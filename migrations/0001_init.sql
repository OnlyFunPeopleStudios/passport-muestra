-- Passport Muestra - esquema inicial (V0.1)
-- D1 (SQLite). UNIQUE(visitor_id, stand_id) garantiza anti-duplicados a nivel de base de datos.

CREATE TABLE IF NOT EXISTS stands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  course TEXT,
  description TEXT,
  area TEXT,
  flag TEXT NOT NULL DEFAULT '🏳️',
  is_published INTEGER NOT NULL DEFAULT 1,
  token TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS visitors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  token TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor_id INTEGER NOT NULL REFERENCES visitors(id),
  stand_id INTEGER NOT NULL REFERENCES stands(id),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  is_hidden INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(visitor_id, stand_id)
);

CREATE INDEX IF NOT EXISTS idx_visits_stand ON visits(stand_id);
CREATE INDEX IF NOT EXISTS idx_visits_visitor ON visits(visitor_id);