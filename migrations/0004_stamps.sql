-- V0.4: Sistema de sellos SVG/imagen
-- Extiende stands con tipo de sello y imagen personalizada.
-- stamp_type: 'flag' (bandera SVG por código ISO), 'icon' (emoji/icono), 'image' (imagen subida), 'color' (solo color)
-- stamp_image: data URL base64 (SVG/PNG/WebP/JPG) para tipo 'image'

ALTER TABLE stands ADD COLUMN stamp_type TEXT NOT NULL DEFAULT 'flag';
ALTER TABLE stands ADD COLUMN stamp_image TEXT;

-- Índice para filtrar por tipo si se necesita
CREATE INDEX IF NOT EXISTS idx_stands_stamp_type ON stands(stamp_type);