import React, { useState, useMemo } from 'react';
import { Stand, Visit, Visitor, EventConfig } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Star,
  Award,
  Filter,
  ArrowUpDown,
  Sparkles,
  QrCode,
  KeyRound,
  Layers,
  CheckCircle2,
  Users,
  FileDown,
} from 'lucide-react';
import { FLAGS } from '../data/flags';
import { exportStatsToPDF } from '../utils/exportStatsPdf';

interface StandStatsPanelProps {
  stands: Stand[];
  visits: Visit[];
  visitors: Visitor[];
  config: EventConfig;
}

// Distinct vibrant colors for areas or stands
const PALETTE = [
  '#6366f1', // Indigo
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#8b5cf6', // Purple
  '#f43f5e', // Rose
  '#14b8a6', // Teal
  '#3b82f6', // Blue
  '#84cc16', // Lime
];

export const StandStatsPanel: React.FC<StandStatsPanelProps> = ({
  stands,
  visits,
  visitors,
  config,
}) => {
  const [sortBy, setSortBy] = useState<'visits-desc' | 'visits-asc' | 'rating-desc' | 'alphabetical'>('visits-desc');
  const [filterArea, setFilterArea] = useState<string>('all');
  const [chartLayout, setChartLayout] = useState<'horizontal' | 'vertical'>('vertical');
  const [chartMetric, setChartMetric] = useState<'stamps' | 'methods'>('stamps');
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleExportPDF = () => {
    setIsExportingPdf(true);
    try {
      exportStatsToPDF({
        stands,
        visits,
        visitors,
        config,
      });
    } catch (err) {
      console.error('Error generating stats PDF:', err);
    } finally {
      setTimeout(() => setIsExportingPdf(false), 800);
    }
  };

  // Extract distinct areas for filter
  const areas = useMemo(() => {
    const set = new Set<string>();
    stands.forEach(s => {
      if (s.area) set.add(s.area);
    });
    return Array.from(set);
  }, [stands]);

  // Aggregate stats per stand
  const processedData = useMemo(() => {
    return stands
      .filter(s => s.is_published)
      .filter(s => filterArea === 'all' || s.area === filterArea)
      .map(stand => {
        const standVisits = visits.filter(v => v.stand_id === stand.id);
        const qrVisits = standVisits.filter(v => v.visit_method === 'qr').length;
        const secretVisits = standVisits.filter(v => v.visit_method === 'secret').length;
        const ratedVisits = standVisits.filter(v => v.rating !== null && v.rating > 0);
        const avgRating =
          ratedVisits.length > 0
            ? Number(
                (
                  ratedVisits.reduce((acc, curr) => acc + (curr.rating || 0), 0) /
                  ratedVisits.length
                ).toFixed(1)
              )
            : 0;

        const visitorPercentage =
          visitors.length > 0 ? Math.round((standVisits.length / visitors.length) * 100) : 0;

        return {
          id: stand.id,
          name: stand.name,
          course: stand.course,
          area: stand.area,
          flag: stand.flag,
          sellos: standVisits.length,
          qrCount: qrVisits,
          secretCount: secretVisits,
          rating: avgRating,
          ratedCount: ratedVisits.length,
          visitorPercentage,
          shortLabel: `${stand.course} - ${stand.name.length > 18 ? stand.name.slice(0, 16) + '...' : stand.name}`,
        };
      })
      .sort((a, b) => {
        if (sortBy === 'visits-desc') return b.sellos - a.sellos;
        if (sortBy === 'visits-asc') return a.sellos - b.sellos;
        if (sortBy === 'rating-desc') return b.rating - a.rating;
        return a.name.localeCompare(b.name);
      });
  }, [stands, visits, visitors, filterArea, sortBy]);

  // Area aggregations for secondary distribution
  const areaData = useMemo(() => {
    const map: Record<string, { area: string; sellos: number; standsCount: number }> = {};
    stands.forEach(stand => {
      const area = stand.area || 'General';
      if (!map[area]) {
        map[area] = { area, sellos: 0, standsCount: 0 };
      }
      map[area].standsCount += 1;
    });

    visits.forEach(v => {
      const stand = stands.find(s => s.id === v.stand_id);
      const area = stand?.area || 'General';
      if (map[area]) {
        map[area].sellos += 1;
      }
    });

    return Object.values(map).sort((a, b) => b.sellos - a.sellos);
  }, [stands, visits]);

  // Overall key metrics
  const totalStamps = visits.length;
  const qrTotal = visits.filter(v => v.visit_method === 'qr').length;
  const secretTotal = visits.filter(v => v.visit_method === 'secret').length;
  const topStand = useMemo(() => {
    if (processedData.length === 0) return null;
    return [...processedData].sort((a, b) => b.sellos - a.sellos)[0];
  }, [processedData]);

  const topRatedStand = useMemo(() => {
    const withRatings = processedData.filter(d => d.ratedCount >= 1);
    if (withRatings.length === 0) return null;
    return [...withRatings].sort((a, b) => b.rating - a.rating)[0];
  }, [processedData]);

  const avgStampsPerStand =
    stands.length > 0 ? (totalStamps / Math.max(1, stands.length)).toFixed(1) : '0';

  // Custom Recharts Tooltip with Tailwind styling
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-md text-xs space-y-2 max-w-xs z-50">
          <div className="border-b border-slate-800 pb-1.5">
            <span className="text-[10px] uppercase font-mono font-bold text-indigo-400 block tracking-wider">
              {data.course} · {data.area}
            </span>
            <p className="font-bold text-sm text-slate-100 leading-snug">{data.name}</p>
          </div>

          <div className="space-y-1 text-[11px]">
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-indigo-400" />
                Sellos obtenidos:
              </span>
              <span className="font-mono font-black text-indigo-300 text-sm">
                {data.sellos} sellos
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                Participación visitantes:
              </span>
              <span className="font-mono font-bold text-emerald-400">
                {data.visitorPercentage}%
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-400" />
                Calificación promedio:
              </span>
              <span className="font-mono font-bold text-amber-400 flex items-center gap-1">
                {data.rating > 0 ? `${data.rating} ★ (${data.ratedCount})` : 'Sin votos'}
              </span>
            </div>

            <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span className="flex items-center gap-1">
                <QrCode className="w-3 h-3 text-indigo-400" /> QR: {data.qrCount}
              </span>
              <span className="flex items-center gap-1">
                <KeyRound className="w-3 h-3 text-amber-400" /> Palabra: {data.secretCount}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header & Description */}
      <div className="bg-gradient-to-r from-indigo-900/90 via-slate-900 to-indigo-950 text-white p-5 sm:p-6 rounded-3xl shadow-xl border border-indigo-500/20 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                <BarChart3 className="w-3.5 h-3.5" /> Métricas Oficiales
              </span>
              <span className="text-xs text-slate-400">Interacción en tiempo real</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Panel de Estadísticas y Sellos por Stand
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Visualización interactiva con gráficos de barras para evaluar el tráfico, la concurrencia y la interacción de los visitantes en cada stand de la muestra escolar.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="bg-white/10 backdrop-blur-md px-3 py-2 rounded-2xl border border-white/10 text-center">
              <span className="text-[10px] text-indigo-200 uppercase font-mono block">Total Sellos</span>
              <span className="text-lg sm:text-xl font-black text-white">{totalStamps}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-3 py-2 rounded-2xl border border-white/10 text-center">
              <span className="text-[10px] text-indigo-200 uppercase font-mono block">Promedio / Stand</span>
              <span className="text-lg sm:text-xl font-black text-amber-300">{avgStampsPerStand}</span>
            </div>
            <button
              type="button"
              onClick={handleExportPDF}
              disabled={isExportingPdf}
              className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold text-xs shadow-xl transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              title="Descargar informe oficial en formato PDF"
            >
              <FileDown className="w-4 h-4" />
              <span>{isExportingPdf ? 'Generando...' : 'Descargar Informe PDF'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Top Stand Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Stand Más Concurrido 🏆
            </span>
            <div className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate max-w-[180px]">
              {topStand ? topStand.name : 'Sin datos'}
            </div>
            <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-bold block">
              {topStand ? `${topStand.sellos} sellos (${topStand.course})` : '-'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
        </div>

        {/* Highest Rating Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Mejor Calificación ⭐
            </span>
            <div className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate max-w-[180px]">
              {topRatedStand ? topRatedStand.name : 'Sin evaluaciones'}
            </div>
            <span className="text-xs font-mono text-amber-500 font-bold flex items-center gap-1">
              {topRatedStand ? `${topRatedStand.rating} ★ (${topRatedStand.ratedCount} votos)` : '-'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <Star className="w-5 h-5 fill-amber-500" />
          </div>
        </div>

        {/* Method Distribution QR */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Sellado por QR
            </span>
            <div className="text-xl font-black text-slate-900 dark:text-slate-100">
              {qrTotal} <span className="text-xs font-normal text-slate-400">({totalStamps > 0 ? Math.round((qrTotal / totalStamps) * 100) : 0}%)</span>
            </div>
            <span className="text-[10px] text-slate-400">Cámara del celular</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
            <QrCode className="w-5 h-5" />
          </div>
        </div>

        {/* Method Distribution Secret Word */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Palabra Secreta
            </span>
            <div className="text-xl font-black text-slate-900 dark:text-slate-100">
              {secretTotal} <span className="text-xs font-normal text-slate-400">({totalStamps > 0 ? Math.round((secretTotal / totalStamps) * 100) : 0}%)</span>
            </div>
            <span className="text-[10px] text-slate-400">Ingreso manual</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Bar Chart Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
        {/* Controls Bar: Filters, Sorting, Orientation */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h4 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              Cantidad de Sellos Obtenidos por Stand
            </h4>
            <span className="text-xs text-slate-400">
              Mostrando {processedData.length} de {stands.length} stands registrados
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Area Filter */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={filterArea}
                onChange={e => setFilterArea(e.target.value)}
                className="bg-transparent font-medium text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
              >
                <option value="all">Todas las Áreas</option>
                {areas.map(a => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="bg-transparent font-medium text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
              >
                <option value="visits-desc">Más Sellados (Mayor a Menor)</option>
                <option value="visits-asc">Menos Sellados (Menor a Mayor)</option>
                <option value="rating-desc">Mejor Calificación ⭐</option>
                <option value="alphabetical">Nombre Stand (A - Z)</option>
              </select>
            </div>

            {/* Metric Mode Toggle (Total Stamps vs QR / Secret Breakdown) */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl font-medium">
              <button
                onClick={() => setChartMetric('stamps')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  chartMetric === 'stamps'
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Total Sellos
              </button>
              <button
                onClick={() => setChartMetric('methods')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  chartMetric === 'methods'
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                QR vs Palabra
              </button>
            </div>

            {/* Orientation Toggle */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl font-medium">
              <button
                onClick={() => setChartLayout('vertical')}
                title="Barras Verticales"
                className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                  chartLayout === 'vertical'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Vertical
              </button>
              <button
                onClick={() => setChartLayout('horizontal')}
                title="Barras Horizontales (Ideal para nombres largos)"
                className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                  chartLayout === 'horizontal'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Horizontal
              </button>
            </div>
          </div>
        </div>

        {/* The Recharts Bar Chart Container */}
        {processedData.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 space-y-2">
            <BarChart3 className="w-10 h-10 text-slate-300 dark:text-slate-700" />
            <p className="text-xs font-medium">No se encontraron stands con los filtros seleccionados.</p>
          </div>
        ) : (
          <div className="w-full h-[400px] sm:h-[460px] pt-2">
            <ResponsiveContainer width="100%" height="100%">
              {chartLayout === 'vertical' ? (
                <BarChart
                  data={processedData}
                  margin={{ top: 20, right: 20, left: 0, bottom: 65 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                  <XAxis
                    dataKey="shortLabel"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    angle={-40}
                    textAnchor="end"
                    interval={0}
                    height={70}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    allowDecimals={false}
                    label={{
                      value: 'Cantidad de sellos',
                      angle: -90,
                      position: 'insideLeft',
                      fontSize: 10,
                      fill: '#94a3b8',
                      offset: 10,
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  {chartMetric === 'methods' && (
                    <Legend
                      verticalAlign="top"
                      wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
                    />
                  )}

                  {chartMetric === 'stamps' ? (
                    <Bar
                      dataKey="sellos"
                      name="Sellos Obtenidos"
                      radius={[8, 8, 0, 0]}
                      animationDuration={800}
                    >
                      {processedData.map((entry, index) => (
                        <Cell
                          key={`cell-${entry.id}`}
                          fill={PALETTE[index % PALETTE.length]}
                          opacity={0.9}
                        />
                      ))}
                    </Bar>
                  ) : (
                    <>
                      <Bar
                        dataKey="qrCount"
                        name="Sellos vía QR"
                        fill="#6366f1"
                        stackId="a"
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="secretCount"
                        name="Sellos vía Palabra Secreta"
                        fill="#f59e0b"
                        stackId="a"
                        radius={[8, 8, 0, 0]}
                      />
                    </>
                  )}
                </BarChart>
              ) : (
                <BarChart
                  data={processedData}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 70, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="shortLabel"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    width={100}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  {chartMetric === 'methods' && (
                    <Legend
                      verticalAlign="top"
                      wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
                    />
                  )}

                  {chartMetric === 'stamps' ? (
                    <Bar
                      dataKey="sellos"
                      name="Sellos Obtenidos"
                      radius={[0, 8, 8, 0]}
                      animationDuration={800}
                    >
                      {processedData.map((entry, index) => (
                        <Cell
                          key={`cell-${entry.id}`}
                          fill={PALETTE[index % PALETTE.length]}
                          opacity={0.9}
                        />
                      ))}
                    </Bar>
                  ) : (
                    <>
                      <Bar
                        dataKey="qrCount"
                        name="Sellos vía QR"
                        fill="#6366f1"
                        stackId="a"
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="secretCount"
                        name="Sellos vía Palabra Secreta"
                        fill="#f59e0b"
                        stackId="a"
                        radius={[0, 8, 8, 0]}
                      />
                    </>
                  )}
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            Pasa el cursor sobre cualquier barra para ver el desglose de votos, % de participación y método.
          </span>
          <span className="font-mono text-[11px]">
            Actualizado automáticamente con cada escaneo
          </span>
        </div>
      </div>

      {/* Secondary Distribution: Sellos por Área Temática */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-500" />
              Sellos Acumulados por Área Temática
            </h4>
            <span className="text-xs text-slate-400">Distribución global</span>
          </div>

          <div className="h-60 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={areaData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                <XAxis dataKey="area" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip
                  formatter={(val: any) => [`${val} sellos`, 'Total Sellos']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="sellos" name="Sellos" fill="#10b981" radius={[6, 6, 0, 0]}>
                  {areaData.map((_, idx) => (
                    <Cell key={`cell-area-${idx}`} fill={PALETTE[(idx + 3) % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed Breakdown List / Table of Stands with Progress */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-500" />
              Detalle de Rendimiento por Stand
            </h4>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                s/ {visitors.length} visitantes
              </span>
              <button
                type="button"
                onClick={handleExportPDF}
                disabled={isExportingPdf}
                className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition disabled:opacity-50"
                title="Descargar este listado en PDF"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Exportar PDF</span>
              </button>
            </div>
          </div>

          <div className="space-y-2.5 max-h-[240px] overflow-y-auto pr-1">
            {processedData.map((item, idx) => (
              <div
                key={item.id}
                className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-mono text-slate-400 w-5 font-bold text-center">
                    #{idx + 1}
                  </span>
                  <div className="min-w-0">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                      {item.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {item.course} · {item.area}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 font-mono">
                  {item.rating > 0 && (
                    <span className="text-amber-500 font-bold text-[11px] flex items-center gap-0.5">
                      <Star className="w-3 h-3 fill-amber-500" />
                      {item.rating}
                    </span>
                  )}
                  <div className="text-right">
                    <span className="font-black text-indigo-600 dark:text-indigo-400 text-sm block">
                      {item.sellos}
                    </span>
                    <span className="text-[10px] text-slate-400">{item.visitorPercentage}% part.</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
