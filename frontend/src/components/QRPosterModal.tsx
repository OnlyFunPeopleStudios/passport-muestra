import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Stand } from '../types';
import { usePassport } from '../context/PassportContext';
import { FlagIcon } from '../data/flags';
import { Printer, X, Download, Clock, MapPin, Sparkles } from 'lucide-react';

interface QRPosterModalProps {
  stand: Stand;
  onClose: () => void;
}

export const QRPosterModal: React.FC<QRPosterModalProps> = ({ stand, onClose }) => {
  const { config } = usePassport();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    const url = `${window.location.origin}/#/scan?tok=${stand.token}`;
    QRCode.toDataURL(url, {
      width: 360,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error(err));
  }, [stand]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl relative text-slate-800 dark:text-slate-100 space-y-4 my-auto">
        {/* Modal Top Actions (Hidden in Print) */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-lg">
              Cartel Oficial A4
            </span>
            <span className="text-xs text-slate-500">Stand #{stand.id}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir Cartel
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Poster Container */}
        <div
          id="printable-poster"
          className="bg-white text-slate-900 border-4 border-slate-900 p-8 rounded-3xl shadow-lg flex flex-col items-center text-center space-y-6 print:border-none print:shadow-none print:p-4"
        >
          {/* Header */}
          <div className="space-y-1 flex flex-col items-center">
            {config.logo && (
              <div className="w-16 h-16 rounded-2xl overflow-hidden p-1 border border-slate-300 shadow-sm bg-white mb-1 flex items-center justify-center">
                <img
                  src={config.logo}
                  alt={config.institution_name}
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <span className="text-xs font-bold font-mono tracking-widest text-slate-500 uppercase">
              {config.institution_name} · {config.event_name}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
              {stand.name}
            </h2>
            <div className="flex items-center justify-center gap-2 pt-1">
              {stand.stamp_image ? (
                <img
                  src={stand.stamp_image}
                  alt={stand.name}
                  className="w-8 h-8 rounded-lg object-cover shadow-sm border border-slate-300"
                />
              ) : (
                <FlagIcon flag={stand.flag} className="w-7 h-5 shadow-sm" />
              )}
              <span className="font-bold text-sm text-indigo-700 font-mono">
                {stand.course}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                {stand.area}
              </span>
            </div>
          </div>

          {/* Schedule and Location info banner */}
          <div className="flex flex-wrap items-center justify-center gap-4 py-2 px-4 rounded-xl bg-slate-100 border border-slate-300 text-xs font-semibold text-slate-700">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-600" />
              <strong>Horario:</strong> {stand.schedule || '09:00 - 17:30 hs'}
            </span>
            {stand.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-rose-600" />
                <strong>Ubicación:</strong> {stand.location}
              </span>
            )}
          </div>

          {/* QR Code */}
          <div className="p-4 bg-white border-2 border-slate-900 rounded-2xl shadow-sm flex flex-col items-center">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR Stand"
                className="w-56 h-56 sm:w-64 sm:h-64 object-contain"
              />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-slate-400 font-mono text-xs">
                Generando QR...
              </div>
            )}
            <span className="text-[11px] font-mono text-slate-500 pt-2 font-semibold">
              Escaneá con la cámara de tu celular o pasaporte digital
            </span>
          </div>

          {/* Physical Secret Word Section */}
          <div className="w-full p-4 rounded-2xl bg-amber-100 border-2 border-dashed border-amber-600 text-center space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900 block">
              ¿No te funciona la cámara? Ingresá esta palabra secreta:
            </span>
            <div className="text-3xl font-black font-mono tracking-widest text-amber-950 select-all">
              {stand.secret_word}
            </div>
          </div>

          <p className="text-[11px] text-slate-500 max-w-sm leading-relaxed">
            {stand.description}
          </p>
        </div>
      </div>
    </div>
  );
};
