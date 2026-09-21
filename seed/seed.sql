-- Passport Muestra - datos de prueba (14 stands / 13 países)
-- La columna flag guarda el código ISO 3166-1 alpha-2; el front lo muestra como SVG en /stamps/{flag}.svg.
-- Países de esta muestra: ar, br, co, us, mx, es, it, pt, gb, cn, jp, eg, ma.
-- Marruecos (ma) tiene dos stands independientes: el país no es un identificador único.

INSERT INTO stands (slug, name, course, description, area, flag, token) VALUES
('ambientes-ambientales', 'Ambientes y problemáticas ambientales', '3.º A', 'Investigación sobre ambientes y su cuidado', 'Ciencias Naturales', 'ar', 'bca43843d5d538f3eaab'),
('robotica-sustentable', 'Robótica sustentable', '4.º B', 'Robots construidos con materiales reciclados', 'Tecnología', 'br', 'cf2fc7728a6d62477190'),
('navegantes-portugueses', 'Navegantes portugueses', '5.º C', 'Rutas marítimas y expansión oceánica', 'Historia', 'pt', 'edc125a04bb92e5a2be3'),
('antiguo-egipto', 'Antiguo Egipto', '1.º A', 'El Nilo, las pirámides y la vida en el antiguo Egipto', 'Historia', 'eg', '79bd5991a174794135dc'),
('cocina-mexicana', 'Cocina típica mexicana', '2.º B', 'Recetas y cultura gastronómica de México', 'Gastronomía', 'mx', 'fdb561df51a65007494d'),
('conquista-america', 'La conquista de América', '2.º A', 'Línea de tiempo de la llegada de los españoles', 'Historia', 'es', '0b82bc1614a6baa0a5d0'),
('renacimiento', 'Renacimiento italiano', '3.º B', 'Arte y arquitectura del Renacimiento', 'Artes', 'it', '58e289bf42c7831247cd'),
('cultura-japonesa', 'Cultura japonesa', '4.º A', 'Tradiciones, caligrafía y origami', 'Interculturalidad', 'jp', '7721f72cab90e95805c6'),
('cafe-biodiversidad', 'Café y biodiversidad', '3.º C', 'El café colombiano y los ecosistemas', 'Ciencias Naturales', 'co', 'e2f3def365181010385a'),
('carrera-espacial', 'Carrera espacial', '2.º C', 'Cohetes y la llegada a la Luna', 'Tecnología', 'us', '8faf1bd22bf8bd49aff8'),
('revolucion-industrial', 'La revolución industrial', '4.º C', 'Máquinas y cambios sociales del siglo XIX', 'Historia', 'gb', 'b8810f1b080b3a17bb8e'),
('ecosistemas-asiaticos', 'Ecosistemas asiáticos', '1.º C', 'Fauna y flora de los grandes ecosistemas de Asia', 'Ciencias Naturales', 'cn', 'c2a61ce407d30f4c111e'),
('marruecos-videos', 'Marruecos — Proyección de videos', '4.º A', 'Cortos y documentales sobre la cultura marroquí', 'Audiovisual', 'ma', '2a86cfe2f872f1cdbb64'),
('marruecos-fotografia', 'Marruecos — Muestra fotográfica', '4.º B', 'Fotografías de paisajes y ciudades de Marruecos', 'Fotografía', 'ma', '3d899cbce99346a7ef94');
