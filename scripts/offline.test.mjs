// Pruebas de la lógica del modo offline (sin navegador).
// Carga public/offline.js en un contexto aislado y verifica la parte pura:
// deduplicación de visitas y clasificación idempotente de la sincronización.
// Además monta un IndexedDB de mentira (y un fetch de mentira) para probar el
// circuito real: visita por palabra sin conexión y sincronización de la cola.
// Se ejecuta con: node scripts/offline.test.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '..', 'public', 'offline.js'), 'utf8');

// Sin IndexedDB a propósito: así también se prueba que la app degrada sin romperse.
const sandbox = { console, navigator: { onLine: true } };
vm.createContext(sandbox);
vm.runInContext(src, sandbox);

const offline = sandbox.PMOffline;
const pure = offline?._pure;

let pass = 0;
let fail = 0;
const check = (name, cond) => {
  if (cond) { pass++; console.log('PASS  ' + name); }
  else { fail++; console.log('FAIL  ' + name); }
};

check('offline.js expone PMOffline._pure', Boolean(pure));

if (pure) {
  // ---- clasificación de la sincronización (idempotencia) ----
  check('sync 201 -> ok', pure.classifySyncResult(201) === 'ok');
  check('sync 200 -> ok', pure.classifySyncResult(200) === 'ok');
  check('sync 409 -> done (reenviar no duplica)', pure.classifySyncResult(409) === 'done');
  check('sync 400 -> permanent (no reintentar en loop)', pure.classifySyncResult(400) === 'permanent');
  check('sync 404 -> permanent', pure.classifySyncResult(404) === 'permanent');
  check('sync 500 -> transient (se reintenta)', pure.classifySyncResult(500) === 'transient');
  check('sync 0 (sin red) -> transient', pure.classifySyncResult(0) === 'transient');

  // ---- clave de deduplicación local ----
  check('visitKey separa visitante y stand', pure.visitKey('vt1', 5) !== pure.visitKey('vt1', 6));
  check('visitKey es estable', pure.visitKey('vt1', 5) === pure.visitKey('vt1', 5));

  // ---- unión servidor + local sin duplicar ----
  const server = [{ stand_id: 1, rating: 5, comment: 'ok' }, { stand_id: 2, rating: null, comment: null }];
  const local = [{ stand_id: 2, rating: 4, comment: 'offline' }, { stand_id: 3, rating: null, comment: null }];
  const merged = pure.mergeVisits(server, local);
  check('merge: no duplica stands (3, no 4)', merged.length === 3);
  check('merge: la visita local actualiza la del servidor', merged.find((v) => v.stand_id === 2).rating === 4);
  check('merge: conserva las visitas del servidor', merged.find((v) => v.stand_id === 1).comment === 'ok');
  check('merge: agrega la visita local pendiente', merged.some((v) => v.stand_id === 3));
  check('merge: sin datos no rompe', pure.mergeVisits(undefined, undefined).length === 0);

  // ---- V0.7: palabra secreta del stand (misma normalización que el servidor) ----
  check('normalizeWord: recorta espacios y baja a minúsculas', pure.normalizeWord('  GiRaSol ') === 'girasol');
  check('normalizeWord: vacío/null -> ""', pure.normalizeWord(null) === '' && pure.normalizeWord('   ') === '');
  const standsW = [{ id: 1, secret_word: 'GIRASOL' }, { id: 2, secret_word: '  tiburon ' }, { id: 3 }];
  check('matchStandByWord: tolera mayúsculas y espacios', pure.matchStandByWord(standsW, '  girasol ')?.id === 1);
  check('matchStandByWord: reconoce la segunda palabra', pure.matchStandByWord(standsW, 'TIBURON')?.id === 2);
  check('matchStandByWord: palabra inexistente -> null', pure.matchStandByWord(standsW, 'nope') === null);
  check('matchStandByWord: palabra vacía -> null', pure.matchStandByWord(standsW, '   ') === null);
  check('matchStandByWord: el stand sin palabra no coincide', pure.matchStandByWord(standsW, '3') === null);

  // ---- cuerpo de la sincronización: por palabra o por token ----
  const bWord = pure.bodyFor({ type: 'visit', visitor_id: 'v', word: 'GIRASOL', token: 't' });
  check('bodyFor: visita por palabra reenvía word (sin tok)', bWord.vt === 'v' && bWord.word === 'GIRASOL' && !bWord.tok);
  const bTok = pure.bodyFor({ type: 'visit', visitor_id: 'v', token: 't' });
  check('bodyFor: visita por QR reenvía tok', bTok.vt === 'v' && bTok.tok === 't' && !bTok.word);
  const bEv = pure.bodyFor({ type: 'evaluate', visitor_id: 'v', token: 't', rating: 4, comment: 'ok' });
  check('bodyFor: evaluación lleva rating y comentario', bEv.tok === 't' && bEv.rating === 4 && bEv.comment === 'ok');
}

// ---- degradación sin IndexedDB (la app online debe seguir andando) ----
check('sin IndexedDB: getStands -> []', (await offline.getStands()).length === 0);
check('sin IndexedDB: getVisits -> []', (await offline.getVisits('vt')).length === 0);
check('sin IndexedDB: findStandByToken -> null', (await offline.findStandByToken('tok')) === null);
check('sin IndexedDB: findStandByWord -> null', (await offline.findStandByWord('palabra')) === null);
check('sin IndexedDB: localPassport -> 0 stands', (await offline.localPassport('vt')).total_stands === 0);

