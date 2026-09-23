import React, { useState, useRef } from 'react';
import { usePassport } from '../context/PassportContext';
import { StampBadge } from './StampBadge';
import { Stand, StampStyle } from '../types';
import {
  Sparkles,
  Upload,
  Image as ImageIcon,
  Check,
  CheckCircle2,
  RefreshCw,
  Wand2,
  ChevronDown,
  ChevronUp,
  Store,
  Layers,
  Camera,
  Trash2
} from 'lucide-react';

const SAMPLE_IMAGES = [
  {
    name: 'Robótica & IA',
    url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=500&auto=format&fit=crop&q=80',
    course: '4.º A',
    area: 'Tecnología',
  },
  {
    name: 'Astronomía & Cielos',
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500&auto=format&fit=crop&q=80',
    course: '3.º B',
    area: 'Ciencias Naturales',
  },
  {
    name: 'Biología & Plantas',
    url: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=500&auto=format&fit=crop&q=80',
    course: '2.º C',
    area: 'Ciencias Naturales',
  },
  {
    name: 'Arte & Expresión',
    url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=500&auto=format&fit=crop&q=80',
    course: '5.º B',
    area: 'Arte y Cultura',
  },
  {
    name: 'Historia & Letras',
    url: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=500&auto=format&fit=crop&q=80',
    course: '1.º A',
    area: 'Ciencias Sociales',
  },
];

const SHAPES: { id: StampStyle; label: string; desc: string; icon: string }[] = [
  { id: 'estampilla', label: 'Estampilla', desc: 'Borde dentado postal', icon: '🏷️' },
  { id: 'circular', label: 'Circular', desc: 'Sello redondo tradicional', icon: '🔘' },
  { id: 'cuadrado', label: 'Cuadrado', desc: 'Esquinas redondeadas', icon: '⏹️' },
  { id: 'hexagonal', label: 'Hexágono', desc: 'Geométrico moderno', icon: '⬡' },
  { id: 'escudo', label: 'Escudo', desc: 'Emblema heráldico escolar', icon: '🛡️' },
];

