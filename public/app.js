// Passport Muestra - app cliente (vanilla, hash routing, PWA)
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

const flagEmoji = (code) =>
  code && code.length === 2
    ? String.fromCodePoint(...Array.from(code.toUpperCase()).map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
    : '🏳️';

const pct = (done, total) => (total ? Math.round((done / total) * 100) : 0);

// ---------- routing ----------
function route() {
  const hash = (location.hash || '#/').replace(/^#/, '');
  const [path, query] = hash.split('?');
  const params = new URLSearchParams(query || '');
  const go = { '/': renderHome, '/home': renderHome, '/passport': renderPassport, '/stands': renderStands, '/scan': renderScan, '/qr': renderQR }[path];
  if (path.startsWith('/scan') && params.get('tok')) renderScanResult(params.get('tok'));
  else (go || renderHome)();
}
window.addEventListener('hashchange', route);

// ---------- vistas ----------
function renderHome() {
  const hasVt = !!localStorage.getItem(VT_KEY);
  $view.innerHTML = `
    <section class="card">
      <h2>Bienvenido</h2>
      <p class="muted">Recorré los stands, sellá tu pasaporte con sus banderas y contanos qué te pareció.</p>
      ${hasVt ? `<button class="btn" onclick="location.hash='#/passport'">Ver mi pasaporte</button><p class="muted small">Tu pasaporte de este teléfono ya existe.</p>` : ''}
      <form id="create-form" class="mt">
        <label for="name">Tu nombre o apodo <span class="muted">(opcional)</span></label>
        <input id="name" name="name" maxlength="40" placeholder="Ej: Lucía">
        <button class="btn primary" type="submit">Crear mi pasaporte</button>
        <p class="muted small">Sin nombre = modo anónimo 🕶️</p>
      </form>
    </section>
    <section class="card">
      <h3>¿Cómo funciona?</h3>
      <ol class="steps">
        <li>Creá tu pasaporte (una sola vez).</li>
        <li>En cada stand escaneá su QR.</li>
        <li>La bandera del país queda sellada en tu pasaporte.</li>
        <li>Puntúa el proyecto con estrellas 💫</li>
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
    const data = await api('/api/passport?vt=' + encodeURIComponent(vt));
    const visited = new Set(data.visits.map((v) => v.stand_id));
    const done = visited.size;
    const total = data.total_stands;
    const percent = pct(done, total);
    const stamps = Array.from({ length: total }, (_, i) => i + 1)
      .map((id) => {
        const v = data.visits.find((x) => x.stand_id === id);
        return v
          ? `<div class="stamp done" title="${esc(v.stand_name)}">${flagEmoji(v.flag)}<span>${esc(v.stand_name.split(' ')[0])}</span></div>`
          : `<div class="stamp"><span class="qs">?</span></div>`;
      })
      .join('');
    $view.innerHTML = `
      <section class="card">
        <h2>Mi pasaporte ${data.visitor.name ? '· ' + esc(data.visitor.name) : ''}</h2>
        <div class="progress">
          <div class="progress-fill" style="width:${percent}%"></div>
        </div>
        <p class="progress-text"><strong>${done} / ${total}</strong> stands visitados · <strong>${percent}%</strong> completado</p>
        ${done === total ? '<p class="banner-complete">🎉 ¡Pasaporte completo! ¡Felicitaciones!</p>' : ''}
        <div class="stamps">${stamps}</div>
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
              <span class="stand-flag">${flagEmoji(s.flag)}</span>
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

// Simula el escaneo (también sirve para probar sin cámara)
async function visitStand(tok) {
  const vt = localStorage.getItem(VT_KEY);
  if (!vt) { location.hash = '/home'; return; }
  try {
    const data = await api('/api/visits', { method: 'POST', body: JSON.stringify({ vt, tok }) });
    showVisitResult(data, false);
  } catch (err) {
    showVisitResult({ error: err.message, already: err.data?.already, visits: null }, true);
  }
}

function renderScan() {
  $view.innerHTML = `
    <section class="card">
      <h2>Escanear stand</h2>
      <p class="muted">Apuntá la cámara al QR del stand.</p>
      <div id="reader"></div>
      <p id="scan-note" class="muted small"></p>
      <button class="btn ghost mt" onclick="location.hash='#/stands'">No tengo cámara · ver lista</button>
    </section>`;
  if (!('Html5QrcodeScanner' in window)) {
    document.getElementById('scan-note').textContent = 'El lector QR no está disponible. Usá la lista de stands.';
    return;
  }
  if (!navigator?.mediaDevices?.getUserMedia) {
    document.getElementById('scan-note').textContent = 'Cámara no disponible (se necesita HTTPS). Usá la lista de stands.';
    return;
  }
  const scanner = new Html5QrcodeScanner('reader', { fps: 10, qrbox: { width: 220, height: 220 } });
  scanner.render(
    (text) => {
      scanner.clear();
      const m = text.match(/\/scan\?tok=([^&)\s]+)/) || text.match(/tok=([^&)\s]+)/);
      visitStand(m ? m[1] : text);
    },
    () => {}
  );
}

async function renderScanResult(tok, alreadyHandled) {
  if (tok && !alreadyHandled) { visitStand(tok); return; }
  $view.innerHTML = `
    <section class="card center">
      <h2>${esc((!tok || tok.error) ? 'Oops' : 'Sello agregado')}</h2>
      <p>${esc((tok && tok.error) || 'Sello listo en tu pasaporte.')}</p>
      ${tok && tok.error ? '' : ''}
      <button class="btn primary mt" onclick="location.hash='#/passport'">Ver mi pasaporte</button>
    </section>`;
}

function showVisitResult(data, isError) {
  if (isError) {
    $view.innerHTML = `
      <section class="card center">
        <h2>${data.already ? 'Ya lo tenías' : 'No se pudo visitar'}</h2>
        <p>${esc(data.error)}</p>
        <button class="btn primary mt" onclick="location.hash='#/passport'">Ver mi pasaporte</button>
        <button class="btn ghost mt" onclick="location.hash='#/stands'">Ir a otro stand</button>
      </section>`;
    return;
  }
  const done = data.visits.length;
  const total = data.total_stands;
  $view.innerHTML = `
    <section class="card center">
      <div class="big-stamp">${flagEmoji(data.visit.flag)}</div>
      <h2>✓ ${esc(data.visit.stand_name)}</h2>
      <p>Sello agregado a tu pasaporte · <strong>${done} / ${total}</strong> (${pct(done, total)}%)</p>
      <div class="row mt">
        <button class="btn primary" onclick="location.hash='#/scan'">Seguir escaneando</button>
        <button class="btn ghost" onclick="location.hash='#/passport'">Ver pasaporte</button>
      </div>
    </section>
    <section class="card center muted">⭐ puntuación y comentarios llegan en la próxima versión.</section>`;
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
          <div class="card qr-card" data-tok="${esc(s.token)}" data-name="${esc(s.name)}">
            <h3>${esc(s.name)}</h3>
            <div class="qr-img"></div>
            <button class="btn ghost small-btn" onclick="downloadQr('${esc(s.token)}','${esc(s.slug || s.id)}')">⬇️ Descargar</button>
          </div>`).join('')}
      </div>`;
    stands.forEach((s) => {
      const card = $view.querySelector(`[data-tok="${CSS.escape(s.token)}"] .qr-img`);
      const url = `${location.origin}${location.pathname}#/scan?tok=${s.token}`;
      const qr = qrcode(0, 'M');
      qr.addData(url);
      qr.make();
      const img = document.createElement('img');
      img.src = qr.createDataURL(8, 8);
      img.alt = 'QR ' + s.name;
      card.appendChild(img);
    });
  }).catch((err) => { $view.innerHTML = `<section class="card"><p>${esc(err.message)}</p></section>`; });
}

function downloadQr(tok, slug) {
  const url = `${location.origin}${location.pathname}#/scan?tok=${tok}`;
  const qr = qrcode(0, 'M');
  qr.addData(url);
  qr.make();
  const a = document.createElement('a');
  a.href = qr.createDataURL(12, 12);
  a.download = `pasaporte-${slug}.png`;
  a.click();
}

route();