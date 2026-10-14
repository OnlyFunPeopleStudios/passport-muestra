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
  ChevronRight,
  ExternalLink,
  BookOpen,
  Compass,
  Lightbulb,
  X,
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
  const [fichaStand, setFichaStand] = useState<Stand | null>(null);

  const publishedStands = stands.filter(s => s.is_published);
  const areas = Array.from(new Set(publishedStands.map(s => s.area)));

  const visitorVisits = visits.filter(v => v.visitor_id === currentVisitor?.id);
  const visitsMap = new Map(visitorVisits.map(v => [v.stand_id, v]));

  const filteredStands = publishedStands.filter(s => {
    const q = search.toLowerCase();
    const matchesSearch =
      s.name.toLowerCase().includes(q) ||
      s.course.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      (s.location || '').toLowerCase().includes(q) ||
      (s.topic || '').toLowerCase().includes(q) ||
      (s.activities || '').toLowerCase().includes(q) ||
      (s.highlight || '').toLowerCase().includes(q) ||
      (s.fun_facts || '').toLowerCase().includes(q);
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

                <button
                  onClick={() => setFichaStand(stand)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-fuchsia-50 dark:bg-fuchsia-950/40 hover:bg-fuchsia-100 dark:hover:bg-fuchsia-950/60 text-fuchsia-700 dark:text-fuchsia-300 text-xs font-bold rounded-xl border border-fuchsia-300/50 dark:border-fuchsia-800/50 transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Ver ficha del stand
                </button>
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

      {/* Modal de la ficha completa del stand */}
      {fichaStand && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setFichaStand(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 p-4 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <div className="flex items-start gap-3">
                {fichaStand.stamp_image ? (
                  <div className="w-11 h-11 rounded-xl overflow-hidden shadow-sm border border-slate-300 dark:border-slate-700 shrink-0 bg-slate-100 dark:bg-slate-800">
                    <img src={fichaStand.stamp_image} alt={fichaStand.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <FlagIcon flag={fichaStand.flag} className="w-11 h-8 shrink-0 shadow-sm" />
                )}
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    {fichaStand.name}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {fichaStand.course}
                    {fichaStand.area ? ` · ${fichaStand.area}` : ''}
                    {fichaStand.topic ? ` · ${fichaStand.topic}` : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setFichaStand(null)}
                aria-label="Cerrar"
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {fichaStand.invite_text && (
                <p className="text-sm font-semibold italic text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border-l-4 border-indigo-500 rounded-r-xl px-3 py-2 leading-relaxed">
                  “{fichaStand.invite_text}”
                </p>
              )}

              {fichaStand.description && (
                <section className="space-y-1">
                  <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-400 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    Sobre el stand
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {fichaStand.description}
                  </p>
                </section>
              )}

              {fichaStand.activities && (
                <section className="space-y-1">
                  <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-400 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5" />
                    ¿Qué vas a encontrar?
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {fichaStand.activities}
                  </p>
                </section>
              )}

              {fichaStand.highlight && (
                <section className="space-y-1">
                  <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-400 flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5" />
                    No te lo pierdas
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {fichaStand.highlight}
                  </p>
                </section>
              )}

              {fichaStand.fun_facts && (
                <section className="space-y-1">
                  <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-400 flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5" />
                    ¿Sabías que…?
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {fichaStand.fun_facts}
                  </p>
                </section>
              )}

              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="flex items-center gap-1 font-mono font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-800/40">
                  <Clock className="w-3 h-3" />
                  {fichaStand.schedule || '09:00 - 17:30 hs'}
                </span>
                {fichaStand.location && (
                  <span className="flex items-center gap-1 font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md">
                    <MapPin className="w-3 h-3 text-rose-500" />
                    {fichaStand.location}
                  </span>
                )}
              </div>

              {(fichaStand.has_flyer_image || fichaStand.flyer_url) && (
                <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-3">
                  <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Material del stand
                  </h4>
                  {fichaStand.has_flyer_image && (
                    <img
                      src={`/api/stands/${fichaStand.id}/flyer`}
                      alt={`Material de ${fichaStand.name}`}
                      className="w-full rounded-2xl border border-slate-200 dark:border-slate-800"
                    />
                  )}
                  {fichaStand.flyer_url && (
                    <a
                      href={fichaStand.flyer_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition shadow"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Abrir link del material
                    </a>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end border-t border-slate-200 dark:border-slate-800 pt-3">
                {visitsMap.get(fichaStand.id) ? (
                  <button
                    onClick={() => {
                      onOpenEvaluation(fichaStand);
                      setFichaStand(null);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold rounded-xl transition border border-amber-500/30"
                  >
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    {visitsMap.get(fichaStand.id)?.rating
                      ? `Calificado: ${visitsMap.get(fichaStand.id)?.rating} ⭐`
                      : 'Dejar calificación ⭐'}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      onOpenScanner();
                      setFichaStand(null);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold rounded-xl transition shadow"
                  >
                    <QrCode className="w-3.5 h-3.5 text-indigo-200" />
                    Sellar stand
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
