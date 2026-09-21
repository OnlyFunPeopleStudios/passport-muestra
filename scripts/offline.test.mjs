// Pruebas de la lógica del modo offline (sin navegador).
// Carga public/offline.js en un contexto aislado y verifica la parte pura:
// deduplicación de visitas y clasificación idempotente de la sincronización.
// Se ejecuta con: node scripts/offline.test.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, '..', 'public', 'offline.js'), 'utf8');

// Sin IndexedDB a propósito: así también se prueba que la app degrada sin romperse.
const sandbox = { console, navigator: { onLine: true } };
vm.createContext(sandbox);
vm.runInContext(src, sandbox);

const offline = sandbox.PMOffline;
const pure = offline?._pure;

let pass = 0;
let fail = 0;
const check = (name, cond) => {
  if (cond) { pass++; console.log('PASS  ' + name); }
  else { fail++; console.log('FAIL  ' + name); }
};

check('offline.js expone PMOffline._pure', Boolean(pure));

if (pure) {
  // ---- clasificación de la sincronización (idempotencia) ----
  check('sync 201 -> ok', pure.classifySyncResult(201) === 'ok');
  check('sync 200 -> ok', pure.classifySyncResult(200) === 'ok');
  check('sync 409 -> done (reenviar no duplica)', pure.classifySyncResult(409) === 'done');
  check('sync 400 -> permanent (no reintentar en loop)', pure.classifySyncResult(400) === 'permanent');
  check('sync 404 -> permanent', pure.classifySyncResult(404) === 'permanent');
  check('sync 500 -> transient (se reintenta)', pure.classifySyncResult(500) === 'transient');
  check('sync 0 (sin red) -> transient', pure.classifySyncResult(0) === 'transient');

  // ---- clave de deduplicación local ----
  check('visitKey separa visitante y stand', pure.visitKey('vt1', 5) !== pure.visitKey('vt1', 6));
  check('visitKey es estable', pure.visitKey('vt1', 5) === pure.visitKey('vt1', 5));

  // ---- unión servidor + local sin duplicar ----
  const server = [{ stand_id: 1, rating: 5, comment: 'ok' }, { stand_id: 2, rating: null, comment: null }];
  const local = [{ stand_id: 2, rating: 4, comment: 'offline' }, { stand_id: 3, rating: null, comment: null }];
  const merged = pure.mergeVisits(server, local);
  check('merge: no duplica stands (3, no 4)', merged.length === 3);
  check('merge: la visita local actualiza la del servidor', merged.find((v) => v.stand_id === 2).rating === 4);
  check('merge: conserva las visitas del servidor', merged.find((v) => v.stand_id === 1).comment === 'ok');
  check('merge: agrega la visita local pendiente', merged.some((v) => v.stand_id === 3));
  check('merge: sin datos no rompe', pure.mergeVisits(undefined, undefined).length === 0);
}

// ---- degradación sin IndexedDB (la app online debe seguir andando) ----
check('sin IndexedDB: getStands -> []', (await offline.getStands()).length === 0);
check('sin IndexedDB: getVisits -> []', (await offline.getVisits('vt')).length === 0);
check('sin IndexedDB: findStandByToken -> null', (await offline.findStandByToken('tok')) === null);
check('sin IndexedDB: localPassport -> 0 stands', (await offline.localPassport('vt')).total_stands === 0);

let threw = false;
try { await offline.evaluateOffline('vt', 'tok', 5, ''); } catch { threw = true; }
check('sin datos locales: evaluar offline avisa (no rompe)', threw);

console.log('');
console.log(`Resultado offline: ${pass} pass, ${fail} fail`);
process.exit(fail);
