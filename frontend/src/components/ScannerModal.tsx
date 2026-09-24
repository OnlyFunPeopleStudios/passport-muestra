import React, { useEffect, useRef, useState } from 'react';
import { usePassport } from '../context/PassportContext';
import { Stand, Visit } from '../types';
import { FlagIcon } from '../data/flags';
import {
  QrCode,
  Key,
  X,
  Camera,
  CheckCircle2,
  AlertCircle,
  Star,
  Sparkles,
  MapPin,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { isCatalogFailure } from '../context/catalog';

interface ScannerModalProps {
  onClose: () => void;
  onOpenEvaluation: (stand: Stand) => void;
  initialTok?: string | null;
  onInitialHandled?: () => void;
}

const loadHtml5Qrcode = (): Promise<any> =>
  new Promise((resolve, reject) => {
    if ((window as any).Html5Qrcode) return resolve((window as any).Html5Qrcode);
    const s = document.createElement('script');
    s.src = '/vendor/html5-qrcode.min.js';
    s.onload = () => resolve((window as any).Html5Qrcode);
    s.onerror = () => reject(new Error('No se pudo cargar el lector de QR. Usá la palabra secreta.'));
    document.head.appendChild(s);
  });

export const ScannerModal: React.FC<ScannerModalProps> = ({
  onClose,
  onOpenEvaluation,
  initialTok,
  onInitialHandled,
}) => {
  const { stands, config, recordVisit, catalogStatus, catalogSource, refreshCatalog } = usePassport();
  const recordVisitRef = useRef(recordVisit);
  recordVisitRef.current = recordVisit;

  const [activeTab, setActiveTab] = useState<'qr' | 'secret'>('qr');
  const [secretWord, setSecretWord] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const scannerRegionRef = useRef<HTMLDivElement>(null);
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    already?: boolean;
    stand?: Stand;
    visit?: Visit;
    error?: string;
    errorTitle?: string;
  } | null>(null);

  const handleToken = async (tok: string) => {
    const res = await recordVisitRef.current({ token: tok });
    setScanResult(res);
    if (res.success && res.stand) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
    onInitialHandled?.();
  };

  // Código heredado: ?tok= desde un QR ya impreso (#/scan?tok=...).
  // No resuelve mientras el catálogo todavía carga: espera catalogReady y recién
  // ahí intenta. Durante la espera se muestra "Preparando pasaporte…".
  useEffect(() => {
    if (initialTok && catalogStatus !== 'loading') void handleToken(initialTok);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTok, catalogStatus]);

  // Cámara real (html5-qrcode) en la pestaña QR.
  useEffect(() => {
    if (activeTab !== 'qr' || scanResult || (initialTok && catalogStatus === 'loading')) return;
    let cancelled = false;
    let scanner: any = null;
    setCameraError(null);
    setCameraReady(false);

    loadHtml5Qrcode()
      .then(async (Html5Qrcode) => {
        if (cancelled || !scannerRegionRef.current) return;
        scanner = new Html5Qrcode('qr-scan-region');
        try {
          await scanner.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 220, height: 220 } },
            (text: string) => {
              const m = String(text).match(/tok=([^&]+)/);
              if (m) void handleToken(decodeURIComponent(m[1]));
            },
            () => {}
          );
          if (!cancelled) setCameraReady(true);
        } catch (err: any) {
          if (!cancelled) {
            setCameraError(
              err?.name === 'NotAllowedError'
                ? 'Necesitás permitir el acceso a la cámara para escanear. Usá la pestaña "Palabra Secreta".'
                : 'No se pudo iniciar la cámara. Usá la pestaña "Palabra Secreta".'
            );
          }
        }
      })
      .catch((err: any) => {
        if (!cancelled) setCameraError(err?.message || 'No se pudo cargar el lector de QR.');
      });

    return () => {
      cancelled = true;
      if (scanner) {
        try {
          scanner.stop().catch(() => {});
        } catch {
          /* ya detenida */
        }
        scanner = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, scanResult, catalogStatus]);

  const handleSecretSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretWord.trim()) return;
    const res = await recordVisit({ word: secretWord.trim() });
    setScanResult(res);

    if (res.success && res.stand) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl relative text-slate-800 dark:text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">{config.texts.scan_title}</h3>
              <p className="text-[11px] text-slate-500">{config.texts.scan_note}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success / Result Overlay */}
        {scanResult ? (
          <div className="p-6 flex flex-col items-center text-center space-y-4 my-auto">
            {scanResult.success && scanResult.stand ? (
              <>
                <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 animate-bounce">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center justify-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> ¡Sello Registrado!
                  </span>
                  <h4 className="text-xl font-bold">{scanResult.stand.name}</h4>
                  <p className="text-xs text-slate-500">
                    {scanResult.stand.course} · {scanResult.stand.area}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-3 w-full justify-center">
                  <FlagIcon flag={scanResult.stand.flag} className="w-10 h-7 shadow" />
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    ¡Agregado exitosamente a tu pasaporte!
                  </span>
                </div>
                <div className="flex items-center gap-3 w-full pt-2">
                  <button
                    onClick={() => {
                      const s = scanResult.stand;
                      onClose();
                      if (s) onOpenEvaluation(s);
                    }}
                    className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Star className="w-4 h-4 fill-slate-950" />
                    Evaluar ahora con ⭐
                  </button>
                  <button
                    onClick={() => setScanResult(null)}
                    className="py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
                  >
                    Seguir
                  </button>
                </div>
              </>
            ) : scanResult.already && scanResult.stand ? (
              <>
                <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/60 border border-amber-500/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-amber-600 dark:text-amber-400">
                    {config.texts.already_visited}
                  </h4>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {scanResult.stand.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    Ya habías sellado este stand anteriormente en tu visita.
                  </p>
                </div>
                <div className="flex items-center gap-3 w-full pt-3">
                  <button
                    onClick={() => {
                      const s = scanResult.stand;
                      onClose();
                      if (s) onOpenEvaluation(s);
                    }}
                    className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Star className="w-3.5 h-3.5 fill-white" />
                    Ver o editar mi evaluación
                  </button>
                  <button
                    onClick={() => setScanResult(null)}
                    className="py-2.5 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-xl transition cursor-pointer"
                  >
                    Volver
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/60 border border-rose-500/40 flex items-center justify-center text-rose-500">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-rose-500">
                    {scanResult.already
                      ? 'Ya visitado'
                      : scanResult.errorTitle === 'Catálogo no disponible'
                        ? 'Catálogo no disponible'
                        : scanResult.errorTitle === 'Datos desactualizados'
                          ? 'Datos desactualizados'
                          : scanResult.errorTitle === 'Pasaporte no encontrado' ||
                              scanResult.error === 'pasaporte no encontrado'
                            ? 'Pasaporte no encontrado'
                            : 'Código no reconocido'}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {scanResult.error || 'La palabra secreta ingresada no coincide con ningún stand de la muestra.'}
                  </p>
                  {isCatalogFailure(scanResult) && (
                    <button
                      onClick={() => {
                        setScanResult(null);
                        void refreshCatalog();
                      }}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 underline mt-1 cursor-pointer"
                    >
                      Reintentar carga del catálogo
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setScanResult(null)}
                  className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Intentar nuevamente
                </button>
              </>
            )}
          </div>
        ) : initialTok && catalogStatus === 'loading' ? (
          <div className="p-10 flex flex-col items-center text-center space-y-3 my-auto">
            <div className="w-14 h-14 rounded-full bg-indigo-100 dark:bg-indigo-950/60 border-2 border-indigo-500/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 animate-pulse">
              <Sparkles className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold">Preparando pasaporte…</h4>
              <p className="text-xs text-slate-500">Cargando el catálogo de stands. Esperá un momento.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Mode Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-1 m-4 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('qr')}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  activeTab === 'qr'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                Escanear QR del Stand
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('secret')}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  activeTab === 'secret'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                Tengo la Palabra Secreta
              </button>
            </div>

            {/* Tab Body */}
            <div className="p-6 pt-0 flex-1 overflow-y-auto space-y-4">
              {activeTab === 'qr' ? (
                <div className="space-y-4 text-center">
                  {/* Camera Viewfinder */}
                  <div className="relative aspect-square max-w-[240px] mx-auto rounded-3xl overflow-hidden bg-slate-950 border-2 border-indigo-500/50 flex items-center justify-center shadow-inner">
                    <div className="absolute inset-4 border-2 border-white/20 border-dashed rounded-2xl pointer-events-none" />

                    {/* Reticles */}
                    <div className="absolute top-3 left-3 w-6 h-6 border-t-4 border-l-4 border-indigo-400 rounded-tl-lg z-10" />
                    <div className="absolute top-3 right-3 w-6 h-6 border-t-4 border-r-4 border-indigo-400 rounded-tr-lg z-10" />
                    <div className="absolute bottom-3 left-3 w-6 h-6 border-b-4 border-l-4 border-indigo-400 rounded-bl-lg z-10" />
                    <div className="absolute bottom-3 right-3 w-6 h-6 border-b-4 border-r-4 border-indigo-400 rounded-br-lg z-10" />

                    <div ref={scannerRegionRef} id="qr-scan-region" className="absolute inset-0 w-full h-full" />

                    {!cameraReady && !cameraError && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/70 text-slate-200">
                        <Camera className="w-8 h-8 text-indigo-400 animate-pulse" />
                        <p className="text-xs font-semibold">Iniciando cámara…</p>
                      </div>
                    )}

                    {cameraError && (
                      <div className="absolute inset-0 flex items-center justify-center p-6 bg-slate-950/80">
                        <p className="text-xs text-slate-300 leading-relaxed">{cameraError}</p>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    ¿Tu cámara no enfoca o no funciona? Puedes usar la pestaña{' '}
                    <strong>"Tengo la Palabra Secreta"</strong>.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-amber-50/70 dark:bg-amber-950/30 p-3.5 rounded-2xl border border-amber-300/60 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                      <Key className="w-3.5 h-3.5" />
                      Palabra física del stand
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-amber-200/80 leading-relaxed">
                      Cada stand tiene su palabra secreta escrita en el cartel físico de la muestra. Búscala en la mesa de los alumnos expositores y escríbela aquí:
                    </p>
                  </div>

                  <form onSubmit={handleSecretSubmit} className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Ingresa la palabra del cartel
                      </label>
                      <input
                        type="text"
                        value={secretWord}
                        onChange={e => setSecretWord(e.target.value.toUpperCase())}
                        placeholder="Escribe la palabra secreta..."
                        className="w-full text-base font-mono tracking-wider uppercase px-4 py-3 bg-slate-50 dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100 font-bold"
                        autoFocus
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={!secretWord.trim()}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Validar y sellar pasaporte
                    </button>
                  </form>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};