export const StampCreatorStudio: React.FC<{ onStandCreated?: (stand: Stand) => void }> = ({
  onStandCreated,
}) => {
  const { createStand, stands } = usePassport();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Core simple states
  const [imageUrl, setImageUrl] = useState<string>(SAMPLE_IMAGES[0].url);
  const [selectedShape, setSelectedShape] = useState<StampStyle>('estampilla');
  const [name, setName] = useState<string>('Proyecto Robótica e Innovación');
  const [course, setCourse] = useState<string>('4.º A');

  // Secondary details
  const [area, setArea] = useState<string>('Tecnología');
  const [secretWord, setSecretWord] = useState<string>('ROBOTICA');
  const [schedule, setSchedule] = useState<string>('10:00 - 12:30 hs');
  const [location, setLocation] = useState<string>('Patio Central');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<boolean>(false);
  const [createdStandName, setCreatedStandName] = useState<string>('');

  // Auto-generate secret word based on name
  const generateWord = (standName: string) => {
    const clean = standName
      .trim()
      .split(' ')
      .map(w => w.replace(/[^a-zA-Z0-9]/g, ''))
      .filter(w => w.length >= 3);

    if (clean.length > 0) {
      return clean[0].toUpperCase().slice(0, 10);
    }
    const pool = ['CIENCIA', 'INNOVAR', 'FUTURO', 'SABER', 'CREAR', 'PROYECTO'];
    return pool[Math.floor(Math.random() * pool.length)];
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!secretWord || secretWord === 'ROBOTICA' || secretWord === 'PALABRA') {
      setSecretWord(generateWord(val));
    }
  };

  // Image upload with compression to DataURL
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
        setImageUrl(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const finalWord = secretWord.trim()
      ? secretWord.trim().toUpperCase()
      : generateWord(name);

    try {
      const newStand = await createStand({
        slug: 'stand-' + (stands.length + 1) + '-' + name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 15),
        name: name.trim(),
        course: course.trim() || 'General',
        description: `Proyecto escolar ${name.trim()} presentado por los alumnos de ${course.trim()}.`,
        area: area.trim() || 'General',
        flag: 'ar',
        stamp_type: 'imagen',
        stamp_image: imageUrl,
        stamp_style: selectedShape,
        secret_word: finalWord,
        schedule: schedule.trim() || '09:00 - 17:30 hs',
        location: location.trim() || 'Patio Central',
        sort_order: stands.length + 1,
        is_published: true,
      });

      setCreatedStandName(newStand.name);
      setSuccessMessage(true);
      setTimeout(() => {
        setSuccessMessage(false);
      }, 4000);

      if (onStandCreated) {
        onStandCreated(newStand);
      }
    } catch (err: any) {
      window.alert(err?.message || 'No se pudo crear el stand.');
    }
  };

  // Stand model for live badge preview
  const makePreviewStand = (shape: StampStyle): Stand => ({
    id: 999,
    slug: 'preview',
    name: name || 'Nombre del Proyecto',
    course: course || 'Curso',
    description: 'Vista previa del sello',
    area: area || 'Área',
    flag: 'ar',
    token: 'tok-preview',
    secret_word: secretWord || 'SELLO',
    stamp_type: 'imagen',
    stamp_image: imageUrl,
    stamp_style: shape,
    sort_order: 999,
    is_published: true,
  });

  const previewVisit = {
    id: 999,
    visitor_id: 1,
    stand_id: 999,
    rating: 5,
    comment: '¡Genial proyecto!',
    is_hidden: false,
    is_reviewed: true,
    visit_method: 'qr' as const,
    created_at: '2026-09-22',
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 rounded-3xl shadow-xl border border-indigo-500/20 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/30 text-indigo-300 text-[11px] font-mono font-bold uppercase tracking-wider inline-flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5" />
              Creador Visual Simplificado
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Creá tu Sello con una Foto o Imagen
            </h2>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              Subí cualquier foto, logo o ilustración de tu proyecto. El sistema la convertirá automáticamente a las diferentes formas para estampar el pasaporte.
            </p>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-100 dark:bg-emerald-950/80 border-2 border-emerald-500 text-emerald-900 dark:text-emerald-100 rounded-2xl text-xs font-bold flex items-center justify-between shadow-lg animate-bounce">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              ¡Listo! El sello <strong>"{createdStandName}"</strong> fue creado en forma <strong>{selectedShape}</strong> y ya está activo en todos los pasaportes.
            </span>
          </div>
        </div>
      )}

      {/* Main Creation Flow */}
      <div className="space-y-6">
        {/* STEP 1: SUBIR FOTO O IMAGEN */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow">
                1
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Subí una foto o imagen del proyecto
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">JPG, PNG o WebP</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            {/* Upload Area / Dropzone */}
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
                onChange={e => {
                  if (e.target.files && e.target.files[0]) {
                    handleImageFile(e.target.files[0]);
                  }
                }}
              />
              <div className="w-14 h-14 rounded-2xl bg-indigo-600 group-hover:scale-110 text-white flex items-center justify-center shadow-lg transition">
                <Upload className="w-7 h-7" />
              </div>
              <div>
                <p className="font-bold text-xs text-indigo-950 dark:text-indigo-200">
                  Haz clic para elegir una foto desde tu dispositivo o arrastrala aquí
                </p>
                <span className="text-[11px] text-slate-400">
                  Foto de la maqueta, dibujo de los alumnos, logo o lámina
                </span>
              </div>
            </div>

            {/* Current Image Preview */}
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex flex-col items-center text-center gap-2">
              <span className="text-[10px] uppercase font-mono font-bold text-slate-400">
                Imagen seleccionada
              </span>
              <div className="w-24 h-24 rounded-xl overflow-hidden shadow border-2 border-indigo-500/40 relative group">
                <img
                  src={imageUrl}
                  alt="Sello foto"
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Cambiar foto
              </button>
            </div>
          </div>

          {/* Quick Sample Presets */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-[11px] font-semibold text-slate-500 block mb-2">
              ¿No tienes una foto a mano? Prueba con estas imágenes de ejemplo:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {SAMPLE_IMAGES.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setImageUrl(sample.url);
                    setName(sample.name);
                    setCourse(sample.course);
                    setArea(sample.area);
                    setSecretWord(generateWord(sample.name));
                  }}
                  className={`p-2 rounded-xl border flex items-center gap-2 text-left transition cursor-pointer ${
                    imageUrl === sample.url
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 bg-slate-50 dark:bg-slate-950'
                  }`}
                >
                  <img
                    src={sample.url}
                    alt={sample.name}
                    className="w-8 h-8 rounded-lg object-cover shrink-0 shadow-xs"
                  />
                  <div className="truncate">
                    <span className="text-[11px] font-bold block truncate text-slate-800 dark:text-slate-200">
                      {sample.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {sample.course}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* STEP 2: MULTI-SHAPE LIVE SHOWCASE */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow">
                2
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Elige la forma que más te guste para estampar
              </h3>
            </div>
            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
              Haz clic sobre una forma para seleccionarla
            </span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Tu foto se adapta automáticamente a los bordes y texturas de cada sello:
          </p>

          {/* 5 Shapes rendered live side-by-side with the uploaded photo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-2">
            {SHAPES.map(shape => {
              const isSelected = selectedShape === shape.id;
              const previewStand = makePreviewStand(shape.id);

              return (
                <div
                  key={shape.id}
                  onClick={() => setSelectedShape(shape.id)}
                  className={`p-4 rounded-2xl border-2 transition flex flex-col items-center justify-between gap-3 text-center cursor-pointer relative group ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/60 shadow-md ring-4 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 bg-slate-50/50 dark:bg-slate-950/50'
                  }`}
                >
                  {/* Selected checkmark badge */}
                  {isSelected && (
                    <div className="absolute top-2.5 right-2.5 bg-indigo-600 text-white rounded-full p-1 shadow">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}

                  {/* Stamp Badge rendering with the uploaded image */}
                  <div className="py-2 transform transition-transform group-hover:scale-105">
                    <StampBadge
                      stand={previewStand}
                      visit={previewVisit}
                      stampStyle={shape.id}
                      size="sm"
                    />
                  </div>

                  <div className="w-full space-y-0.5 border-t border-slate-200 dark:border-slate-800/80 pt-2">
                    <span className="font-black text-xs text-slate-900 dark:text-slate-100 flex items-center justify-center gap-1">
                      <span>{shape.icon}</span> {shape.label}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-medium">
                      {shape.desc}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* STEP 3: SIMPLE STAND DATA & ACTION */}
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4"
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow">
              3
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Datos básicos del Stand
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Nombre del Stand o Proyecto *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => handleNameChange(e.target.value)}
                placeholder="Ej: Robótica y Sensores, Huella de Carbono..."
                className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Curso / División *
              </label>
              <input
                type="text"
                required
                value={course}
                onChange={e => setCourse(e.target.value)}
                placeholder="Ej: 3.º B, 5.º Año"
                className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Toggle Advanced Options */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline cursor-pointer"
            >
              {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showAdvanced ? 'Ocultar opciones opcionales' : 'Ver opciones opcionales (Área, Horario, Ubicación, Palabra)'}
            </button>

            {showAdvanced && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-3 animate-fade-in text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 dark:text-slate-400">
                    Área Temática
                  </label>
                  <input
                    type="text"
                    value={area}
                    onChange={e => setArea(e.target.value)}
                    placeholder="Ej: Ciencias, Arte, Tecnología"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 dark:text-slate-400">
                    Horario de Exposición
                  </label>
                  <input
                    type="text"
                    value={schedule}
                    onChange={e => setSchedule(e.target.value)}
                    placeholder="10:00 - 12:30 hs"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 dark:text-slate-400">
                    Ubicación en el Colegio
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="Patio Central, Aula 4..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  />
                </div>

                <div className="space-y-1 sm:col-span-3">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-600 dark:text-slate-400">
                      Palabra Secreta del Cartel (Alternativa al QR)
                    </label>
                    <button
                      type="button"
                      onClick={() => setSecretWord(generateWord(name))}
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1 font-bold"
                    >
                      <Wand2 className="w-3 h-3" /> Regenerar
                    </button>
                  </div>
                  <input
                    type="text"
                    value={secretWord}
                    onChange={e => setSecretWord(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/40 font-mono font-black text-amber-700 dark:text-amber-300 tracking-wider uppercase"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Big Action Submit Button */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              Forma elegida:{' '}
              <strong className="text-indigo-600 dark:text-indigo-400 uppercase">
                {selectedShape}
              </strong>
            </div>

            <button
              type="submit"
              disabled={!name.trim()}
              className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-2xl shadow-xl transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Crear Sello y Agregar al Pasaporte
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
