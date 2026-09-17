// Passport Muestra - API (Cloudflare Worker + D1)
// V0.1: visitantes, stands, visitas con anti-duplicado UNIQUE(visitor_id, stand_id).

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });

const sanitizeName = (name) => {
  const n = String(name ?? '').trim();
  return n.length > 40 ? n.slice(0, 40) : n;
};

async function passport(db, visitorToken) {
  const visitor = await db
    .prepare('SELECT id, name, token FROM visitors WHERE token = ?')
    .bind(visitorToken)
    .first();
  if (!visitor) return { status: 404, error: 'pasaporte no encontrado' };
  const { results: visits } = await db
    .prepare(
      `SELECT v.stand_id, v.rating, v.comment, v.created_at,
              s.name AS stand_name, s.course, s.flag
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

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;
    const db = env.DB;

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
      // Incluye token: el token de un stand es tan público como el QR impreso.
      // La moderación/admin con contraseña llega en V0.3.
      const { results } = await db
        .prepare(
          'SELECT id, slug, name, course, description, area, flag, token FROM stands WHERE is_published = 1 ORDER BY id'
        )
        .all();
      return json({ stands: results });
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
          return json({ error: 'Este stand ya forma parte de tu pasaporte.', already: true }, 409);
        }
        return json({ error: 'no se pudo registrar la visita' }, 500);
      }
      const data = await passport(db, visitor.token);
      data.visit = { stand_id: stand.id, stand_name: stand.name, flag: stand.flag };
      return json(data, 201);
    }

    return env.ASSETS.fetch(req);
  },
};