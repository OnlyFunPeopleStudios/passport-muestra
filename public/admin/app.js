// Centro de Mando - app admin (vanilla). Evento configurable: mismo motor, distinto evento.
const $main = document.getElementById('main');
const $login = document.getElementById('login');
const $sidebar = document.getElementById('sidebar');

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const flagEmoji = (code) =>
  code && code.length === 2
    ? String.fromCodePoint(...Array.from(code.toUpperCase()).map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
    : code || '🏳️';

let toastTimer;
function toast(msg, type = 'ok') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.className = 'toast hidden'), 2600);
}

async function api(path, opts) {
  const r = await fetch(path, { headers: { 'content-type': 'application/json' }, ...opts });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (r.status === 401) showLogin();
    throw Object.assign(new Error(data.error || 'error (' + r.status + ')'), { status: r.status });
  }
  return data;
}

// ---------- auth ----------
function showLogin() {
  $login.classList.remove('hidden');
  $sidebar.classList.add('hidden');
  $main.classList.add('hidden');
}
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = document.getElementById('login-err');
  err.classList.add('hidden');
  try {
    const r = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: document.getElementById('login-pass').value }),
    });
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      err.textContent = data.error || 'Contraseña incorrecta';
      err.classList.remove('hidden');
      return;
    }
    location.reload();
  } catch (err2) {
    err.textContent = 'No se pudo iniciar sesión';
    err.classList.remove('hidden');
  }
});
document.getElementById('logout').addEventListener('click', async () => {
  await api('/api/admin/logout', { method: 'POST', body: '{}' }).catch(() => {});
  location.reload();
});

// ---------- navegación ----------
const views = { resumen: renderResumen, stands: renderStands, diseno: renderDiseno, comentarios: renderComentarios, visitantes: renderVisitantes, config: renderConfig };
document.querySelectorAll('.sidebar nav a').forEach((a) =>
  a.addEventListener('click', () => setView(a.dataset.view))
);
async function setView(name) {
  document.querySelectorAll('.sidebar nav a').forEach((a) => a.classList.toggle('active', a.dataset.view === name));
  $main.innerHTML = '<p class="muted">Cargando…</p>';
  try {
    await views[name]();
  } catch (err) {
    if (err.status !== 401) toast(err.message, 'bad');
  }
}

const fmt = (ts) => (ts ? String(ts).slice(0, 16).replace('T', ' ') : '—');
const stars = (n) => (n ? '★'.repeat(n) + '☆'.repeat(5 - n) : '—');

// ---------- Resumen ----------
async function renderResumen() {
  const d = await api('/api/admin/dashboard');
  const t = d.totals;
  $main.innerHTML = `
    <div class="toolbar"><h2>Resumen del evento</h2>
      <div class="row"><a class="btn small ghost" href="/api/admin/export/visitas.csv">⬇️ Exportar visitas</a>
      <a class="btn small ghost" href="/api/admin/export/summary.csv">⬇️ Exportar resumen</a></div>
    </div>
    <div class="grid-stats">
      <div class="stat"><b>${t.visitors}</b><span>Visitantes</span></div>
      <div class="stat"><b>${t.visits}</b><span>Sellos aplicados</span></div>
      <div class="stat"><b>${t.active_stands}</b><span>Stands activos</span></div>
      <div class="stat"><b>${t.evaluations}</b><span>Evaluaciones</span></div>
      <div class="stat"><b>${t.avg_rating ?? '—'}</b><span>Promedio ⭐</span></div>
      <div class="stat"><b>${d.pct_evaluated_visitors}%</b><span>Visitantes evaluaron</span></div>
    </div>
    <section class="card">
      <h3>Actividad reciente</h3>
      ${d.recent.length ? d.recent.map((r) => `
        <div class="comment-item">
          <strong>${flagEmoji(r.stand_flag)} ${esc(r.stand_name)}</strong> · ${esc(r.visitor_name)} · <span class="muted small">${fmt(r.created_at)}</span>
          <span class="stars">${stars(r.rating)}</span>
          ${r.comment ? `<p class="quote">"${esc(r.comment)}"</p>` : ''}
        </div>`).join('') : '<p class="muted">Todavía no hay actividad.</p>'}
    </section>
    <section class="card">
      <h3>Stands</h3>
      <table>
        <tr><th>Stand</th><th>Estado</th><th>Visitas</th><th>Eval.</th><th>Prom.</th><th>Coment.</th></tr>
        ${d.stands.map((s) => `
          <tr>
            <td>${flagEmoji(s.flag)} ${esc(s.name)}${s.course ? ` <span class="muted small">· ${esc(s.course)}</span>` : ''}</td>
            <td>${s.is_published ? '<span class="pill on">activo</span>' : '<span class="pill off">inactivo</span>'}</td>
            <td>${s.visits ?? 0}</td><td>${s.evals ?? 0}</td>
            <td>${s.avg_rating ?? '—'}</td><td>${s.comments ?? 0}</td>
          </tr>`).join('')}
      </table>
    </section>`;
}

