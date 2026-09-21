-- V0.7: palabra secreta por stand (vía alternativa al QR) + método de visita.
-- No destructiva: solo agrega columnas. Las visitas existentes quedan como 'qr'.
-- secret_word: palabra que se muestra físicamente en el stand. Vacía/NULL = esa vía
-- no permite registrar el stand. No es un mecanismo de seguridad fuerte.

ALTER TABLE stands ADD COLUMN secret_word TEXT;

ALTER TABLE visits ADD COLUMN visit_method TEXT NOT NULL DEFAULT 'qr';
