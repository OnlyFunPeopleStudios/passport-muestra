// Passport Muestra - Modo offline del visitante (V0.6)
// Guarda los stands y las visitas en el dispositivo (IndexedDB) y encola las
// operaciones para sincronizarlas cuando vuelve la conexión.
// El servidor sigue siendo la fuente de verdad: la cola se apoya en
// UNIQUE(visitor_id, stand_id) de /api/visits (reenviar da 409, no duplica) y en
// el UPDATE de /api/evaluate (reenviar es idempotente). Por eso reutilizamos los
// endpoints existentes en lugar de crear uno nuevo.
(function (global) {
  'use strict';

  const DB_NAME = 'pm-offline';
  const DB_VERSION = 1;
  const STANDS = 'stands';
  const VISITS = 'visits';
  const QUEUE = 'queue';
  const META = 'meta';
  const ENDPOINT = { visit: '/api/visits', evaluate: '/api/evaluate' };

  // ---------- lógica pura (sin DOM ni IndexedDB; ver scripts/offline.test.mjs) ----------

  const visitKey = (visitorToken, standId) => String(visitorToken) + '::' + String(standId);

  // Qué hacer con la respuesta del servidor al sincronizar una operación:
  //   ok        -> 2xx: quedó aplicada
  //   done      -> 409: ya estaba aplicada (idempotente, no duplicar)
  //   permanent -> 4xx: no va a funcionar nunca; se conserva para diagnóstico
  //   transient -> red caída o 5xx: reintentar más tarde
  function classifySyncResult(status) {
    if (status >= 200 && status < 300) return 'ok';
    if (status === 409) return 'done';
    if (status >= 400 && status < 500) return 'permanent';
    return 'transient';
  }

  // Une las visitas del servidor con las locales sin duplicar por stand.
  // Gana la local cuando existe: puede tener rating/comentario recién cargados
  // que todavía no llegaron al servidor.
  function mergeVisits(serverVisits, localVisits) {
    const byStand = new Map();
    for (const v of serverVisits || []) byStand.set(v.stand_id, v);
    for (const v of localVisits || []) byStand.set(v.stand_id, { ...byStand.get(v.stand_id), ...v });
    return Array.from(byStand.values());
  }

  // ---------- IndexedDB ----------

  let dbp = null;
  let syncing = false;

  function open() {
    if (dbp) return dbp;
    dbp = new Promise((resolve, reject) => {
      if (!global.indexedDB) return reject(new Error('sin IndexedDB'));
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STANDS)) db.createObjectStore(STANDS, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(VISITS)) db.createObjectStore(VISITS, { keyPath: 'key' });
        if (!db.objectStoreNames.contains(QUEUE)) db.createObjectStore(QUEUE, { keyPath: 'operation_id' });
        if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: 'k' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbp;
  }

  function run(store, mode, fn) {
    return open().then(
      (db) =>
        new Promise((resolve, reject) => {
          const t = db.transaction(store, mode);
          const out = fn(t.objectStore(store));
          t.oncomplete = () => resolve(out ? out.result : undefined);
          t.onerror = () => reject(t.error);
          t.onabort = () => reject(t.error);
        })
    );
  }

  const get = (s, k) => run(s, 'readonly', (os) => os.get(k));
  const getAll = (s) => run(s, 'readonly', (os) => os.getAll());
  const put = (s, v) => run(s, 'readwrite', (os) => os.put(v));
  const del = (s, k) => run(s, 'readwrite', (os) => os.delete(k));
  // Sin IndexedDB la app sigue funcionando online: estas operaciones devuelven el fallback.
  const safe = (p, fallback) => p.catch(() => fallback);

  // ---------- stands (catálogo local: permite reconocer un QR sin conexión) ----------

  async function saveStands(list) {
    try {
      const db = await open();
      await new Promise((resolve, reject) => {
        const t = db.transaction(STANDS, 'readwrite');
        const os = t.objectStore(STANDS);
        os.clear();
        for (const s of list || []) os.put(s);
        t.oncomplete = resolve;
        t.onerror = () => reject(t.error);
      });
    } catch {}
  }

  const getStands = () => safe(getAll(STANDS), []);
  const findStandByToken = (tok) => getStands().then((all) => all.find((s) => s.token === tok) || null);

  // ---------- visitas (espejo local del pasaporte de este teléfono) ----------

  async function saveVisit(vt, visit) {
    if (!vt || !visit || visit.stand_id == null) return null;
    try {
      const key = visitKey(vt, visit.stand_id);
      const [prev, stand] = await Promise.all([get(VISITS, key), get(STANDS, visit.stand_id)]);
      const merged = { ...(stand || {}), ...(prev || {}), ...visit, key, visitor_id: vt, stand_id: visit.stand_id };
      delete merged.id;
      await put(VISITS, merged);
      return merged;
    } catch {
      return null;
    }
  }

  const getVisits = (vt) => safe(getAll(VISITS), []).then((all) => all.filter((v) => v.visitor_id === vt));
  const getVisit = (vt, standId) => safe(get(VISITS, visitKey(vt, standId)), null);

  const saveVisitor = (vt, visitor) => safe(put(META, { k: 'visitor', v: { name: visitor?.name || '' } }), null);
  const getVisitor = () => safe(get(META, 'visitor'), null).then((r) => r?.v || null);

  async function localPassport(vt) {
    const [visits, stands, visitor] = await Promise.all([getVisits(vt), getStands(), getVisitor()]);
    return { visitor: { name: visitor?.name || '' }, visits, total_stands: stands.length };
  }

  // ---------- cola de operaciones ----------

  const newId = () =>
    global.crypto?.randomUUID ? global.crypto.randomUUID() : 'op-' + Date.now() + '-' + Math.random().toString(36).slice(2);

  const pendingOps = () => safe(getAll(QUEUE), []).then((all) => all.sort((a, b) => a.created_at - b.created_at));
  const pendingCount = () => safe(getAll(QUEUE), []).then((all) => all.filter((o) => o.status !== 'error').length);

  async function enqueue(op) {
    const record = { operation_id: newId(), created_at: Date.now(), status: 'queued', ...op };
    await safe(put(QUEUE, record), null);
    emit();
    return record;
  }

  const bodyFor = (op) =>
    op.type === 'visit'
      ? { vt: op.visitor_id, tok: op.token }
      : { vt: op.visitor_id, tok: op.token, rating: op.rating, comment: op.comment ?? '' };

  // Vacía la cola. Un fallo de red o un 5xx corta el bucle (se reintenta después);
  // un 4xx se guarda como error permanente (no se borra: queda para diagnóstico).
  async function sync() {
    if (syncing || !isOnline()) return;
    const ops = (await pendingOps()).filter((o) => o.status !== 'error');
    if (!ops.length) { emit(); return; }
    syncing = true;
    emit();
    try {
      for (const op of ops) {
        let status = 0;
        try {
          const res = await fetch(ENDPOINT[op.type], {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(bodyFor(op)),
          });
          status = res.status;
        } catch {
          break; // sin red: se reintenta en el próximo evento online
        }
        const kind = classifySyncResult(status);
        if (kind === 'ok' || kind === 'done') await safe(del(QUEUE, op.operation_id), null);
        else if (kind === 'permanent') await safe(put(QUEUE, { ...op, status: 'error', http_status: status }), null);
        else break; // 5xx: se reintenta luego
      }
    } finally {
      syncing = false;
      emit();
    }
  }

  // ---------- operaciones offline usadas por app.js ----------

  async function visitOffline(vt, tok) {
    const stand = await findStandByToken(tok);
    if (!stand) throw new Error('Sin conexión y este stand todavía no está en el dispositivo. Reconectate y probá de nuevo.');
    const existing = await getVisit(vt, stand.id);
    if (existing) return { already: true, visit: existing };
    const visit = {
      stand_id: stand.id,
      stand_name: stand.name,
      course: stand.course,
      flag: stand.flag,
      stamp_icon: stand.stamp_icon,
      stamp_color: stand.stamp_color,
      stamp_type: stand.stamp_type,
      stamp_image: stand.stamp_image,
      rating: null,
      comment: null,
      created_at: new Date().toISOString(),
    };
    await saveVisit(vt, visit);
    await enqueue({ type: 'visit', visitor_id: vt, token: tok, stand_id: stand.id });
    return { already: false, visit, passport: await localPassport(vt) };
  }

  async function evaluateOffline(vt, tok, rating, comment) {
    const stand = await findStandByToken(tok);
    if (!stand) throw new Error('Sin conexión y este stand todavía no está en el dispositivo.');
    const visit = await getVisit(vt, stand.id);
    if (!visit) throw new Error('Primero visitá el stand para poder evaluarlo.');
    await saveVisit(vt, { stand_id: stand.id, rating, comment: comment || null });
    await enqueue({ type: 'evaluate', visitor_id: vt, token: tok, stand_id: stand.id, rating, comment: comment || '' });
    return localPassport(vt);
  }

  // ---------- indicador de conexión (discreto, no altera el diseño) ----------

  function ensurePill() {
    let el = document.getElementById('conn-status');
    if (!el) {
      el = document.createElement('div');
      el.id = 'conn-status';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    return el;
  }

  function paint(el, pending) {
    let text;
    let cls;
    if (syncing) { text = '↻ Sincronizando…'; cls = 'conn-syncing'; }
    else if (!isOnline()) { text = '○ Sin conexión · guardado en este dispositivo'; cls = 'conn-offline'; }
    else if (pending > 0) { text = '↻ ' + pending + ' pendiente' + (pending === 1 ? '' : 's') + ' de sincronizar'; cls = 'conn-syncing'; }
    else { text = '● Conectado'; cls = 'conn-online'; }
    el.textContent = text;
    el.className = 'conn-status ' + cls;
  }

  function emit() {
    if (typeof document === 'undefined' || !document.body) return;
    const el = ensurePill();
    pendingCount().then((n) => paint(el, n));
  }

  function init() {
    if (typeof window === 'undefined') return;
    open().catch(() => {});
    emit();
    window.addEventListener('online', () => { emit(); sync(); });
    window.addEventListener('offline', () => emit());
    window.addEventListener('focus', () => sync());
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { emit(); sync(); } });
    sync();
  }

  const isOnline = () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false);

  global.PMOffline = {
    init,
    sync,
    emit,
    isOnline,
    saveStands,
    getStands,
    findStandByToken,
    saveVisit,
    getVisit,
    getVisits,
    saveVisitor,
    localPassport,
    enqueue,
    pendingCount,
    visitOffline,
    evaluateOffline,
    mergeVisits,
    _pure: { visitKey, classifySyncResult, mergeVisits },
  };
})(typeof window !== 'undefined' ? window : this);