// ---------- Stands ----------
let editingId = null;
let currentEditingStand = null;
let pendingStandImage = null;

function standFormHtml() {
  return `
    <form id="stand-form" class="card">
      <h3 id="stand-form-title">Nuevo stand</h3>
      <div class="stand-form-layout">
        <div class="stand-form-fields">
          <div class="form-grid">
            <div><label>Nombre *</label><input name="name" id="sf-name" maxlength="60" placeholder="Ej: Tecnología Argentina"></div>
            <div><label>Curso / año</label><input name="course" maxlength="60" placeholder="Ej: 3° A"></div>
            <div><label>Área</label><input name="area" maxlength="60" placeholder="Ej: Tecnología"></div>
            <div><label>País / bandera (ISO, ej: AR)</label><input name="flag" id="sf-flag" maxlength="4" placeholder="AR"></div>
            <div><label>Tipo de sello</label>
              <select name="stamp_type" id="sf-type">
                <option value="flag">Bandera (SVG por código ISO)</option>
                <option value="icon">Icono/emoji</option>
                <option value="image">Imagen personalizada</option>
                <option value="color">Solo color</option>
              </select></div>
            <div><label>Icono del sello (para tipo icon)</label><input name="stamp_icon" id="sf-icon" maxlength="8" placeholder="🌱"></div>
            <div><label>Color del sello</label><input name="stamp_color" id="sf-color" type="color" value="#0f4c81"></div>
            <div><label>Imagen del sello (para tipo image, máx 200 KB)</label>
              <input type="file" name="stamp_image_file" id="sf-file" accept="image/png,image/svg+xml,image/webp,image/jpeg">
              <span class="muted small">Se convertirá a data URL</span></div>
            <div><label>Orden</label><input name="sort_order" type="number" value="0"></div>
            <div><label><input name="is_published" type="checkbox" checked> Activo en la muestra</label></div>
          </div>
          <label>Descripción</label>
          <textarea name="description" maxlength="300" placeholder="Qué van a mostrar…"></textarea>
        </div>
        <div class="stand-form-preview-card">
          <div class="stand-form-preview-label">Vista previa del sello</div>
          <div id="stand-stamp-preview" class="stand-stamp-preview-box"></div>
          <span class="muted small">Se actualiza en tiempo real</span>
        </div>
      </div>
      <div class="row mt-actions"><button class="btn primary" type="submit">Guardar stand</button>
      <button class="btn ghost" type="button" id="stand-reset">Cancelar edición</button></div>
    </form>`;
}

