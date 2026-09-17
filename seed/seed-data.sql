-- Passport Muestra - datos de demostración para el Centro de Mando (V0.3)
-- 8 visitantes, ~30 visitas con evaluaciones variadas + algunas visitas sin evaluar.
-- Los pares (visitor, stand) son únicos.

INSERT INTO visitors (name, token) VALUES
('Lucía',        '53a7f979-90ce-4662-aa40-af1931e7b28a'),
('Matías',       '1f172489-8d3d-41a3-98c5-a267083907eb'),
('Sofía',        'bdf64d8e-ed42-42e8-986e-971e59a8d852'),
(NULL,           '3b1f0835-58d6-4e0f-9fd4-1f4e4b1cff5f'),
('Joaquín',      'a46c63b2-6725-44d4-a436-f57359e1aadb'),
('Valentina',    '2977e544-7895-4bf9-bde6-3939512b3246'),
(NULL,           'ba4bec8c-3622-425d-a90c-69d3527e6c6c'),
('Benjamín',     '1ffa23df-7ca9-4e32-8598-8ff402ee9074');

INSERT INTO visits (visitor_id, stand_id, rating, comment) VALUES
-- Lucía
((SELECT id FROM visitors WHERE token = '53a7f979-90ce-4662-aa40-af1931e7b28a'), (SELECT id FROM stands WHERE slug = 'ambientes-ambientales'), 5, 'Me encantó la explicación'),
((SELECT id FROM visitors WHERE token = '53a7f979-90ce-4662-aa40-af1931e7b28a'), (SELECT id FROM stands WHERE slug = 'robotica-sustentable'), 4, NULL),
((SELECT id FROM visitors WHERE token = '53a7f979-90ce-4662-aa40-af1931e7b28a'), (SELECT id FROM stands WHERE slug = 'musica-tradicion'), 5, 'Muy lindo el pasaporte'),
((SELECT id FROM visitors WHERE token = '53a7f979-90ce-4662-aa40-af1931e7b28a'), (SELECT id FROM stands WHERE slug = 'volcanes'), 3, NULL),
((SELECT id FROM visitors WHERE token = '53a7f979-90ce-4662-aa40-af1931e7b28a'), (SELECT id FROM stands WHERE slug = 'cocina-mexicana'), 4, '¡Muy buena maqueta!'),
-- Matías
((SELECT id FROM visitors WHERE token = '1f172489-8d3d-41a3-98c5-a267083907eb'), (SELECT id FROM stands WHERE slug = 'cultura-japonesa'), 4, 'Buenísimo'),
((SELECT id FROM visitors WHERE token = '1f172489-8d3d-41a3-98c5-a267083907eb'), (SELECT id FROM stands WHERE slug = 'renacimiento'), 5, NULL),
((SELECT id FROM visitors WHERE token = '1f172489-8d3d-41a3-98c5-a267083907eb'), (SELECT id FROM stands WHERE slug = 'torre-eiffel'), 3, NULL),
((SELECT id FROM visitors WHERE token = '1f172489-8d3d-41a3-98c5-a267083907eb'), (SELECT id FROM stands WHERE slug = 'machu-picchu'), 5, 'Excelente maqueta'),
((SELECT id FROM visitors WHERE token = '1f172489-8d3d-41a3-98c5-a267083907eb'), (SELECT id FROM stands WHERE slug = 'carrera-espacial'), 4, NULL),
-- Sofía
((SELECT id FROM visitors WHERE token = 'bdf64d8e-ed42-42e8-986e-971e59a8d852'), (SELECT id FROM stands WHERE slug = 'cafe-biodiversidad'), 5, 'Me gustó mucho'),
((SELECT id FROM visitors WHERE token = 'bdf64d8e-ed42-42e8-986e-971e59a8d852'), (SELECT id FROM stands WHERE slug = 'revolucion-industrial'), 4, NULL),
((SELECT id FROM visitors WHERE token = 'bdf64d8e-ed42-42e8-986e-971e59a8d852'), (SELECT id FROM stands WHERE slug = 'autos-energia'), 3, NULL),
((SELECT id FROM visitors WHERE token = 'bdf64d8e-ed42-42e8-986e-971e59a8d852'), (SELECT id FROM stands WHERE slug = 'ecosistemas-asiaticos'), 5, 'Gran trabajo'),
-- anónimo 1
((SELECT id FROM visitors WHERE token = '3b1f0835-58d6-4e0f-9fd4-1f4e4b1cff5f'), (SELECT id FROM stands WHERE slug = 'ambientes-ambientales'), 3, NULL),
((SELECT id FROM visitors WHERE token = '3b1f0835-58d6-4e0f-9fd4-1f4e4b1cff5f'), (SELECT id FROM stands WHERE slug = 'cultura-japonesa'), 5, 'La mejor parte de la muestra'),
((SELECT id FROM visitors WHERE token = '3b1f0835-58d6-4e0f-9fd4-1f4e4b1cff5f'), (SELECT id FROM stands WHERE slug = 'cafe-biodiversidad'), 4, NULL),
((SELECT id FROM visitors WHERE token = '3b1f0835-58d6-4e0f-9fd4-1f4e4b1cff5f'), (SELECT id FROM stands WHERE slug = 'ecosistemas-asiaticos'), 5, NULL),
((SELECT id FROM visitors WHERE token = '3b1f0835-58d6-4e0f-9fd4-1f4e4b1cff5f'), (SELECT id FROM stands WHERE slug = 'robotica-sustentable'), NULL, NULL),
-- Joaquín
((SELECT id FROM visitors WHERE token = 'a46c63b2-6725-44d4-a436-f57359e1aadb'), (SELECT id FROM stands WHERE slug = 'robotica-sustentable'), 5, 'Impresionante'),
((SELECT id FROM visitors WHERE token = 'a46c63b2-6725-44d4-a436-f57359e1aadb'), (SELECT id FROM stands WHERE slug = 'renacimiento'), 4, NULL),
((SELECT id FROM visitors WHERE token = 'a46c63b2-6725-44d4-a436-f57359e1aadb'), (SELECT id FROM stands WHERE slug = 'revolucion-industrial'), 5, 'Increíble trabajo'),
-- Valentina
((SELECT id FROM visitors WHERE token = '2977e544-7895-4bf9-bde6-3939512b3246'), (SELECT id FROM stands WHERE slug = 'musica-tradicion'), 5, NULL),
((SELECT id FROM visitors WHERE token = '2977e544-7895-4bf9-bde6-3939512b3246'), (SELECT id FROM stands WHERE slug = 'torre-eiffel'), 5, 'Me encantó el origami'),
((SELECT id FROM visitors WHERE token = '2977e544-7895-4bf9-bde6-3939512b3246'), (SELECT id FROM stands WHERE slug = 'autos-energia'), 4, NULL),
((SELECT id FROM visitors WHERE token = '2977e544-7895-4bf9-bde6-3939512b3246'), (SELECT id FROM stands WHERE slug = 'ecosistemas-asiaticos'), 3, NULL),
-- anónimo 2
((SELECT id FROM visitors WHERE token = 'ba4bec8c-3622-425d-a90c-69d3527e6c6c'), (SELECT id FROM stands WHERE slug = 'volcanes'), 4, NULL),
((SELECT id FROM visitors WHERE token = 'ba4bec8c-3622-425d-a90c-69d3527e6c6c'), (SELECT id FROM stands WHERE slug = 'machu-picchu'), 4, NULL),
((SELECT id FROM visitors WHERE token = 'ba4bec8c-3622-425d-a90c-69d3527e6c6c'), (SELECT id FROM stands WHERE slug = 'carrera-espacial'), 4, 'Muy interesante'),
((SELECT id FROM visitors WHERE token = 'ba4bec8c-3622-425d-a90c-69d3527e6c6c'), (SELECT id FROM stands WHERE slug = 'autos-energia'), 4, NULL),
-- Benjamín
((SELECT id FROM visitors WHERE token = '1ffa23df-7ca9-4e32-8598-8ff402ee9074'), (SELECT id FROM stands WHERE slug = 'cocina-mexicana'), 3, NULL),
((SELECT id FROM visitors WHERE token = '1ffa23df-7ca9-4e32-8598-8ff402ee9074'), (SELECT id FROM stands WHERE slug = 'carrera-espacial'), 5, NULL),
((SELECT id FROM visitors WHERE token = '1ffa23df-7ca9-4e32-8598-8ff402ee9074'), (SELECT id FROM stands WHERE slug = 'revolucion-industrial'), 4, NULL),
((SELECT id FROM visitors WHERE token = '1ffa23df-7ca9-4e32-8598-8ff402ee9074'), (SELECT id FROM stands WHERE slug = 'ecosistemas-asiaticos'), 5, 'Felicitaciones');