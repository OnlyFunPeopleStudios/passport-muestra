-- V1.2: ficha ampliada del stand (los datos que los profes cargan en el formulario).
-- topic: tema principal ("Cultura Colombiana"). activities: qué va a encontrar
-- o hacer el visitante. highlight: dato/lugar/personaje más importante.
-- fun_facts: datos curiosos. invite_text: frase corta de invitación.
-- Todo informativo y opcional: los stands actuales quedan con estos campos vacíos.
ALTER TABLE stands ADD COLUMN topic TEXT;
ALTER TABLE stands ADD COLUMN activities TEXT;
ALTER TABLE stands ADD COLUMN highlight TEXT;
ALTER TABLE stands ADD COLUMN fun_facts TEXT;
ALTER TABLE stands ADD COLUMN invite_text TEXT;