let threw = false;
try { await offline.evaluateOffline('vt', 'tok', 5, ''); } catch { threw = true; }
check('sin datos locales: evaluar offline avisa (no rompe)', threw);

// ---- IndexedDB de mentira: se prueba el circuito completo sin navegador ----
// Solo implementa lo que usa offline.js (open/transaction/get/getAll/put/delete/clear).
function fakeIndexedDB() {
  const data = new Map();
  const keyPaths = new Map();
  const req = (fn) => { const r = {}; try { r.result = fn(); } catch (e) { r.error = e; } return r; };
  const db = {
    objectStoreNames: { contains: (n) => data.has(n) },
    createObjectStore(name, opts = {}) { data.set(name, new Map()); keyPaths.set(name, opts.keyPath); return {}; },
    transaction(name) {
      const t = { oncomplete: null, onerror: null, onabort: null, error: null };
      const map = data.get(name);
      const kp = keyPaths.get(name);
      t.objectStore = () => ({
        get: (k) => req(() => map.get(k)),
        getAll: () => req(() => Array.from(map.values())),
        put: (v) => req(() => { const k = Array.isArray(kp) ? kp.map((p) => v[p]).join('|') : v[kp]; map.set(k, v); return k; }),
        delete: (k) => req(() => map.delete(k)),
        clear: () => req(() => map.clear()),
      });
      queueMicrotask(() => { if (t.oncomplete) t.oncomplete(); });
      return t;
    },
  };
  return {
    open: () => {
      const r = { result: db, onsuccess: null, onerror: null, onupgradeneeded: null };
      queueMicrotask(() => { if (r.onupgradeneeded) r.onupgradeneeded(); if (r.onsuccess) r.onsuccess(); });
      return r;
    },
  };
}

const calls = [];
let reply = { status: 201 };
let seq = 0;
const sandbox2 = {
  console,
  navigator: { onLine: true },
  indexedDB: fakeIndexedDB(),
  fetch: async (url, opts) => {
    try {
      const body = JSON.parse(opts.body);
      calls.push({ url, body });
    } catch {}
    if (reply.network) throw new Error('sin red');
    return { status: reply.status };
  },
  crypto: { randomUUID: () => 'op-' + ++seq },
  fetch: async (url, opts) => {
    try {
      const body = JSON.parse(opts.body);
      calls.push({ url, body });
    } catch {}
    if (reply.network) throw new Error('sin red');
    return { status: reply.status };
  },
};
vm.createContext(sandbox2);
vm.runInContext(src, sandbox2);
const off = sandbox2.PMOffline;

await off.saveStands([
  { id: 1, name: 'Uno', token: 'tok1', secret_word: 'GIRASOL' },
  { id: 2, name: 'Dos', token: 'tok2', secret_word: '  tiburon ' },
  { id: 3, name: 'Tres', token: 'tok3' },
]);

const r1 = await off.visitByWordOffline('vt1', 'girasol');
check('offline: palabra correcta registra la visita', r1.already === false && r1.visit.stand_id === 1 && r1.visit.visit_method === 'secret');
check('offline: la visita por palabra queda en la cola', (await off.pendingCount()) === 1);

const r2 = await off.visitByWordOffline('vt1', 'TIBURON');
check('offline: tolera mayúsculas y espacios del catálogo', r2.already === false && r2.visit.stand_id === 2);

const r3 = await off.visitByWordOffline('vt1', '  girasol ');
check('offline: repetir la palabra no duplica (misma visita)', r3.already === true && (await off.pendingCount()) === 2);

let threwWord = false;
try { await off.visitByWordOffline('vt1', 'tres'); } catch { threwWord = true; }
check('offline: stand sin palabra no se registra', threwWord);

let msgWord = '';
try { await off.visitByWordOffline('vt2', 'NO-EXISTE'); } catch (e) { msgWord = e.message; }
check('offline: palabra incorrecta avisa y no encola', /no corresponde a ning/.test(msgWord) && (await off.pendingCount()) === 2);

reply = { status: 201 };
await off.sync();
check('sync: reenvía {vt, word} para las visitas por palabra', calls.some((c) => c.url === '/api/visits' && c.body.word === 'girasol'));
check('sync: la cola queda vacía', (await off.pendingCount()) === 0);
check('sync: las visitas por palabra siguen en el pasaporte local', (await off.getVisits('vt1')).length === 2);

await off.visitByWordOffline('vt3', 'girasol');
reply = { status: 409 };
await off.sync();
check('sync: 409 (ya registrada) no deja pendientes', (await off.pendingCount()) === 0);
check('sync: 409 no borra la visita local', (await off.getVisit('vt3', 1)) !== null);

await off.visitByWordOffline('vt4', 'girasol');
reply = { network: true };
await off.sync();
check('sync: sin red la operación queda pendiente para después', (await off.pendingCount()) === 1);

reply = { status: 201 };
const r5 = await off.visitOffline('vt5', 'tok3');
check('offline: la visita por QR queda como qr', r5.already === false && r5.visit.visit_method === 'qr');
await off.sync();
check('sync: reenvía {vt, tok} para las visitas por QR', calls.some((c) => c.body.tok === 'tok3'));
check('sync: todo sincronizado', (await off.pendingCount()) === 0);

console.log('');
console.log(`Resultado offline: ${pass} pass, ${fail} fail`);
process.exit(fail);
