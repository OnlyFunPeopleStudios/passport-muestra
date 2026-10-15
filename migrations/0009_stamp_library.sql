-- V1.3: Biblioteca de sellos reutilizables.
-- Un sello (imagen + forma) se crea una vez y se asigna a varios stands.
-- stands.stamp_id referencia stamps(id). Si es NULL, el stand usa su sello
-- propio (stamp_type/stamp_image/stamp_style) como antes: migración aditiva.

CREATE TABLE IF NOT EXISTS stamps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL,
  style TEXT NOT NULL DEFAULT 'circular',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

ALTER TABLE stands ADD COLUMN stamp_id INTEGER;