async function renderStands() {
  const { stands } = await api('/api/admin/stands');
  editingId = null;
  currentEditingStand = null;
  pendingStandImage = null;
  $main.innerHTML = `
    <div class="toolbar"><h2>Stands</h2><button class="btn primary small" id="stand-new">+ Nuevo stand</button></div>
    ${standFormHtml()}
    <section class="card">
      <h3>Listado (${stands.length})</h3>
      <table>
        <tr><th>Sello</th><th>Stand</th><th>Estado</th><th>Visitas</th><th>Eval.</th><th>Prom.</th><th>Acciones</th></tr>
        ${stands.map((s) => `
          <tr>
            <td>${window.PassportStamp.render(s, { size: 'small', showStars: false })}</td>
            <td>${esc(s.name)}<span class="muted small">${esc(s.course ?? '')} · ${s.sort_order}</span></td>
            <td>${s.is_published ? '<span class="pill on">activo</span>' : '<span class="pill off">inactivo</span>'}</td>
            <td>${s.visits ?? 0}</td><td>${s.evals ?? 0}</td><td>${s.avg_rating ?? '—'}</td>
            <td>
              <div class="row">
                <button class="btn small" data-act="edit" data-id="${s.id}">✏️ Editar</button>
                <button class="btn small ghost" data-act="toggle" data-id="${s.id}">${s.is_published ? 'Desactivar' : 'Activar'}</button>
                <button class="btn small ghost" data-act="qr" data-id="${s.id}">🖨️ QR</button>
                <button class="btn small accent" data-act="del" data-id="${s.id}">🗑️</button>
              </div>
            </td>
          </tr>`).join('')}
      </table>
      <p class="note">Eliminar oculta el stand pero conserva sus visitas y evaluaciones. Cada QR es único: usá "Descargar" siempre desde acá.</p>
    </section>`;

  const form = document.getElementById('stand-form');
  const previewBox = document.getElementById('stand-stamp-preview');

  function updatePreview() {
    const standData = {
      name: form.name.value || 'Stand',
      flag: form.flag.value || '',
      stamp_type: form.stamp_type.value || 'flag',
      stamp_icon: form.stamp_icon.value || '',
      stamp_color: form.stamp_color.value || '#0f4c81',
      stamp_image: pendingStandImage || currentEditingStand?.stamp_image || null,
    };
    if (previewBox) {
      previewBox.innerHTML = window.PassportStamp.render(standData, { size: 'big' });
    }
  }

  // Escuchar cambios en campos que afectan el sello
  ['sf-name', 'sf-flag', 'sf-type', 'sf-icon', 'sf-color'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', updatePreview);
    document.getElementById(id)?.addEventListener('change', updatePreview);
  });

  const fileInput = document.getElementById('sf-file');
  fileInput?.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file && file.size > 0) {
      if (file.size > 200 * 1024) { toast('Imagen del sello: máximo 200 KB', 'bad'); return; }
      if (!/^image\/(png|svg\+xml|webp|jpeg)$/.test(file.type)) { toast('Formato no permitido (PNG/SVG/WebP/JPG)', 'bad'); return; }
      const reader = new FileReader();
      reader.onload = () => {
        pendingStandImage = reader.result;
        form.stamp_type.value = 'image';
        updatePreview();
      };
      reader.readAsDataURL(file);
    } else {
      pendingStandImage = null;
      updatePreview();
    }
  });

  updatePreview();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const body = Object.fromEntries(formData.entries());
    body.is_published = form.is_published.checked;

    if (pendingStandImage) {
      body.stamp_image = pendingStandImage;
    }
    delete body.stamp_image_file;

    try {
      if (editingId) {
        await api('/api/admin/stands/' + editingId, { method: 'PUT', body: JSON.stringify(body) });
        toast('Stand actualizado');
      } else {
        await api('/api/admin/stands', { method: 'POST', body: JSON.stringify(body) });
        toast('Stand creado');
      }
      form.reset();
      form.is_published.checked = true;
      editingId = null;
      currentEditingStand = null;
      pendingStandImage = null;
      renderStands();
    } catch (err) {
      if (err.status !== 401) toast(err.message, 'bad');
    }
  });

  document.getElementById('stand-new').addEventListener('click', () => {
    form.reset();
    form.is_published.checked = true;
    editingId = null;
    currentEditingStand = null;
    pendingStandImage = null;
    document.getElementById('stand-form-title').textContent = 'Nuevo stand';
    updatePreview();
    form.scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('stand-reset').addEventListener('click', () => {
    form.reset();
    form.is_published.checked = true;
    editingId = null;
    currentEditingStand = null;
    pendingStandImage = null;
    document.getElementById('stand-form-title').textContent = 'Nuevo stand';
    updatePreview();
  });

  $main.querySelectorAll('button[data-act]').forEach((b) =>
    b.addEventListener('click', async () => {
      const id = Number(b.dataset.id);
      const stand = stands.find((s) => s.id === id);
      try {
        if (b.dataset.act === 'edit') {
          editingId = id;
          currentEditingStand = stand;
          pendingStandImage = null;
          document.getElementById('stand-form-title').textContent = 'Editar: ' + stand.name;
          Object.entries({
            name: stand.name, course: stand.course ?? '', area: stand.area ?? '',
            description: stand.description ?? '', flag: stand.flag ?? '',
            stamp_icon: stand.stamp_icon ?? '', stamp_color: stand.stamp_color || '#0f4c81', stamp_type: stand.stamp_type || 'flag', sort_order: stand.sort_order ?? 0,
          }).forEach(([k, v]) => (form[k] ? (form[k].value = v) : null));
          form.is_published.checked = !!stand.is_published;
          updatePreview();
          form.scrollIntoView({ behavior: 'smooth' });
        } else if (b.dataset.act === 'toggle') {
          await api('/api/admin/stands/' + id, { method: 'PUT', body: JSON.stringify({ name: stand.name, is_published: !stand.is_published }) });
          toast(stand.is_published ? 'Stand desactivado' : 'Stand activado');
          renderStands();
        } else if (b.dataset.act === 'qr') {
          downloadQr(stand.token, stand.slug);
        } else if (b.dataset.act === 'del') {
          if (confirm('Ocultar "' + stand.name + '"? Sus visitas y evaluaciones se conservan.')) {
            await api('/api/admin/stands/' + id, { method: 'DELETE' });
            toast('Stand oculto');
            renderStands();
          }
        }
      } catch (err) {
        if (err.status !== 401) toast(err.message, 'bad');
      }
    })
  );
}

function downloadQr(tok, slug) {
  const url = `${location.origin}/#/scan?tok=${tok}`;
  const qr = qrcode(0, 'M');
  qr.addData(url);
  qr.make();
  const a = document.createElement('a');
  a.href = qr.createDataURL(12, 12);
  a.download = `pasaporte-${slug || tok}.png`;
  a.click();
}

// ---------- Diseño y marca ----------
const PRESETS = [
  { n: 'Clásico',         primary: '#0f4c81', secondary: '#e8b54d', accent: '#d64545', background: '#f7f3ea', text: '#22303c', text2: '#6b7a86' },
  { n: 'Bosque',          primary: '#1e5a3a', secondary: '#d9a441', accent: '#b3593a', background: '#f2f6ee', text: '#22302a', text2: '#5c6b60' },
  { n: 'Océano',          primary: '#0e6f8c', secondary: '#f2b84b', accent: '#e2645a', background: '#eef6f8', text: '#22303c', text2: '#5d7380' },
  { n: 'Uva',             primary: '#5e4a9e', secondary: '#e6c04c', accent: '#d65383', background: '#f5f2fa', text: '#2b2437', text2: '#6d6290' },
  { n: 'Tierra',          primary: '#7a4b2a', secondary: '#d6a54f', accent: '#c95d2b', background: '#f7f1e7', text: '#36271d', text2: '#7a6452' },
  { n: 'Noche',           primary: '#1f2733', secondary: '#e8b54d', accent: '#e05b4d', background: '#232b36', text: '#e6eaef', text2: '#9aa5b0' },
];
const TEXT_FIELDS = [
  ['welcome_text', 'Texto de bienvenida'], ['button_text', 'Botón principal'], ['footer_text', 'Pie de página'],
  ['name_label', 'Etiqueta del nombre'], ['create_anon_hint', 'Sugerencia modo anónimo'], ['passport_title', 'Título del pasaporte'],
  ['scan_title', 'Título escanear'], ['scan_note', 'Nota escanear'], ['visit_ok', 'Visita registrada'],
  ['already_visited', 'Ya visitado'], ['not_evaluated', 'Aún sin evaluar'], ['eval_question', 'Pregunta de la evaluación'],
  ['comment_label', 'Etiqueta comentario'], ['submit_eval', 'Botón enviar'], ['eval_saved', 'Evaluación guardada'],
  ['progress_suffix', 'Sufijo progreso'], ['completed', 'Mensaje de pasaporte completo'],
];
let pendingLogo = undefined; // undefined = sin cambios, null = quitar, string = nuevo

async function renderDiseno() {
  const { config: c } = await api('/api/admin/config');
  pendingLogo = undefined;
  const setVal = (ids, val) => ids.forEach((id) => { const el = document.getElementById(id); if (el) el.value = val; });
  $main.innerHTML = `
    <div class="toolbar"><h2>Diseño y marca</h2>
      <button class="btn primary" id="save-diseno">💾 Guardar configuración</button></div>
    <div class="preview-grid">
      <div>
        <fieldset>
          <legend>Identidad del evento</legend>
          <div class="form-grid">
            <div><label>Nombre del evento</label><input id="event_name" maxlength="80"></div>
            <div><label>Subtítulo</label><input id="event_subtitle" maxlength="120"></div>
            <div><label>Institución</label><input id="institution_name" maxlength="120"></div>
            <div><label>Estilo del sello</label>
              <input type="hidden" id="stamp_style" value="${esc(c.stamp_style || 'circular')}">
              <div class="stamp-style-picker" id="style-picker">
                ${['circular', 'redondo', 'estampilla', 'cuadrado'].map(st => `
                  <button type="button" class="stamp-style-card ${c.stamp_style === st ? 'active' : ''}" data-style="${st}">
                    ${window.PassportStamp.render({ name: 'Argentina', flag: 'ar' }, { style: st, size: 'normal', showStars: false })}
                    <span class="stamp-style-name">${st.charAt(0).toUpperCase() + st.slice(1)}</span>
                  </button>
                `).join('')}
              </div>
            </div>
          </div>
          <label>Descripción</label>
          <textarea id="description" maxlength="500"></textarea>
        </fieldset>

        <fieldset>
          <legend>Paleta de colores</legend>
          <div class="preset-row">${PRESETS.map((p, i) => `<button class="preset" data-p="${i}" title="${p.n}" style="background:linear-gradient(135deg, ${p.primary} 0 50%, ${p.secondary} 50%)"></button>`).join('')}</div>
          <div class="form-grid">
            ${[['primary_color', 'Principal'], ['secondary_color', 'Secundario'], ['accent_color', 'Acento'], ['background_color', 'Fondo'], ['text_color', 'Texto'], ['text_secondary_color', 'Texto secundario']].map(([k, n]) => `
              <div><label>${n}</label><div class="row"><input id="${k}" type="color"><input id="${k}_t" maxlength="7" value=""></div></div>`).join('')}
          </div>
        </fieldset>

        <fieldset>
          <legend>Logo del evento</legend>
          <div class="row"><img id="logo-preview" class="logo-preview ${c.logo ? '' : 'hidden'}" alt="logo">
            <div style="flex:1">
              <label>Subir imagen (PNG/SVG/WebP/JPG, máx 200 KB)</label>
              <input type="file" id="logo-file" accept="image/png,image/svg+xml,image/webp,image/jpeg">
              <div class="row"><button class="btn small ghost" id="logo-keep" type="button">No cambiar</button>
              <button class="btn small accent" id="logo-remove" type="button">Quitar</button></div>
            </div>
          </div>
        </fieldset>

        <details open>
          <summary style="cursor:pointer;font-weight:700;margin:10px 0 4px">Textos del evento</summary>
          <div class="form-grid">
            ${TEXT_FIELDS.map(([k, n]) => `<div><label>${n}</label><input id="t_${k}" maxlength="300"></div>`).join('')}
          </div>
        </details>
      </div>

      <div>
        <h3>Vista previa</h3>
        <div id="pv" class="preview-frame">
          <div class="preview-top">
            <span>🛂</span><img class="plogo hidden" data-pv="logo" alt="logo">
            <div><h3 data-pv="name">Evento</h3><p data-pv="subtitle"></p></div>
          </div>
          <div class="preview-body">
            <div class="pv-card">
              <p data-pv="welcome"></p>
              <span class="pv-btn primary" data-pv="btn"></span>
            </div>
            <div class="pv-card">
              <div class="pv-progress"><i></i></div>
              <p class="small" data-pv="progress">1 / 3 <span class="muted">completado</span></p>
              <div class="pv-stamps" data-pv="stamps"></div>
            </div>
          </div>
        </div>
        <p class="note">La vista previa muestra cómo se verá la app pública con esta configuración. Nada cambia hasta tocar "Guardar".</p>
      </div>
    </div>`;

  setVal(['event_name'], c.event_name);
  setVal(['event_subtitle'], c.event_subtitle);
  setVal(['institution_name'], c.institution_name);
  setVal(['description'], c.description);
  setVal(['stamp_style'], c.stamp_style);
  setVal(['primary_color', 'primary_color_t'], c.primary_color);
  setVal(['secondary_color', 'secondary_color_t'], c.secondary_color);
  setVal(['accent_color', 'accent_color_t'], c.accent_color);
  setVal(['background_color', 'background_color_t'], c.background_color);
  setVal(['text_color', 'text_color_t'], c.text_color);
  setVal(['text_secondary_color', 'text_secondary_color_t'], c.text_secondary_color);
  TEXT_FIELDS.forEach(([k]) => setVal(['t_' + k], c.texts[k] || ''));
  if (c.logo && document.getElementById('logo-preview')) {
    const img = document.getElementById('logo-preview');
    img.src = c.logo;
    img.classList.remove('hidden');
  }

  const pv = document.getElementById('pv');
  function paint() {
    const get = (id, fb) => document.getElementById(id)?.value || fb;
    pv.style.setProperty('--color-primary', get('primary_color', '#0f4c81'));
    pv.style.setProperty('--color-secondary', get('secondary_color', '#e8b54d'));
    pv.style.setProperty('--color-accent', get('accent_color', '#d64545'));
    pv.style.setProperty('--color-background', get('background_color', '#f7f3ea'));
    pv.style.setProperty('--color-text', get('text_color', '#22303c'));
    pv.style.setProperty('--color-text-secondary', get('text_secondary_color', '#6b7a86'));
    pv.querySelector('[data-pv="name"]').textContent = get('event_name', 'Evento');
    pv.querySelector('[data-pv="subtitle"]').textContent = get('event_subtitle', '');
    pv.querySelector('[data-pv="welcome"]').textContent = get('t_welcome_text', '');
    pv.querySelector('[data-pv="btn"]').textContent = get('t_button_text', '');
    const style = get('stamp_style', 'circular');
    const stampsContainer = pv.querySelector('[data-pv="stamps"]');
    if (stampsContainer) {
      stampsContainer.innerHTML = `
        ${window.PassportStamp.render({ name: 'Argentina', flag: 'ar' }, { style, size: 'normal', showStars: false })}
        ${window.PassportStamp.render({ name: 'Brasil', flag: 'br' }, { style, size: 'normal', showStars: false })}
        ${window.PassportStamp.render({}, { placeholder: true, style, size: 'normal' })}
      `;
    }
    const logoEl = pv.querySelector('[data-pv="logo"]');
    if (pendingLogo) { logoEl.src = pendingLogo; logoEl.classList.remove('hidden'); }
    else if (pendingLogo === null) logoEl.classList.add('hidden');
    else if (c.logo) { logoEl.src = c.logo; logoEl.classList.remove('hidden'); }
  }
  paint();

  document.querySelectorAll('.stamp-style-card').forEach((card) => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.stamp-style-card').forEach(x => x.classList.remove('active'));
      card.classList.add('active');
      document.getElementById('stamp_style').value = card.dataset.style;
      paint();
    });
  });

  ['event_name', 'event_subtitle', 'institution_name', 'description', 'stamp_style',
    'primary_color', 'secondary_color', 'accent_color', 'background_color', 'text_color', 'text_secondary_color',
    ...TEXT_FIELDS.map(([k]) => 't_' + k)].forEach((id) => {
    const el = document.getElementById(id);
    el.addEventListener('input', paint);
    if (String(id).endsWith('_t')) el.addEventListener('input', paint); // hex text también pinta color
  });
  // hex text ↔ color sync
  [['primary_color', 'primary_color_t'], ['secondary_color', 'secondary_color_t'], ['accent_color', 'accent_color_t'],
   ['background_color', 'background_color_t'], ['text_color', 'text_color_t'], ['text_secondary_color', 'text_secondary_color_t']]
    .forEach(([k, t]) => {
      document.getElementById(t).addEventListener('input', () => { document.getElementById(k).value = document.getElementById(t).value; paint(); });
    });
  document.querySelectorAll('.preset').forEach((p) =>
    p.addEventListener('click', () => {
      const pr = PRESETS[Number(p.dataset.p)];
      Object.entries({ primary_color: pr.primary, secondary_color: pr.secondary, accent_color: pr.accent,
        background_color: pr.background, text_color: pr.text, text_secondary_color: pr.text2 })
        .forEach(([k, v]) => { document.getElementById(k).value = v; document.getElementById(k + '_t').value = v; });
      paint();
    })
  );

  const file = document.getElementById('logo-file');
  file.addEventListener('change', () => {
    const f = file.files[0];
    if (!f) return;
    if (!/^image\/(png|svg\+xml|webp|jpeg)$/.test(f.type)) return toast('Formato no permitido', 'bad');
    if (f.size > 200 * 1024) return toast('Máximo 200 KB', 'bad');
    const r = new FileReader();
    r.onload = () => {
      pendingLogo = r.result;
      const img = document.getElementById('logo-preview');
      img.src = pendingLogo; img.classList.remove('hidden');
      paint();
    };
    r.readAsDataURL(f);
  });
  document.getElementById('logo-keep').addEventListener('click', () => { pendingLogo = undefined; file.value = ''; paint(); });
  document.getElementById('logo-remove').addEventListener('click', () => {
    pendingLogo = null; file.value = '';
    document.getElementById('logo-preview').classList.add('hidden');
    paint();
  });

  document.getElementById('save-diseno').addEventListener('click', async () => {
    const colors = {};
    ['primary_color', 'secondary_color', 'accent_color', 'background_color', 'text_color', 'text_secondary_color']
      .forEach((k) => { colors[k] = document.getElementById(k).value; });
    const texts = {};
    TEXT_FIELDS.forEach(([k]) => { texts[k] = document.getElementById('t_' + k).value; });
    const config = {
      event_name: document.getElementById('event_name').value,
      event_subtitle: document.getElementById('event_subtitle').value,
      institution_name: document.getElementById('institution_name').value,
      description: document.getElementById('description').value,
      stamp_style: document.getElementById('stamp_style').value,
      ...colors, texts,
      logo: pendingLogo === undefined ? (c.logo ?? null) : (pendingLogo ?? null),
    };
    try {
      const res = await api('/api/admin/config', { method: 'PUT', body: JSON.stringify({ config }) });
      pendingLogo = undefined;
      document.getElementById('side-event').textContent = res.config.event_name;
      toast('Configuración guardada. La app pública ya la está usando.');
      renderDiseno();
    } catch (err) {
      if (err.status !== 401) toast('Error al guardar: ' + err.message, 'bad');
    }
  });
}

