import React from 'react';
import { FlagBackground } from '../data/flags';
import { Stand, Visit, StampStyle } from '../types';
import { Star, CheckCircle2, Lock, Sparkles } from 'lucide-react';

interface StampBadgeProps {
  stand: Stand;
  visit?: Visit;
  stampStyle?: StampStyle;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export const StampBadge: React.FC<StampBadgeProps> = ({
  stand,
  visit,
  stampStyle = 'circular',
  onClick,
  size = 'md',
}) => {
  const isVisited = Boolean(visit);
  const rating = visit?.rating;

  // Use individual stand style override if provided, otherwise global style
  const effectiveStyle: StampStyle = stand.stamp_style || stampStyle || 'circular';

  // Size configurations
  const dimensions = {
    sm: 'w-28 h-28 text-[10px]',
    md: 'w-36 h-36 text-xs',
    lg: 'w-44 h-44 text-sm',
  }[size];

  // Shape classes and clip paths
  const getShapeStyle = () => {
    switch (effectiveStyle) {
      case 'estampilla':
        return {
          containerClass: 'rounded-lg border-4 border-dashed border-amber-900/60 shadow-md',
          innerRing: 'border-2 border-amber-950/40 rounded-sm inset-1.5',
          clipClass: 'rounded-md',
        };
      case 'cuadrado':
        return {
          containerClass: 'rounded-2xl border-4 border-indigo-900/70 shadow-md',
          innerRing: 'border-2 border-indigo-950/30 rounded-xl inset-1.5',
          clipClass: 'rounded-xl',
        };
      case 'hexagonal':
        return {
          containerClass: 'rounded-3xl border-4 border-purple-900/70 shadow-md',
          innerRing: 'border-2 border-purple-950/30 rounded-2xl inset-1.5',
          clipClass: 'rounded-2xl',
        };
      case 'escudo':
        return {
          containerClass: 'rounded-t-2xl rounded-b-3xl border-4 border-teal-900/70 shadow-md',
          innerRing: 'border-2 border-teal-950/30 rounded-t-xl rounded-b-2xl inset-1.5',
          clipClass: 'rounded-t-xl rounded-b-2xl',
        };
      case 'circular':
      case 'redondo':
      default:
        return {
          containerClass: 'rounded-full border-4 border-emerald-900/80 shadow-md',
          innerRing: 'border-2 border-emerald-950/40 rounded-full inset-1.5 border-dashed',
          clipClass: 'rounded-full',
        };
    }
  };

  const shape = getShapeStyle();

  return (
    <button
      onClick={onClick}
      type="button"
      className={`relative select-none transition-all duration-300 cursor-pointer overflow-hidden p-0 group ${dimensions} ${shape.containerClass} ${
        isVisited
          ? 'hover:scale-105 active:scale-95 filter drop-shadow-lg ring-2 ring-amber-400/50'
          : 'opacity-70 hover:opacity-100 hover:scale-102 border-slate-400 dark:border-slate-700 bg-slate-200/50 dark:bg-slate-900/50'
      }`}
      title={isVisited ? `${stand.name} - Sellado ✓` : `${stand.name} - Sin sellar`}
    >
      {/* 1. BACKGROUND: THE FLAG OCCUPIES THE ENTIRE STAMP */}
      <div
        className={`absolute inset-0 w-full h-full overflow-hidden ${shape.clipClass} ${
          !isVisited ? 'grayscale contrast-75 brightness-75 opacity-25' : ''
        }`}
      >
        {stand.stamp_image || stand.stamp_type === 'imagen' ? (
          <img
            src={stand.stamp_image}
            alt={stand.name}
            className="w-full h-full object-cover object-center"
          />
        ) : stand.stamp_type === 'color' && stand.stamp_color ? (
          <div
            className="w-full h-full"
            style={{
              background: `radial-gradient(circle at center, ${stand.stamp_color}, #0f172a)`,
            }}
          />
        ) : stand.stamp_type === 'icono' && stand.stamp_icon ? (
          <div className="w-full h-full bg-gradient-to-br from-indigo-700 to-slate-900 flex items-center justify-center text-4xl">
            {stand.stamp_icon}
          </div>
        ) : (
          <FlagBackground flag={stand.flag} />
        )}

        {/* Ink / parchment texture overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/75 pointer-events-none" />
      </div>

      {/* 2. INNER VINTAGE STAMP BORDER */}
      <div className={`absolute pointer-events-none z-10 ${shape.innerRing}`} />

      {/* 3. TEXT AND DETAILS OVERLAID OVER THE FLAG */}
      <div className="relative z-20 w-full h-full flex flex-col justify-between p-2.5 text-white">
        {/* Top: Course & Area Badge */}
        <div className="flex items-center justify-between w-full">
          <span className="font-mono font-black text-[9px] sm:text-[10px] uppercase tracking-wider bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/30 text-amber-300 shadow">
            {stand.course}
          </span>
          {isVisited && (
            <span className="bg-emerald-600 text-white rounded-full p-0.5 shadow-md flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
          )}
        </div>

        {/* Center: Visited State / Seal or Lock */}
        <div className="my-auto flex flex-col items-center justify-center text-center">
          {isVisited ? (
            <div className="transform -rotate-6 transition-transform group-hover:rotate-0">
              <span className="text-[10px] font-black uppercase tracking-widest font-mono text-amber-300 border-y-2 border-amber-300/80 px-2 py-0.5 bg-black/40 backdrop-blur-sm shadow">
                ★ SELLADO ★
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-0.5 text-white/90 drop-shadow">
              <Lock className="w-5 h-5 text-white/80" />
              <span className="text-[9px] font-black uppercase font-mono tracking-wider bg-black/50 px-1.5 py-0.5 rounded">
                Sin sellar
              </span>
            </div>
          )}
        </div>

        {/* Bottom: Stand Name & Rating directly over flag */}
        <div className="w-full flex flex-col items-center text-center space-y-0.5">
          <div className="w-full font-black text-[10px] sm:text-[11px] leading-tight line-clamp-2 px-1 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
            {stand.name}
          </div>

          {isVisited && (
            <div className="flex items-center justify-center gap-1 pt-0.5">
              {rating ? (
                <div className="flex items-center gap-0.5 bg-black/75 px-1.5 py-0.5 rounded-full border border-amber-400/60 text-[9px] font-bold text-amber-300 shadow">
                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                  <span>{rating} ⭐</span>
                </div>
              ) : (
                <span className="text-[9px] text-amber-300 bg-black/70 px-1.5 py-0.2 rounded-full font-semibold underline">
                  Evaluar ⭐
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
};
