import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { EventConfig, Stand, Visitor, Visit, VisitWithDetails, StampType } from '../types';
import { DEFAULT_CONFIG } from '../data/seedData';
import {
  CatalogStatus,
  CATALOG_UNAVAILABLE_ERROR,
  hasWordInput,
  loadCatalog,
  resolveStand,
} from './catalog';

// ---------- utilidades ----------

const JSON_HEADERS = { 'content-type': 'application/json' };

// Claves de localStorage del vanilla: se reutilizan para conservar pasaportes existentes.
const VT_KEY = 'pm_vt';
const NAME_KEY = 'pm_vt_name';
const CREATED_KEY = 'pm_vt_created';

// window.PMOffline lo expone public/offline.js (incluido como script estático).
const off = () => (typeof window !== 'undefined' ? (window as any).PMOffline ?? null : null);

// Tope de espera del catálogo en recordVisit: si en 10s sigue cargando, se
// devuelve el error explícito de catálogo no disponible (no "código no reconocido").
const CATALOG_WAIT_MS = 10000;

const FRONT_STAMP_TYPE: Record<string, StampType> = {
  flag: 'bandera',
  icon: 'icono',
  image: 'imagen',
  color: 'color',
};
const BACK_STAMP_TYPE: Record<string, string> = {
  bandera: 'flag',
  icono: 'icon',
  imagen: 'image',
  color: 'color',
};

function standFromApi(s: any): Stand {
  return {
    id: s.id,
    slug: s.slug ?? '',
    name: s.name,
    course: s.course ?? '',
    description: s.description ?? '',
    area: s.area ?? '',
    flag: s.flag ?? 'ar',
    token: s.token,
    secret_word: String(s.secret_word ?? ''),
    schedule: s.schedule || undefined,
    location: s.location || undefined,
    stamp_type: s.stamp_type ? (FRONT_STAMP_TYPE[s.stamp_type] ?? 'bandera') : 'bandera',
    stamp_icon: s.stamp_icon || '',
    stamp_color: s.stamp_color || '',
    stamp_image: s.stamp_image || '',
    stamp_style: s.stamp_style || undefined,
    sort_order: Number(s.sort_order) || 0,
    is_published: !!s.is_published,
  };
}

function standToApi(s: Partial<Stand>) {
  return {
    name: s.name,
    course: s.course,
    description: s.description,
    area: s.area,
    flag: s.flag,
    is_published: s.is_published,
    stamp_icon: s.stamp_icon,
    stamp_color: s.stamp_color,
    stamp_image: s.stamp_image,
    stamp_type: s.stamp_type ? (BACK_STAMP_TYPE[s.stamp_type] ?? 'flag') : 'flag',
    sort_order: s.sort_order,
    secret_word: s.secret_word,
  };
}

function visitFromServer(visitorId: number | string, v: any): Visit {
  const out: any = {
    id: v.id ?? 0,
    visitor_id: visitorId,
    stand_id: v.stand_id,
    rating: v.rating ?? null,
    comment: v.comment ?? null,
    is_hidden: !!v.is_hidden,
    is_reviewed: !!v.is_reviewed,
    visit_method: v.visit_method === 'secret' ? 'secret' : 'qr',
    created_at: v.created_at,
  };
  // Detalles inline que trae el backend (y las visitas locales); se conservan
  // para que el pasaporte siga mostrando el stand aunque se despublique.
  for (const k of ['stand_name', 'course', 'flag', 'area'] as const) {
    if (v[k]) out[k] = v[k];
  }
  return out as Visit;
}

// Comprimir una dataURL a una resolución razonable (misma lógica de upload del prototipo).
function compressDataUrl(dataUrl: string, maxDim: number, mime: string, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL(mime, quality));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

const urlToDataUrl = (url: string) =>
  fetch(url)
    .then(r => {
      if (!r.ok) throw new Error('fetch logo');
      return r.blob();
    })
    .then(
      blob =>
        new Promise<string>((resolve, reject) => {
          const fr = new FileReader();
          fr.onload = () => resolve(fr.result as string);
          fr.onerror = reject;
          fr.readAsDataURL(blob);
        })
    );

