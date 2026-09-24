// Pruebas de "Material para la Muestra" (V0.9):
//   1) El QR GENERAL codifica EXACTAMENTE https://pasaporte.onlyfunpeople.com.ar
//      (sin token de stand) — verificado por DECODIFICADO real con ZXing.
//   2) La generación SVG y PNG es determinística y exportable.
//   3) El afiche A4 usa el branding/catálogo de colores configurado.
//   4) No se modifican stands, tokens, secret_words, visitas ni visitantes
//      (los módulos son puros: sin fetch, sin /api).
// Node 24 corre .ts nativo (type stripping). node scripts/generalQr.test.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const assert = createRequire(import.meta.url);

// ZXing (ya está en el árbol de dependencias del root, dentro de html5-qrcode).
const ZXing = assert(root + '/node_modules/html5-qrcode/third_party/zxing-js.umd.js');
const Z = ZXing.ZXing || ZXing;

// pngjs (dependencia de la build server de qrcode) para leer el PNG real.
const PNG = assert(root + '/frontend/node_modules/pngjs').PNG;

const generalQr = await import(
  pathToFileURL(join(root, 'frontend', 'src', 'utils', 'generalQr.ts')).href
);
const poster = await import(
  pathToFileURL(join(root, 'frontend', 'src', 'utils', 'poster.ts')).href
);

const { GENERAL_URL, generalQrSvg, generalQrPng, buildQrMatrix } = generalQr;
const { buildPosterSvg, extractYear, extractSvgInner, xmlEscape } = poster;

let pass = 0;
let fail = 0;
const check = (name, cond) => {
  if (cond) { pass++; console.log('PASS  ' + name); }
  else { fail++; console.log('FAIL  ' + name); }
};

// ---- 1. URL exacta del QR GENERAL ----
check('URL GENERAL exacta (sin token de stand)', GENERAL_URL === 'https://pasaporte.onlyfunpeople.com.ar');
check('la URL no contiene ningún token de stand', !/[?&#]tok=/.test(GENERAL_URL));

// ---- 2. Generación SVG y PNG ----
const svg = await generalQrSvg({ width: 800, margin: 4 });
const svg2 = await generalQrSvg({ width: 800, margin: 4 });
const png = await generalQrPng({ width: 512, margin: 4 });

check('SVG empieza con <svg', typeof svg === 'string' && svg.trim().startsWith('<svg'));
check('SVG usa alto contraste (negro sobre blanco)', svg.includes('#000000') || svg.includes('#000'));
check('SVG export es determinístico (misma URL -> mismo SVG)', svg === svg2);

const vbMatch = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
const grid = buildQrMatrix(GENERAL_URL).modules.size; // 29 módulos con EC M
check('viewBox presente en el SVG', Boolean(vbMatch));
check('quiet zone: viewBox = módulos + 2*margin (4)', vbMatch && Number(vbMatch[1]) === grid + 8 && Number(vbMatch[2]) === grid + 8);

check('PNG es data URL base64', typeof png === 'string' && png.startsWith('data:image/png;base64,'));
check('PNG genera algo (no vacío)', typeof png === 'string' && png.length > 100);

// ---- 3. DECODIFICADO real: el QR debe dar la URL exacta ----
function matrixToLuminance(matrix, scale = 8) {
  const n = matrix.size;
  const w = n * scale;
  const h = n * scale;
  const lum = new Uint8Array(w * h); // 0 = oscuro, 255 = claro
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const dark = matrix.get ? matrix.get(r, c) : Boolean(matrix.data[r * n + c]);
      const v = dark ? 0 : 255;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          lum[(r * scale + dy) * w + (c * scale + dx)] = v;
        }
      }
    }
  }
  return { lum, w, h };
}

function decodeLuminance(lum, w, h) {
  const source = new Z.RGBLuminanceSource(lum, w, h);
  const bitmap = new Z.BinaryBitmap(new Z.HybridBinarizer(source));
  return new Z.QRCodeReader().decode(bitmap).getText();
}

{
  const { lum, w, h } = matrixToLuminance(buildQrMatrix(GENERAL_URL).modules);
  const decoded = decodeLuminance(lum, w, h);
  check('DECODIFICADO ZXing: el QR GENERAL devuelve la URL exacta', decoded === GENERAL_URL);
}

// El PNG real también debe decodificar a la misma URL.
{
  const b64 = png.split(',')[1];
  const pngObj = PNG.sync.read(Buffer.from(b64, 'base64'));
  const data = pngObj.data; // RGBA
  const lum = new Uint8Array(pngObj.width * pngObj.height);
  for (let i = 0; i < pngObj.width * pngObj.height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    lum[i] = Math.round((r + g + b) / 3); // PNG del QR es prácticamente blanco/negro
  }
  const decoded = decodeLuminance(lum, pngObj.width, pngObj.height);
  check('DECODIFICADO ZXing: el PNG exportado también da la URL exacta', decoded === GENERAL_URL);
}

// Una URL DISTINTA debe dar una matriz distinta (el QR no es un placeholder).
{
  const m1 = buildQrMatrix(GENERAL_URL).modules;
  const m2 = buildQrMatrix('https://pasaporte.onlyfunpeople.com.ar/#/scan?tok=OTRO').modules;
  let differs = m1.size !== m2.size;
  if (m1.size === m2.size) {
    for (let i = 0; i < m1.data.length && !differs; i++) {
      if (m1.data[i] !== m2.data[i]) differs = true;
    }
  }
  check('URL distinta -> matriz distinta (contenido sensible)', differs);
}

