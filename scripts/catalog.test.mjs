// Pruebas de la lógica pura del catálogo visitante (frontend/src/context/catalog.ts):
// red primero, IndexedDB como respaldo, estados explícitos y resolución de QR/palabra
// con el mismo flujo seguro. Cubre los puntos A–J del fix del catálogo (sin navegador).
// Node 24 corre .ts nativo (type stripping). Se ejecuta con: node scripts/catalog.test.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

const {
  loadCatalog,
  resolveStand,
  findStandByToken,
  findStandByWord,
  hasWordInput,
  catalogFailureInfo,
  isCatalogFailure,
  CATALOG_UNAVAILABLE_ERROR,
  CATALOG_STALE_HINT,
  NOT_FOUND_QR_ERROR,
  NOT_FOUND_WORD_ERROR,
} = await import(
  pathToFileURL(join(here, '..', 'frontend', 'src', 'context', 'catalog.ts')).href
);

let pass = 0;
let fail = 0;
const check = (name, cond) => {
  if (cond) { pass++; console.log('PASS  ' + name); }
  else { fail++; console.log('FAIL  ' + name); }
};

// Mismo shape que /api/stands (backend) y que Stand (is_published/token/secret_word).
const ambiente = { id: 1, slug: 'ambiente', name: 'Ambiente', token: 'tok-ambiente-abc123', secret_word: 'AMBIENTE', is_published: 1, sort_order: 1 };
const nivel = { id: 2, slug: 'nivel', name: 'Nivel Inicial', token: 'tok-nivel-def456', secret_word: '', is_published: 1, sort_order: 2 };
const oculto = { id: 3, slug: 'oculto', name: 'Oculto', token: 'tok-oculto-zzz999', secret_word: 'OCULTO', is_published: 0, sort_order: 3 };

// A. El catálogo carga correctamente (red OK -> ready, y guarda el espejo fresco)
{
  let saved = null;
  const result = await loadCatalog({
    fetchStands: async () => [ambiente, nivel],
    loadLocal: async () => [],
    saveLocal: async list => { saved = list; },
  });
  check('A1. catálogo por red -> ready y source network', result.status === 'ready' && result.source === 'network');
  check('A2. la red guarda el espejo fresco en IndexedDB', Array.isArray(saved) && saved.length === 2);
}

// B. Si el fetch falla -> fallback a IndexedDB
{
  const result = await loadCatalog({
    fetchStands: async () => { throw new Error('sin red'); },
    loadLocal: async () => [ambiente],
    saveLocal: async () => {},
  });
  check('B1. fetch falla -> catálogo desde IndexedDB (ready, source local)', result.status === 'ready' && result.source === 'local' && result.stands.length === 1);
}

// B2. Fetch falla y no hay respaldo -> 'empty' (no revienta)
{
  const result = await loadCatalog({
    fetchStands: async () => { throw new Error('sin red'); },
    loadLocal: async () => [],
    saveLocal: async () => {},
  });
  check('B2. sin red y sin respaldo -> empty sin excepción', result.status === 'empty' && result.source === 'none' && result.stands.length === 0);
}

// C. Catálogo todavía cargando -> NUNCA "código no reconocido": pending (esperar)
{
  const out = resolveStand('loading', [], { token: 'cualquiera' });
  check('C1. catalog loading + QR -> pending (no se resuelve antes de tiempo)', out.state === 'pending');
  const outW = resolveStand('loading', [], { word: 'AMBIENTE' });
  check('C2. catalog loading + palabra -> pending', outW.state === 'pending');
}

// D. #/scan?tok= con catálogo listo -> resuelve el stand (después de esperar catalogReady)
{
  const out = resolveStand('ready', [ambiente, nivel, oculto], { token: 'tok-ambiente-abc123' });
  check('D1. catalog ready + QR -> found con método qr', out.state === 'found' && out.method === 'qr' && out.stand.id === 1);
}

// E. QR válido -> encuentra el stand; inactivo no matchea
{
  check('E1. QR válido -> stand encontrado', findStandByToken([ambiente, nivel], 'tok-nivel-def456')?.id === 2);
  check('E2. QR de stand inactivo -> NO matchea', findStandByToken([ambiente, nivel, oculto], 'tok-oculto-zzz999') === undefined);
  check('E3. QR inexistente -> undefined', findStandByToken([ambiente, nivel], 'token-fantasma') === undefined);
}

// F. Palabra válida -> encuentra el stand (normaliza mayúsculas/espacios)
{
  check('F1. palabra válida -> stand encontrado', findStandByWord([ambiente, nivel], '  ambiente ')?.id === 1);
  check('F2. palabra de stand inactivo -> no matchea', findStandByWord([ambiente, nivel, oculto], 'oculto') === undefined);
  check('F3. palabra inexistente -> undefined', findStandByWord([ambiente, nivel], 'tiburon') === undefined);
  const out = resolveStand('ready', [ambiente, nivel], { word: 'AMBIENTE' });
  check('F4. resolveStand por palabra -> found con método secret', out.state === 'found' && out.method === 'secret' && out.stand.id === 1);
  const bad = resolveStand('ready', [ambiente, nivel], { word: 'nada' });
  check('F5. palabra inválida -> not-found', bad.state === 'not-found' && bad.method === 'secret');
}

