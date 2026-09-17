// Passport Muestra - API (Cloudflare Worker + D1)
// V0.3: mismo motor, distinto evento. Configuración del evento + Centro de Mando.
// Se mantiene V0.1 (visitas) y V0.2 (evaluaciones). Admin opcional con contraseña.

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
const text = (data, headers = { 'content-type': 'text/plain; charset=utf-8' }) => new Response(data, { headers });

const COMMENT_MAX = 200;
// Filtro básico de lenguaje inapropiado (censura simple, no IA).
const BAD_WORDS =
  /\b(?:put[oa]s?|bolud[oa]s?|pelotud[oa]s?|forr[oa]s?|concha|reconcha|tarad[oa]s?|pendej[oa]s?|estupid[oa]s?|gilipollas|zorr[oa]s?|idiot[oa]s?|imbecil|mierda|chot[oa]s?|pija|hdp)\b/i;

const sanitizeName = (name) => {
  const n = String(name ?? '').trim();
  return n.length > 40 ? n.slice(0, 40) : n;
};

// Valida y limpia un comentario. Devuelve '' si no hay comentario válido.
function sanitizeComment(raw) {
  if (raw == null) return '';
  const trimmed = String(raw).trim();
  if (trimmed.length > COMMENT_MAX) return '__TOO_LONG__';
  return trimmed.replace(BAD_WORDS, '***');
}

// ---------- Configuración del evento ----------

const STAMP_STYLES = ['circular', 'redondo', 'estampilla', 'cuadrado'];
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const DATA_URL_RE = /^data:image\/(?:png|webp|jpeg|svg\+xml);base64,[A-Za-z0-9+/=]+$/;
const LOGO_MAX = 300_000; // ~225 KB en base64

const DEFAULTS = {
  event_name: 'Muestra Escolar 2026',
  event_subtitle: 'Recorré los stands y completá tu pasaporte',
  institution_name: '',
  description: '',
  primary_color: '#0f4c81',
  secondary_color: '#e8b54d',
  accent_color: '#d64545',
  background_color: '#f7f3ea',
  text_color: '#22303c',
  text_secondary_color: '#6b7a86',
  stamp_style: 'circular',
  texts: {
    welcome_text: 'Recorré los stands, sellá tu pasaporte y contanos qué te pareció.',
    button_text: 'Crear mi pasaporte',
    footer_text: '',
    name_label: 'Tu nombre o apodo',
    create_anon_hint: 'Sin nombre = modo anónimo 🕶️',
    passport_title: 'Mi pasaporte',
    scan_title: 'Escanear stand',
    scan_note: 'Apuntá la cámara al QR del stand.',
    visit_ok: 'Visita registrada',
    already_visited: 'Este stand ya forma parte de tu pasaporte.',
    not_evaluated: 'Evaluá el stand cuando quieras.',
    eval_question: '¿Cómo te gustó este proyecto?',
    comment_label: '¿Querés dejar un comentario?',
    submit_eval: 'Enviar',
    eval_saved: '✓ Evaluación guardada',
    progress_suffix: 'stands visitados',
    completed: '¡Pasaporte completo! ¡Felicitaciones!',
  },
};

const cleanText = (v, max) => {
  const s = String(v ?? '').trim();
  return s.length > max ? s.slice(0, max) : s;
};

function cleanConfig(cfg) {
  const color = (key) => (COLOR_RE.test(String(cfg?.[key] ?? '')) ? cfg[key] : DEFAULTS[key]);
  const texts = { ...DEFAULTS.texts };
  for (const key of Object.keys(DEFAULTS.texts)) {
    const v = String(cfg?.texts?.[key] ?? '').trim();
    if (v) texts[key] = v.slice(0, 300);
  }
  let logo = null;
  const raw = String(cfg?.logo ?? '');
  if (raw && raw.length <= LOGO_MAX && DATA_URL_RE.test(raw)) logo = raw;
  return {
    event_name: cleanText(cfg?.event_name, 80) || DEFAULTS.event_name,
    event_subtitle: cleanText(cfg?.event_subtitle, 120),
    institution_name: cleanText(cfg?.institution_name, 120),
    description: cleanText(cfg?.description, 500),
    logo,
    primary_color: color('primary_color'),
    secondary_color: color('secondary_color'),
    accent_color: color('accent_color'),
    background_color: color('background_color'),
    text_color: color('text_color'),
    text_secondary_color: color('text_secondary_color'),
    stamp_style: STAMP_STYLES.includes(cfg?.stamp_style) ? cfg.stamp_style : 'circular',
    texts,
  };
}

