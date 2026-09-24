// Sección "Material para la Muestra" del Centro de Mando.
//
// Genera el QR GENERAL (https://pasaporte.onlyfunpeople.com.ar, sin token de
// stand) y el afiche A4 automático con el branding configurado. Solamente
// LECTURA: no modifica stands, tokens, secret_words, visitas, visitantes,
// evaluaciones ni configuración.
import React, { useEffect, useState } from 'react';
import type { EventConfig } from '../types';
import { GENERAL_URL, generalQrPng, generalQrSvg } from '../utils/generalQr';
import { buildPosterSvg, extractYear, posterSvgToPngDataUrl } from '../utils/poster';
import { QrCode, Download, Printer, FileDown, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface MaterialMuestraViewProps {
  config: EventConfig;
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const MaterialMuestraView: React.FC<MaterialMuestraViewProps> = ({ config }) => {
  const [qrSvg, setQrSvg] = useState('');
  const [qrPng, setQrPng] = useState('');
  const [posterSvg, setPosterSvg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [posterPng, setPosterPng] = useState<string | null>(null);

  const year = extractYear(config.event_name);

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    setError(null);
    setPosterPng(null);
    (async () => {
      try {
        const [svg, png] = await Promise.all([
          generalQrSvg({ width: 1024 }),
          generalQrPng({ width: 1024 }),
        ]);
        if (cancelled) return;
        setQrSvg(svg);
        setQrPng(png);
        setPosterSvg(buildPosterSvg(config, { qrSvg: svg }));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [config]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPosterPng = async () => {
    if (!posterSvg) return;
    setPosterPng('pending');
    try {
      const png = await posterSvgToPngDataUrl(posterSvg);
      setPosterPng(null);
      downloadDataUrl(png, `afiche-${year}.png`);
    } catch (e) {
      setPosterPng(null);
      setError(e instanceof Error ? e.message : 'Error generando el PNG del afiche.');
    }
  };

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #material-muestra-print-area, #material-muestra-print-area * { visibility: visible; }
          #material-muestra-print-area { position: absolute; left: 0; top: 0; width: 210mm; }
          @page { size: A4 portrait; margin: 0; }
        }
      `}</style>

      <div className="pb-20 print:hidden">
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              📦 Material para la Muestra
            </h2>
            <p className="text-xs text-slate-500">
              QR GENERAL de entrada y afiche A4 con la identidad del evento. Solo lectura.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => downloadBlob(qrSvg, 'qr-general-pasaporte.svg', 'image/svg+xml')}
              disabled={busy || !qrSvg}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold shadow flex items-center gap-1.5 transition disabled:opacity-40 cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5" /> QR SVG
            </button>
            <button
              onClick={() => downloadDataUrl(qrPng, 'qr-general-pasaporte.png')}
              disabled={busy || !qrPng}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold shadow flex items-center gap-1.5 transition disabled:opacity-40 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> QR PNG
            </button>
            <button
              onClick={() => downloadBlob(posterSvg, `afiche-${year}.svg`, 'image/svg+xml')}
              disabled={busy || !posterSvg}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow flex items-center gap-1.5 transition disabled:opacity-40 cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5" /> Afiche SVG
            </button>
            <button
              onClick={handleDownloadPosterPng}
              disabled={busy || !posterSvg || posterPng === 'pending'}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow flex items-center gap-1.5 transition disabled:opacity-40 cursor-pointer"
            >
              {posterPng === 'pending' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              Afiche PNG
            </button>
            <button
              onClick={handlePrint}
              disabled={busy || !posterSvg}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow flex items-center gap-1.5 transition disabled:opacity-40 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Imprimir
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* QR */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-4">
              <QrCode className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">QR GENERAL de entrada</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4 break-all font-mono">{GENERAL_URL}</p>
            <div className="w-full flex justify-center">
              {busy || !qrPng ? (
                <div className="w-52 h-52 flex items-center justify-center text-slate-400 font-mono text-xs">
                  {busy ? 'Generando QR...' : 'Sin QR'}
                </div>
              ) : (
                <img
                  src={qrPng}
                  alt="QR GENERAL de la muestra"
                  className="w-52 h-52 sm:w-64 sm:h-64 object-contain"
                  loading="lazy"
                />
              )}
            </div>
            <p className="text-[11px] text-slate-400 text-center mt-3">
              Escaneá y entrá directo al pasaporte. Se descarga en SVG (vectorial) o PNG (alta resolución).
            </p>
          </div>

          {/* Info del afiche */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-4">
              <Printer className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Afiche A4 automático</h3>
            </div>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                Usa el branding: <strong>{config.event_name}</strong>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                Institución: <strong>{config.institution_name || '—'}</strong>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                Año detectado: <strong>{year}</strong>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                Paleta actual: <strong>{config.primary_color}</strong>,{' '}
                <strong>{config.secondary_color}</strong>, <strong>{config.accent_color}</strong>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                El QR incrustado es el mismo QR GENERAL descargable.
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                Si cambiás la paleta o el nombre, el afiche se regenera automáticamente.
              </li>
            </ul>
          </div>
        </div>

        {/* Preview del afiche */}
        <div className="mt-6">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">Vista previa del afiche</h3>
          <div className="bg-slate-100 dark:bg-slate-950 rounded-2xl p-4 flex justify-center overflow-auto">
            {busy || !posterSvg ? (
              <div className="w-[210mm] h-[297mm] flex items-center justify-center text-slate-400 font-mono text-xs">
                {busy ? 'Generando afiche...' : 'Sin afiche'}
              </div>
            ) : (
              <img
                src={svgDataUrl(posterSvg)}
                alt={`Afiche de la ${config.event_name}`}
                className="max-w-full h-auto rounded-lg shadow-lg"
                style={{ maxHeight: '70vh' }}
                loading="lazy"
              />
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            A4 vertical (210 × 297 mm). La descarga PNG se genera desde este mismo SVG (sin capturas de pantalla).
          </p>
        </div>
      </div>

      {/* Zona solo impresión: mismo SVG de la preview */}
      <div id="material-muestra-print-area" className="hidden print:block">
        {posterSvg && (
          <img src={svgDataUrl(posterSvg)} alt={`Afiche de la ${config.event_name}`} style={{ width: '210mm' }} />
        )}
      </div>
    </>
  );
};