// ---------- tipos del contexto ----------

export interface RecordVisitResult {
  success: boolean;
  already?: boolean;
  error?: string;
  stand?: Stand;
  visit?: Visit;
}

export interface AdminActionResult {
  success: boolean;
  error?: string;
}

interface PassportContextType {
  config: EventConfig;
  stands: Stand[];
  catalogStatus: CatalogStatus;
  catalogReady: boolean;
  visitors: Visitor[];
  visits: Visit[];
  currentVisitor: Visitor | null;
  setCurrentVisitor: (v: Visitor | null) => void;
  createVisitor: (name?: string) => Promise<Visitor>;
  updateVisitorName: (name: string) => Promise<void>;
  recordVisit: (params: { token?: string; word?: string; visitorToken?: string }) => Promise<RecordVisitResult>;
  evaluateVisit: (params: {
    standId: number;
    rating: number;
    comment?: string;
    visitorToken?: string;
  }) => Promise<AdminActionResult>;
  isAdmin: boolean;
  checkAdmin: () => Promise<void>;
  adminLogin: (password: string) => Promise<AdminActionResult>;
  adminLogout: () => Promise<void>;
  changeAdminPassword: (current: string, next: string, confirm: string) => Promise<AdminActionResult>;
  resetVisits: (password: string) => Promise<AdminActionResult>;
  resetVisitors: (password: string) => Promise<AdminActionResult>;
  updateConfig: (newConfig: Partial<EventConfig>) => Promise<void>;
  updateStand: (id: number, updates: Partial<Stand>) => Promise<void>;
  createStand: (data: Omit<Stand, 'id' | 'token'>) => Promise<Stand>;
  deleteStand: (id: number) => Promise<void>;
  regenerateStandToken: (id: number) => Promise<string>;
  moderateComment: (visitId: number, action: 'hide' | 'unhide' | 'review' | 'delete') => Promise<void>;
  exportCSV: (type: 'visitas' | 'summary') => void;
  getVisitorVisits: (visitorId: number) => VisitWithDetails[];
}

const PassportContext = createContext<PassportContextType | null>(null);

const readStoredVisitor = (): Visitor | null => {
  const token = localStorage.getItem(VT_KEY);
  if (!token) return null;
  const name = localStorage.getItem(NAME_KEY);
  const created_at = localStorage.getItem(CREATED_KEY) || new Date().toISOString();
  return { id: -1, name, token, created_at };
};