async function getConfig(db) {
  const row = await db.prepare('SELECT * FROM event_config WHERE id = 1').first();
  if (!row) return { ...DEFAULTS, texts: { ...DEFAULTS.texts } };
  let cfg = { ...row, texts: {} };
  try {
    cfg.texts = JSON.parse(row.texts_json || '{}');
  } catch {
    cfg.texts = {};
  }
  return cleanConfig(cfg);
}

// ---------- Auth admin (contraseña persistente + sesión) ----------

const COOKIE = 'admin_session';
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const PBKDF2_ITERATIONS = 210000;

const b64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

function cookieValue(req, name) {
  const m = req.headers.get('cookie')?.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

async function pbkdf2(password, saltB64, iterations) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: unb64(saltB64), iterations },
    key,
    256
  );
  return b64(bits);
}

function timingSafe(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const getAuth = (db) => db.prepare('SELECT * FROM admin_auth WHERE id = 1').first();

// Válida si coincide con la contraseña guardada o con ADMIN_PASSWORD (arranque/recuperación).
async function verifyPassword(db, env, password) {
  if (!password) return false;
  const auth = await getAuth(db);
  if (auth?.password_hash && auth?.salt) {
    if (timingSafe(await pbkdf2(password, auth.salt, auth.iterations || PBKDF2_ITERATIONS), auth.password_hash)) return true;
  }
  return Boolean(env.ADMIN_PASSWORD) && timingSafe(password, env.ADMIN_PASSWORD);
}

async function setPassword(db, password) {
  const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  await db
    .prepare(
      `UPDATE admin_auth SET password_hash = ?, salt = ?, iterations = ?,
              session_token = NULL, session_expires = NULL, updated_at = datetime('now') WHERE id = 1`
    )
    .bind(hash, salt, PBKDF2_ITERATIONS)
    .run();
}

async function startSession(db) {
  const token = b64(crypto.getRandomValues(new Uint8Array(32)));
  const expires = Date.now() + SESSION_MS;
  await db
    .prepare("UPDATE admin_auth SET session_token = ?, session_expires = ?, updated_at = datetime('now') WHERE id = 1")
    .bind(token, expires)
    .run();
  return { token, expires };
}

const endSession = (db) =>
  db.prepare('UPDATE admin_auth SET session_token = NULL, session_expires = NULL WHERE id = 1').run();

// Punto único de control: todo /api/admin/* (salvo login/logout) pasa por acá.
async function requireAdmin(req, db) {
  const token = cookieValue(req, COOKIE);
  if (!token) return false;
  const auth = await getAuth(db);
  return Boolean(auth?.session_token) && Number(auth.session_expires) > Date.now() && timingSafe(token, auth.session_token);
}

const sessionCookie = (token, expires, secure) =>
  `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor((expires - Date.now()) / 1000)}${secure ? '; Secure' : ''}`;
const clearCookie = (secure) => `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`;

// ---------- CSV ----------

const csvCell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const csv = (rows) => '\uFEFF' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
const csvResponse = (rows, filename) =>
  new Response(csv(rows), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
    },
  });

// ---------- Consultas compartidas ----------

async function passport(db, visitorToken) {
  const visitor = await db
    .prepare('SELECT id, name, token FROM visitors WHERE token = ?')
    .bind(visitorToken)
    .first();
  if (!visitor) return { status: 404, error: 'pasaporte no encontrado' };
  const { results: visits } = await db
    .prepare(
      `SELECT v.stand_id, v.rating, v.comment, v.created_at,
              s.name AS stand_name, s.course, s.flag, s.stamp_icon, s.stamp_color
       FROM visits v JOIN stands s ON s.id = v.stand_id
       WHERE v.visitor_id = ? ORDER BY v.id`
    )
    .bind(visitor.id)
    .all();
  const { results: stands } = await db
    .prepare('SELECT id FROM stands WHERE is_published = 1')
    .all();
  return {
    visitor: { id: visitor.id, name: visitor.name, token: visitor.token },
    visits,
    total_stands: stands.length,
  };
}

