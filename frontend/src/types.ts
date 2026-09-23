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
  stamp_type?: StampType;
  stamp_icon?: string;
  stamp_color?: string;
  stamp_image?: string;
  stamp_style?: StampStyle;
  sort_order: number;
  is_published: boolean;
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
