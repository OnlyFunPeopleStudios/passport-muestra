-- V0.3.1: autenticación del Centro de Mando con contraseña persistente y sesión.
-- Una única fila (id = 1). No guarda texto plano: solo hash PBKDF2 + salt.
CREATE TABLE IF NOT EXISTS admin_auth (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  password_hash TEXT,
  salt TEXT,
  iterations INTEGER NOT NULL DEFAULT 210000,
  session_token TEXT,
  session_expires INTEGER,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO admin_auth (id) VALUES (1);
