import React, { useState } from 'react';
import { Stand, Visit } from '../types';
import { usePassport } from '../context/PassportContext';
import { FlagIcon } from '../data/flags';
import { Star, X, Check, MessageSquare, AlertCircle } from 'lucide-react';

interface EvaluationModalProps {
  stand: Stand;
  visit?: Visit;
  onClose: () => void;
  onSave?: (rating: number, comment?: string) => void;
  texts?: {
    eval_question: string;
    comment_label: string;
    submit_eval: string;
    eval_saved: string;
  };
}

export const EvaluationModal: React.FC<EvaluationModalProps> = ({
  stand,
  visit: propVisit,
  onClose,
  onSave,
  texts: propTexts,
}) => {
  const { config, visits, currentVisitor, evaluateVisit } = usePassport();

  const userVisit = propVisit || visits.find(
    v => v.visitor_id === currentVisitor?.id && v.stand_id === stand.id
  );

  const activeTexts = propTexts || {
    eval_question: config.texts.eval_question || '¿Cómo te gustó este proyecto?',
    comment_label: config.texts.comment_label || '¿Querés dejar un comentario?',
    submit_eval: config.texts.submit_eval || 'Guardar valoración',
    eval_saved: config.texts.eval_saved || '✓ Evaluación guardada con éxito',
  };

  const [rating, setRating] = useState<number>(userVisit?.rating || 0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>(userVisit?.comment || '');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError('Por favor selecciona una puntuación de 1 a 5 estrellas.');
      return;
    }
    setError(null);
    if (onSave) {
      onSave(rating, comment);
    } else {
      const res = await evaluateVisit({ standId: stand.id, rating, comment });
      if (!res.success) {
        setError(res.error || 'No se pudo guardar la evaluación.');
        return;
      }
    }
    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-slate-800 dark:text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Stand Header */}
        <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-slate-200 dark:border-slate-800">
          <FlagIcon flag={stand.flag} className="w-12 h-8 shrink-0 shadow" />
          <div>
            <span className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              {stand.course} · {stand.area}
            </span>
            <h3 className="text-lg font-bold leading-snug">{stand.name}</h3>
          </div>
        </div>

        {savedSuccess ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 animate-bounce">
              <Check className="w-8 h-8" />
            </div>
            <p className="font-semibold text-base text-emerald-600 dark:text-emerald-400">
              {activeTexts.eval_saved}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2 text-center">
              <label className="text-sm font-semibold block text-slate-700 dark:text-slate-200">
                {activeTexts.eval_question}
              </label>

              {/* Star rating selector */}
              <div className="flex items-center justify-center gap-2 pt-1">
                {[1, 2, 3, 4, 5].map(star => {
                  const isFilled = (hoverRating || rating) >= star;
                  return (
                    <button
                      type="button"
                      key={star}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="p-1.5 transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          isFilled
                            ? 'text-amber-500 fill-amber-500 drop-shadow-sm'
                            : 'text-slate-300 dark:text-slate-700'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 block h-4">
                {hoverRating || rating ? `${hoverRating || rating} de 5 estrellas` : ''}
              </span>
            </div>

            {/* Optional Comment */}
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                {activeTexts.comment_label}
              </label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Escribe tu opinión, felicitaciones a los alumnos..."
                rows={3}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 resize-none"
              />
            </div>

            {error && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
            >
              {activeTexts.submit_eval}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
