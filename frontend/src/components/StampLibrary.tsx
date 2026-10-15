import React, { useRef, useState } from 'react';
import { usePassport } from '../context/PassportContext';
import { StampBadge } from './StampBadge';
import { Stand, Stamp, StampStyle } from '../types';
import { Check, CheckCircle2, Layers, Library, RefreshCw, Trash2, Upload } from 'lucide-react';

const SHAPES: { id: StampStyle; label: string; desc: string; icon: string }[] = [
  { id: 'estampilla', label: 'Estampilla', desc: 'Borde dentado postal', icon: '🏷️' },
  { id: 'circular', label: 'Circular', desc: 'Sello redondo tradicional', icon: '🔘' },
  { id: 'cuadrado', label: 'Cuadrado', desc: 'Esquinas redondeadas', icon: '⏹️' },
  { id: 'hexagonal', label: 'Hexágono', desc: 'Geométrico moderno', icon: '⬡' },
  { id: 'escudo', label: 'Escudo', desc: 'Emblema heráldico escolar', icon: '🛡️' },
];

// Stand de mentira solo para previsualizar el sello con datos de ejemplo.
function previewStand(name: string, image: string, style: StampStyle): Stand {
  return {
    id: -1,
    slug: 'preview',
    name: name.trim() || 'Nombre del stand',
    course: '4.º A',
    description: 'Vista previa del sello',
    area: 'Área',
    flag: 'ar',
    token: 'preview',
    secret_word: 'SELLO',
    stamp_type: 'imagen',
    stamp_image: image,
    stamp_style: style,
    sort_order: 0,
    is_published: true,
  };
}

// Visita falsa: así el preview se ve "sellado" y a todo color.
const previewVisit = {
  id: -1,
  visitor_id: -1,
  stand_id: -1,
  rating: 5,
  comment: '',
  is_hidden: false,
  is_reviewed: false,
  visit_method: 'qr' as const,
  created_at: '2026-01-01',
};

export const StampLibrary: React.FC = () => {
  const { stamps, createStamp, deleteStamp } = usePassport();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageUrl, setImageUrl] = useState('');
  const [selectedShape, setSelectedShape] = useState<StampStyle>('estampilla');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedName, setSavedName] = useState('');

  // Comprime la imagen a 600px JPEG para guardarla liviana en la base.
  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 600;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
        setImageUrl(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) handleImageFile(e.dataTransfer.files[0]);
  };

  const handleSave = async () => {
    if (!imageUrl) {
      window.alert('Primero subí una imagen para el sello.');
      return;
    }
    setSaving(true);
    try {
      const finalName = name.trim() || 'Sello';
      await createStamp({ name: finalName, image: imageUrl, style: selectedShape });
      setSavedName(finalName);
      setName('');
      setImageUrl('');
      setTimeout(() => setSavedName(''), 4000);
    } catch (err: any) {
      window.alert(err?.message || 'No se pudo guardar el sello.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (s: Stamp) => {
    if (!window.confirm(`¿Borrar el sello "${s.name}"? Los stands que lo usaban vuelven a su sello propio.`)) return;
    await deleteStamp(s.id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 rounded-3xl shadow-xl border border-indigo-500/20 relative overflow-hidden">
        <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/30 text-indigo-300 text-[11px] font-mono font-bold uppercase tracking-wider inline-flex items-center gap-1.5">
          <Library className="w-3.5 h-3.5" /> Biblioteca de sellos
        </span>
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1.5">
          Creá un sello una vez y usalo en varios stands
        </h2>
        <p className="text-xs text-slate-300 max-w-2xl leading-relaxed mt-1">
          Subí una imagen y elegí la forma. Guardá el sello y después asignalo a los stands que quieras:
          cada stand se estampa con <strong className="text-white">su nombre y su curso</strong> sobre la misma imagen.
        </p>
      </div>

      {savedName && (
        <div className="p-4 bg-emerald-100 dark:bg-emerald-950/80 border-2 border-emerald-500 text-emerald-900 dark:text-emerald-100 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>¡Listo! El sello <strong>"{savedName}"</strong> quedó guardado en la biblioteca.</span>
        </div>
      )}

      {/* Crear sello */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="md:col-span-2 border-2 border-dashed border-indigo-300 dark:border-indigo-800/80 hover:border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleImageFile(e.target.files[0])}
            />
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 group-hover:scale-110 text-white flex items-center justify-center shadow-lg transition">
              <Upload className="w-7 h-7" />
            </div>
            <div>
              <p className="font-bold text-xs text-indigo-950 dark:text-indigo-200">
                Hacé clic para elegir la imagen del sello
              </p>
              <span className="text-[11px] text-slate-400">Logo, dibujo, lámina o foto (JPG, PNG o WebP)</span>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex flex-col items-center text-center gap-2">
            <span className="text-[10px] uppercase font-mono font-bold text-slate-400">Imagen elegida</span>
            <div className="w-24 h-24 rounded-xl overflow-hidden shadow border-2 border-indigo-500/40 bg-white dark:bg-slate-900 flex items-center justify-center">
              {imageUrl ? (
                <img src={imageUrl} alt="Sello" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] text-slate-400 px-2">Sin imagen</span>
              )}
            </div>
            {imageUrl && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Cambiar imagen
              </button>
            )}
          </div>
        </div>

        {/* Forma */}
        <div className="space-y-2">
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Elegí la forma del sello</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {SHAPES.map(shape => {
              const isSelected = selectedShape === shape.id;
              return (
                <div
                  key={shape.id}
                  onClick={() => setSelectedShape(shape.id)}
                  className={`p-3 rounded-2xl border-2 transition flex flex-col items-center gap-2 text-center cursor-pointer relative ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/60 shadow-md ring-4 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 bg-slate-50/50 dark:bg-slate-950/50'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 bg-indigo-600 text-white rounded-full p-1 shadow">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                  {imageUrl ? (
                    <StampBadge stand={previewStand(name, imageUrl, shape.id)} visit={previewVisit} size="sm" />
                  ) : (
                    <div className="w-28 h-28 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-3xl">
                      {shape.icon}
                    </div>
                  )}
                  <div>
                    <span className="text-[11px] font-bold block text-slate-800 dark:text-slate-200">{shape.label}</span>
                    <span className="text-[10px] text-slate-400">{shape.desc}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Nombre + guardar */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex-1 space-y-1">
            <label className="font-semibold text-xs text-slate-700 dark:text-slate-300">Nombre del sello</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Sello de la Muestra 2026"
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl"
            />
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !imageUrl}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-lg flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4" /> {saving ? 'Guardando…' : 'Guardar sello'}
          </button>
        </div>
      </div>

      {/* Biblioteca */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
            Sellos guardados <span className="text-slate-400 font-normal">({stamps.length})</span>
          </h3>
        </div>

        {stamps.length === 0 ? (
          <p className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-6 text-center">
            Todavía no hay sellos en la biblioteca. Creá el primero arriba y después asignalo a los stands
            desde <strong>Gestión de Stands</strong>.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {stamps.map(stamp => (
              <div
                key={stamp.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex flex-col items-center gap-2 shadow-sm"
              >
                <StampBadge
                  stand={previewStand(stamp.name, stamp.image, stamp.style)}
                  visit={previewVisit}
                  size="sm"
                />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 text-center line-clamp-2">
                  {stamp.name}
                </span>
                <span className="text-[10px] text-slate-400 capitalize">{stamp.style}</span>
                <button
                  type="button"
                  onClick={() => handleDelete(stamp)}
                  className="text-[11px] text-rose-500 hover:text-rose-600 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Borrar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
