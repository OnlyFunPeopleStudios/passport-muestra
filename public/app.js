// Passport Muestra - app cliente (vanilla, hash routing, PWA)
// V0.2: sello → puntuación ⭐ + comentario 💬
const $view = document.getElementById('view');
const VT_KEY = 'pm_vt';

const api = async (path, opts) => {
  const r = await fetch(path, { headers: { 'content-type': 'application/json' }, ...opts });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(data.error || 'error'), { status: r.status, data });
  return data;
};

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const flagEmoji = (code) => window.PassportStamp?.flagEmoji(code) || '🏳️';

const pct = (done, total) => (total ? Math.round((done / total) * 100) : 0);

// ---------- configuración del evento ----------
let cfg = null;
const t = (key, fallback) => cfg?.texts?.[key] || fallback;

// Renderiza el sello utilizando el motor único PassportStamp
function renderStamp(s, opts = {}) {
  return window.PassportStamp.render(s, typeof opts === 'string' ? { extraClass: opts } : opts);
}

async function loadConfig() {
  try {
    const { config } = await api('/api/config');
    cfg = config;
    const s = document.documentElement.style;
    s.setProperty('--color-primary', config.primary_color);
    s.setProperty('--color-secondary', config.secondary_color);
    s.setProperty('--color-accent', config.accent_color);
    s.setProperty('--color-background', config.background_color);
    s.setProperty('--color-text', config.text_color);
    s.setProperty('--color-text-secondary', config.text_secondary_color);
    document.body.dataset.stamp = config.stamp_style;
    const nameEl = document.getElementById('event-name');
    if (nameEl) nameEl.textContent = config.event_name.trim() || 'Pasaporte Digital';
    const subEl = document.getElementById('event-subtitle');
    if (subEl) subEl.textContent = config.event_subtitle;
    document.title = config.event_name.trim() + ' · Pasaporte Digital';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', config.primary_color);
    const logo = document.getElementById('top-logo');
    const icon = document.getElementById('top-logo-icon');
    if (config.logo && logo) {
      logo.src = config.logo;
      logo.classList.remove('hidden');
      icon.classList.add('hidden');
    }
    const footer = document.getElementById('site-footer');
    if (footer && config.texts.footer_text) {
      footer.textContent = config.texts.footer_text;
      footer.classList.remove('hidden');
    }
  } catch {
    cfg = null;
  }
  if (cfg) route(); // la config llegó después del primer render
}

// ---------- routing ----------
function route() {
  const hash = (location.hash || '#/').replace(/^#/, '');
  const [path, query] = hash.split('?');
  const params = new URLSearchParams(query || '');
  const go = { '/': renderHome, '/home': renderHome, '/passport': renderPassport, '/stands': renderStands, '/scan': renderScan, '/qr': renderQR }[path];
  if (path.startsWith('/scan') && params.get('tok')) visitStand(params.get('tok'));
  else (go || renderHome)();
}
window.addEventListener('hashchange', route);

// ---------- vistas ----------
function renderHome() {
  const hasVt = !!localStorage.getItem(VT_KEY);
  $view.innerHTML = `
    <section class="card">
      <h2>Bienvenido</h2>
      <p class="muted">${esc(t('welcome_text', 'Recorré los stands, sellá tu pasaporte y contanos qué te pareció.'))}</p>
      ${hasVt ? `<button class="btn" onclick="location.hash='#/passport'">Ver mi pasaporte</button><p class="muted small">Tu pasaporte de este teléfono ya existe.</p>` : ''}
      <form id="create-form" class="mt">
        <label for="name">${esc(t('name_label', 'Tu nombre o apodo'))} <span class="muted">(opcional)</span></label>
        <input id="name" name="name" maxlength="40" placeholder="Ej: Lucía">
        <button class="btn primary" type="submit">${esc(t('button_text', 'Crear mi pasaporte'))}</button>
        <p class="muted small">${esc(t('create_anon_hint', 'Sin nombre = modo anónimo 🕶️'))}</p>
      </form>
    </section>
    <section class="card">
      <h3>¿Cómo funciona?</h3>
      <ol class="steps">
        <li>Creá tu pasaporte (una sola vez).</li>
        <li>En cada stand escaneá su QR.</li>
        <li>La bandera del país queda sellada en tu pasaporte.</li>
        <li>Puntúa el proyecto con estrellas ⭐ y dejá un comentario si querés.</li>
      </ol>
    </section>`;
  document.getElementById('create-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const { visitor } = await api('/api/visitors', { method: 'POST', body: JSON.stringify({ name: e.target.name.value }) });
      localStorage.setItem(VT_KEY, visitor.token);
      location.hash = '/passport';
    } catch (err) {
      alert(err.message);
    }
  });
}

