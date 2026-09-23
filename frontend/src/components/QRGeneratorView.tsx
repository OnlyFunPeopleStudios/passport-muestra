import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { usePassport } from '../context/PassportContext';
import { FlagIcon } from '../data/flags';
import { Stand } from '../types';
import { Printer, Download, QrCode, Key, RefreshCw, Check } from 'lucide-react';

interface QRGeneratorViewProps {
  initialStand?: Stand;
}

export const QRGeneratorView: React.FC<QRGeneratorViewProps> = ({ initialStand }) => {
  const { stands, config } = usePassport();
  const publishedStands = stands.filter(s => s.is_published);
  const [selectedStandId, setSelectedStandId] = useState<number>(
    initialStand?.id || publishedStands[0]?.id || 1
  );
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const posterRef = useRef<HTMLDivElement>(null);

  const stand = stands.find(s => s.id === selectedStandId) || publishedStands[0];

  useEffect(() => {
    if (!stand) return;
    const url = `${window.location.origin}/#/scan?tok=${stand.token}`;
    QRCode.toDataURL(url, {
      width: 320,
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

  if (!stand) {
    return <div>No hay stands disponibles.</div>;
  }

  return (
    <div className="space-y-6 pb-20 max-w-2xl mx-auto">
      {/* Top selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm print:hidden">
        <div>
          <h2 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <QrCode className="w-4 h-4 text-indigo-500" />
            Cartel de Stand para Imprimir
          </h2>
          <p className="text-xs text-slate-500">
            Genera el cartel físico con el código QR y la palabra secreta.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedStandId}
            onChange={e => setSelectedStandId(Number(e.target.value))}
            className="text-xs py-2 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl font-medium focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 flex-1 sm:w-60 truncate"
          >
            {publishedStands.map(s => (
              <option key={s.id} value={s.id}>
                {s.course} - {s.name}
              </option>
            ))}
          </select>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow flex items-center gap-1.5 transition shrink-0"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir
          </button>
        </div>
      </div>

      {/* Printable Poster */}
      <div
        ref={posterRef}
        className="bg-white text-slate-900 border-4 border-slate-900 rounded-3xl p-8 sm:p-10 shadow-2xl flex flex-col items-center text-center space-y-6 print:border-none print:shadow-none print:p-0 print:m-0"
      >
        {/* Header Institution & Event */}
        <div className="space-y-1 border-b-2 border-slate-900 pb-4 w-full">
          <span className="text-xs font-mono uppercase tracking-widest text-slate-600 font-bold block">
            {config.institution_name || 'Muestra Anual Escolar'}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {config.event_name}
          </h1>
        </div>

        {/* Stand Header Info */}
        <div className="flex flex-col items-center space-y-2">
          <FlagIcon flag={stand.flag} className="w-16 h-11 shadow-md rounded-md" />
          <div className="inline-block px-3 py-1 bg-slate-100 rounded-full font-mono text-xs font-bold uppercase tracking-wider text-slate-700">
            {stand.course} · {stand.area}
          </div>
          <h2 className="text-xl sm:text-2xl font-black max-w-md leading-tight text-slate-950">
            {stand.name}
          </h2>
          <p className="text-xs text-slate-600 max-w-sm italic">
            "{stand.description}"
          </p>
        </div>

        {/* The QR Code */}
        <div className="p-4 bg-white border-2 border-slate-900 rounded-2xl shadow-md">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`QR para ${stand.name}`}
              className="w-56 h-56 sm:w-64 sm:h-64 object-contain"
            />
          ) : (
            <div className="w-56 h-56 flex items-center justify-center text-slate-400 font-mono text-xs">
              Generando QR...
            </div>
          )}
          <span className="text-[11px] font-mono text-slate-500 font-medium block mt-1">
            Apuntá la cámara para sellar
          </span>
        </div>

        {/* Alternative: Secret Word Banner */}
        <div className="w-full bg-slate-950 text-white rounded-2xl p-4 sm:p-5 space-y-1 shadow-lg">
          <div className="flex items-center justify-center gap-1.5 text-xs text-amber-400 font-semibold uppercase tracking-wider">
            <Key className="w-4 h-4 text-amber-400" />
            ¿Sin cámara? Usá la palabra secreta:
          </div>
          <div className="text-2xl sm:text-3xl font-mono font-black tracking-widest text-amber-300 uppercase py-1">
            {stand.secret_word}
          </div>
          <p className="text-[10px] text-slate-400">
            Ingresala en la opción "Tengo la palabra del stand" de tu pasaporte digital
          </p>
        </div>

        {/* Poster Footer */}
        <div className="text-[11px] text-slate-400 pt-2 font-mono">
          Token: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">{stand.token}</code>
        </div>
      </div>
    </div>
  );
};
