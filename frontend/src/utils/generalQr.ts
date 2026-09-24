// Utilidades del QR GENERAL de acceso a la muestra.
//
// Reutiliza la librería `qrcode` (node-qrcode, MIT) que el Centro de Mando
// React ya usa en QRGeneratorView / QRPosterModal (frontend/package.json ->
// "qrcode": "^1.5.4"). NO agrega librerías nuevas.
//
// Es 100% LECTURA: no toca stands, tokens, secret_words, visitas,
// visitantes, evaluaciones ni configuración de producción.
import QRCode from 'qrcode';

/** URL exacta que debe codificar el QR GENERAL (sin token de stand). */
export const GENERAL_URL = 'https://pasaporte.onlyfunpeople.com.ar';

/** Corrección de errores nivel M (equilibrado). */
export const QR_EC_LEVEL = 'M';

/** Quiet zone: módulos de margen en blanco alrededor del QR (4 = estándar). */
export const QR_MARGIN = 4;

export interface GeneralQrOptions {
  width?: number;
  margin?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  color?: { dark?: string; light?: string };
}

const DEFAULTS: Required<Pick<GeneralQrOptions, 'width' | 'margin' | 'errorCorrectionLevel'>> & {
  color: { dark: string; light: string };
} = {
  width: 1024,
  margin: QR_MARGIN,
  errorCorrectionLevel: QR_EC_LEVEL,
  color: { dark: '#000000', light: '#ffffff' },
};

function mergeOpts(opts: GeneralQrOptions = {}): Required<GeneralQrOptions> {
  return {
    width: opts.width ?? DEFAULTS.width,
    margin: opts.margin ?? DEFAULTS.margin,
    errorCorrectionLevel: opts.errorCorrectionLevel ?? DEFAULTS.errorCorrectionLevel,
    color: {
      dark: opts.color?.dark ?? DEFAULTS.color.dark,
      light: opts.color?.light ?? DEFAULTS.color.light,
    },
  };
}

/**
 * SVG del QR GENERAL listo para descargar o incrustar en el afiche.
 * Alto contraste (negro sobre blanco) + quiet zone para escaneo real.
 */
export async function generalQrSvg(opts: GeneralQrOptions = {}): Promise<string> {
  const o = mergeOpts(opts);
  return QRCode.toString(GENERAL_URL, {
    type: 'svg',
    width: o.width,
    margin: o.margin,
    errorCorrectionLevel: o.errorCorrectionLevel,
    color: o.color,
  });
}

/** PNG (data URL) del QR GENERAL, listo para descargar o previsualizar. */
export async function generalQrPng(opts: GeneralQrOptions = {}): Promise<string> {
  const o = mergeOpts(opts);
  return QRCode.toDataURL(GENERAL_URL, {
    width: o.width,
    margin: o.margin,
    errorCorrectionLevel: o.errorCorrectionLevel,
    color: o.color,
  });
}

/**
 * Matriz de módulos del QR (para tests y verificación por decodificado).
 * Expone exactamente lo que genera `qrcode` para un texto dado.
 */
export function buildQrMatrix(text: string, errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H' = QR_EC_LEVEL) {
  return QRCode.create(text, { errorCorrectionLevel });
}