async function renderPassport() {
  const vt = localStorage.getItem(VT_KEY);
  if (!vt) { location.hash = '/home'; return; }
  try {
    const [standsData, data] = await Promise.all([
      api('/api/stands').catch(() => ({ stands: [] })),
      api('/api/passport?vt=' + encodeURIComponent(vt)),
    ]);
    const visitedMap = new Map((data.visits || []).map((v) => [v.stand_id, v]));
    const done = visitedMap.size;
    const total = data.total_stands || standsData.stands.length || 0;
    const percent = pct(done, total);

    const publishedStands = standsData.stands || [];
    const slots = publishedStands.length
      ? publishedStands
          .map((s) => {
            const v = visitedMap.get(s.id);
            const stampHtml = v
              ? renderStamp(v, { size: 'normal' })
              : renderStamp({}, { placeholder: true, size: 'normal' });
            return `
              <div class="passport-slot ${v ? 'done' : 'pending'}">
                ${stampHtml}
                <span class="passport-slot-name">${esc(s.name)}</span>
              </div>`;
          })
          .join('')
      : Array.from({ length: total }, (_, i) => i + 1)
          .map((id) => {
            const v = data.visits.find((x) => x.stand_id === id);
            const stampHtml = v
              ? renderStamp(v, { size: 'normal' })
              : renderStamp({}, { placeholder: true, size: 'normal' });
            return `<div class="passport-slot ${v ? 'done' : 'pending'}">${stampHtml}</div>`;
          })
          .join('');

    $view.innerHTML = `
      <section class="card">
        <h2>${esc(t('passport_title', 'Mi pasaporte'))} ${data.visitor.name ? '· ' + esc(data.visitor.name) : ''}</h2>
        <div class="progress">
          <div class="progress-fill" style="width:${percent}%"></div>
        </div>
        <p class="progress-text"><strong>${done} / ${total}</strong> ${esc(t('progress_suffix', 'stands visitados'))} · <strong>${percent}%</strong> completado</p>
        ${done === total && total > 0 ? `<p class="banner-complete">${esc(t('completed', '¡Pasaporte completo! ¡Felicitaciones!'))}</p>` : ''}
        <div class="passport-grid">${slots}</div>
      </section>
      <div class="row mt">
        <button class="btn primary" onclick="location.hash='#/scan'">📷 Escanear stand</button>
        <button class="btn ghost" onclick="location.hash='#/stands'">Ver lista de stands</button>
      </div>`;
  } catch (err) {
    localStorage.removeItem(VT_KEY);
    $view.innerHTML = `<section class="card"><p>${esc(err.message)}</p><button class="btn" onclick="location.hash='#/home'">Crear pasaporte</button></section>`;
  }
}

async function renderStands() {
  try {
    const { stands } = await api('/api/stands');
    $view.innerHTML = `
      <section class="card">
        <h2>Stands de la muestra</h2>
        <p class="muted small">Tocá "Visitar" o escaneá su QR desde el menú 📷</p>
      </section>
      <div class="stand-list">
        ${stands.map((s) => `
          <article class="card stand-card">
            <div class="stand-head">
              ${renderStamp(s, { size: 'small', showStars: false })}
              <div>
                <h3>${esc(s.name)}</h3>
                <p class="muted small">${esc(s.course)} · ${esc(s.area)}</p>
              </div>
            </div>
            <p>${esc(s.description)}</p>
            <button class="btn" onclick="visitStand('${esc(s.token)}')">Visitar ${esc(s.name.split(' ')[0])}</button>
          </article>`).join('')}
      </div>`;
  } catch (err) {
    $view.innerHTML = `<section class="card"><p>${esc(err.message)}</p></section>`;
  }
}

// ---------- loop: visitar → sellar → evaluar ----------
let lastTok = null;

// Simula el escaneo (también sirve para probar sin cámara)
async function visitStand(tok) {
  const vt = localStorage.getItem(VT_KEY);
  if (!vt) { location.hash = '/home'; return; }
  lastTok = tok;
  $view.innerHTML = `<section class="card center"><p class="muted">Registrando visita…</p></section>`;
  try {
    const data = await api('/api/visits', { method: 'POST', body: JSON.stringify({ vt, tok }) });
    showVisitSuccess(data);
  } catch (err) {
    if (err.data?.already && err.data.visit) showAlreadyVisited(err.data.visit);
    else
      $view.innerHTML = `<section class="card center"><h2>No se pudo visitar</h2><p>${esc(err.message)}</p><button class="btn mt" onclick="location.hash='#/stands'">Volver a los stands</button></section>`;
  }
}

// Sello grande para confirmación visual tras escaneo
function renderBigStamp(v, animated = true) {
  return renderStamp(v, { size: 'hero', animated });
}

