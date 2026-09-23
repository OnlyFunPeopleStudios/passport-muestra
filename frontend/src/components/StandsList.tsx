import React, { useState } from 'react';
import { usePassport } from '../context/PassportContext';
import { FlagIcon } from '../data/flags';
import { Stand } from '../types';
import { 
  Search, 
  CheckCircle2, 
  Star, 
  QrCode, 
  Clock, 
  MapPin, 
  Sparkles,
  ChevronRight
} from 'lucide-react';

interface StandsListProps {
  onOpenEvaluation: (stand: Stand) => void;
  onOpenScanner: () => void;
}

export const StandsList: React.FC<StandsListProps> = ({
  onOpenEvaluation,
  onOpenScanner,
}) => {
  const { stands, visits, currentVisitor, config } = usePassport();
  const [search, setSearch] = useState('');
  const [selectedArea, setSelectedArea] = useState<string>('all');

  const publishedStands = stands.filter(s => s.is_published);
  const areas = Array.from(new Set(publishedStands.map(s => s.area)));

  const visitorVisits = visits.filter(v => v.visitor_id === currentVisitor?.id);
  const visitsMap = new Map(visitorVisits.map(v => [v.stand_id, v]));

  const filteredStands = publishedStands.filter(s => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.course.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase()) ||
      (s.location && s.location.toLowerCase().includes(search.toLowerCase()));
    const matchesArea = selectedArea === 'all' || s.area === selectedArea;
    return matchesSearch && matchesArea;
  });

  return (
    <div className="space-y-6 pb-20">
      {/* Header and Search */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            🏫 Catálogo de Stands
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-mono">
              {publishedStands.length} proyectos
            </span>
          </h2>
          <p className="text-xs text-slate-500">
            Descubre todos los proyectos participantes en la muestra escolar.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre, curso, área..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200"
          />
        </div>
      </div>

      {/* Area Filter Tags */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        <button
          onClick={() => setSelectedArea('all')}
          className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition ${
            selectedArea === 'all'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          Todas las áreas ({publishedStands.length})
        </button>
        {areas.map(area => {
          const count = publishedStands.filter(s => s.area === area).length;
          return (
            <button
              key={area}
              onClick={() => setSelectedArea(area)}
              className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition ${
                selectedArea === area
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {area} ({count})
            </button>
          );
        })}
      </div>

      {/* Stands Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredStands.map(stand => {
          const visit = visitsMap.get(stand.id);
          const isVisited = Boolean(visit);

          return (
            <div
              key={stand.id}
              className={`rounded-2xl border p-4.5 transition-all flex flex-col justify-between ${
                isVisited
                  ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-500/30'
                  : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-indigo-500/40'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {stand.stamp_image ? (
                      <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm border border-slate-300 dark:border-slate-700 shrink-0 mt-0.5 bg-slate-100 dark:bg-slate-800">
                        <img src={stand.stamp_image} alt={stand.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <FlagIcon flag={stand.flag} className="w-10 h-7 shrink-0 shadow-sm mt-0.5" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                          {stand.course}
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {stand.area}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mt-0.5 leading-snug">
                        {stand.name}
                      </h3>
                    </div>
                  </div>

                  {isVisited && (
                    <span className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Sellado
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {stand.description}
                </p>

                {/* Schedule & Physical Location info */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                  <span className="flex items-center gap-1 font-mono font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-800/40">
                    <Clock className="w-3 h-3" />
                    {stand.schedule || '09:00 - 17:30 hs'}
                  </span>
                  {stand.location && (
                    <span className="flex items-center gap-1 font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md">
                      <MapPin className="w-3 h-3 text-rose-500" />
                      {stand.location}
                    </span>
                  )}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-200 dark:border-slate-800/80">
                <span className="text-[11px] text-slate-400 italic">
                  Para sellar, visita el stand físicamente
                </span>

                {isVisited ? (
                  <button
                    onClick={() => onOpenEvaluation(stand)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold rounded-xl transition border border-amber-500/30"
                  >
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    {visit?.rating ? `Calificado: ${visit.rating} ⭐` : 'Dejar calificación ⭐'}
                  </button>
                ) : (
                  <button
                    onClick={onOpenScanner}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold rounded-xl transition shadow"
                  >
                    <QrCode className="w-3.5 h-3.5 text-indigo-200" />
                    Sellar stand
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
