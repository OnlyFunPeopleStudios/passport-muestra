import React, { useState } from 'react';
import { usePassport } from '../context/PassportContext';
import { User, Check, X, ShieldCheck, Sparkles, Plus, RotateCcw } from 'lucide-react';

interface VisitorModalProps {
  onClose: () => void;
}

export const VisitorModal: React.FC<VisitorModalProps> = ({ onClose }) => {
  const {
    visitors,
    currentVisitor,
    setCurrentVisitor,
    createVisitor,
    updateVisitorName,
    isAdmin,
    stands,
    visits,
  } = usePassport();

  const [nameInput, setNameInput] = useState(currentVisitor?.name || '');
  const [isSaved, setIsSaved] = useState(false);
  const [showAdminSwitcher, setShowAdminSwitcher] = useState(false);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateVisitorName(nameInput);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 800);
  };

  const handleResetNewPassport = async () => {
    if (window.confirm('¿Querés reiniciar y comenzar con un nuevo pasaporte en blanco?')) {
      try {
        await createVisitor(nameInput);
        onClose();
      } catch (err: any) {
        window.alert(err?.message || 'No se pudo crear tu pasaporte.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-slate-800 dark:text-slate-100 space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <User className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Mi Pasaporte Personal
          </h3>
          <p className="text-xs text-slate-500">
            Personalizá el nombre que aparece en la portada de tu pasaporte escolar.
          </p>
        </div>

        {/* Name Edit Form */}
        <form onSubmit={handleSaveName} className="space-y-4">
          <div className="space-y-1.5 text-xs">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Nombre o Apodo en el Pasaporte
            </label>
            <input
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              placeholder="Ej: Carolina (o dejá vacío para Anónimo)"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-xs sm:text-sm font-semibold"
              autoFocus
            />
            <span className="text-[11px] text-slate-400 block">
              Sin nombre = Modo Anónimo 🕶️
            </span>
          </div>

          {isSaved && (
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <Check className="w-4 h-4" />
              <span>¡Nombre actualizado en tu pasaporte!</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold rounded-xl text-xs shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Guardar Nombre
            </button>
            <button
              type="button"
              onClick={handleResetNewPassport}
              className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              title="Comenzar con un pasaporte nuevo en blanco"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reiniciar
            </button>
          </div>
        </form>

        {/* Device Privacy Notice */}
        <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-900 dark:text-emerald-300">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed">
            <strong>Privacidad y Exclusividad:</strong> Este pasaporte está guardado exclusivamente en este teléfono celular. Cada visitante que ingresa a la página tiene su propio pasaporte independiente; nadie más puede ver tus sellos ni tus valoraciones.
          </div>
        </div>

        {/* ADMIN ONLY: Persona Simulator for Testing */}
        {isAdmin && (
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                ⚙️ Modo Administrador: Simular Visitante
              </span>
              <button
                type="button"
                onClick={() => setShowAdminSwitcher(!showAdminSwitcher)}
                className="text-[10px] text-slate-400 hover:underline cursor-pointer"
              >
                {showAdminSwitcher ? 'Ocultar' : 'Ver lista'}
              </button>
            </div>

            {showAdminSwitcher && (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {visitors.map(visitor => {
                  const isSelected = currentVisitor?.id === visitor.id;
                  const vVisits = visits.filter(v => v.visitor_id === visitor.id);
                  return (
                    <button
                      key={visitor.id}
                      onClick={() => {
                        setCurrentVisitor(visitor);
                        onClose();
                      }}
                      className={`w-full p-2 rounded-xl border text-left flex items-center justify-between text-xs transition cursor-pointer ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 font-bold'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs">
                          {visitor.name ? visitor.name.charAt(0).toUpperCase() : '🕶️'}
                        </span>
                        <div>
                          <span>{visitor.name || 'Anónimo'}</span>
                          <span className="text-[10px] text-slate-400 block font-normal font-mono">
                            {vVisits.length} sellos
                          </span>
                        </div>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