async function standStats(db) {
  return (
    await db
      .prepare(
        `SELECT s.id, s.slug, s.name, s.course, s.description, s.area, s.flag, s.token,
                s.stamp_icon, s.stamp_color, s.sort_order, s.is_published,
                COALESCE(v.visits, 0) visits, COALESCE(v.evals, 0) evals,
                v.avg_rating, COALESCE(v.comments, 0) comments
         FROM stands s
         LEFT JOIN (
           SELECT stand_id, COUNT(*) visits, COUNT(rating) evals,
                  ROUND(AVG(rating), 2) avg_rating, COUNT(comment) comments
           FROM visits GROUP BY stand_id
         ) v ON v.stand_id = s.id
         ORDER BY s.sort_order, s.id`
      )
      .all()
  ).results;
}

// ---------- Router ----------

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;
    const db = env.DB;

    // ---- público: pasaporte del visitante (V0.1 / V0.2) ----

    if (method === 'POST' && path === '/api/visitors') {
      const name = sanitizeName((await req.json().catch(() => ({}))).name);
      const token = crypto.randomUUID();
      try {
        const { meta } = await db
          .prepare('INSERT INTO visitors (name, token) VALUES (?, ?)')
          .bind(name, token)
          .run();
        return json({ visitor: { id: Number(meta.last_row_id), name, token } }, 201);
      } catch (err) {
        return json({ error: 'no se pudo crear el pasaporte' }, 500);
      }
    }

    if (method === 'GET' && path === '/api/stands') {
      const { results } = await db
        .prepare(
          `SELECT id, slug, name, course, description, area, flag, token, stamp_icon, stamp_color
           FROM stands WHERE is_published = 1 ORDER BY sort_order, id`
        )
        .all();
      return json({ stands: results });
    }

    if (method === 'GET' && path === '/api/config') {
      return json({ config: await getConfig(db) });
    }

    if (method === 'GET' && path === '/api/passport') {
      const data = await passport(db, url.searchParams.get('vt') ?? '');
      return data.status === 404 ? json(data, 404) : json(data);
    }

    if (method === 'POST' && path === '/api/visits') {
      const body = await req.json().catch(() => ({}));
      const visitor = await db
        .prepare('SELECT id, token FROM visitors WHERE token = ?')
        .bind(String(body.vt ?? ''))
        .first();
      if (!visitor) return json({ error: 'pasaporte no encontrado' }, 404);
      const stand = await db
        .prepare('SELECT id, name, flag, token FROM stands WHERE token = ? AND is_published = 1')
        .bind(String(body.tok ?? ''))
        .first();
      if (!stand) return json({ error: 'stand no encontrado' }, 404);
      try {
        await db
          .prepare('INSERT INTO visits (visitor_id, stand_id) VALUES (?, ?)')
          .bind(visitor.id, stand.id)
          .run();
      } catch (err) {
        if (/UNIQUE constraint/i.test(err.message)) {
          const existing = await db
            .prepare(
              `SELECT v.rating, v.comment, v.created_at,
                      s.name AS stand_name, s.flag, s.id AS stand_id
               FROM visits v JOIN stands s ON s.id = v.stand_id
               WHERE v.visitor_id = ? AND v.stand_id = ?`
            )
            .bind(visitor.id, stand.id)
            .first();
          return json({ error: 'Este stand ya forma parte de tu pasaporte.', already: true, visit: existing }, 409);
        }
        return json({ error: 'no se pudo registrar la visita' }, 500);
      }
      const data = await passport(db, visitor.token);
      data.visit = { stand_id: stand.id, stand_name: stand.name, flag: stand.flag };
      return json(data, 201);
    }

    if (method === 'POST' && path === '/api/evaluate') {
      const body = await req.json().catch(() => ({}));
      const rating = body.rating;
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return json({ error: 'La puntuación debe ser un número entero entre 1 y 5.' }, 400);
      }
      const comment = sanitizeComment(body.comment);
      if (comment === '__TOO_LONG__') {
        return json({ error: `El comentario no puede superar los ${COMMENT_MAX} caracteres.` }, 400);
      }
      const visitor = await db
        .prepare('SELECT id, token FROM visitors WHERE token = ?')
        .bind(String(body.vt ?? ''))
        .first();
      if (!visitor) return json({ error: 'pasaporte no encontrado' }, 404);
      const stand = await db
        .prepare('SELECT id, name, flag, token FROM stands WHERE token = ? AND is_published = 1')
        .bind(String(body.tok ?? ''))
        .first();
      if (!stand) return json({ error: 'stand no encontrado' }, 404);
      const visit = await db
        .prepare('SELECT id FROM visits WHERE visitor_id = ? AND stand_id = ?')
        .bind(visitor.id, stand.id)
        .first();
      if (!visit) return json({ error: 'Primero visitá el stand para poder evaluarlo.' }, 404);

      await db
        .prepare('UPDATE visits SET rating = ?, comment = ? WHERE id = ?')
        .bind(rating, comment || null, visit.id)
        .run();
      const data = await passport(db, visitor.token);
      data.evaluated = { stand_id: stand.id, stand_name: stand.name, flag: stand.flag };
      return json(data);
    }

    // ---- admin -----------

    if (method === 'POST' && path === '/api/admin/login') {
      const { password } = await req.json().catch(() => ({}));
      if (!(await verifyPassword(db, env, String(password ?? '')))) {
        return json({ error: 'Contraseña incorrecta.' }, 401);
      }
      const { token, expires } = await startSession(db);
      const res = json({ ok: true });
      res.headers.set('set-cookie', sessionCookie(token, expires, url.protocol === 'https:'));
      return res;
    }

    // Logout siempre responde 200: limpia la sesión del servidor y la cookie.
    if (method === 'POST' && path === '/api/admin/logout') {
      await endSession(db);
      const res = json({ ok: true });
      res.headers.set('set-cookie', clearCookie(url.protocol === 'https:'));
      return res;
    }

    if (path.startsWith('/api/admin') && !(await requireAdmin(req, db))) {
      return json({ error: 'no autorizado' }, 401);
    }

    if (method === 'POST' && path === '/api/admin/password') {
      const b = await req.json().catch(() => ({}));
      if (!(await verifyPassword(db, env, String(b.current ?? '')))) {
        return json({ error: 'La contraseña actual no es correcta.' }, 400);
      }
      const next = String(b.next ?? '');
      if (next.length < 8) return json({ error: 'La nueva contraseña debe tener al menos 8 caracteres.' }, 400);
      if (next !== String(b.confirm ?? '')) return json({ error: 'Las contraseñas nuevas no coinciden.' }, 400);
      await setPassword(db, next); // invalida la sesión actual
      const res = json({ ok: true, relogin: true });
      res.headers.set('set-cookie', clearCookie(url.protocol === 'https:'));
      return res;
    }

    if (method === 'GET' && path === '/api/admin/config') {
      return json({ config: await getConfig(db) });
    }

    if (method === 'PUT' && path === '/api/admin/config') {
      const body = await req.json().catch(() => ({}));
      const c = cleanConfig(body.config);
      await db
        .prepare(
          `UPDATE event_config SET event_name = ?, event_subtitle = ?, institution_name = ?, description = ?,
                  logo = ?, primary_color = ?, secondary_color = ?, accent_color = ?, background_color = ?,
                  text_color = ?, text_secondary_color = ?, stamp_style = ?, texts_json = ?,
                  updated_at = datetime('now') WHERE id = 1`
        )
        .bind(
          c.event_name, c.event_subtitle, c.institution_name, c.description,
          c.logo, c.primary_color, c.secondary_color, c.accent_color, c.background_color,
          c.text_color, c.text_secondary_color, c.stamp_style, JSON.stringify(c.texts)
        )
        .run();
      if (body?.clearLogo) {
        await db.prepare('UPDATE event_config SET logo = NULL, updated_at = datetime(\'now\') WHERE id = 1').run();
      }
      return json({ ok: true, config: await getConfig(db) });
    }

    if (method === 'GET' && path === '/api/admin/dashboard') {
      const tot = await db
        .prepare(
          `SELECT
             (SELECT COUNT(*) FROM visitors) AS visitors,
             (SELECT COUNT(*) FROM visits) AS visits,
             (SELECT COUNT(*) FROM stands WHERE is_published = 1) AS active_stands,
             (SELECT COUNT(*) FROM visits WHERE rating IS NOT NULL) AS evaluations,
             (SELECT ROUND(AVG(rating), 2) FROM visits WHERE rating IS NOT NULL) AS avg_rating,
             (SELECT COUNT(DISTINCT visitor_id) FROM visits WHERE rating IS NOT NULL) AS rated_visitors`
        )
        .first();
      const { results: recent } = await db
        .prepare(
          `SELECT v.rating, v.comment, v.created_at, v.is_hidden,
                  s.name AS stand_name, s.flag AS stand_flag,
                  COALESCE(vis.name, 'Anónimo') AS visitor_name
           FROM visits v JOIN stands s ON s.id = v.stand_id
           LEFT JOIN visitors vis ON vis.id = v.visitor_id
           ORDER BY v.id DESC LIMIT 12`
        )
        .all();
      return json({
        totals: tot,
        pct_evaluated_visitors: tot.visitors ? Math.round((tot.rated_visitors / tot.visitors) * 100) : 0,
        recent,
        stands: await standStats(db),
      });
    }

    if (method === 'GET' && path === '/api/admin/stands') {
      return json({ stands: await standStats(db) });
    }

    if (method === 'POST' && path === '/api/admin/stands') {
      const b = await req.json().catch(() => ({}));
      const name = cleanText(b.name, 60);
      if (!name) return json({ error: 'El stand necesita un nombre.' }, 400);
      const slug = (name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'stand') + '-' + Date.now().toString(36);
      const token = crypto.randomUUID();
      const { meta } = await db
        .prepare(
          `INSERT INTO stands (slug, name, course, description, area, flag, token, is_published, stamp_icon, stamp_color, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          slug, name, cleanText(b.course, 60), cleanText(b.description, 300), cleanText(b.area, 60),
          cleanText(b.flag, 4) || '🌍', token, b.is_published === false ? 0 : 1,
          cleanText(b.stamp_icon, 8) || null, String(b.stamp_color ?? ''), Number(b.sort_order) || 0
        )
        .run();
      return json({ ok: true, stand: { id: Number(meta.last_row_id), slug, name, token } }, 201);
    }

    let m = path.match(/^\/api\/admin\/stands\/(\d+)(?:\/(token))?$/);
    if (m) {
      const id = Number(m[1]);
      if (method === 'PUT' && !m[2]) {
        const b = await req.json().catch(() => ({}));
        const cur = await db.prepare('SELECT name FROM stands WHERE id = ?').bind(id).first();
        if (!cur) return json({ error: 'stand no encontrado' }, 404);
        let name = cur.name;
        if (typeof b.name === 'string') {
          name = cleanText(b.name, 60);
          if (!name) return json({ error: 'El stand necesita un nombre.' }, 400);
        }
        await db
          .prepare(
            `UPDATE stands SET name = ?, course = ?, description = ?, area = ?, flag = ?,
                    is_published = ?, stamp_icon = ?, stamp_color = ?, sort_order = ? WHERE id = ?`
          )
          .bind(
            name, cleanText(b.course, 60), cleanText(b.description, 300), cleanText(b.area, 60),
            cleanText(b.flag, 4) || '🌍', b.is_published === false ? 0 : 1,
            cleanText(b.stamp_icon, 8) || null, String(b.stamp_color ?? ''), Number(b.sort_order) || 0, id
          )
          .run();
        return json({ ok: true });
      }
      if (method === 'DELETE') {
        // Eliminación lógica: oculta el stand y conserva visitas/evaluaciones.
        await db.prepare('UPDATE stands SET is_published = 0 WHERE id = ?').bind(id).run();
        return json({ ok: true });
      }
      if (method === 'POST' && m[2] === 'token') {
        const token = crypto.randomUUID();
        await db.prepare('UPDATE stands SET token = ? WHERE id = ?').bind(token, id).run();
        return json({ ok: true, token });
      }
    }

    if (method === 'GET' && path === '/api/admin/comments') {
      const { results } = await db
        .prepare(
          `SELECT v.id, v.rating, v.comment, v.created_at, v.is_hidden, v.is_reviewed,
                  s.name AS stand_name, s.flag AS stand_flag,
                  COALESCE(vis.name, 'Anónimo') AS visitor_name
           FROM visits v JOIN stands s ON s.id = v.stand_id
           LEFT JOIN visitors vis ON vis.id = v.visitor_id
           WHERE v.comment IS NOT NULL AND v.comment != ''
           ORDER BY v.id DESC LIMIT 300`
        )
        .all();
      return json({ comments: results });
    }

    m = path.match(/^\/api\/admin\/comments\/(\d+)\/(hide|review|delete)$/);
    if (m && method === 'POST') {
      const id = Number(m[1]);
      const action = m[2];
      if (action === 'delete') {
        // Borra el comentario pero conserva la visita y la valoración.
        await db.prepare('UPDATE visits SET comment = NULL WHERE id = ?').bind(id).run();
      } else if (action === 'hide') {
        const row = await db.prepare('SELECT is_hidden FROM visits WHERE id = ?').bind(id).first();
        if (row) await db.prepare('UPDATE visits SET is_hidden = ? WHERE id = ?').bind(row.is_hidden ? 0 : 1, id).run();
      } else if (action === 'review') {
        const row = await db.prepare('SELECT is_reviewed FROM visits WHERE id = ?').bind(id).first();
        if (row) await db.prepare('UPDATE visits SET is_reviewed = ? WHERE id = ?').bind(row.is_reviewed ? 0 : 1, id).run();
      }
      return json({ ok: true });
    }

    if (method === 'GET' && path === '/api/admin/visitors') {
      const { results: visitors } = await db
        .prepare(
          `SELECT id, name, token, created_at,
                  (SELECT COUNT(*) FROM visits v WHERE v.visitor_id = visitors.id) AS visited,
                  (SELECT MAX(created_at) FROM visits v WHERE v.visitor_id = visitors.id) AS last_activity
           FROM visitors ORDER BY id DESC LIMIT 500`
        )
        .all();
      const { results: stands } = await db.prepare('SELECT COUNT(*) AS n FROM stands WHERE is_published = 1').all();
      return json({ visitors, total_stands: stands[0]?.n ?? 0 });
    }

    if (method === 'GET' && path === '/api/admin/export/visitas.csv') {
      const { results } = await db
        .prepare(
          `SELECT v.id, v.rating, v.comment, v.created_at,
                  vis.id AS visitor_id, COALESCE(vis.name, 'Anónimo') AS visitor_name, s.name AS stand_name
           FROM visits v JOIN stands s ON s.id = v.stand_id
           LEFT JOIN visitors vis ON vis.id = v.visitor_id
           ORDER BY v.id`
        )
        .all();
      const rows = [['id', 'visitante_id', 'visitante', 'stand', 'fecha', 'rating', 'comentario']];
      for (const v of results) {
        rows.push([v.id, v.visitor_id, v.visitor_name, v.stand_name, v.created_at, v.rating ?? '', v.comment ?? '']);
      }
      return csvResponse(rows, 'visitas.csv');
    }

    if (method === 'GET' && path === '/api/admin/export/summary.csv') {
      const rows = [['stand', 'curso', 'visitas', 'evaluaciones', 'promedio', 'comentarios', 'publicado']];
      for (const s of await standStats(db)) {
        rows.push([
          s.name, s.course ?? '', s.visits ?? 0, s.evals ?? 0, s.avg_rating ?? '', s.comments ?? 0, s.is_published ? 'si' : 'no',
        ]);
      }
      return csvResponse(rows, 'resumen.csv');
    }

    // ---- admin UI ----
    if (method === 'GET' && (path === '/admin' || path === '/admin/')) {
      return env.ASSETS.fetch(new Request(new URL('/admin/index.html', req.url), req));
    }

    return env.ASSETS.fetch(req);
  },
};