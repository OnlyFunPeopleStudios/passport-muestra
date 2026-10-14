// Mapeo Stand <-> API (payload del worker).
//
// Módulo PURO (sin fetch, sin React): así lo cubre scripts/standApi.test.mjs.
// La lista de campos de standToApi debe cubrir TODO lo que el worker acepta en
// POST/PUT /api/stands y que el admin puede editar en el Centro de Mando.
// Bug corregido: faltaban schedule / location / stamp_style, así que el horario
// y la ubicación "volvían" al valor por defecto al recargar.
import type { Stand, StampType } from '../types';

export const FRONT_STAMP_TYPE: Record<string, StampType> = {
  flag: 'bandera',
  icon: 'icono',
  image: 'imagen',
  color: 'color',
};

export const BACK_STAMP_TYPE: Record<string, string> = {
  bandera: 'flag',
  icono: 'icon',
  imagen: 'image',
  color: 'color',
};

export function standFromApi(s: any): Stand {
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
    flyer_url: s.flyer_url || undefined,
    flyer_image: s.flyer_image || undefined,
    has_flyer_image: !!s.has_flyer_image || !!s.flyer_image,
    sort_order: Number(s.sort_order) || 0,
    is_published: !!s.is_published,
  };
}

export function standToApi(s: Partial<Stand>) {
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
    stamp_style: s.stamp_style,
    schedule: s.schedule,
    location: s.location,
    sort_order: s.sort_order,
    secret_word: s.secret_word,
    flyer_url: s.flyer_url,
    flyer_image: s.flyer_image,
  };
}
