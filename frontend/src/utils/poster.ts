// Afiche A4 "Material para la Muestra".
//
// Genera un SVG puro (viewBox A4 vertical) a partir del branding configurado
// en el Centro de Mando: usa event_name, institution_name, logo,
// primary_color, secondary_color, accent_color, background_color,
// text_color y text_secondary_color. Sin librerías nuevas.
//
// 100% LECTURA: no toca stands, tokens, secret_words, visitas, visitantes,
// ni configuración de producción.
import type { EventConfig } from '../types.ts';
import { GENERAL_URL } from './generalQr.ts';

export const POSTER_WIDTH = 1240; // A4 @ ~150dpi (210mm)
export const POSTER_HEIGHT = 1754; // A4 @ ~150dpi (297mm)

export interface PosterBuildOptions {
  /** SVG del QR GENERAL (con quiet zone y alto contraste). */
  qrSvg: string;
  /** Año para mostrar; por defecto se extrae de event_name o es el actual. */
  year?: string;
}

/** Escapa texto para usarlo dentro de XML/SVG. */
export function xmlEscape(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Extrae el año de un nombre de evento (p.ej. "Muestra Escolar 2026" -> 2026). */
export function extractYear(eventName: string): string {
  const m = String(eventName || '').match(/\b(19|20)\d{2}\b/);
  return m ? m[0] : String(new Date().getFullYear());
}

/**
 * Extrae el contenido interior de un SVG de QR (paths) y su viewBox,
 * para poder incrustarlo en el afiche conservando la quiet zone.
 */
export function extractSvgInner(qrSvg: string): { inner: string; grid: number } {
  const vb = qrSvg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const grid = vb ? Math.round(Number(vb[1])) : 1;
  const inner = qrSvg.replace(/<svg[^>]*>/i, '').replace(/<\/svg>\s*$/i, '').trim();
  return { inner, grid };
}

/** Divide texto en líneas de ancho aproximado (espacios), máximo `maxLines`. */
function wrapLines(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
    if (lines.length === maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  else if (current && lines.length === maxLines) lines[maxLines - 1] += ` ${current}`;
  return lines;
}

/**
 * Construye el afiche A4 vertical como SVG.
 * El QR que recibe se incrusta tal cual (mismo QR que las descargas).
 */
export function buildPosterSvg(config: EventConfig, opts: PosterBuildOptions): string {
  const year = opts.year || extractYear(config.event_name);
  const { inner: qrInner, grid: qrGrid } = extractSvgInner(opts.qrSvg);

  const inst = config.institution_name || 'Institución educativa';
  const eventName = config.event_name || 'Muestra Escolar';
  const invitation =
    config.event_subtitle?.trim() || config.description?.trim() || 'Recorré los stands y completá tu pasaporte.';

  // Reducción de fuente si el nombre del evento es largo.
  const eventFont = eventName.length > 34 ? 34 : eventName.length > 26 ? 40 : 48;

  const invLines = wrapLines(invitation, 42, 2);
  const invFont = invLines.length > 1 ? 30 : 34;
  const invStartY = 608 - (invLines.length - 1) * (invFont + 8);

  const logo = config.logo
    ? `<image href="${xmlEscape(config.logo)}" x="552" y="62" width="136" height="136" preserveAspectRatio="xMidYMid slice" clip-path="url(#logoClip)" />`
    : `<text x="620" y="145" text-anchor="middle" font-family="Verdana, Arial, sans-serif" font-size="64" font-weight="700" fill="${xmlEscape(config.primary_color)}">${xmlEscape(
        (inst.trim().charAt(0) || 'P').toUpperCase()
      )}</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
  width="210mm" height="297mm" viewBox="0 0 ${POSTER_WIDTH} ${POSTER_HEIGHT}"
  role="img" aria-label="Afiche de la ${xmlEscape(eventName)}">
  <defs>
    <clipPath id="logoClip"><circle cx="620" cy="130" r="68" /></clipPath>
  </defs>

  <!-- Fondo -->
  <rect width="${POSTER_WIDTH}" height="${POSTER_HEIGHT}" fill="${xmlEscape(config.background_color)}" />

  <!-- Decoración sutil de viaje -->
  <g opacity="0.35">
    <circle cx="90" cy="1680" r="150" fill="${xmlEscape(config.secondary_color)}" />
    <circle cx="1160" cy="150" r="120" fill="${xmlEscape(config.secondary_color)}" />
    <circle cx="150" cy="520" r="18" fill="none" stroke="${xmlEscape(config.accent_color)}" stroke-width="3" />
    <circle cx="228" cy="500" r="18" fill="none" stroke="${xmlEscape(config.accent_color)}" stroke-width="3" />
    <!-- ruta punteada -->
    <path d="M 90 560 C 320 640, 520 470, 820 520 S 1140 420, 1170 460"
      fill="none" stroke="${xmlEscape(config.secondary_color)}" stroke-width="5"
      stroke-dasharray="2 20" stroke-linecap="round" />
    <circle cx="400" cy="572" r="10" fill="${xmlEscape(config.accent_color)}" />
    <circle cx="640" cy="512" r="10" fill="${xmlEscape(config.accent_color)}" />
    <circle cx="900" cy="506" r="10" fill="${xmlEscape(config.accent_color)}" />
  </g>

  <!-- Banda superior -->
  <rect width="${POSTER_WIDTH}" height="360" fill="${xmlEscape(config.primary_color)}" />
  <g opacity="0.18">
    <circle cx="1120" cy="60" r="130" fill="${xmlEscape(config.secondary_color)}" />
    <circle cx="90" cy="330" r="150" fill="${xmlEscape(config.secondary_color)}" />
  </g>
  <circle cx="620" cy="130" r="78" fill="#ffffff" />
  ${logo}
  <text x="620" y="250" text-anchor="middle" font-family="Verdana, Arial, sans-serif"
    font-size="30" font-weight="600" letter-spacing="4" fill="#ffffff"
    text-transform="uppercase">${xmlEscape(inst.toUpperCase())}</text>
  <text x="620" y="314" text-anchor="middle" font-family="Verdana, Arial, sans-serif"
    font-size="${eventFont}" font-weight="800" fill="#ffffff">${xmlEscape(eventName)} · <tspan fill="${xmlEscape(
    config.secondary_color
  )}">${xmlEscape(year)}</tspan></text>

  <!-- Título -->
  <text x="620" y="478" text-anchor="middle" font-family="Verdana, Arial, sans-serif"
    font-size="118" font-weight="900" letter-spacing="4" fill="${xmlEscape(config.primary_color)}">MI PASAPORTE</text>
  <rect x="440" y="508" width="360" height="10" rx="5" fill="${xmlEscape(config.accent_color)}" />

  <!-- Invitación -->
  ${invLines
    .map(
      (line, i) =>
        `<text x="620" y="${invStartY + i * (invFont + 8)}" text-anchor="middle" font-family="Verdana, Arial, sans-serif" font-size="${invFont}" fill="${xmlEscape(
          config.text_color
        )}">${xmlEscape(line)}</text>`
    )
    .join('\n  ')}

  <!-- QR: tarjeta blanca con borde de la paleta -->
  <rect x="388" y="710" width="480" height="480" rx="40" fill="${xmlEscape(
    config.secondary_color
  )}" opacity="0.35" />
  <rect x="380" y="700" width="480" height="480" rx="40" fill="#ffffff"
    stroke="${xmlEscape(config.primary_color)}" stroke-width="6" />
  <g transform="translate(420 740) scale(${(440 / qrGrid).toFixed(6)})">
    ${qrInner}
  </g>

  <!-- Llamado a escanear -->
  <text x="620" y="1298" text-anchor="middle" font-family="Verdana, Arial, sans-serif"
    font-size="44" font-weight="800" letter-spacing="6" fill="${xmlEscape(config.primary_color)}">ESCANEÁ PARA COMENZAR</text>
  <rect x="330" y="1330" width="580" height="72" rx="36" fill="#ffffff"
    stroke="${xmlEscape(config.secondary_color)}" stroke-width="4" />
  <text x="620" y="1378" text-anchor="middle" font-family="'Courier New', monospace"
    font-size="34" font-weight="700" fill="${xmlEscape(config.text_color)}">${xmlEscape(GENERAL_URL)}</text>

  <!-- Pie -->
  <text x="620" y="1510" text-anchor="middle" font-family="Verdana, Arial, sans-serif"
    font-size="30" font-weight="600" letter-spacing="3" fill="${xmlEscape(config.text_secondary_color)}">recorré • descubrí • aprendé</text>

  <rect y="${POSTER_HEIGHT - 120}" width="${POSTER_WIDTH}" height="120" fill="${xmlEscape(
    config.primary_color
  )}" />
  <text x="620" y="${POSTER_HEIGHT - 55}" text-anchor="middle" font-family="Verdana, Arial, sans-serif"
    font-size="34" font-weight="700" fill="#ffffff">${xmlEscape(inst)} · ${xmlEscape(year)}</text>
</svg>`;
}

/**
 * Convierte el SVG del afiche a PNG (data URL) usando canvas en el navegador.
 * Útil para la descarga PNG y para imprimir con nitidez. Requiere DOM.
 */
export async function posterSvgToPngDataUrl(
  svg: string,
  width: number = POSTER_WIDTH * 2,
  height: number = POSTER_HEIGHT * 2
): Promise<string> {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('No se pudo rasterizar el afiche SVG.'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No hay contexto 2D disponible.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}