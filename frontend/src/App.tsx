import React, { useEffect, useState } from 'react';
import { usePassport } from './context/PassportContext';
import { PassportView } from './components/PassportView';
import { StandsList } from './components/StandsList';
import { ScheduleProgramView } from './components/ScheduleProgramView';
import { AdminPanel } from './components/AdminPanel';
import { QRPosterModal } from './components/QRPosterModal';
import { EvaluationModal } from './components/EvaluationModal';
import { ScannerModal } from './components/ScannerModal';
import { VisitorModal } from './components/VisitorModal';
import { WelcomeOnboarding } from './components/WelcomeOnboarding';
import { Stand } from './types';
import { 
  BookOpen, 
  Store, 
  Calendar, 
  ShieldAlert, 
  Smartphone, 
  QrCode, 
  Monitor, 
  Heart
} from 'lucide-react';

export function App() {
  const { config, currentVisitor } = usePassport();
  const [viewMode, setViewMode] = useState<'visitor' | 'admin'>('visitor');
  const [visitorTab, setVisitorTab] = useState<'passport' | 'program' | 'stands'>('passport');
  const [isMobileFrame, setIsMobileFrame] = useState<boolean>(false);

  // Modals state
  const [showScanner, setShowScanner] = useState(false);
  const [showVisitorModal, setShowVisitorModal] = useState(false);
  const [evaluationStand, setEvaluationStand] = useState<Stand | null>(null);
  const [qrModalStand, setQrModalStand] = useState<Stand | null>(null);

  // QR heredado (#/scan?tok=...): se aplica apenas hay un pasaporte activo.
  const [pendingTok, setPendingTok] = useState<string | null>(null);

  useEffect(() => {
    const m = window.location.hash.match(/#\/scan\?tok=([^&]+)/);
    if (m) {
      setPendingTok(decodeURIComponent(m[1]));
      window.location.hash = '#';
    }
  }, []);

  useEffect(() => {
    if (currentVisitor && pendingTok) setShowScanner(true);
  }, [currentVisitor, pendingTok]);

  const handleOpenEvaluation = (stand: Stand) => {
    setEvaluationStand(stand);
  };

  const handleOpenAdminQR = (stand: Stand) => {
    setQrModalStand(stand);
  };

  return (
    <div 
      className="min-h-screen flex flex-col font-sans transition-colors duration-300"
      style={{
        backgroundColor: config.background_color || '#f7f3ea',
        color: config.text_color || '#22303c',
      }}
    >
      {/* Top Header / App Bar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-black/10 dark:border-white/10 px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          {config.logo ? (
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700 bg-white flex items-center justify-center p-0.5 shrink-0">
              <img src={config.logo} alt={config.institution_name} className="w-full h-full object-contain" />
            </div>
          ) : (
            <div 
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-sm font-bold text-xs"
              style={{ backgroundColor: config.primary_color }}
            >
              🛂
            </div>
          )}
          <div>
            <h1 className="font-bold text-xs sm:text-sm tracking-tight flex items-center gap-1.5">
              {config.event_name}
              <span className="hidden md:inline-block text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                {config.institution_name || 'Muestra 2026'}
              </span>
            </h1>
          </div>
        </div>

        {/* View Switchers */}
        <div className="flex items-center gap-2">
          {/* Main Role Switcher: Visitor vs Admin */}
          <div className="flex bg-slate-200/70 dark:bg-slate-800/80 p-0.5 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setViewMode('visitor')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'visitor'
                  ? 'bg-white dark:bg-slate-900 shadow-sm text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Modo</span> Visitante
            </button>
            <button
              onClick={() => setViewMode('admin')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'admin'
                  ? 'bg-white dark:bg-slate-900 shadow-sm text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Centro de Mando
            </button>
          </div>

          {/* Device Frame Simulator (for Visitor Mode) */}
          {viewMode === 'visitor' && (
            <button
              onClick={() => setIsMobileFrame(!isMobileFrame)}
              title={isMobileFrame ? 'Ver en pantalla completa' : 'Simular marco de celular'}
              className="p-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition hidden sm:flex items-center justify-center cursor-pointer"
            >
              {isMobileFrame ? <Monitor className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex justify-center p-3 sm:p-6 overflow-x-hidden">
        {/* If Mobile Frame is toggled, wrap in a sleek smartphone frame */}
        <div
          className={`w-full transition-all duration-300 ${
            viewMode === 'visitor' && isMobileFrame
              ? 'max-w-[420px] bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl border-8 border-slate-900 dark:border-slate-800 p-4 min-h-[780px] flex flex-col justify-between'
              : 'max-w-5xl'
          }`}
        >
          {viewMode === 'visitor' ? (
            <div className="flex-1 flex flex-col">
              {/* Visitor Navigation Tabs: Safe for public */}
              <div className="flex items-center justify-center gap-2 mb-6 border-b border-black/10 dark:border-white/10 pb-3">
                <button
                  onClick={() => setVisitorTab('passport')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    visitorTab === 'passport'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-white'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  🛂 Mi Pasaporte
                </button>
                <button
                  onClick={() => setVisitorTab('program')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    visitorTab === 'program'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-white'
                  }`}
                >
                  <Calendar className="w-4 h-4 text-amber-500" />
                  📅 Programa de la Muestra
                </button>
                <button
                  onClick={() => setVisitorTab('stands')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    visitorTab === 'stands'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-white'
                  }`}
                >
                  <Store className="w-4 h-4" />
                  🏫 Stands
                </button>
              </div>

              {/* Visitor Views */}
              {visitorTab === 'passport' && (
                !currentVisitor ? (
                  <WelcomeOnboarding />
                ) : (
                  <PassportView
                    onOpenScanner={() => setShowScanner(true)}
                    onOpenEvaluation={handleOpenEvaluation}
                    onOpenNewVisitor={() => setShowVisitorModal(true)}
                  />
                )
              )}

              {visitorTab === 'program' && (
                <ScheduleProgramView
                  onOpenScanner={() => setShowScanner(true)}
                  onOpenEvaluation={handleOpenEvaluation}
                />
              )}

              {visitorTab === 'stands' && (
                <StandsList
                  onOpenEvaluation={handleOpenEvaluation}
                  onOpenScanner={() => setShowScanner(true)}
                />
              )}
            </div>
          ) : (
            <AdminPanel onOpenQR={handleOpenAdminQR} />
          )}
        </div>
      </main>

      {/* Floating Action Button for Scanning (Visitor Mode) */}
      {viewMode === 'visitor' && visitorTab === 'passport' && currentVisitor && (
        <div className="fixed bottom-6 right-6 z-30">
          <button
            onClick={() => setShowScanner(true)}
            className="px-5 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 active:scale-95 text-white font-extrabold text-sm shadow-2xl flex items-center gap-2 border border-white/30 backdrop-blur transition-all cursor-pointer"
          >
            <QrCode className="w-5 h-5" />
            <span>Sellar Stand (QR / Palabra)</span>
          </button>
        </div>
      )}

      {/* Modals */}
      {showScanner && (
        <ScannerModal
          onClose={() => setShowScanner(false)}
          onOpenEvaluation={handleOpenEvaluation}
          initialTok={pendingTok}
          onInitialHandled={() => setPendingTok(null)}
        />
      )}

      {showVisitorModal && (
        <VisitorModal onClose={() => setShowVisitorModal(false)} />
      )}

      {evaluationStand && (
        <EvaluationModal
          stand={evaluationStand}
          onClose={() => setEvaluationStand(null)}
        />
      )}

      {qrModalStand && (
        <QRPosterModal
          stand={qrModalStand}
          onClose={() => setQrModalStand(null)}
        />
      )}

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-500 border-t border-black/5 dark:border-white/5 space-y-1">
        <p>{config.texts.footer_text || 'Muestra Escolar 2026'}</p>
        <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
          Hecho con <Heart className="w-3 h-3 text-rose-500 fill-rose-500 inline" /> para la comunidad educativa
        </p>
      </footer>
    </div>
  );
}

export default App;
