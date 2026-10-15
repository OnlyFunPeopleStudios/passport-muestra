// Pruebas del mapeo Stand <-> API (frontend/src/utils/standApi.ts).
//
// Regresión del bug: el Centro de Mando editaba el horario (schedule), la
// ubicación (location) y el estilo de sello (stamp_style), pero standToApi NO
// los mandaba al worker -> al recargar volvían al valor por defecto.
//
// Node 24 corre .ts nativo (type stripping). Los módulos son puros: sin fetch,
// sin React, sin tocar stands/visitas/visitantes.
//   node scripts/standApi.test.mjs
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const { standFromApi, standToApi } = await import(
  pathToFileURL(join(root, 'frontend', 'src', 'utils', 'standApi.ts')).href
);

let pass = 0;
let fail = 0;
const check = (name, cond) => {
  if (cond) { pass++; console.log('PASS  ' + name); }
  else { fail++; console.log('FAIL  ' + name); }
};

// Campos que el admin puede editar y el worker acepta en POST/PUT /api/stands.
// Si standToApi no manda uno de estos, el cambio se pierde al recargar.
const EDITABLE = ['name', 'course', 'description', 'area', 'flag', 'is_published',
  'stamp_icon', 'stamp_color', 'stamp_image', 'stamp_type', 'stamp_style', 'stamp_id',
  'schedule', 'location', 'sort_order', 'secret_word', 'flyer_url', 'flyer_image',
  'topic', 'activities', 'highlight', 'fun_facts', 'invite_text'];

// ---- 1. Bug de regresión: schedule/location/stamp_style viajan al API ----
const edited = {
  name: 'Stand X',
  schedule: '10:00 - 12:00 hs',
  location: 'Patio Central - Stand #4',
  stamp_style: 'hexagonal',
  stamp_type: 'icono',
};
const out = standToApi(edited);
check('schedule se envía al API', out.schedule === '10:00 - 12:00 hs');
check('location se envía al API', out.location === 'Patio Central - Stand #4');
check('stamp_style se envía al API', out.stamp_style === 'hexagonal');

// ---- 2. Cobertura completa de campos editables ----
const missing = EDITABLE.filter((k) => !(k in out));
check('standToApi cubre todos los campos editables (' + missing.join(', ') + ')', missing.length === 0);

// ---- 3. stamp_type se traduce front -> API en ambos sentidos ----
check('stamp_type front->API (icono -> icon)', out.stamp_type === 'icon');
check('stamp_type API->front (icon -> icono)', standFromApi({ stamp_type: 'icon' }).stamp_type === 'icono');
check('stamp_type por defecto', standToApi({}).stamp_type === 'flag');

// ---- 4. Round-trip: editar y re-leer conserva los valores ----
const back = standFromApi(out);
check('round-trip conserva schedule', back.schedule === '10:00 - 12:00 hs');
check('round-trip conserva location', back.location === 'Patio Central - Stand #4');
check('round-trip conserva stamp_style', back.stamp_style === 'hexagonal');

// ---- 5. undefined se omite (permite updates parciales sin borrar datos) ----
check('campo no enviado queda undefined (no null)', standToApi({}).schedule === undefined);
check('string vacío sí se envía (permite limpiar el campo)', standToApi({ schedule: '' }).schedule === '');

// ---- 6. Sello de la biblioteca (stamp_id) ----
check('stamp_id se envía al API', standToApi({ stamp_id: 7 }).stamp_id === 7);
check('stamp_id no enviado queda undefined', standToApi({}).stamp_id === undefined);
check('stamp_id null se envía (permite quitar el sello)', standToApi({ stamp_id: null }).stamp_id === null);
check('stamp_id API->front', standFromApi({ stamp_id: 7 }).stamp_id === 7);
check('stamp_id por defecto es null (sin sello de biblioteca)', standFromApi({}).stamp_id === null);

console.log('\n' + pass + ' pass / ' + fail + ' fail');
if (fail > 0) process.exit(1);