function showVisitSuccess(data) {
  const v = data.visit;
  const done = data.visits.length;
  const total = data.total_stands;
  ev = { tok: lastTok, name: v.stand_name, flag: v.flag, stamp_type: v.stamp_type, stamp_image: v.stamp_image, stamp_color: v.stamp_color, rating: 0 };
  $view.innerHTML = `
    <section class="card visit-hero-card">
      ${renderBigStamp(v, true)}
      <h2>✓ ¡Visitaste este stand!</h2>
      <h3 class="muted">${esc(v.stand_name)}</h3>
      <p class="muted small">${esc(t('visit_ok', 'Visita registrada'))} · <strong>${done} / ${total}</strong> (${pct(done, total)}%)</p>
    </section>
    ${evalFormHtml()}`;
  bindEval();
}

function showAlreadyVisited(visit) {
  ev = { tok: lastTok, name: visit.stand_name, flag: visit.flag, stamp_type: visit.stamp_type, stamp_image: visit.stamp_image, stamp_color: visit.stamp_color, rating: 0 };
  const has = visit && visit.rating;
  $view.innerHTML = `
    <section class="card center">
      ${renderBigStamp(visit)}
      <h2>✓ Ya visitaste este stand</h2>
      <p>${esc(t('already_visited', 'Este stand ya forma parte de tu pasaporte.'))}</p>
      ${has ? `
        <div class="ev-summary">
          <div class="stars static">${'★'.repeat(visit.rating)}${'☆'.repeat(5 - visit.rating)}</div>
          ${visit.comment ? `<p class="quote">"${esc(visit.comment)}"</p>` : '<p class="muted small">Sin comentario</p>'}
        </div>` : `
        <p class="muted">${esc(t('not_evaluated', 'Evaluá el stand cuando quieras.'))}</p>
        <button class="btn primary mt" onclick="showEvalForExisting()">Evaluar ahora</button>`}
      <div class="row mt">
        <button class="btn ghost" onclick="location.hash='#/passport'">Ver pasaporte</button>
        <button class="btn ghost" onclick="location.hash='#/stands'">Ir a otro stand</button>
      </div>
    </section>`;
}

function showEvalForExisting() {
  $view.innerHTML = `
    <section class="card center">
      ${renderBigStamp(ev)}
      <h2>${esc(ev.name)}</h2>
    </section>
    ${evalFormHtml()}`;
  bindEval();
}

// ---------- formulario de evaluación ----------
let ev = { tok: null, name: '', flag: '', rating: 0 };

function evalFormHtml() {
  return `
    <section class="card">
      <h3>${esc(t('eval_question', '¿Cómo te gustó este proyecto?'))}</h3>
      <div class="stars" id="stars">${starButtons()}</div>
      <label for="comment">${esc(t('comment_label', '¿Querés dejar un comentario?'))} <span class="muted">(opcional)</span></label>
      <textarea id="comment" maxlength="200" rows="3" placeholder="Decinos qué te pareció…"></textarea>
      <p class="counter"><span id="count">0</span>/200</p>
      <button id="submit-eval" class="btn primary" disabled onclick="submitEval()">${esc(t('submit_eval', 'Enviar'))}</button>
    </section>`;
}

function starButtons() {
  return [1, 2, 3, 4, 5]
    .map((i) => `<button type="button" class="star" data-v="${i}" onclick="pickStar(${i})">${i <= ev.rating ? '★' : '☆'}</button>`)
    .join('');
}

function pickStar(n) {
  ev.rating = n;
  document.getElementById('stars').innerHTML = starButtons();
  document.getElementById('submit-eval').disabled = false;
}

function bindEval() {
  const c = document.getElementById('comment');
  const cnt = document.getElementById('count');
  c.addEventListener('input', () => { cnt.textContent = c.value.length; });
  c.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitEval(); }
  });
}

async function submitEval() {
  const vt = localStorage.getItem(VT_KEY);
  const btn = document.getElementById('submit-eval');
  if (!vt || ev.rating < 1) return;
  btn.disabled = true;
  btn.textContent = 'Guardando…';
  try {
    const data = await api('/api/evaluate', {
      method: 'POST',
      body: JSON.stringify({ vt, tok: ev.tok, rating: ev.rating, comment: document.getElementById('comment').value }),
    });
    const done = data.visits.length;
    const total = data.total_stands;
    $view.innerHTML = `
      <section class="card visit-hero-card">
        ${renderStamp({ stand_name: ev.name, flag: ev.flag, stamp_type: ev.stamp_type, stamp_image: ev.stamp_image, stamp_color: ev.stamp_color, rating: ev.rating }, { size: 'hero', animated: true })}
        <h2>✓ ${esc(t('eval_saved', 'Evaluación guardada'))}</h2>
        <p>Tu pasaporte ahora tiene este sello · <strong>${done} / ${total}</strong> (${pct(done, total)}%)</p>
        <div class="stars static">${'★'.repeat(ev.rating)}${'☆'.repeat(5 - ev.rating)}</div>
        <div class="row mt">
          <button class="btn primary" onclick="location.hash='#/scan'">Siguiente stand</button>
          <button class="btn ghost" onclick="location.hash='#/passport'">Ver pasaporte</button>
        </div>
      </section>`;
  } catch (err) {
    alert(err.message);
    btn.disabled = false;
    btn.textContent = 'Enviar';
  }
}

