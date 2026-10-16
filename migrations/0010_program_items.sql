-- Passport Muestra - V1.4: actos del programa (inicio, cierre, etc.) sin necesidad de un stand.
-- Una sola fila (id = 1). Cada item: { time, title, note }.

ALTER TABLE event_config ADD COLUMN program_json TEXT;
