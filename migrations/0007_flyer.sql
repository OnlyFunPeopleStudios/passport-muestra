-- V1.1: flyer / material por stand (link externo o imagen) cargado por el admin.
-- flyer_url: link (Drive, Canva, YouTube, etc.). flyer_image: dataURL comprimido.
-- No es autenticación: solo contenido informativo del stand.
ALTER TABLE stands ADD COLUMN flyer_url TEXT;
ALTER TABLE stands ADD COLUMN flyer_image TEXT;