// G. Conexión que vuelve -> el refresh vuelve a la red y reemplaza el local
{
  let localStore = [nivel];
  let online = false;
  const run = () =>
    loadCatalog({
      fetchStands: async () => {
        if (!online) throw new Error('offline');
        return [ambiente, nivel];
      },
      loadLocal: async () => localStore,
      saveLocal: async list => { localStore = list; },
    });
  const offline = await run();
  check('G1. offline -> usa el respaldo local', offline.status === 'ready' && offline.source === 'local');
  online = true;
  const recovered = await run();
  check('G2. vuelve online -> red manda y reemplaza el local', recovered.status === 'ready' && recovered.source === 'network' && localStore.length === 2);
}

// H + J. Un refresh con token regenerado reemplaza el catálogo viejo: el token
// viejo deja de resolver y el nuevo sí (QR nuevo generado en backend -> resuelto)
{
  let backend = [ambiente, nivel];
  let saved = [ambiente, nivel];
  const run = () =>
    loadCatalog({
      fetchStands: async () => backend,
      loadLocal: async () => saved,
      saveLocal: async list => { saved = list; },
    });
  const regenerado = {
    ...nivel,
    token: 'tok-nivel-NUEVO-9999', // /api/admin/stands/:id/token regeneró el QR
  };
  const before = await run();
  const oldResolved = resolveStand(before.status, before.stands, { token: 'tok-nivel-def456' });
  check('H1. antes del refresh -> el token viejo resuelve', oldResolved.state === 'found' && oldResolved.stand.id === 2);
  backend = [ambiente, regenerado];
  const after = await run();
  const newResolved = resolveStand(after.status, after.stands, { token: 'tok-nivel-NUEVO-9999' });
  const oldAfter = resolveStand(after.status, after.stands, { token: 'tok-nivel-def456' });
  check('H2. refresh -> el catálogo fresco reemplaza al viejo (source network)', after.source === 'network');
  check('J1. token nuevo -> resuelve después del refresh', newResolved.state === 'found' && newResolved.stand.id === 2);
  check('J2. token viejo -> deja de resolver', oldAfter.state === 'not-found');
  check('J3. el espejo guardado quedó con el token nuevo', saved[1].token === 'tok-nivel-NUEVO-9999');
}

// Catálogo 'empty' -> error explícito de catálogo, NUNCA "código no reconocido"
{
  const out = resolveStand('empty', [], { token: 'cualquiera' });
  check('empty -> unavailable (error explícito de catálogo)', out.state === 'unavailable');
  check('hasWordInput distingue sin valor', hasWordInput(undefined) === false && hasWordInput('  ') === false && hasWordInput('x') === true);
}

// I. Service Worker cambia de versión (invalida el cache viejo del catálogo)
{
  const sw = readFileSync(join(here, '..', 'public', 'sw.js'), 'utf8');
  check('I1. SW usa pm-v3 (invalida pm-v2 y pm-v1)', /const VERSION = 'pm-v3'/.test(sw));
  check('I2. el activate borra caches que no arrancan con la versión actual', /keys\.filter/.test(sw) && /!k\.startsWith\(VERSION\)/.test(sw));
}

// K. catalogFailureInfo: el error distingue el ORIGEN (catálogo vs local vs no-match).
{
  const empty = catalogFailureInfo('empty', 'none', 'qr');
  check('K1. catálogo sin datos -> título "Catálogo no disponible" (no "código no reconocido")', empty.title === 'Catálogo no disponible' && empty.kind === 'no-catalog' && empty.detail === CATALOG_UNAVAILABLE_ERROR);

  const qr = catalogFailureInfo('ready', 'network', 'qr');
  check('K2. red fresca + QR sin match -> "Código no reconocido" con mensaje exacto', qr.title === 'Código no reconocido' && qr.kind === 'not-found' && qr.detail === NOT_FOUND_QR_ERROR);

  const word = catalogFailureInfo('ready', 'network', 'secret');
  check('K3. red fresca + palabra sin match -> mensaje exacto de palabra', word.detail === NOT_FOUND_WORD_ERROR && word.title === 'Código no reconocido');

  const local = catalogFailureInfo('ready', 'local', 'qr');
  check('K4. catálogo LOCAL (posible viejo) -> "Datos desactualizados" + hint de conexión', local.title === 'Datos desactualizados' && local.kind === 'stale-local' && local.detail.includes(NOT_FOUND_QR_ERROR) && local.detail.includes(CATALOG_STALE_HINT));

  check('K5. isCatalogFailure detecta catálogo no disponible', isCatalogFailure({ error: CATALOG_UNAVAILABLE_ERROR }) === true);
  check('K6. isCatalogFailure detecta datos desactualizados por título', isCatalogFailure({ errorTitle: 'Datos desactualizados' }) === true);
  check('K7. isCatalogFailure NO marca un "código no reconocido" real', isCatalogFailure({ error: NOT_FOUND_QR_ERROR }) === false);

  // Loading (el fix espera): nunca un "código no reconocido" mientras carga.
  const pending = catalogFailureInfo('loading', 'none', 'qr');
  check('K8. catálogo cargando -> no-catalog (nunca not-found)', pending.kind === 'no-catalog');
}

console.log('');
console.log(`Resultado: ${pass} pass, ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);