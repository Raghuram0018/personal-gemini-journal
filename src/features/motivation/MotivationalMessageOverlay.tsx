import React, { useEffect, useState, useRef } from 'react';
import { MotivationalMessage } from './motivationalMessages';
import { Sparkles, Quote, ArrowRight, BookOpen, LogOut, CheckCircle } from 'lucide-react';
import './motivation.css';

interface MotivationalMessageOverlayProps {
  message: MotivationalMessage;
  mode: 'login' | 'logout' | 'daily';
  onComplete: () => void;
}

export const MotivationalMessageOverlay: React.FC<MotivationalMessageOverlayProps> = ({
  message,
  mode,
  onComplete,
}) => {
  const [typedCharCount, setTypedCharCount] = useState<number>(0);
  const [isTypingDone, setIsTypingDone] = useState<boolean>(false);
  const [isExiting, setIsExiting] = useState<boolean>(false);

  const completedRef = useRef<boolean>(false);
  const fullText = message.text;

  // Typing effect logic
  useEffect(() => {
    // Check reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setTypedCharCount(fullText.length);
      setIsTypingDone(true);
      return;
    }

    setTypedCharCount(0);
    setIsTypingDone(false);

    let currentIndex = 0;
    const typingInterval = setInterval(() => {
      currentIndex += 1;
      setTypedCharCount(currentIndex);

      if (currentIndex >= fullText.length) {
        clearInterval(typingInterval);
        setIsTypingDone(true);
      }
    }, 32);

    return () => clearInterval(typingInterval);
  }, [fullText]);

  // Auto-complete after typing finishes + hold duration
  useEffect(() => {
    if (!isTypingDone) return;

    const holdTimer = setTimeout(() => {
      handleFinish();
    }, 2500);

    return () => clearTimeout(holdTimer);
  }, [isTypingDone]);

  const handleFinish = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    setIsExiting(true);
    setTimeout(() => {
      onComplete();
    }, 400); // Wait for CSS exit fade transition
  };

  const visibleText = fullText.slice(0, typedCharCount);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none transition-all duration-500 ${
        isExiting ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Dark Ambient Backdrop with Blur */}
      <div
        className="absolute inset-0 bg-slate-950/85 backdrop-blur-xl transition-opacity duration-500"
        onClick={handleFinish}
      />

      {/* Glow Effects Behind Card */}
      <div className="absolute w-96 h-96 rounded-full bg-indigo-600/15 blur-3xl animate-motivation-glow pointer-events-none" />
      <div className="absolute w-80 h-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none translate-x-32 -translate-y-20" />

      {/* Main Glassmorphic Motivational Card */}
      <div
        className="relative max-w-xl w-full rounded-3xl p-6 sm:p-10 motivation-glass-panel text-slate-100 shadow-2xl overflow-hidden border border-indigo-500/20 transform transition-transform duration-500"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500/60 via-indigo-500 to-purple-500/60" />

        {/* Card Header Tag */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
              {mode === 'login' ? (
                <Sparkles className="w-4 h-4 text-indigo-400" />
              ) : mode === 'logout' ? (
                <LogOut className="w-4 h-4 text-amber-400" />
              ) : (
                <BookOpen className="w-4 h-4 text-emerald-400" />
              )}
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-widest font-bold text-indigo-400 font-mono block">
                {message.category}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {mode === 'login'
                  ? 'Welcome Back to Your Journey'
                  : mode === 'logout'
                  ? 'Preserving Your Thoughts & Peace'
                  : 'Daily Insight'}
              </span>
            </div>
          </div>

          <span className="text-[10px] px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-400 font-mono">
            #{message.id}
          </span>
        </div>

        {/* Quote Content Body */}
        <div className="my-6 relative min-h-[110px] flex flex-col justify-center">
          <Quote className="absolute -top-3 -left-3 w-10 h-10 text-indigo-500/10 pointer-events-none" />
          <p className="text-lg sm:text-xl md:text-2xl font-serif text-white leading-relaxed tracking-wide relative z-10">
            "{visibleText}"
            {!isTypingDone && <span className="typing-cursor" />}
          </p>
        </div>

        {/* Author Attribution */}
        <div
          className={`mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between transition-all duration-500 ${
            isTypingDone ? 'opacity-100 translate-y-0' : 'opacity-40 translate-y-1'
          }`}
        >
          <div className="text-sm font-medium text-amber-300/90 font-display flex items-center gap-2">
            <span className="w-5 h-[1px] bg-amber-400/50" />
            <span>— {message.author}</span>
          </div>

          <button
            onClick={handleFinish}
            className="px-4 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 hover:border-indigo-400/60 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-lg group"
          >
            <span>{isTypingDone ? 'Continue' : 'Skip'}</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
