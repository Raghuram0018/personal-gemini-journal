import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, Sparkles, Lock, Check } from 'lucide-react';

interface DragToStartCTAProps {
  onComplete: () => void;
  label?: string;
}

export const DragToStartCTA: React.FC<DragToStartCTAProps> = ({
  onComplete,
  label = 'Begin your journey',
}) => {
  const [dragProgress, setDragProgress] = useState(0); // 0 to 1
  const [isDragging, setIsDragging] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isCompleted) return;
    setIsDragging(true);
    startXRef.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !trackRef.current || isCompleted) return;

    const rect = trackRef.current.getBoundingClientRect();
    const handleWidth = 56;
    const maxDrag = rect.width - handleWidth;
    const deltaX = e.clientX - startXRef.current;

    const progress = Math.max(0, Math.min(1, deltaX / maxDrag));
    setDragProgress(progress);

    if (progress >= 0.92) {
      setIsCompleted(true);
      setIsDragging(false);
      setDragProgress(1);
      setTimeout(() => {
        onComplete();
      }, 300);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragProgress < 0.92) {
      // Spring back
      setDragProgress(0);
    }
  };

  // Direct click handler for accessibility
  const handleClickTrigger = () => {
    if (isCompleted) return;
    setIsCompleted(true);
    setDragProgress(1);
    setTimeout(() => {
      onComplete();
    }, 250);
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Outer Glow container */}
      <div
        className="p-1 rounded-full bg-gradient-to-r from-indigo-500/30 via-purple-500/30 to-pink-500/30 transition-all duration-300 shadow-2xl"
        style={{
          boxShadow: `0 0 ${20 + dragProgress * 30}px rgba(99, 102, 241, ${0.2 + dragProgress * 0.4})`,
        }}
      >
        {/* Track */}
        <div
          ref={trackRef}
          className="relative h-14 rounded-full bg-slate-950/90 border border-slate-800 backdrop-blur-2xl overflow-hidden flex items-center px-1 select-none cursor-pointer"
          onClick={handleClickTrigger}
          role="button"
          tabIndex={0}
          aria-label={`${label} (Drag or click to launch)`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleClickTrigger();
            }
          }}
        >
          {/* Progress Light Trail Fill */}
          <div
            className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-500 transition-all duration-75 opacity-90"
            style={{ width: `${Math.max(8, dragProgress * 100)}%` }}
          />

          {/* Shimmer Light Reflection */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer pointer-events-none" />

          {/* Track Text Label */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span
              className={`text-xs sm:text-sm font-semibold tracking-wider font-display transition-opacity duration-200 flex items-center gap-2 ${
                dragProgress > 0.4 ? 'text-white' : 'text-slate-300'
              }`}
            >
              <span>{isCompleted ? 'Opening Personal Journal...' : label}</span>
              {!isCompleted && <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />}
            </span>
          </div>

          {/* Draggable Handle */}
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
              transform: `translateX(${dragProgress * ((trackRef.current?.clientWidth || 320) - 52)}px)`,
            }}
            className={`relative z-10 w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center shadow-lg cursor-grab active:cursor-grabbing transition-transform duration-75 ${
              isDragging ? 'scale-105 shadow-indigo-500/50' : 'hover:scale-105'
            }`}
          >
            {isCompleted ? (
              <Check className="w-5 h-5 text-white animate-bounce" />
            ) : (
              <ArrowRight className="w-5 h-5 text-white transition-transform group-hover:translate-x-0.5" />
            )}
          </div>
        </div>
      </div>

      {/* Accessible Hint */}
      <div className="flex items-center justify-between px-3 mt-2 text-[11px] text-slate-400">
        <span className="flex items-center gap-1">
          <Lock className="w-3 h-3 text-emerald-400" /> Firebase Auth & UID Isolated
        </span>
        <span className="text-slate-400">Drag handle or click track to begin</span>
      </div>
    </div>
  );
};
