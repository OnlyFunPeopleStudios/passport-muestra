// Lógica pura del catálogo del visitante.
// Red primero, IndexedDB como respaldo, estados explícitos y resolución de
// QR / palabra secreta con el mismo flujo seguro. No depende del DOM ni de
// React: se prueba en node (scripts/catalog.test.mjs).
//
// Los tres estados del catálogo no se pueden confundir:
//   'loading' -> todavía cargando (la app aún NO puede resolver ningún stand)
//   'ready'   -> cargado con datos (puede resolver QR / palabra)
//   'empty'   -> cargado sin datos (red y respaldo local fallaron o están vacíos)
export type CatalogStatus = 'loading' | 'ready' | 'empty';

export const CATALOG_UNAVAILABLE_ERROR =
  'No se pudo cargar el catálogo de stands. Verificá tu conexión a internet e intentá de nuevo.';

// Mensajes exactos que ya conoce el usuario (se mantienen para compatibilidad).
export const NOT_FOUND_QR_ERROR = 'Código QR no reconocido o stand inactivo.';
export const NOT_FOUND_WORD_ERROR = 'La palabra secreta no coincide con ningún stand.';
export const CATALOG_STALE_HINT =
  'Puede que los datos guardados en este dispositivo estén desactualizados. Conectate a internet e intentá de nuevo.';

export type CatalogSource = 'network' | 'local' | 'none';

export interface CatalogFailureInfo {
  title: string;
  detail: string;
  kind: 'no-catalog' | 'stale-local' | 'not-found';
}

/**
 * Traduce un fallo de resolución del catálogo a un mensaje que distingue el
 * ORIGEN del problema (requisito de la auditoría):
 *   - catálogo sin datos        -> "Catálogo no disponible" (no "código no reconocido")
 *   - catálogo local (viejo)    -> "Datos desactualizados" + hint de conexión
 *   - catálogo fresco sin match -> "Código no reconocido"
 */
export function catalogFailureInfo(
  status: CatalogStatus,
  source: CatalogSource,
  method: 'qr' | 'secret'
): CatalogFailureInfo {
  if (status !== 'ready') {
    return { title: 'Catálogo no disponible', detail: CATALOG_UNAVAILABLE_ERROR, kind: 'no-catalog' };
  }
  const base = method === 'secret' ? NOT_FOUND_WORD_ERROR : NOT_FOUND_QR_ERROR;
  if (source === 'local') {
    return { title: 'Datos desactualizados', detail: `${base} ${CATALOG_STALE_HINT}`, kind: 'stale-local' };
  }
  return { title: 'Código no reconocido', detail: base, kind: 'not-found' };
}

export const isCatalogFailure = (r: { error?: string; errorTitle?: string }) =>
  r?.error === CATALOG_UNAVAILABLE_ERROR || r?.errorTitle === 'Catálogo no disponible' || r?.errorTitle === 'Datos desactualizados';

/** Mínimo de un stand que necesita el flujo visitante (tipado estructural: Stand cumple esto). */
export interface CatalogStand {
  id: number;
  name: string;
  token: string;
  secret_word: string;
  is_published: boolean;
}

export interface CatalogLoadResult<T> {
  status: 'ready' | 'empty';
  source: 'network' | 'local' | 'none';
  stands: T[];
}

export interface CatalogLoadOptions<T> {
  fetchStands: () => Promise<T[]>;
  loadLocal: () => Promise<T[]>;
  saveLocal: (stands: T[]) => Promise<void>;
}

export const hasWordInput = (word?: string | null): boolean =>
  word !== undefined && word !== null && String(word).trim() !== '';

export function findStandByToken<T extends CatalogStand>(stands: T[], token: string): T | undefined {
  return stands.find(s => s.is_published && s.token === token);
}

export function findStandByWord<T extends CatalogStand>(stands: T[], word: string): T | undefined {
  const w = String(word).trim().toLowerCase();
  return stands.find(s => s.is_published && !!s.secret_word && s.secret_word.trim().toLowerCase() === w);
}

/**
 * Carga el catálogo: primero la red. Si responde, guarda el espejo fresco en
 * IndexedDB y lo reemplaza (nunca se mantiene un catálogo viejo por encima de
 * uno fresco). Si la red falla, usa el respaldo local. Si nada hay, queda 'empty'
 * (la resolución devolverá el error explícito de catálogo no disponible).
 */
export async function loadCatalog<T>(opts: CatalogLoadOptions<T>): Promise<CatalogLoadResult<T>> {
  try {
    const raw = await opts.fetchStands();
    if (!Array.isArray(raw)) throw new Error('respuesta inválida de /api/stands');
    if (raw.length) await opts.saveLocal(raw);
    return { status: raw.length ? 'ready' : 'empty', source: 'network', stands: raw };
  } catch {
    // Fallback a IndexedDB sin propagar errores: si el respaldo falla, 'empty'.
    let list: T[] = [];
    try {
      const local = await opts.loadLocal().catch(() => [] as T[]);
      if (Array.isArray(local)) list = local;
    } catch {
      list = [];
    }
    if (list.length) return { status: 'ready', source: 'local', stands: list };
    return { status: 'empty', source: 'none', stands: [] };
  }
}

export type ResolveOutcome<T extends CatalogStand> =
  | { state: 'found'; stand: T; method: 'qr' | 'secret' }
  | { state: 'not-found'; method: 'qr' | 'secret' }
  | { state: 'pending' }
  | { state: 'unavailable' };

/**
 * Resuelve un QR o una palabra contra el catálogo usando su estado explícito.
 * 'pending'  = todavía cargando: el llamador debe esperar, no marcar error.
 * 'unavailable' = catálogo sin datos: error explícito de catálogo, no "código no reconocido".
 * 'not-found' = catálogo listo pero ese stand no está publicado / no coincide.
 */
export function resolveStand<T extends CatalogStand>(
  status: CatalogStatus,
  stands: T[],
  input: { token?: string; word?: string }
): ResolveOutcome<T> {
  if (status === 'loading') return { state: 'pending' };
  if (status === 'empty') return { state: 'unavailable' };
  if (hasWordInput(input.word)) {
    const stand = findStandByWord(stands, String(input.word));
    return stand
      ? { state: 'found', stand, method: 'secret' }
      : { state: 'not-found', method: 'secret' };
  }
  if (typeof input.token === 'string' && input.token.length > 0) {
    const stand = findStandByToken(stands, input.token);
    return stand
      ? { state: 'found', stand, method: 'qr' }
      : { state: 'not-found', method: 'qr' };
  }
  return { state: 'not-found', method: 'qr' };
}