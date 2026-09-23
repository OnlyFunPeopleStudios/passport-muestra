import React, { useState } from 'react';
import { usePassport } from '../context/PassportContext';
import { StampBadge } from './StampBadge';
import { Stand } from '../types';
import { 
  Trophy, 
  Sparkles, 
  User, 
  QrCode, 
  Star, 
  PlusCircle, 
  Info,
  CheckCircle2
} from 'lucide-react';

interface PassportViewProps {
  onOpenScanner: () => void;
  onOpenEvaluation: (stand: Stand) => void;
  onOpenNewVisitor: () => void;
}

export const PassportView: React.FC<PassportViewProps> = ({
  onOpenScanner,
  onOpenEvaluation,
  onOpenNewVisitor,
}) => {
  const { config, stands, visits, currentVisitor } = usePassport();
  const [selectedUnvisitedStand, setSelectedUnvisitedStand] = useState<Stand | null>(null);

  const publishedStands = stands.filter(s => s.is_published);
  const totalStands = publishedStands.length;

  const visitorVisits = visits.filter(v => v.visitor_id === currentVisitor?.id);
  const visitedCount = visitorVisits.length;
  const percentage = totalStands > 0 ? Math.round((visitedCount / totalStands) * 100) : 0;
  const isCompleted = visitedCount >= totalStands && totalStands > 0;

  const visitsMap = new Map(visitorVisits.map(v => [v.stand_id, v]));

  return (
    <div className="space-y-6 pb-20">
      {/* Event & Visitor Info Card */}
      <div 
        className="rounded-3xl p-6 text-white shadow-xl relative overflow-hidden transition-all"
        style={{
          backgroundColor: config.primary_color,
          backgroundImage: `radial-gradient(circle at top right, ${config.secondary_color}25, transparent 70%)`,
        }}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            {config.logo && (
              <div className="w-16 h-16 rounded-2xl bg-white/95 shadow-md p-1.5 shrink-0 border-2 border-white/40 flex items-center justify-center overflow-hidden">
                <img
                  src={config.logo}
                  alt={config.institution_name}
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono uppercase tracking-wider bg-white/20 backdrop-blur text-white">
                  {config.institution_name || 'Muestra 2026'}
                </span>
                {currentVisitor?.name ? (
                  <span className="text-xs flex items-center gap-1 text-white/90">
                    <User className="w-3.5 h-3.5" />
                    {currentVisitor.name}
                  </span>
                ) : (
                  <span className="text-xs flex items-center gap-1 text-white/90">
                    🕶️ Anónimo
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight">
                {config.texts.passport_title}
              </h2>
              <p className="text-xs text-white/80 max-w-md">
                {config.event_subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={onOpenNewVisitor}
              className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-xs text-white backdrop-blur transition flex items-center gap-1.5 cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              {currentVisitor?.name ? 'Editar mi nombre' : 'Personalizar nombre'}
            </button>
            <button
              onClick={onOpenScanner}
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-lg transition active:scale-95 flex items-center gap-1.5"
            >
              <QrCode className="w-4 h-4" />
              Sellar Stand
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6 pt-5 border-t border-white/15 relative z-10 space-y-2">
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-300" />
              Progreso del recorrido
            </span>
            <span className="font-mono text-amber-300">
              {visitedCount} / {totalStands} · {percentage}%
            </span>
          </div>
          <div className="w-full h-3.5 bg-black/25 rounded-full overflow-hidden p-0.5 shadow-inner">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out shadow"
              style={{
                width: `${percentage}%`,
                backgroundColor: config.secondary_color,
              }}
            />
          </div>
          <p className="text-[11px] text-white/70 text-right">
            {totalStands - visitedCount > 0
              ? `Te faltan ${totalStands - visitedCount} stands para completar el pasaporte.`
              : '¡Felicitaciones! Recorriste todos los stands de la muestra.'}
          </p>
        </div>
      </div>

      {/* Completion Banner */}
      {isCompleted && (
        <div className="bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-indigo-500/20 border-2 border-amber-400/50 rounded-3xl p-5 flex items-center gap-4 text-slate-800 dark:text-slate-100 shadow-lg animate-fade-in">
          <div className="w-12 h-12 rounded-2xl bg-amber-400 flex items-center justify-center text-slate-950 shrink-0 shadow-md">
            <Trophy className="w-7 h-7" />
          </div>
          <div className="space-y-0.5">
            <h4 className="font-bold text-base text-amber-600 dark:text-amber-400">
              {config.texts.completed}
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Has sellado todos los stands disponibles en esta muestra. ¡Gracias por participar y apoyar los proyectos!
            </p>
          </div>
        </div>
      )}

      {/* Grid of Stamps */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
            Sellos del Pasaporte
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            Toca un sello para ver o calificar
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 justify-items-center">
          {publishedStands.map(stand => {
            const visit = visitsMap.get(stand.id);
            return (
              <StampBadge
                key={stand.id}
                stand={stand}
                visit={visit}
                stampStyle={config.stamp_style}
                onClick={() => {
                  if (visit) {
                    onOpenEvaluation(stand);
                  } else {
                    setSelectedUnvisitedStand(stand);
                  }
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Unvisited Stand Quick Info Modal */}
      {selectedUnvisitedStand && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-slate-800 dark:text-slate-100">
            <div className="space-y-1">
              <span className="text-[11px] font-mono font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                {selectedUnvisitedStand.course} · {selectedUnvisitedStand.area}
              </span>
              <h3 className="text-lg font-bold">{selectedUnvisitedStand.name}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {selectedUnvisitedStand.description}
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2">
              <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <span>
                Para sellar este stand, dirígete físicamente hacia él y escanea su código QR o escribe su palabra secreta.
              </span>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setSelectedUnvisitedStand(null)}
                className="flex-1 py-2 px-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  setSelectedUnvisitedStand(null);
                  onOpenScanner();
                }}
                className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow transition flex items-center justify-center gap-1.5"
              >
                <QrCode className="w-3.5 h-3.5" />
                Sellar ahora
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