// ---------- Comentarios ----------
async function renderComentarios() {
  const { comments } = await api('/api/admin/comments');
  const visible = comments.length;
  const hidden = comments.filter((x) => x.is_hidden).length;
  $main.innerHTML = `
    <div class="toolbar"><h2>Comentarios</h2><span class="muted small">${visible} totales · ${hidden} ocultos</span></div>
    <section class="card">
      ${comments.length ? comments.map((x) => `
        <div class="comment-item">
          <div class="row">
            <strong>${flagEmoji(x.stand_flag)} ${esc(x.stand_name)}</strong>
            <span class="muted small">${esc(x.visitor_name)} · ${fmt(x.created_at)}</span>
            <span class="stars">${stars(x.rating)}</span>
            ${x.is_hidden ? '<span class="pill off">oculto</span>' : ''}
            ${x.is_reviewed ? '<span class="pill gold">revisado</span>' : ''}
          </div>
          <p class="quote">"${esc(x.comment)}"</p>
          <div class="row">
            <button class="btn small" data-id="${x.id}" data-act="review">${x.is_reviewed ? '↩ No revisado' : '✅ Revisado'}</button>
            <button class="btn small ghost" data-id="${x.id}" data-act="hide">${x.is_hidden ? '👁️ Mostrar' : '🙈 Ocultar'}</button>
            <button class="btn small accent" data-id="${x.id}" data-act="delete">🗑️ Borrar</button>
          </div>
        </div>`).join('')
        : '<p class="muted">Todavía no hay comentarios.</p>'}
    </section>`;
  $main.querySelectorAll('button[data-act]').forEach((b) =>
    b.addEventListener('click', async () => {
      try {
        await api(`/api/admin/comments/${b.dataset.id}/${b.dataset.act}`, { method: 'POST', body: '{}' });
        toast(b.dataset.act === 'delete' ? 'Comentario borrado (valoración intacta)' : 'Actualizado');
        renderComentarios();
      } catch (err) { if (err.status !== 401) toast(err.message, 'bad'); }
    })
  );
}

