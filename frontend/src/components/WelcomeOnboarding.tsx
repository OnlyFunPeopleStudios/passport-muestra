import React, { useState } from 'react';
import { usePassport } from '../context/PassportContext';
import { User, Sparkles, ShieldCheck, ArrowRight, BookOpen } from 'lucide-react';

export const WelcomeOnboarding: React.FC = () => {
  const { config, createVisitor } = usePassport();
  const [nameInput, setNameInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createVisitor(nameInput);
    } catch (err: any) {
      setError(err?.message || 'No se pudo crear tu pasaporte.');
    }
  };

  const handleStartAnonymous = async () => {
    try {
      await createVisitor('');
    } catch (err: any) {
      setError(err?.message || 'No se pudo crear tu pasaporte.');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Subtle decorative background gradient */}
        <div
          className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: config.primary_color }}
        />
        <div
          className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full blur-3xl opacity-15 pointer-events-none"
          style={{ backgroundColor: config.secondary_color }}
        />

        {/* Top Header & Logo */}
        <div className="flex flex-col items-center text-center space-y-3">
          {config.logo ? (
            <div className="w-20 h-20 rounded-3xl overflow-hidden shadow-lg border-2 border-slate-100 dark:border-slate-800 bg-white p-2 flex items-center justify-center">
              <img
                src={config.logo}
                alt={config.institution_name}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ) : (
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg text-3xl font-black"
              style={{ backgroundColor: config.primary_color }}
            >
              🛂
            </div>
          )}

          <div className="space-y-1">
            <span className="text-[11px] px-3 py-1 rounded-full font-mono font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 inline-block">
              {config.institution_name || 'Colegio Modelo'}
            </span>
            <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {config.event_name || 'Muestra Escolar 2026'}
            </h2>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              {config.event_subtitle || 'Recorré los stands, juntá sellos y completá tu pasaporte escolar.'}
            </p>
          </div>
        </div>

        {/* Welcome Pitch */}
        <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-2">
          <div className="flex items-center gap-2 text-indigo-950 dark:text-indigo-200 font-bold text-xs">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Tu Pasaporte Digital Personal</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
            Cada stand tiene un cartel con código QR y palabra secreta. Al escanearlos o escribirlos, desbloquearás sellos únicos y podrás calificar los proyectos.
          </p>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleStart} className="space-y-4">
          <div className="space-y-1.5 text-xs">
            <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-500" />
              ¿Cómo te llamás? (Opcional)
            </label>
            <input
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              placeholder="Ej: Carolina, Mamá de Lucas, etc."
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-2xl text-xs sm:text-sm font-medium focus:outline-none focus:border-indigo-500 transition shadow-inner"
              autoFocus
            />
            <span className="text-[10px] text-slate-400 block">
              Aparecerá impreso en la tapa de tu pasaporte digital.
            </span>
          </div>

          <div className="space-y-2 pt-1">
            <button
              type="submit"
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>Crear mi Pasaporte y Comenzar</span>
              <ArrowRight className="w-4 h-4 ml-auto" />
            </button>

            <button
              type="button"
              onClick={handleStartAnonymous}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-98 text-slate-600 dark:text-slate-300 rounded-2xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>🕶️ Continuar como Anónimo</span>
            </button>

            {error && (
              <p className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <span>{error}</span>
              </p>
            )}
          </div>
        </form>

        {/* Privacy Note */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-start gap-2 text-[10px] text-slate-400 leading-tight">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <span>
            <strong>100% Privado:</strong> Tu pasaporte y tus sellos se guardan únicamente en el navegador de tu celular. Ningún otro visitante puede ver tu recorrido ni tus datos.
          </span>
        </div>
      </div>
    </div>
  );
};
