import React, { useState, useRef } from 'react';
import { usePassport } from '../context/PassportContext';
import { Stand, StampStyle, EventConfig } from '../types';
import { FlagIcon, FLAGS } from '../data/flags';
import { StampBadge } from './StampBadge';
import { StampCreatorStudio } from './StampCreatorStudio';
import { QRPosterModal } from './QRPosterModal';
import { StandStatsPanel } from './StandStatsPanel';
import { COLOR_PRESETS } from '../data/seedData';
import {
  LayoutDashboard,
  BarChart3,
  Store,
  Palette,
  MessageSquare,
  Users,
  Settings,
  Lock,
  LogOut,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  QrCode,
  Download,
  CheckCircle,
  Eye,
  EyeOff,
  AlertTriangle,
  Star,
  Key,
  ShieldCheck,
  Check,
  TrendingUp,
  Award,
  Sparkles,
  Printer,
  Clock,
  MapPin,
  Upload,
  Image as ImageIcon,
  Pipette,
  Bookmark,
  Trash,
  X,
  FileDown,
  Database
} from 'lucide-react';
import { exportStatsToPDF } from '../utils/exportStatsPdf';

interface AdminPanelProps {
  onOpenQR: (stand: Stand) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onOpenQR }) => {
  const {
    config,
    stands,
    visitors,
    visits,
    isAdmin,
    adminLogin,
    adminLogout,
    changeAdminPassword,
    updateConfig,
    updateStand,
    createStand,
    deleteStand,
    regenerateStandToken,
    moderateComment,
    exportCSV,
    resetVisits,
    resetVisitors,
  } = usePassport();

  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'stats' | 'creator' | 'stands' | 'posters' | 'branding' | 'comments' | 'visitors' | 'settings'
  >('dashboard');

  // Login form state
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Stand modal state
  const [editingStand, setEditingStand] = useState<Stand | null>(null);
  const [standFormData, setStandFormData] = useState<{
    slug: string;
    name: string;
    course: string;
    description: string;
    area: string;
    flag: string;
    secret_word: string;
    schedule: string;
    location: string;
    stamp_style: StampStyle;
    stamp_image?: string;
    stamp_type?: 'bandera' | 'icono' | 'color' | 'imagen';
    sort_order: number;
    is_published: boolean;
  }>({
    slug: '',
    name: '',
    course: '',
    description: '',
    area: 'Ciencias Naturales',
    flag: 'ar',
    secret_word: '',
    schedule: '09:00 - 17:30 hs',
    location: 'Patio Central',
    stamp_style: 'circular',
    stamp_image: undefined,
    stamp_type: 'bandera',
    sort_order: stands.length + 1,
    is_published: true,
  });

  // Password change state
  const [currPw, setCurrPw] = useState('');
  const [nextPw, setNextPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwMessage, setPwMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Reinicio de visitas
  const [resetOpen, setResetOpen] = useState(false);
  const [resetPw, setResetPw] = useState('');
  const [resetMsg, setResetMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [resetBusy, setResetBusy] = useState(false);

  // Borrado de visitantes
  const [clearOpen, setClearOpen] = useState(false);
  const [clearPw, setClearPw] = useState('');
  const [clearMsg, setClearMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [clearBusy, setClearBusy] = useState(false);

  const handleClearVisitors = async () => {
    if (!clearPw.trim()) {
      setClearMsg({ type: 'err', text: 'Ingresá la contraseña para confirmar.' });
      return;
    }
    setClearBusy(true);
    setClearMsg(null);
    const r = await resetVisitors(clearPw);
    setClearBusy(false);
    if (r.success) {
      setClearOpen(false);
      setClearPw('');
      setClearMsg(null);
    } else {
      setClearMsg({ type: 'err', text: r.error || 'No se pudieron eliminar los visitantes.' });
    }
  };

  const handleResetVisits = async () => {
    if (!resetPw.trim()) {
      setResetMsg({ type: 'err', text: 'Ingresá la contraseña para confirmar.' });
      return;
    }
    setResetBusy(true);
    setResetMsg(null);
    const r = await resetVisits(resetPw);
    setResetBusy(false);
    if (r.success) {
      setResetOpen(false);
      setResetPw('');
      setResetMsg(null);
    } else {
      setResetMsg({ type: 'err', text: r.error || 'No se pudieron eliminar las visitas.' });
    }
  };

  // Config draft state
  const [draftConfig, setDraftConfig] = useState<EventConfig>(config);
  const [configSaved, setConfigSaved] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Custom Palettes state
  interface CustomPaletteItem {
    id: string;
    name: string;
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    text_secondary: string;
  }

  const [customPalettes, setCustomPalettes] = useState<CustomPaletteItem[]>(() => {
    const saved = localStorage.getItem('passport_custom_palettes');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });
  const [customPaletteName, setCustomPaletteName] = useState('');

  // Sample logos for quick 1-click test (se convierten a data URL: el backend
  // solo acepta imágenes locales embebidas).
  const SAMPLE_LOGOS = [
    {
      name: 'Escudo Escolar Clásico',
      url: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=300&auto=format&fit=crop&q=80',
    },
    {
      name: 'Academia & Ciencia',
      url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=300&auto=format&fit=crop&q=80',
    },
    {
      name: 'Arte y Letras',
      url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=300&auto=format&fit=crop&q=80',
    },
  ];

  const applySampleLogo = async (url: string) => {
    try {
      const blob = await (await fetch(url)).blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
        reader.readAsDataURL(blob);
      });
      setDraftConfig(prev => ({ ...prev, logo: dataUrl }));
    } catch {
      setSamLogoError('No se pudo cargar el logo de ejemplo: revisá tu conexión a internet.');
    }
  };
  const [samLogoError, setSamLogoError] = useState<string | null>(null);

  const handleLogoUpload = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 400;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        setDraftConfig(prev => ({ ...prev, logo: canvas.toDataURL('image/png') }));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCustomPalette = () => {
    const name = customPaletteName.trim() || `Mi Paleta #${customPalettes.length + 1}`;
    const newPalette: CustomPaletteItem = {
      id: 'custom-' + Date.now(),
      name,
      primary: draftConfig.primary_color,
      secondary: draftConfig.secondary_color,
      accent: draftConfig.accent_color,
      background: draftConfig.background_color,
      text: draftConfig.text_color,
      text_secondary: draftConfig.text_secondary_color,
    };
    const updated = [...customPalettes, newPalette];
    setCustomPalettes(updated);
    localStorage.setItem('passport_custom_palettes', JSON.stringify(updated));
    setCustomPaletteName('');
  };

  const handleDeleteCustomPalette = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customPalettes.filter(p => p.id !== id);
    setCustomPalettes(updated);
    localStorage.setItem('passport_custom_palettes', JSON.stringify(updated));
  };

  // Comments filter
  const [commentFilter, setCommentFilter] = useState<'all' | 'pending' | 'hidden'>('all');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await adminLogin(passwordInput);
    if (!res.success) {
      setLoginError(res.error || 'Contraseña incorrecta.');
    } else {
      setLoginError(null);
      setPasswordInput('');
    }
  };

  const handleOpenEditStand = (stand: Stand) => {
    setEditingStand(stand);
    setStandFormData({
      slug: stand.slug,
      name: stand.name,
      course: stand.course,
      description: stand.description,
      area: stand.area,
      flag: stand.flag,
      secret_word: stand.secret_word,
      schedule: stand.schedule || '09:00 - 17:30 hs',
      location: stand.location || 'Patio Central',
      stamp_style: stand.stamp_style || config.stamp_style || 'circular',
      stamp_image: stand.stamp_image,
      stamp_type: stand.stamp_type,
      sort_order: stand.sort_order,
      is_published: stand.is_published,
    });
  };

  const handleSaveStand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStand) {
      await updateStand(editingStand.id, standFormData);
      setEditingStand(null);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateConfig(draftConfig);
      setConfigSaved(true);
      setTimeout(() => setConfigSaved(false), 2500);
    } catch (err: any) {
      window.alert(err?.message || 'No se pudo guardar la configuración.');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await changeAdminPassword(currPw, nextPw, confirmPw);
    if (res.success) {
      setPwMessage({ type: 'ok', text: '✓ Contraseña actualizada correctamente' });
      setCurrPw('');
      setNextPw('');
      setConfirmPw('');
    } else {
      setPwMessage({ type: 'err', text: res.error || 'Error al cambiar contraseña' });
    }
  };

  // Print all posters function
  const handlePrintAllPosters = () => {
    window.print();
  };

  // If not logged in, show login card
  if (!isAdmin) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6 text-slate-800 dark:text-slate-100">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold">Centro de Mando</h2>
            <p className="text-xs text-slate-500">
              Acceso exclusivo para docentes y directivos del evento. Aquí se administran los códigos QR, palabras secretas y cronograma.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Contraseña de Administrador
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                placeholder="Ingresá la contraseña..."
                className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-slate-100"
                autoFocus
              />
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-semibold text-xs rounded-xl shadow-md transition cursor-pointer"
            >
              Ingresar al Centro de Mando
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Calculate statistics for dashboard
  const activeStands = stands.filter(s => s.is_published);
  const totalStamps = visits.length;
  const evals = visits.filter(v => v.rating !== null);
  const avgRating =
    evals.length > 0
      ? (evals.reduce((acc, curr) => acc + (curr.rating || 0), 0) / evals.length).toFixed(1)
      : '0.0';

  // Stand ranking by visits
  const standRanking = activeStands
    .map(stand => {
      const sVisits = visits.filter(v => v.stand_id === stand.id);
      const sEvals = sVisits.filter(v => v.rating !== null);
      const sAvg =
        sEvals.length > 0
          ? (sEvals.reduce((acc, curr) => acc + (curr.rating || 0), 0) / sEvals.length).toFixed(1)
          : null;
      return {
        stand,
        visitsCount: sVisits.length,
        avgRating: sAvg,
      };
    })
    .sort((a, b) => b.visitsCount - a.visitsCount);

  // Comments for moderation
  const commentsList = visits
    .filter(v => v.comment && v.comment.trim() !== '')
    .filter(v => {
      if (commentFilter === 'pending') return !v.is_reviewed && !v.is_hidden;
      if (commentFilter === 'hidden') return v.is_hidden;
      return true;
    })
    .reverse();

  return (
    <div className="space-y-6 pb-20">
      {/* Top Admin Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Centro de Mando
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono font-semibold">
                ● Sesión activa
              </span>
            </h2>
            <p className="text-xs text-slate-500">{config.event_name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('creator')}
            className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-indigo-600 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            + Crear Sello
          </button>
          <button
            onClick={() => exportCSV('summary')}
            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV
          </button>
          <button
            onClick={adminLogout}
            className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Salir
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-slate-200 dark:border-slate-800">
        {[
          { id: 'dashboard', label: '📊 Resumen', icon: LayoutDashboard },
          { id: 'stats', label: '📈 Gráficos de Sellos', icon: BarChart3 },
          { id: 'creator', label: '🎨 Creador de Sellos', icon: Sparkles },
          { id: 'stands', label: `🏫 Stands (${stands.length})`, icon: Store },
          { id: 'posters', label: '🖨️ Carteles QR & Palabras', icon: QrCode },
          { id: 'branding', label: '🎨 Diseño y marca', icon: Palette },
          { id: 'comments', label: `💬 Comentarios (${commentsList.length})`, icon: MessageSquare },
          { id: 'visitors', label: `🧑‍🎓 Visitantes (${visitors.length})`, icon: Users },
          { id: 'settings', label: '⚙️ Configuración', icon: Settings },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl font-semibold text-xs whitespace-nowrap flex items-center gap-2 transition cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB: CREADOR DE SELLOS */}
      {activeTab === 'creator' && (
        <StampCreatorStudio onStandCreated={() => setActiveTab('stands')} />
      )}

      {/* TAB: ESTADÍSTICAS RECHARTS */}
      {activeTab === 'stats' && (
        <StandStatsPanel
          stands={stands}
          visits={visits}
          visitors={visitors}
          config={config}
        />
      )}

      {/* TAB: CARTELES QR & PALABRAS SECRETAS (SOLO ADMIN / DOCENTES) */}
      {activeTab === 'posters' && (
        <div className="space-y-6">
          <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <span className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 text-sm">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                Material Exclusivo de Impresión para la Organización
              </span>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                Estos carteles contienen el <strong>Código QR físico</strong> y la <strong>Palabra Secreta</strong> para colocar en cada mesa del colegio.
                Los visitantes de a pie no pueden acceder a esta pantalla para evitar que sellen pasaportes desde sus casas.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stands.map(stand => (
              <div
                key={stand.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FlagIcon flag={stand.flag} className="w-6 h-4 shadow-sm" />
                      <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {stand.course}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      ID #{stand.id}
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-snug">
                    {stand.name}
                  </h4>

                  <div className="flex flex-col gap-1 text-[11px] text-slate-500 font-medium">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-indigo-500" />
                      {stand.schedule || '09:00 - 17:30 hs'}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-rose-500" />
                      {stand.location || 'Patio Central'}
                    </span>
                  </div>

                  {/* Secret word box */}
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/50 rounded-xl border border-amber-200 dark:border-amber-800/60 text-center space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 block tracking-wider">
                      Palabra Secreta del Cartel
                    </span>
                    <span className="font-mono text-base font-black text-amber-900 dark:text-amber-200 tracking-widest">
                      {stand.secret_word}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onOpenQR(stand)}
                  className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Ver e Imprimir Cartel A4
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <StandStatsPanel
            stands={stands}
            visits={visits}
            visitors={visitors}
            config={config}
          />

          {/* Recent Activity */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                Últimas Visitas y Evaluaciones en Tiempo Real
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 font-mono">
                  {visits.length} interacciones totales
                </span>
                <button
                  onClick={() => {
                    setResetPw('');
                    setResetMsg(null);
                    setResetOpen(true);
                  }}
                  title="Elimina TODAS las visitas y evaluaciones (sellos, comentarios, puntajes)."
                  className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-100 transition flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" /> Reiniciar visitas
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-h-[340px] overflow-y-auto pr-1">
              {visits
                .slice(-12)
                .reverse()
                .map(v => {
                  const stand = stands.find(s => s.id === v.stand_id);
                  const visitor = visitors.find(vis => vis.id === v.visitor_id);
                  return (
                    <div
                      key={v.id}
                      className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[130px]">
                          {visitor?.name || '🕶️ Anónimo'}
                        </span>
                        <span className="text-slate-400 font-mono text-[10px]">
                          {v.created_at.slice(11, 16)} hs
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
                        {stand && <FlagIcon flag={stand.flag} className="w-3.5 h-2.5 shrink-0" />}
                        <span className="truncate">{stand?.name}</span>
                      </div>
                      {v.rating ? (
                        <div className="flex items-center gap-1 text-amber-500 font-bold text-[11px]">
                          <Star className="w-3 h-3 fill-amber-500" /> {v.rating} estrellas
                          {v.comment && (
                            <span className="text-slate-500 font-normal italic truncate ml-1 text-[10px]">
                              "{v.comment}"
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">Sin valoración</span>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* TAB: STANDS CRUD */}
      {activeTab === 'stands' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Gestión de Stands y Sellos
              </h3>
              <p className="text-xs text-slate-500">
                Administra los proyectos, formas de sellos, horarios y ubicaciones físicas.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('creator')}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                Diseñar Nuevo Sello
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-mono uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Sello</th>
                    <th className="py-3 px-4">Stand / Curso</th>
                    <th className="py-3 px-4">Horario & Ubicación</th>
                    <th className="py-3 px-4">Forma</th>
                    <th className="py-3 px-4">Palabra Secreta</th>
                    <th className="py-3 px-4">Visitas</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {stands.map(stand => {
                    const standVisits = visits.filter(v => v.stand_id === stand.id);
                    return (
                      <tr
                        key={stand.id}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition ${
                          !stand.is_published ? 'opacity-50' : ''
                        }`}
                      >
                        <td className="py-2.5 px-4 w-16">
                          <div className="w-10 h-10 rounded overflow-hidden shadow-sm border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            {stand.stamp_image ? (
                              <img
                                src={stand.stamp_image}
                                alt={stand.name}
                                className="w-full h-full object-cover"
                              />
                            ) : FLAGS[stand.flag]?.render() || (
                              <span className="font-mono text-[10px]">{stand.flag}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-800 dark:text-slate-100 block">
                            {stand.name}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {stand.course} · {stand.area}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[11px]">
                          <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold block">
                            {stand.schedule || '09:00 - 17:30 hs'}
                          </span>
                          <span className="text-slate-500">
                            {stand.location || 'Patio Central'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-medium capitalize text-slate-600 dark:text-slate-300">
                          {stand.stamp_style || config.stamp_style || 'circular'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-800">
                            {stand.secret_word}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {standVisits.length}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => {
                              void updateStand(stand.id, { is_published: !stand.is_published });
                            }}
                            title={
                              stand.is_published
                                ? 'Ocultar del catálogo (los pasaportes ya sellados no se pierden)'
                                : 'Activar en el catálogo'
                            }
                            className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-[10px] font-bold border transition cursor-pointer ${
                              stand.is_published
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <span
                              className={`relative w-7 h-4 rounded-full transition ${
                                stand.is_published ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            >
                              <span
                                className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${
                                  stand.is_published ? 'left-3.5' : 'left-0.5'
                                }`}
                              />
                            </span>
                            {stand.is_published ? 'Activo' : 'Oculto'}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => onOpenQR(stand)}
                              title="Ver Cartel QR para Imprimir"
                              className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 dark:hover:bg-slate-800 cursor-pointer"
                            >
                              <QrCode className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEditStand(stand)}
                              title="Editar Stand"
                              className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 dark:hover:bg-slate-800 cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => regenerateStandToken(stand.id)}
                              title="Regenerar Token QR"
                              className="p-1.5 text-slate-500 hover:text-amber-600 rounded-lg hover:bg-amber-50 dark:hover:bg-slate-800 cursor-pointer"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteStand(stand.id)}
                              title="Desactivar Stand"
                              className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-slate-800 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Stand Edit Modal */}
      {editingStand && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-slate-800 dark:text-slate-100">
            <h3 className="text-base font-bold">
              Editar Stand: {editingStand.name}
            </h3>

            <form onSubmit={handleSaveStand} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Nombre del Stand
                  </label>
                  <input
                    type="text"
                    required
                    value={standFormData.name}
                    onChange={e => setStandFormData({ ...standFormData, name: e.target.value })}
                    placeholder="Ej: Robótica sustentable"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Curso</label>
                  <input
                    type="text"
                    required
                    value={standFormData.course}
                    onChange={e => setStandFormData({ ...standFormData, course: e.target.value })}
                    placeholder="Ej: 3.º B"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Área</label>
                  <input
                    type="text"
                    required
                    value={standFormData.area}
                    onChange={e => setStandFormData({ ...standFormData, area: e.target.value })}
                    placeholder="Ej: Ciencias Naturales, Historia"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Horario de Exposición
                  </label>
                  <input
                    type="text"
                    required
                    value={standFormData.schedule}
                    onChange={e => setStandFormData({ ...standFormData, schedule: e.target.value })}
                    placeholder="Ej: 10:00 - 12:30 hs"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Ubicación en el Colegio
                  </label>
                  <input
                    type="text"
                    required
                    value={standFormData.location}
                    onChange={e => setStandFormData({ ...standFormData, location: e.target.value })}
                    placeholder="Ej: Patio Central, Aula Magna"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Forma del Sello
                  </label>
                  <select
                    value={standFormData.stamp_style}
                    onChange={e =>
                      setStandFormData({
                        ...standFormData,
                        stamp_style: e.target.value as StampStyle,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl font-medium"
                  >
                    <option value="circular">🔘 Circular</option>
                    <option value="estampilla">🏷️ Estampilla Postal</option>
                    <option value="cuadrado">⏹️ Cuadrado</option>
                    <option value="hexagonal">⬡ Hexagonal</option>
                    <option value="escudo">🛡️ Escudo</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Palabra Secreta
                  </label>
                  <input
                    type="text"
                    required
                    value={standFormData.secret_word}
                    onChange={e =>
                      setStandFormData({ ...standFormData, secret_word: e.target.value.toUpperCase() })
                    }
                    placeholder="Ej: AMBIENTE"
                    className="w-full font-mono uppercase px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl font-bold"
                  />
                </div>

                <div className="space-y-1 col-span-2">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Bandera de Fondo Completo
                  </label>
                  <select
                    value={standFormData.flag}
                    onChange={e => setStandFormData({ ...standFormData, flag: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl uppercase font-mono"
                  >
                    {Object.keys(FLAGS).map(k => (
                      <option key={k} value={k}>
                        {k.toUpperCase()} - {FLAGS[k].name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1 col-span-2">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Descripción
                  </label>
                  <textarea
                    rows={2}
                    value={standFormData.description}
                    onChange={e =>
                      setStandFormData({ ...standFormData, description: e.target.value })
                    }
                    placeholder="Breve reseña del proyecto..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="pub"
                  checked={standFormData.is_published}
                  onChange={e =>
                    setStandFormData({ ...standFormData, is_published: e.target.checked })
                  }
                  className="rounded text-indigo-600"
                />
                <label htmlFor="pub" className="text-xs font-semibold cursor-pointer">
                  Stand publicado y activo en el recorrido
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingStand(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow cursor-pointer"
                >
                  Guardar Stand
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB: BRANDING & DESIGN */}
      {activeTab === 'branding' && (
        <form onSubmit={handleSaveConfig} className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Palette className="w-5 h-5 text-indigo-500" />
                Diseño, Logo y Paleta de Colores
              </h3>
              <p className="text-xs text-slate-500">
                Sube el logo del colegio, elige o crea tu propia paleta y personaliza la identidad del evento.
              </p>
            </div>
            <button
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Check className="w-4 h-4" />
              Guardar Cambios
            </button>
          </div>

          {configSaved && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 rounded-2xl text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2 animate-bounce">
              <CheckCircle className="w-4 h-4" />
              <span>¡Logo, colores y configuración aplicados con éxito a toda la aplicación!</span>
            </div>
          )}

          {/* 1. SECCIÓN: LOGO DEL COLEGIO / INSTITUCIÓN */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    Logo Oficial del Colegio / Institución
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Aparecerá en el encabezado, en la portada del pasaporte y en los carteles imprimibles.
                  </span>
                </div>
              </div>
              {draftConfig.logo && (
                <button
                  type="button"
                  onClick={() => setDraftConfig(prev => ({ ...prev, logo: null }))}
                  className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <Trash className="w-3.5 h-3.5" /> Quitar logo
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              {/* Upload Zone */}
              <div
                onClick={() => logoInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleLogoUpload(e.dataTransfer.files[0]);
                  }
                }}
                className="md:col-span-2 border-2 border-dashed border-indigo-300 dark:border-indigo-800/80 hover:border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20 rounded-2xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2.5 group"
              >
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      handleLogoUpload(e.target.files[0]);
                    }
                  }}
                />
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-xs text-indigo-950 dark:text-indigo-200">
                    Subir logo o escudo escolar
                  </p>
                  <span className="text-[11px] text-slate-400">
                    Haz clic para seleccionar o arrastra una imagen (PNG, JPG, SVG, WebP)
                  </span>
                </div>
              </div>

              {/* Logo Preview */}
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex flex-col items-center justify-center text-center gap-2">
                <span className="text-[10px] uppercase font-mono font-bold text-slate-400">
                  Vista Previa del Logo
                </span>
                {draftConfig.logo ? (
                  <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-sm border border-slate-300 dark:border-slate-700 bg-white p-1.5 flex items-center justify-center">
                    <img
                      src={draftConfig.logo}
                      alt="Logo Institución"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 text-[10px] gap-1">
                    <ImageIcon className="w-6 h-6 opacity-40" />
                    <span>Sin logo</span>
                  </div>
                )}
                {draftConfig.logo && (
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
                  >
                    Cambiar imagen
                  </button>
                )}
              </div>
            </div>

            {/* Sample Logos */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-500 block mb-2">
                ¿No tienes el archivo a mano? Elige un escudo escolar de muestra:
              </span>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_LOGOS.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => void applySampleLogo(sample.url)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 bg-slate-50 dark:bg-slate-950 flex items-center gap-2 text-xs font-medium cursor-pointer transition"
                  >
                    <img
                      src={sample.url}
                      alt={sample.name}
                      className="w-5 h-5 rounded object-cover shadow-xs"
                    />
                    <span>{sample.name}</span>
                  </button>
                ))}
              </div>
              {samLogoError && (
                <p className="mt-2 text-[11px] text-rose-500 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {samLogoError}
                </p>
              )}
            </div>
          </div>

          {/* 2. SECCIÓN: PALETAS PREDISEÑADAS */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>🎨</span> Paletas de Color Prediseñadas
              </h4>
              <p className="text-xs text-slate-500">
                Selecciona una de las combinaciones prediseñadas con un solo clic.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
              {COLOR_PRESETS.map(preset => (
                <button
                  type="button"
                  key={preset.name}
                  onClick={() =>
                    setDraftConfig({
                      ...draftConfig,
                      primary_color: preset.primary,
                      secondary_color: preset.secondary,
                      accent_color: preset.accent,
                      background_color: preset.background,
                      text_color: preset.text,
                      text_secondary_color: preset.text_secondary,
                    })
                  }
                  className={`p-3 rounded-2xl border text-left space-y-2 transition text-xs cursor-pointer ${
                    draftConfig.primary_color === preset.primary &&
                    draftConfig.background_color === preset.background
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-950/50'
                  }`}
                >
                  <span className="font-bold block truncate text-[11px] text-slate-800 dark:text-slate-200">
                    {preset.name}
                  </span>
                  <div className="flex h-5 rounded-lg overflow-hidden shadow-inner border border-black/10">
                    <div style={{ backgroundColor: preset.primary }} className="flex-1" title="Primario" />
                    <div style={{ backgroundColor: preset.secondary }} className="flex-1" title="Secundario" />
                    <div style={{ backgroundColor: preset.accent }} className="flex-1" title="Acento" />
                    <div style={{ backgroundColor: preset.background }} className="flex-1" title="Fondo" />
                  </div>
                </button>
              ))}
            </div>

            {/* Custom Saved Palettes */}
            {customPalettes.length > 0 && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                  ⭐ Mis Paletas Creadas y Guardadas
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {customPalettes.map(palette => (
                    <div
                      key={palette.id}
                      onClick={() =>
                        setDraftConfig({
                          ...draftConfig,
                          primary_color: palette.primary,
                          secondary_color: palette.secondary,
                          accent_color: palette.accent,
                          background_color: palette.background,
                          text_color: palette.text,
                          text_secondary_color: palette.text_secondary,
                        })
                      }
                      className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 bg-slate-50 dark:bg-slate-950/80 flex items-center justify-between gap-3 cursor-pointer group transition"
                    >
                      <div className="space-y-1 truncate">
                        <span className="font-bold text-xs block truncate text-slate-800 dark:text-slate-200">
                          {palette.name}
                        </span>
                        <div className="flex h-4 w-28 rounded-md overflow-hidden shadow-inner border border-black/10">
                          <div style={{ backgroundColor: palette.primary }} className="flex-1" />
                          <div style={{ backgroundColor: palette.secondary }} className="flex-1" />
                          <div style={{ backgroundColor: palette.accent }} className="flex-1" />
                          <div style={{ backgroundColor: palette.background }} className="flex-1" />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={e => handleDeleteCustomPalette(palette.id, e)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-slate-800 transition"
                        title="Eliminar esta paleta"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 3. SECCIÓN: CREADOR DE PALETA PROPIA / PERSONALIZADA */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-amber-500 text-white font-black text-xs flex items-center justify-center shadow">
                  <Pipette className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    Creador de Paleta Propia
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Ajusta los colores con el selector de color o ingresa los códigos HEX de tu institución.
                  </span>
                </div>
              </div>
            </div>

            {/* Color Pickers Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
              {/* Primary Color */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Color Primario (Barras y Botones)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={draftConfig.primary_color}
                    onChange={e => setDraftConfig({ ...draftConfig, primary_color: e.target.value })}
                    className="w-9 h-9 rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={draftConfig.primary_color}
                    onChange={e => setDraftConfig({ ...draftConfig, primary_color: e.target.value })}
                    className="w-full px-2.5 py-1.5 font-mono uppercase text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              {/* Secondary Color */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Color Secundario / Acento
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={draftConfig.secondary_color}
                    onChange={e => setDraftConfig({ ...draftConfig, secondary_color: e.target.value })}
                    className="w-9 h-9 rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={draftConfig.secondary_color}
                    onChange={e => setDraftConfig({ ...draftConfig, secondary_color: e.target.value })}
                    className="w-full px-2.5 py-1.5 font-mono uppercase text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              {/* Accent Color */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Color de Acento Adicional
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={draftConfig.accent_color}
                    onChange={e => setDraftConfig({ ...draftConfig, accent_color: e.target.value })}
                    className="w-9 h-9 rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={draftConfig.accent_color}
                    onChange={e => setDraftConfig({ ...draftConfig, accent_color: e.target.value })}
                    className="w-full px-2.5 py-1.5 font-mono uppercase text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              {/* Background Color */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Color de Fondo General
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={draftConfig.background_color}
                    onChange={e => setDraftConfig({ ...draftConfig, background_color: e.target.value })}
                    className="w-9 h-9 rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={draftConfig.background_color}
                    onChange={e => setDraftConfig({ ...draftConfig, background_color: e.target.value })}
                    className="w-full px-2.5 py-1.5 font-mono uppercase text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              {/* Text Primary */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Color de Texto Principal
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={draftConfig.text_color}
                    onChange={e => setDraftConfig({ ...draftConfig, text_color: e.target.value })}
                    className="w-9 h-9 rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={draftConfig.text_color}
                    onChange={e => setDraftConfig({ ...draftConfig, text_color: e.target.value })}
                    className="w-full px-2.5 py-1.5 font-mono uppercase text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              {/* Text Secondary */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Color de Texto Secundario
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={draftConfig.text_secondary_color}
                    onChange={e => setDraftConfig({ ...draftConfig, text_secondary_color: e.target.value })}
                    className="w-9 h-9 rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={draftConfig.text_secondary_color}
                    onChange={e => setDraftConfig({ ...draftConfig, text_secondary_color: e.target.value })}
                    className="w-full px-2.5 py-1.5 font-mono uppercase text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Live Visual Preview of Custom Colors */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 space-y-3">
              <span className="text-[11px] uppercase font-mono font-bold text-slate-400 block">
                Vista Previa de tu Combinación de Colores
              </span>

              {/* Mock banner with current draft colors */}
              <div
                className="p-5 rounded-2xl shadow-md space-y-3 transition-colors"
                style={{
                  backgroundColor: draftConfig.primary_color,
                  color: '#ffffff',
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {draftConfig.logo && (
                      <img
                        src={draftConfig.logo}
                        alt="Logo"
                        className="w-7 h-7 rounded-lg object-contain bg-white/20 p-0.5"
                      />
                    )}
                    <span className="text-xs font-bold font-mono uppercase tracking-wider opacity-90">
                      {draftConfig.institution_name || 'Colegio Modelo'}
                    </span>
                  </div>
                  <span
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-xs"
                    style={{
                      backgroundColor: draftConfig.secondary_color,
                      color: '#0f172a',
                    }}
                  >
                    ★ Pasaporte Activo
                  </span>
                </div>
                <div>
                  <h5 className="font-extrabold text-sm sm:text-base">
                    {draftConfig.event_name || 'Muestra Escolar 2026'}
                  </h5>
                  <p className="text-[11px] opacity-80">
                    {draftConfig.event_subtitle || 'Recorré los stands y completá tu pasaporte'}
                  </p>
                </div>
              </div>

              {/* Save custom palette form */}
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                <input
                  type="text"
                  value={customPaletteName}
                  onChange={e => setCustomPaletteName(e.target.value)}
                  placeholder="Nombre de tu paleta (Ej: Azul Institucional, Escuela 14...)"
                  className="w-full sm:flex-1 text-xs px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
                <button
                  type="button"
                  onClick={handleSaveCustomPalette}
                  className="w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap active:scale-95"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  Guardar en "Mis Paletas"
                </button>
              </div>
            </div>
          </div>

          {/* 4. SECCIÓN: INFORMACIÓN DE LA INSTITUCIÓN */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4 text-xs">
            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>🏫</span> Información de la Institución
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Nombre del Evento
                </label>
                <input
                  type="text"
                  value={draftConfig.event_name}
                  onChange={e => setDraftConfig({ ...draftConfig, event_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Institución / Colegio
                </label>
                <input
                  type="text"
                  value={draftConfig.institution_name}
                  onChange={e =>
                    setDraftConfig({ ...draftConfig, institution_name: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Subtítulo o Lema
                </label>
                <input
                  type="text"
                  value={draftConfig.event_subtitle}
                  onChange={e =>
                    setDraftConfig({ ...draftConfig, event_subtitle: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* 5. SECCIÓN: ESTILO GLOBAL DE LOS SELLOS */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-3 text-xs">
            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>🏷️</span> Estilo Predeterminado de los Sellos
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { id: 'estampilla', label: 'Estampilla Postal', desc: 'Bordes dentados' },
                { id: 'circular', label: 'Circular Clásico', desc: 'Sello redondo tradicional' },
                { id: 'cuadrado', label: 'Cuadrado Moderno', desc: 'Esquinas redondeadas' },
                { id: 'hexagonal', label: 'Hexagonal', desc: 'Geometría moderna' },
                { id: 'escudo', label: 'Escudo', desc: 'Forma blasón heráldico' },
              ].map(st => (
                <button
                  type="button"
                  key={st.id}
                  onClick={() =>
                    setDraftConfig({ ...draftConfig, stamp_style: st.id as StampStyle })
                  }
                  className={`p-3.5 rounded-2xl border text-left space-y-1 transition cursor-pointer ${
                    draftConfig.stamp_style === st.id
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span className="font-bold block text-xs">{st.label}</span>
                  <span className="text-[11px] text-slate-500 block">{st.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Action button at bottom */}
          <div className="flex items-center justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-2xl shadow-xl transition flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Check className="w-4 h-4" />
              Guardar Todos los Cambios de Identidad y Colores
            </button>
          </div>
        </form>
      )}

      {/* TAB: COMMENTS MODERATION */}
      {activeTab === 'comments' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Moderación de Comentarios
              </h3>
              <p className="text-xs text-slate-500">
                Revisa, oculta o elimina comentarios de los visitantes.
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <button
                onClick={() => setCommentFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-medium cursor-pointer ${
                  commentFilter === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setCommentFilter('pending')}
                className={`px-3 py-1.5 rounded-xl font-medium cursor-pointer ${
                  commentFilter === 'pending'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                }`}
              >
                Sin revisar
              </button>
              <button
                onClick={() => setCommentFilter('hidden')}
                className={`px-3 py-1.5 rounded-xl font-medium cursor-pointer ${
                  commentFilter === 'hidden'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                }`}
              >
                Ocultos
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {commentsList.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                No hay comentarios con este filtro.
              </div>
            ) : (
              commentsList.map(visit => {
                const stand = stands.find(s => s.id === visit.stand_id);
                const visitor = visitors.find(v => v.id === visit.visitor_id);

                return (
                  <div
                    key={visit.id}
                    className={`p-4 rounded-2xl border transition-all text-xs space-y-2.5 ${
                      visit.is_hidden
                        ? 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/50'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {visitor?.name || '🕶️ Anónimo'}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-500">{stand?.name}</span>
                        {visit.rating && (
                          <div className="flex items-center gap-0.5 text-amber-500 font-bold ml-1">
                            <Star className="w-3.5 h-3.5 fill-amber-500" />
                            {visit.rating}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {visit.is_reviewed && (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                            Revisado ✓
                          </span>
                        )}
                        {visit.is_hidden && (
                          <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/60 px-2 py-0.5 rounded-full">
                            Oculto 👁️
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs italic">
                      "{visit.comment}"
                    </p>

                    <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400 font-mono">
                      <span>{visit.created_at}</span>
                      <div className="flex items-center gap-2">
                        {!visit.is_reviewed && (
                          <button
                            onClick={() => moderateComment(visit.id, 'review')}
                            className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 rounded-lg font-semibold cursor-pointer"
                          >
                            Marcar revisado
                          </button>
                        )}
                        {visit.is_hidden ? (
                          <button
                            onClick={() => moderateComment(visit.id, 'unhide')}
                            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" /> Mostrar
                          </button>
                        ) : (
                          <button
                            onClick={() => moderateComment(visit.id, 'hide')}
                            className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-lg font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <EyeOff className="w-3 h-3" /> Ocultar
                          </button>
                        )}
                        <button
                          onClick={() => moderateComment(visit.id, 'delete')}
                          className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-lg font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" /> Borrar texto
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB: VISITORS */}
      {activeTab === 'visitors' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Lista de Visitantes Registrados
              </h3>
              <p className="text-xs text-slate-500">
                Seguimiento del avance de cada pasaporte digital emitido.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setClearPw('');
                  setClearMsg(null);
                  setClearOpen(true);
                }}
                title="Elimina TODOS los visitantes registrados (y sus sellos, comentarios y puntajes)."
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Borrar visitantes
              </button>
              <button
                onClick={() => exportCSV('visitas')}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow flex items-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar Visitas (CSV)
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-mono uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Visitante</th>
                    <th className="py-3 px-4">Stands Sellados</th>
                    <th className="py-3 px-4">Progreso</th>
                    <th className="py-3 px-4">Token</th>
                    <th className="py-3 px-4">Fecha de Alta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {visitors.map(visitor => {
                    const vVisits = visits.filter(v => v.visitor_id === visitor.id);
                    const pct = activeStands.length > 0 ? Math.round((vVisits.length / activeStands.length) * 100) : 0;

                    return (
                      <tr key={visitor.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-100">
                          {visitor.name ? visitor.name : '🕶️ Anónimo'}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold">
                          {vVisits.length} / {activeStands.length}
                        </td>
                        <td className="py-3 px-4 w-48">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="font-mono text-[11px] font-bold">{pct}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-400 truncate max-w-xs">
                          {visitor.token.slice(0, 14)}...
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                          {visitor.created_at}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: SETTINGS & EXPORT */}
      {activeTab === 'settings' && (
        <div className="space-y-6 max-w-2xl">
          {/* Change Password Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 text-xs">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-500" />
              Seguridad: Cambiar Contraseña del Centro de Mando
            </h3>

            <form onSubmit={handlePasswordChange} className="space-y-3">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Contraseña Actual
                </label>
                <input
                  type="password"
                  required
                  value={currPw}
                  onChange={e => setCurrPw(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Nueva Contraseña (mínimo 8 caracteres)
                  </label>
                  <input
                    type="password"
                    required
                    value={nextPw}
                    onChange={e => setNextPw(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Confirmar Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPw}
                    onChange={e => setConfirmPw(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
                  />
                </div>
              </div>

              {pwMessage && (
                <div
                  className={`p-3 rounded-xl border text-xs font-semibold ${
                    pwMessage.type === 'ok'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-500/30 text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {pwMessage.text}
                </div>
              )}

              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow transition cursor-pointer"
              >
                Actualizar Contraseña
              </button>
            </form>
          </div>

          {/* Export Center */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 text-xs">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-500" />
              Exportación de Informes y Datos
            </h3>
            <p className="text-slate-500">
              Generá el informe visual ejecutivo en PDF para directivos o descargá las planillas en CSV para Excel y Google Sheets.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => exportStatsToPDF({ stands, visits, visitors, config })}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl flex items-center gap-1.5 transition shadow cursor-pointer active:scale-95"
              >
                <FileDown className="w-3.5 h-3.5" />
                Descargar Informe Estadístico (PDF)
              </button>
              <button
                onClick={() => exportCSV('visitas')}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-semibold flex items-center gap-1.5 transition text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar visitas.csv
              </button>
              <button
                onClick={() => exportCSV('summary')}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-semibold flex items-center gap-1.5 transition text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar summary.csv
              </button>
            </div>
          </div>

          {/* Datos reales */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-2 text-xs">
            <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Database className="w-4 h-4" />
              Datos reales
            </h3>
            <p className="text-slate-500 leading-relaxed">
              Este Centro de Mando trabaja sobre la base de datos real del evento. No hay datos de
              demostración que restablecer: los cambios son inmediatos y afectan a los pasaportes de los
              visitantes en vivo.
            </p>
          </div>
        </div>
      )}

      {/* Modal: reiniciar visitas (pide contraseña de admin) */}
      {resetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-slate-800 dark:text-slate-100">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/20">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm">Reiniciar visitas</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Elimina <b className="text-rose-500">todas</b> las visitas y evaluaciones (sellos, comentarios
                  y puntajes) de la base real. Los stands y pasaportes se conservan. No se puede deshacer.
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Contraseña del Centro de Mando
              </label>
              <input
                type="password"
                value={resetPw}
                onChange={e => setResetPw(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') void handleResetVisits();
                }}
                placeholder="Ingresá la contraseña para confirmar..."
                className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus:outline-none focus:border-rose-500 text-slate-900 dark:text-slate-100"
                autoFocus
              />
            </div>

            {resetMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-600 dark:text-rose-400">
                {resetMsg.text}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setResetOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => void handleResetVisits()}
                disabled={resetBusy}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 active:scale-95 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow transition cursor-pointer disabled:cursor-not-allowed"
              >
                {resetBusy ? 'Eliminando...' : 'Eliminar todo'}
              </button>
            </div>
          </div>
        </div>
      )}
    {/* Modal: borrar visitantes (pide contraseña de admin) */}
      {clearOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-slate-800 dark:text-slate-100">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/20">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm">Borrar visitantes</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Elimina <b className="text-rose-500">todos</b> los visitantes registrados y su actividad
                  (sellos, comentarios y puntajes). Los stands y la configuración se conservan. No se puede
                  deshacer.
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Contraseña del Centro de Mando
              </label>
              <input
                type="password"
                value={clearPw}
                onChange={e => setClearPw(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') void handleClearVisitors();
                }}
                placeholder="Ingresá la contraseña para confirmar..."
                className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl focus:outline-none focus:border-rose-500 text-slate-900 dark:text-slate-100"
                autoFocus
              />
            </div>

            {clearMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-600 dark:text-rose-400">
                {clearMsg.text}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setClearOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => void handleClearVisitors()}
                disabled={clearBusy}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 active:scale-95 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow transition cursor-pointer disabled:cursor-not-allowed"
              >
                {clearBusy ? 'Eliminando...' : 'Borrar todo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
