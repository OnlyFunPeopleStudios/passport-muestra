-- V0.8: datos físicos y forma de sello por stand (port UI Mustra 2).
-- schedule: franja horaria de exposición. location: dónde está el stand.
-- stamp_style: forma del sello (global si NULL -> stamp_style de event_config).

ALTER TABLE stands ADD COLUMN schedule TEXT;
ALTER TABLE stands ADD COLUMN location TEXT;
ALTER TABLE stands ADD COLUMN stamp_style TEXT NOT NULL DEFAULT 'circular';