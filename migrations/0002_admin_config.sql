-- Passport Muestra - V0.3: configuración del evento (mismo motor, distinto evento)
-- Una sola fila activa (id = 1). Los textos extra viven en texts_json.

CREATE TABLE IF NOT EXISTS event_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  event_name TEXT NOT NULL DEFAULT '',
  event_subtitle TEXT NOT NULL DEFAULT '',
  institution_name TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  logo TEXT,
  primary_color TEXT NOT NULL DEFAULT '#0f4c81',
  secondary_color TEXT NOT NULL DEFAULT '#e8b54d',
  accent_color TEXT NOT NULL DEFAULT '#d64545',
  background_color TEXT NOT NULL DEFAULT '#f7f3ea',
  text_color TEXT NOT NULL DEFAULT '#22303c',
  text_secondary_color TEXT NOT NULL DEFAULT '#6b7a86',
  stamp_style TEXT NOT NULL DEFAULT 'circular',
  texts_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO event_config (id) VALUES (1);

-- Personalización por stand (sello, color, orden)
ALTER TABLE stands ADD COLUMN stamp_icon TEXT;
ALTER TABLE stands ADD COLUMN stamp_color TEXT;
ALTER TABLE stands ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

-- Moderación de comentarios (revisado: no elimina la valoración)
ALTER TABLE visits ADD COLUMN is_reviewed INTEGER NOT NULL DEFAULT 0;