// ---- 4. Afiche A4 con branding configurado ----
const config = {
  event_name: 'Muestra Escolar 2026',
  event_subtitle: 'Recorré los stands y completá tu pasaporte',
  institution_name: 'Escuela N° 42',
  description: 'Una muestra de proyectos de los alumnos',
  logo: null,
  primary_color: '#0f4c81',
  secondary_color: '#e8a13a',
  accent_color: '#d64545',
  background_color: '#f7f3ea',
  text_color: '#1f2937',
  text_secondary_color: '#6b7280',
  stamp_style: 'circular',
  texts: {
    welcome_text: 'Bienvenidos',
    button_text: 'Entrar',
    footer_text: 'Pie',
    name_label: 'Nombre',
    create_anon_hint: 'Anónimo',
    passport_title: 'Pasaporte',
    scan_title: 'Escanear',
    scan_note: 'Nota',
    visit_ok: 'Visitado',
    already_visited: 'Ya visitado',
    not_evaluated: 'Sin evaluar',
    eval_question: '¿Te gustó?',
    comment_label: 'Comentario',
    submit_eval: 'Enviar',
    eval_saved: 'Guardado',
    progress_suffix: 'de',
    completed: 'Completado',
  },
};

const posterSvg = buildPosterSvg(config, { qrSvg: svg });

check('Afiche es un SVG A4 vertical', posterSvg.includes('<svg') && /width="210mm" height="297mm"/.test(posterSvg));
check('Afiche muestra el nombre de la muestra', posterSvg.includes('Muestra Escolar 2026'));
check('Afiche muestra el año (2026)', posterSvg.includes('2026'));
check('Afiche muestra la institución', posterSvg.includes('Escuela N° 42'));
check('Afiche contiene "MI PASAPORTE"', posterSvg.includes('MI PASAPORTE'));
check('Afiche contiene la invitación', posterSvg.includes('Recorré los stands'));
check('Afiche contiene "ESCANEÁ PARA COMENZAR"', posterSvg.includes('ESCANEÁ PARA COMENZAR'));
check('Afiche contiene la URL GENERAL', posterSvg.includes(GENERAL_URL));
check('Afiche usa primary_color', posterSvg.includes('#0f4c81'));
check('Afiche usa secondary_color', posterSvg.includes('#e8a13a'));
check('Afiche usa accent_color', posterSvg.includes('#d64545'));
check('Afiche usa background_color', posterSvg.includes('#f7f3ea'));
check('Afiche usa text_color', posterSvg.includes('#1f2937'));
check('Afiche usa text_secondary_color', posterSvg.includes('#6b7280'));

// El QR embebido en el afiche debe ser el MISMO (mismo viewBox/quiet zone).
{
  const innerFromQr = extractSvgInner(svg);
  check('Afiche embebe el QR GENERAL (mismo inner embebido)', posterSvg.includes(innerFromQr.inner));
  check('Afiche contiene paths del QR', innerFromQr.inner.length > 0 && innerFromQr.inner.includes('d="'));
}

// Con logo configurado, el afiche debe incrustar la imagen.
const configLogo = { ...config, logo: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4=' };
const posterWithLogo = buildPosterSvg(configLogo, { qrSvg: svg });
check('Afiche incrusta el logo cuando está configurado', posterWithLogo.includes('href="data:image/svg+xml'));

// Paleta distinta -> afiche distinto (cambia solo con la config del admin).
const configAlt = { ...config, primary_color: '#123456' };
const posterAlt = buildPosterSvg(configAlt, { qrSvg: svg });
check('Paleta distinta -> afiche distinto (no genérico)', posterAlt !== posterSvg && posterAlt.includes('#123456'));

// Año: se extrae del event_name, con fallback.
check('extractYear: "Muestra Escolar 2026" -> 2026', extractYear('Muestra Escolar 2026') === '2026');
check('extractYear: sin año usa el actual', /\d{4}/.test(extractYear('Feria de Ciencias')));
check('xmlEscape escapa & < >', xmlEscape('A & B < C > D') === 'A &amp; B &lt; C &gt; D');

// ---- 5. Solo LECTURA: sin mutaciones de stands/visitantes/visitas ----
// Los módulos son puros: no hacen fetch, no llaman a /api, no usan métodos
// HTTP de escritura y no importan nada del backend ni del contexto de admin.
function sourceAbsentOf(path, needles) {
  const src = readFileSync(join(root, path), 'utf8');
  return needles.every((n) => !src.includes(n));
}

const httpWrite = ['fetch(', '/api/', 'method:', 'headers:', 'XMLHttpRequest', 'PUT "/', 'DELETE'];
check(
  'generalQr.ts: sin fetch ni endpoints de escritura',
  sourceAbsentOf('frontend/src/utils/generalQr.ts', httpWrite)
);
check(
  'poster.ts: sin fetch ni endpoints de escritura',
  sourceAbsentOf('frontend/src/utils/poster.ts', httpWrite)
);
check(
  'generalQr.ts: no importa backend ni admin',
  sourceAbsentOf('frontend/src/utils/generalQr.ts', ['context/', 'PassportContext', 'worker', 'seedData'])
);
check(
  'poster.ts: no importa backend ni admin',
  sourceAbsentOf('frontend/src/utils/poster.ts', ['context/', 'PassportContext', 'worker', 'seedData', "'qrcode'"])
);

// ---- 6. La vista se integra al Centro de Mando (tab + import) ----
{
  const panel = readFileSync(join(root, 'frontend/src/components/AdminPanel.tsx'), 'utf8');
  check('AdminPanel incluye el tab "Material para la Muestra"', panel.includes("id: 'material'") && panel.includes('Material para la Muestra'));
  check('AdminPanel renderiza MaterialMuestraView', panel.includes("activeTab === 'material'") && panel.includes('<MaterialMuestraView'));
}

console.log('');
console.log(`Resultado generalQr: ${pass} pass, ${fail} fail`);
process.exit(fail);