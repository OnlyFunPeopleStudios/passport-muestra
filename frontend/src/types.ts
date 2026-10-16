export type StampStyle = 'circular' | 'redondo' | 'estampilla' | 'cuadrado' | 'hexagonal' | 'escudo';

export type StampType = 'bandera' | 'icono' | 'color' | 'imagen';

export interface EventTexts {
  welcome_text: string;
  button_text: string;
  footer_text: string;
  name_label: string;
  create_anon_hint: string;
  passport_title: string;
  scan_title: string;
  scan_note: string;
  visit_ok: string;
  already_visited: string;
  not_evaluated: string;
  eval_question: string;
  comment_label: string;
  submit_eval: string;
  eval_saved: string;
  progress_suffix: string;
  completed: string;
}

export interface ProgramItem {
  time: string;
  title: string;
  note: string;
}

export interface EventConfig {
  event_name: string;
  event_subtitle: string;
  institution_name: string;
  description: string;
  logo: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  text_secondary_color: string;
  stamp_style: StampStyle;
  texts: EventTexts;
  program: ProgramItem[];
}

export interface Stand {
  id: number;
  slug: string;
  name: string;
  course: string;
  description: string;
  area: string;
  flag: string;
  token: string;
  secret_word: string;
  schedule?: string;      // e.g. "10:00 - 11:30 hs"
  location?: string;      // e.g. "Patio Central - Stand #4"
  topic?: string;         // tema principal del stand (e.g. "Cultura Colombiana")
  activities?: string;    // qué va a encontrar o hacer el visitante
  highlight?: string;     // dato/lugar/personaje más importante del país
  fun_facts?: string;     // datos curiosos
  invite_text?: string;   // frase corta de invitación al stand
  stamp_type?: StampType;
  stamp_icon?: string;
  stamp_color?: string;
  stamp_image?: string;
  stamp_style?: StampStyle;
  stamp_id?: number | null;   // sello de la biblioteca reutilizable (si está, manda sobre stamp_image/stamp_style)
  flyer_url?: string;         // link externo del flyer/material (Drive, Canva, etc.)
  flyer_image?: string;       // dataURL de la imagen del flyer (solo llega con sesión admin)
  has_flyer_image?: boolean;  // el catálogo público expone el flag, no el base64
  sort_order: number;
  is_published: boolean;
}

// Sello reutilizable (biblioteca V1.3): una imagen + una forma que se asignan a
// varios stands. Ver worker GET/POST/DELETE /api/admin/stamps.
export interface Stamp {
  id: number;
  name: string;
  image: string;
  style: StampStyle;
  created_at?: string;
}

export interface Visitor {
  id: number;
  name: string | null;
  token: string;
  created_at: string;
}

export interface Visit {
  id: number;
  visitor_id: number;
  stand_id: number;
  rating: number | null;
  comment: string | null;
  is_hidden: boolean;
  is_reviewed: boolean;
  visit_method: 'qr' | 'secret';
  created_at: string;
}

export interface VisitWithDetails extends Visit {
  stand_name: string;
  course: string;
  flag: string;
  area: string;
  visitor_name: string | null;
}