function renderScan() {
  $view.innerHTML = `
    <section class="card">
      <h2>${esc(t('scan_title', 'Escanear stand'))}</h2>
      <p class="muted">${esc(t('scan_note', 'Apuntá la cámara al QR del stand.'))}</p>
      <div id="reader"></div>
      <p id="scan-note" class="muted small">Escaneando…</p>
      <button class="btn ghost mt" onclick="location.hash='#/stands'">No tengo cámara · ver lista</button>
    </section>`;

  const note = document.getElementById('scan-note');
  if (!('Html5Qrcode' in window)) {
    note.textContent = 'El lector QR no está disponible. Usá la lista de stands.';
    return;
  }
  if (!navigator?.mediaDevices?.getUserMedia) {
    note.textContent = 'Cámara no disponible (se necesita HTTPS). Usá la lista de stands.';
    return;
  }

  // Html5Qrcode (no Html5QrcodeScanner): sin selector de cámara ni botón "Start".
  const scanner = new Html5Qrcode('reader', { verbose: false });
  const config = { fps: 10, qrbox: { width: 220, height: 220 } };
  let done = false;
  const onScan = async (text) => {
    if (done) return;
    done = true;
    const m = text.match(/\/scan\?tok=([^&)\s]+)/) || text.match(/tok=([^&)\s]+)/);
    const tok = m ? m[1] : text;
    try { await scanner.stop(); } catch {}
    visitStand(tok);
  };

  // Arranque automático en la cámara trasera. Si el equipo no acepta facingMode,
  // se busca una trasera/environment por nombre; si no, la primera disponible.
  scanner.start({ facingMode: 'environment' }, config, onScan, () => {}).catch(async () => {
    try {
      const cams = await Html5Qrcode.getCameras();
      if (!cams.length) throw new Error('sin cámaras');
      const rear = cams.find((c) => /back|rear|environment|trasera|posterior/i.test(c.label)) || cams[0];
      await scanner.start(rear.id, config, onScan, () => {});
    } catch {
      note.textContent = 'No pudimos abrir la cámara. Permití el acceso a la cámara del navegador o usá la lista de stands.';
    }
  });
}

// Base pública de la app (funciona en raíz o en subruta; nunca hardcodea el dominio).
const APP_BASE = location.origin + location.pathname.replace(/\/[^/]*$/, '/');

// QR como PNG real dibujado en canvas nativo (sin librerías extra): la extensión
// del archivo (.png) y su contenido coinciden.
function qrPngDataUrl(text, cell = 12, margin = 16) {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const size = n * cell + margin * 2;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#000000';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) ctx.fillRect(margin + c * cell, margin + r * cell, cell, cell);
    }
  }
  return cv.toDataURL('image/png');
}

function renderQR() {
  api('/api/stands').then(({ stands }) => {
    $view.innerHTML = `
      <section class="card">
        <h2>QR de cada stand</h2>
        <p class="muted small">Imprimí cada QR y pegálo en el stand. El teléfono apuntará aquí y sellará el pasaporte del visitante.</p>
      </section>
      <div class="qr-grid">
        ${stands.map((s) => `
          <div class="card qr-card" data-tok="${esc(s.token)}">
            <h3>${esc(s.name)}</h3>
            <div class="qr-img"></div>
            <button class="btn ghost small-btn" onclick="downloadQr('${esc(s.token)}','${esc(s.slug || s.id)}')">⬇️ Descargar</button>
          </div>`).join('')}
      </div>`;
    stands.forEach((s) => {
      const card = $view.querySelector(`[data-tok="${CSS.escape(s.token)}"] .qr-img`);
      const url = `${APP_BASE}#/scan?tok=${s.token}`;
      const img = document.createElement('img');
      img.src = qrPngDataUrl(url, 8, 8);
      img.alt = 'QR ' + s.name;
      card.appendChild(img);
    });
  }).catch((err) => { $view.innerHTML = `<section class="card"><p>${esc(err.message)}</p></section>`; });
}

function downloadQr(tok, slug) {
  const url = `${APP_BASE}#/scan?tok=${tok}`;
  const a = document.createElement('a');
  a.href = qrPngDataUrl(url);
  a.download = `pasaporte-${slug}.png`;
  a.click();
}

route();
loadConfig();