// ---------- Visitantes ----------
async function renderVisitantes() {
  const { visitors, total_stands } = await api('/api/admin/visitors');
  const prog = (v) => (total_stands ? Math.round((v / total_stands) * 100) : 0);
  $main.innerHTML = `
    <div class="toolbar"><h2>Visitantes</h2><span class="muted small">${visitors.length} registrados · ${total_stands} stands activos</span></div>
    <section class="card">
      <table>
        <tr><th>#</th><th>Nombre</th><th>Creado</th><th>Sellos</th><th>Progreso</th><th>Última actividad</th></tr>
        ${visitors.map((v) => `
          <tr>
            <td>${v.id}</td>
            <td>${v.name ? esc(v.name) : '<span class="muted">Anónimo</span>'}</td>
            <td class="small">${fmt(v.created_at)}</td>
            <td>${v.visited} / ${total_stands}</td>
            <td class="small">${prog(v.visited)}%</td>
            <td class="small">${fmt(v.last_activity)}</td>
          </tr>`).join('')}
      </table>
    </section>`;
}

// ---------- Configuración ----------
async function renderConfig() {
  const { config: c } = await api('/api/admin/config');
  $main.innerHTML = `
    <div class="toolbar"><h2>Configuración</h2></div>
    <section class="card">
      <h3>Seguridad</h3>
      <p class="muted small">Cambiá la contraseña del Centro de Mando (por ejemplo, antes de entregarle el panel a otra persona). Se guarda cifrada: nunca en texto plano.</p>
      <form id="pw-form" class="form-grid" style="max-width:440px">
        <div><label>Contraseña actual</label><input type="password" name="current" autocomplete="current-password"></div>
        <div><label>Nueva contraseña (mínimo 8 caracteres)</label><input type="password" name="next" minlength="8" autocomplete="new-password"></div>
        <div><label>Repetir nueva contraseña</label><input type="password" name="confirm" minlength="8" autocomplete="new-password"></div>
        <div><button class="btn primary" type="submit">Cambiar contraseña</button></div>
      </form>
      <p class="note">Al cambiarla se cierran las sesiones abiertas, incluida esta. Si olvidás la contraseña, se recupera con la clave de emergencia <code>ADMIN_PASSWORD</code> del servidor (no se muestra acá).</p>
    </section>
    <section class="card">
      <h3>Exportar datos</h3>
      <div class="row">
        <a class="btn" href="/api/admin/export/visitas.csv">⬇️ Visitas (CSV)</a>
        <a class="btn ghost" href="/api/admin/export/summary.csv">⬇️ Resumen por stand (CSV)</a>
      </div>
      <p class="note">Los CSV abren en Excel/Sheets con el texto en UTF-8. Exportan todo el historial con sellos, valoraciones y comentarios.</p>
    </section>
    <section class="card">
      <h3>Sello y personalización por stand</h3>
      <p class="muted small">Desde "Stands" podés cambiar el icono y color del sello de cada stand. El estilo general (circular, estampilla, etc.) se elige en "Diseño y marca".</p>
    </section>
    <section class="card">
      <h3>Estado</h3>
      <p class="small">Evento actual: <strong>${esc(c.event_name)}</strong> · estilo del sello: <strong>${esc(c.stamp_style)}</strong> · actualizado ${fmt(c.updated_at)}</p>
    </section>`;

  document.getElementById('pw-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target).entries());
    if (body.next.length < 8) return toast('La nueva contraseña debe tener al menos 8 caracteres.', 'bad');
    if (body.next !== body.confirm) return toast('Las contraseñas nuevas no coinciden.', 'bad');
    try {
      await api('/api/admin/password', { method: 'POST', body: JSON.stringify(body) });
      toast('Contraseña actualizada correctamente.');
      showLogin();
    } catch (err) {
      if (err.status !== 401) toast(err.message, 'bad');
    }
  });
}

// ---------- inicio ----------
async function loadBranding() {
  try {
    const { config } = await fetch('/api/config').then((r) => r.json());
    document.getElementById('side-event').textContent = config.event_name;
    document.getElementById('login-event').textContent =
      config.event_name + (config.event_subtitle ? ' · ' + config.event_subtitle : '');
    if (config.logo) {
      const img = document.getElementById('login-logo');
      img.src = config.logo;
      img.classList.remove('hidden');
      document.getElementById('login-icon').classList.add('hidden');
    }
  } catch {}
}

(async () => {
  await loadBranding();
  try {
    const { config } = await api('/api/admin/config');
    document.getElementById('side-event').textContent = config.event_name;
    $login.classList.add('hidden');
    $sidebar.classList.remove('hidden');
    $main.classList.remove('hidden');
    setView('resumen');
  } catch (err) {
    if (err.status !== 401) toast(err.message, 'bad');
  }
})();