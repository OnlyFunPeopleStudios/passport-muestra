import React, { useState } from 'react';
import { usePassport } from '../context/PassportContext';
import { FlagIcon } from '../data/flags';
import { Stand } from '../types';
import { 
  Clock, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  Search, 
  Sparkles, 
  ChevronRight,
  BookOpen
} from 'lucide-react';

interface ScheduleProgramViewProps {
  onOpenScanner: () => void;
  onOpenEvaluation: (stand: Stand) => void;
}

export const ScheduleProgramView: React.FC<ScheduleProgramViewProps> = ({
  onOpenScanner,
  onOpenEvaluation,
}) => {
  const { stands, visits, currentVisitor, config } = usePassport();
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'morning' | 'afternoon'>('all');
  const [search, setSearch] = useState('');

  const publishedStands = stands.filter(s => s.is_published);
  const visitorVisits = visits.filter(v => v.visitor_id === currentVisitor?.id);
  const visitsMap = new Map(visitorVisits.map(v => [v.stand_id, v]));

  // Filter stands
  const filteredStands = publishedStands.filter(stand => {
    const matchesSearch =
      stand.name.toLowerCase().includes(search.toLowerCase()) ||
      stand.course.toLowerCase().includes(search.toLowerCase()) ||
      (stand.location && stand.location.toLowerCase().includes(search.toLowerCase())) ||
      (stand.schedule && stand.schedule.toLowerCase().includes(search.toLowerCase())) ||
      stand.area.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (filterPeriod === 'morning') {
      // Matches morning hours (08:xx, 09:xx, 10:xx, 11:xx, 12:xx or Todo el día)
      return (
        !stand.schedule ||
        stand.schedule.includes('09:') ||
        stand.schedule.includes('10:') ||
        stand.schedule.includes('11:') ||
        stand.schedule.includes('12:') ||
        stand.schedule.toLowerCase().includes('todo el día')
      );
    }
    if (filterPeriod === 'afternoon') {
      // Matches afternoon hours (13:xx, 14:xx, 15:xx, 16:xx, 17:xx or Todo el día)
      return (
        !stand.schedule ||
        stand.schedule.includes('13:') ||
        stand.schedule.includes('14:') ||
        stand.schedule.includes('15:') ||
        stand.schedule.includes('16:') ||
        stand.schedule.includes('17:') ||
        stand.schedule.toLowerCase().includes('todo el día')
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl">
        <div className="space-y-1">
          <span className="text-xs px-2.5 py-0.5 rounded-full font-mono uppercase tracking-wider bg-white/20 text-white inline-block">
            Cronograma Oficial
          </span>
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Calendar className="w-6 h-6 text-amber-400" />
            Programa de la Muestra
          </h2>
          <p className="text-xs text-white/80 max-w-lg leading-relaxed">
            Consulta los horarios de exposición de cada proyecto y su ubicación dentro del colegio para organizar tu visita.
          </p>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por stand, horario, aula..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2.5 bg-white/10 backdrop-blur border border-white/20 rounded-xl focus:outline-none focus:bg-white/20 text-white placeholder-white/60"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 text-xs">
        <button
          onClick={() => setFilterPeriod('all')}
          className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 ${
            filterPeriod === 'all'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Todo el Programa ({publishedStands.length})
        </button>
        <button
          onClick={() => setFilterPeriod('morning')}
          className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 ${
            filterPeriod === 'morning'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}
        >
          ☀️ Turno Mañana
        </button>
        <button
          onClick={() => setFilterPeriod('afternoon')}
          className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 ${
            filterPeriod === 'afternoon'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}
        >
          ⛅ Turno Tarde
        </button>
      </div>

      {/* Timeline Schedule Cards */}
      <div className="space-y-3">
        {filteredStands.map((stand, idx) => {
          const visit = visitsMap.get(stand.id);
          const isVisited = Boolean(visit);

          return (
            <div
              key={stand.id}
              className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                isVisited
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500/30 shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-400/50 shadow-sm'
              }`}
            >
              {/* Left Info: Time, Location, Stand details */}
              <div className="flex items-start gap-3.5 flex-1">
                <FlagIcon flag={stand.flag} className="w-11 h-8 shrink-0 shadow mt-1" />

                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {/* Schedule Badge */}
                    <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 px-2.5 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800/60 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-indigo-500" />
                      {stand.schedule || '09:00 - 17:30 hs'}
                    </span>

                    {/* Location Badge */}
                    {stand.location && (
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-rose-500" />
                        {stand.location}
                      </span>
                    )}

                    <span className="text-[11px] font-mono text-slate-400">
                      {stand.course} · {stand.area}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                    {stand.name}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
                    {stand.description}
                  </p>
                </div>
              </div>

              {/* Right Action: Visited status or Stamp button */}
              <div className="shrink-0 flex items-center gap-2 self-start sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 w-full sm:w-auto justify-between sm:justify-end">
                {isVisited ? (
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ¡Sellado!
                    </span>
                    <button
                      onClick={() => onOpenEvaluation(stand)}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline px-2"
                    >
                      {visit?.rating ? `Ver mi ⭐ ${visit.rating}` : 'Calificar ⭐'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={onOpenScanner}
                    className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold rounded-xl shadow transition flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
                    Sellar en este stand
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