export const PassportProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<EventConfig>(DEFAULT_CONFIG);
  const [stands, setStandsState] = useState<Stand[]>([]);
  const standsRef = useRef<Stand[]>([]);
  const [catalogStatus, setCatalogStatusState] = useState<CatalogStatus>('loading');
  const catalogStatusRef = useRef<CatalogStatus>('loading');
  // Wrapper de setStands que mantiene el ref al día: así recordVisit puede leer
  // el catálogo actual aunque haya arrancado mientras todavía estaba cargando.
  const setStands = (next: Stand[] | ((prev: Stand[]) => Stand[])) => {
    const value = typeof next === 'function' ? next(standsRef.current) : next;
    standsRef.current = value;
    setStandsState(value);
  };
  const setCatalogStatus = (status: CatalogStatus) => {
    catalogStatusRef.current = status;
    setCatalogStatusState(status);
  };
  const [currentVisitor, setCurrentVisitorState] = useState<Visitor | null>(readStoredVisitor);
  const [visitorVisits, setVisitorVisits] = useState<Visit[]>([]);
  const [adminVisits, setAdminVisits] = useState<Visit[]>([]);
  const [adminVisitors, setAdminVisitors] = useState<Visitor[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  // ---------- catálogo + config ----------

  // Evita disparar refreshCatalog en paralelo (arranque + evento online + admin).
  const catalogFetchingRef = useRef(false);

  const refreshCatalog = async () => {
    if (catalogFetchingRef.current) return;
    catalogFetchingRef.current = true;
    try {
      // Red primero: la fuente principal cuando hay conexión. Si falla, IndexedDB
      // como respaldo. Un catálogo fresco de red siempre reemplaza al local.
      const result = await loadCatalog({
        fetchStands: async () => {
          const res = await fetch('/api/stands');
          if (!res || !res.ok) throw new Error('HTTP ' + (res ? res.status : 0));
          return (await res.json()).stands || [];
        },
        loadLocal: () => {
          const store = off();
          return store ? store.getStands().catch(() => []) : Promise.resolve([] as any[]);
        },
        saveLocal: async raw => {
          await off()?.saveStands(raw);
        },
      });
      setStands(result.stands.map(standFromApi));
      setCatalogStatus(result.status);
    } finally {
      catalogFetchingRef.current = false;
    }
  };

  const refreshConfig = async () => {
    const res = await fetch('/api/config').catch(() => null);
    if (res && res.ok) {
      const d = await res.json();
      if (d?.config) setConfig(d.config);
    }
  };

  // ---------- pasaporte del visitante ----------

  const persistVisitor = (v: Visitor) => {
    localStorage.setItem(VT_KEY, v.token);
    if (v.name) localStorage.setItem(NAME_KEY, v.name);
    else localStorage.removeItem(NAME_KEY);
    localStorage.setItem(CREATED_KEY, v.created_at || new Date().toISOString());
  };

  const clearVisitor = () => {
    localStorage.removeItem(VT_KEY);
    localStorage.removeItem(NAME_KEY);
    localStorage.removeItem(CREATED_KEY);
  };

  const refreshPassport = async (vt: string) => {
    let serverVisits: any[] = [];
    let serverVisitor: any = null;
    try {
      const res = await fetch('/api/passport?vt=' + encodeURIComponent(vt));
      if (res.status === 200) {
        const d = await res.json();
        serverVisits = d.visits || [];
        serverVisitor = d.visitor || null;
      }
    } catch {
      /* sin red: se usa el espejo local */
    }
    let merged = serverVisits;
    let localName: string | null = null;
    try {
      const local = await off()?.localPassport(vt);
      if (local) {
        localName = local.visitor?.name ?? null;
        merged = off().mergeVisits(serverVisits, local.visits || []);
      }
    } catch {
      /* sin IndexedDB: todo el flujo online */
    }

    setVisitorVisits(merged.map(v => visitFromServer(serverVisitor?.id ?? currentVisitor?.id ?? -1, v)));

    if (serverVisitor) {
      const v: Visitor = {
        id: serverVisitor.id,
        name: serverVisitor.name ?? currentVisitor?.name ?? null,
        token: serverVisitor.token,
        created_at: currentVisitor?.created_at || new Date().toISOString(),
      };
      setCurrentVisitorState(v);
      persistVisitor(v);
    } else if (localName != null && currentVisitor) {
      setCurrentVisitorState(prev => (prev ? { ...prev, name: localName } : prev));
    }
  };

  // Espejo de una visita del servidor en el store local (para sortear offline después).
  const mirrorVisit = (vt: string, visit: Visit, details?: any) => {
    off()?.saveVisit(vt, {
      stand_id: visit.stand_id,
      stand_name: details?.stand_name,
      course: details?.course,
      flag: details?.flag,
      stamp_icon: details?.stamp_icon,
      stamp_color: details?.stamp_color,
      stamp_type: details?.stamp_type,
      stamp_image: details?.stamp_image,
      rating: visit.rating,
      comment: visit.comment,
      created_at: visit.created_at,
      visit_method: visit.visit_method,
    });
  };

  // ---------- visitante ----------

  const createVisitor = async (name?: string): Promise<Visitor> => {
    const cleanName = name?.trim() ? name.trim().slice(0, 40) : null;
    const res = await fetch('/api/visitors', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ name: cleanName || '' }),
    }).catch(() => null);
    if (!res || !res.ok) {
      throw new Error('No se pudo crear tu pasaporte. Verificá tu conexión a internet.');
    }
    const d = await res.json();
    const visitor: Visitor = {
      id: d.visitor.id,
      name: d.visitor.name,
      token: d.visitor.token,
      created_at: new Date().toISOString(),
    };
    setCurrentVisitorState(visitor);
    persistVisitor(visitor);
    off()?.saveVisitor(visitor.token, visitor);
    setVisitorVisits([]);
    return visitor;
  };

  const setCurrentVisitor = (v: Visitor | null) => {
    if (!v) {
      clearVisitor();
      setCurrentVisitorState(null);
      setVisitorVisits([]);
      return;
    }
    persistVisitor(v);
    setCurrentVisitorState(v);
    void refreshPassport(v.token);
  };

  const updateVisitorName = async (name: string) => {
    const cleanName = name.trim() ? name.trim().slice(0, 40) : null;
    if (!currentVisitor) return;
    const updated = { ...currentVisitor, name: cleanName };
    setCurrentVisitorState(updated);
    persistVisitor(updated);
    off()?.saveVisitor(updated.token, updated);
    // El servidor guarda el nombre: se actualiza si hay red; sin red queda local.
    await fetch('/api/visitors', {
      method: 'PATCH',
      headers: JSON_HEADERS,
      body: JSON.stringify({ vt: updated.token, name: cleanName || '' }),
    }).catch(() => null);
  };

  const recordVisit = async ({
    token,
    word,
    visitorToken,
  }: {
    token?: string;
    word?: string;
    visitorToken?: string;
  }): Promise<RecordVisitResult> => {
    const target =
      visitorToken && isAdmin
        ? adminVisitors.find(v => v.token === visitorToken) || currentVisitor
        : currentVisitor;
    if (!target) return { success: false, error: 'Pasaporte no encontrado. Crea uno primero.' };

    if (!hasWordInput(word) && !(token && token.length > 0)) {
      return { success: false, error: 'Debe ingresar un código QR o palabra secreta.' };
    }

    // QR y palabra comparten el mismo flujo seguro: si el catálogo todavía está
    // cargando se espera (con tope); si quedó sin datos, error explícito de
    // catálogo y NUNCA "Código QR no reconocido" por un catálogo aún vacío.
    let outcome = resolveStand(catalogStatusRef.current, standsRef.current, { token, word });
    if (outcome.state === 'pending') {
      const deadline = Date.now() + CATALOG_WAIT_MS;
      while (catalogStatusRef.current === 'loading' && Date.now() < deadline) {
        await new Promise(r => setTimeout(r, 100));
      }
      outcome = resolveStand(catalogStatusRef.current, standsRef.current, { token, word });
    }
    if (outcome.state === 'pending' || outcome.state === 'unavailable') {
      return { success: false, error: CATALOG_UNAVAILABLE_ERROR };
    }
    if (outcome.state === 'not-found') {
      return {
        success: false,
        error:
          outcome.method === 'secret'
            ? 'La palabra secreta no coincide con ningún stand.'
            : 'Código QR no reconocido o stand inactivo.',
      };
    }

    const stand: Stand = outcome.stand;
    const visitMethod: 'qr' | 'secret' = outcome.method;

    const existing =
      visitorVisits.find(v => v.stand_id === stand!.id) || (await off()?.getVisit(target.token, stand!.id).catch(() => null));
    if (existing) {
      return {
        success: false,
        already: true,
        error: config.texts.already_visited,
        stand,
        visit: visitFromServer(target.id, existing),
      };
    }

    try {
      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify(word ? { vt: target.token, word } : { vt: target.token, tok: token }),
      });
      if (res.status === 201) {
        const d = await res.json();
        const visit = visitFromServer(target.id, d.visit || { stand_id: stand!.id, visit_method: visitMethod, created_at: new Date().toISOString() });
        mirrorVisit(target.token, visit, d.visit);
        await refreshPassport(target.token);
        return { success: true, stand, visit };
      }
      if (res.status === 409) {
        const d = await res.json();
        const visit = visitFromServer(target.id, d.visit || { stand_id: stand!.id, rating: null, comment: null, visit_method: visitMethod, created_at: '' });
        return { success: false, already: true, error: config.texts.already_visited, stand, visit };
      }
      const d = await res.json().catch(() => ({}));
      return { success: false, error: d.error || 'No se pudo registrar la visita.' };
    } catch {
      try {
        const out = word
          ? await off()?.visitByWordOffline(target.token, word)
          : await off()?.visitOffline(target.token, token);
        if (out?.already) return { success: false, already: true, error: config.texts.already_visited, stand, visit: visitFromServer(target.id, out.visit) };
        if (!out) return { success: false, error: 'No se pudo guardar la visita sin conexión.' };
        setVisitorVisits(prev => {
          const map = new Map(prev.map(v => [v.stand_id, v]));
          map.set(out.visit.stand_id, visitFromServer(target.id, out.visit));
          return Array.from(map.values());
        });
        return { success: true, stand, visit: visitFromServer(target.id, out.visit) };
      } catch (err: any) {
        return { success: false, error: err?.message || 'No se pudo guardar la visita sin conexión.' };
      }
    }
  };

  const evaluateVisit = async ({
    standId,
    rating,
    comment,
    visitorToken,
  }: {
    standId: number;
    rating: number;
    comment?: string;
    visitorToken?: string;
  }): Promise<AdminActionResult> => {
    const target =
      visitorToken && isAdmin
        ? adminVisitors.find(v => v.token === visitorToken) || currentVisitor
        : currentVisitor;
    if (!target) return { success: false, error: 'Visitante no identificado.' };
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return { success: false, error: 'La calificación debe ser de 1 a 5 estrellas.' };
    }
    const stand = stands.find(s => s.id === standId);
    if (!stand) return { success: false, error: 'No se encontró el stand para evaluar.' };

    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ vt: target.token, tok: stand.token, rating, comment: comment ?? '' }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        return { success: false, error: d.error || 'No se pudo guardar la evaluación.' };
      }
      await refreshPassport(target.token);
      return { success: true };
    } catch {
      try {
        await off()?.evaluateOffline(target.token, stand.token, rating, comment ?? '');
        await refreshPassport(target.token);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || 'No se pudo guardar la evaluación sin conexión.' };
      }
    }
  };

  // ---------- admin ----------

  const refreshAdminData = async () => {
    const [dashRes, commentsRes, visitorsRes] = await Promise.all([
      fetch('/api/admin/dashboard').catch(() => null),
      fetch('/api/admin/comments').catch(() => null),
      fetch('/api/admin/visitors').catch(() => null),
    ]);
    const dash = dashRes?.ok ? await dashRes.json().catch(() => ({})) : {};
    const comments = commentsRes?.ok ? (await commentsRes.json().catch(() => ({}))).comments || [] : [];
    const visitors = visitorsRes?.ok ? (await visitorsRes.json().catch(() => ({}))).visitors || [] : [];

    setAdminVisitors((visitors as any[]).map(v => ({ id: v.id, name: v.name, token: v.token, created_at: v.created_at })));

    // Recientes + comentarios deduplicados. La clave es el id de la visita
    // cuando el backend lo devuelve; si no, (visitor_id, stand_id).
    const rows = new Map<string, any>();
    for (const r of dash.recent || []) {
      rows.set('v:' + r.visitor_id + ':' + r.stand_id, { ...r, is_hidden: !!r.is_hidden, is_reviewed: !!r.is_reviewed });
    }
    for (const c of comments) {
      rows.set(c.id != null ? 'id:' + c.id : 'v:' + c.visitor_id + ':' + c.stand_id, c);
    }
    // Reindexar por id cuando un comentario y un reciente apuntan a la misma visita.
    const byId = new Map<string, any>();
    for (const [key, r] of rows) {
      const idKey = r.id != null ? 'id:' + r.id : key;
      byId.set(idKey, { ...(byId.get(idKey) || {}), ...r, id: r.id ?? byId.get(idKey)?.id });
    }
    const adminV = Array.from(byId.values())
      .map(r => visitFromServer(r.visitor_id ?? -1, r))
      .sort((a, b) => (b.id || 0) - (a.id || 0));
    setAdminVisits(adminV);
    // La grilla de stands del Centro de Mando necesita ver también los ocultos:
    // /api/stands devuelve todos cuando hay sesión de admin (ver worker.js).
    await refreshCatalog();
  };

  const checkAdmin = async () => {
    const res = await fetch('/api/admin/dashboard').catch(() => null);
    if (res && res.ok) {
      setIsAdmin(true);
      await refreshAdminData();
    } else {
      setIsAdmin(false);
    }
  };

  const adminLogin = async (password: string): Promise<AdminActionResult> => {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ password }),
    }).catch(() => null);
    if (!res) return { success: false, error: 'Sin conexión. Verificá tu internet.' };
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      return { success: false, error: d.error || 'Contraseña incorrecta.' };
    }
    setIsAdmin(true);
    await refreshAdminData();
    return { success: true };
  };

  const adminLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' }).catch(() => null);
    setIsAdmin(false);
  };

  const changeAdminPassword = async (
    current: string,
    next: string,
    confirm: string
  ): Promise<AdminActionResult> => {
    if (next.length < 8) return { success: false, error: 'La nueva contraseña debe tener al menos 8 caracteres.' };
    if (next !== confirm) return { success: false, error: 'Las contraseñas no coinciden.' };
    const res = await fetch('/api/admin/password', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ current, next, confirm }),
    }).catch(() => null);
    if (!res) return { success: false, error: 'Sin conexión. Verificá tu internet.' };
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      return { success: false, error: d.error || 'No se pudo cambiar la contraseña.' };
    }
    // El servidor invalidó la sesión actual → hay que volver a entrar.
    setIsAdmin(false);
    return { success: true };
  };

  const resetVisits = async (password: string): Promise<AdminActionResult> => {
    const res = await fetch('/api/admin/reset-visits', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ password }),
    }).catch(() => null);
    if (!res) return { success: false, error: 'Sin conexión. Verificá tu internet.' };
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      return { success: false, error: d.error || 'No se pudieron eliminar las visitas.' };
    }
    await refreshAdminData();
    return { success: true };
  };

  const resetVisitors = async (password: string): Promise<AdminActionResult> => {
    const res = await fetch('/api/admin/reset-visitors', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ password }),
    }).catch(() => null);
    if (!res) return { success: false, error: 'Sin conexión. Verificá tu internet.' };
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      return { success: false, error: d.error || 'No se pudieron eliminar los visitantes.' };
    }
    await refreshAdminData();
    return { success: true };
  };

  // ---------- CRUD de stands y config ----------

  const updateConfig = async (newConfig: Partial<EventConfig>) => {
    const merged: EventConfig = {
      ...config,
      ...newConfig,
      texts: { ...config.texts, ...(newConfig.texts || {}) },
    };
    const res = await fetch('/api/admin/config', {
      method: 'PUT',
      headers: JSON_HEADERS,
      body: JSON.stringify({ config: merged }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d.error || 'No se pudo guardar la configuración.');
    setConfig(d.config);
  };

  const updateStand = async (id: number, updates: Partial<Stand>) => {
    const res = await fetch('/api/admin/stands/' + id, {
      method: 'PUT',
      headers: JSON_HEADERS,
      body: JSON.stringify(standToApi(updates)),
    }).catch(() => null);
    if (!res || !res.ok) return;
    await refreshCatalog();
  };

  const createStand = async (data: Omit<Stand, 'id' | 'token'>): Promise<Stand> => {
    const payload = standToApi(data);
    let stampImage = payload.stamp_image;
    if (payload.stamp_type === 'image' && stampImage && !String(stampImage).startsWith('data:')) {
      try {
        const dl = await urlToDataUrl(stampImage);
        stampImage = await compressDataUrl(dl, 600, 'image/jpeg', 0.85);
      } catch {
        throw new Error('No se pudo cargar la imagen de muestra. Subí una imagen desde tu dispositivo.');
      }
    }
    const res = await fetch('/api/admin/stands', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ ...payload, stamp_image: stampImage }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d.error || 'No se pudo crear el stand.');
    await refreshCatalog();
    return {
      ...(data as Stand),
      id: d.stand.id,
      slug: d.stand.slug,
      token: d.stand.token,
      stamp_image: stampImage || data.stamp_image,
    };
  };

  const deleteStand = async (id: number) => {
    await fetch('/api/admin/stands/' + id, { method: 'DELETE' }).catch(() => null);
    await refreshCatalog();
  };

  const regenerateStandToken = async (id: number): Promise<string> => {
    const res = await fetch('/api/admin/stands/' + id + '/token', { method: 'POST' }).catch(() => null);
    const d = res?.ok ? await res.json().catch(() => ({})) : {};
    if (d.token) setStands(prev => prev.map(s => (s.id === id ? { ...s, token: d.token } : s)));
    return d.token || '';
  };

  const moderateComment = async (visitId: number, action: 'hide' | 'unhide' | 'review' | 'delete') => {
    const a = action === 'unhide' ? 'hide' : action;
    await fetch('/api/admin/comments/' + visitId + '/' + a, { method: 'POST' }).catch(() => null);
    await refreshAdminData();
  };

  const exportCSV = (type: 'visitas' | 'summary') => {
    // Descarga directa con la cookie de sesión del navegador.
    window.location.href = '/api/admin/export/' + type + '.csv';
  };

  // ---------- arranque ----------

  useEffect(() => {
    off()?.init();
    void refreshConfig();
    void refreshCatalog();
    if (currentVisitor?.token) void refreshPassport(currentVisitor.token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cuando vuelve la conexión, se refresca el catálogo: la red reemplaza el
  // catálogo local (el fino control de concurrencia está en refreshCatalog).
  useEffect(() => {
    const onOnline = () => {
      void refreshCatalog();
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- valor del contexto ----------

  // El mismo vector data alimenta la vista visitante (espejo del pasaporte) y
  // los paneles admin (dataset completo). Al entrar en modo admin se muestra el
  // set completo; el resto del tiempo, el pasaporte local.
  const displayVisits = isAdmin ? adminVisits : visitorVisits;
  const displayVisitors = isAdmin ? adminVisitors : currentVisitor ? [currentVisitor] : [];

  const getVisitorVisits = (visitorId: number): VisitWithDetails[] =>
    displayVisits
      .filter(v => v.visitor_id === visitorId)
      .map(v => {
        const row = v as any;
        const stand = stands.find(s => s.id === v.stand_id);
        return {
          ...v,
          stand_name: row.stand_name || stand?.name || 'Stand #' + v.stand_id,
          course: row.course || stand?.course || '',
          flag: row.flag || stand?.flag || 'ar',
          area: row.area || stand?.area || '',
          visitor_name: currentVisitor?.id === visitorId ? currentVisitor.name : null,
        };
      });

  return (
    <PassportContext.Provider
      value={{
        config,
        stands,
        catalogStatus,
        catalogReady: catalogStatus === 'ready',
        visitors: displayVisitors,
        visits: displayVisits,
        currentVisitor,
        setCurrentVisitor,
        createVisitor,
        updateVisitorName,
        recordVisit,
        evaluateVisit,
        isAdmin,
        checkAdmin,
        adminLogin,
        adminLogout,
        changeAdminPassword,
        resetVisits,
        resetVisitors,
        updateConfig,
        updateStand,
        createStand,
        deleteStand,
        regenerateStandToken,
        moderateComment,
        exportCSV,
        getVisitorVisits,
      }}
    >
      {children}
    </PassportContext.Provider>
  );
};

export const usePassport = () => {
  const context = useContext(PassportContext);
  if (!context) throw new Error('usePassport must be used within a PassportProvider');
  return context;
};