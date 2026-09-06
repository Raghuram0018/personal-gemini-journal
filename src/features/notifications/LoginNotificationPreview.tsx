import React, { useEffect, useState } from 'react';
import { Bell, Sparkles, X, Clock, Calendar, CheckSquare, ArrowRight } from 'lucide-react';
import { AppNotification } from '../../types';

interface LoginNotificationPreviewProps {
  notifications: AppNotification[];
  userDisplayName: string;
  onOpenNotifications: () => void;
  onOpenCalendar?: () => void;
  soundEnabled?: boolean;
}

export const LoginNotificationPreview: React.FC<LoginNotificationPreviewProps> = ({
  notifications,
  userDisplayName,
  onOpenNotifications,
  onOpenCalendar,
  soundEnabled = true,
}) => {
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);

  // Time of day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Synthesize gentle ambient chime via Web Audio API
  const playChimeSound = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);

        gain.gain.setValueAtTime(0.01, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + start + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };

      // Gentle C-E-G major triad chord chime
      playTone(523.25, 0, 0.4); // C5
      playTone(659.25, 0.1, 0.5); // E5
      playTone(783.99, 0.2, 0.6); // G5
    } catch (err) {
      // Ignore autoplay blocks or audio context restriction
      console.warn('[LoginNotificationPreview] Audio autoplay policy prevented chime:', err);
    }
  };

  useEffect(() => {
    playChimeSound();

    // Auto fade out after 8 seconds
    const timer = setTimeout(() => {
      setIsFadingOut(true);
      const removeTimer = setTimeout(() => {
        setIsVisible(false);
      }, 500);
      return () => clearTimeout(removeTimer);
    }, 8000);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible || notifications.length === 0) return null;

  const todayCount = notifications.length;

  return (
    <div
      className={`fixed top-20 right-4 sm:right-6 z-50 max-w-sm w-full transition-all duration-500 transform ${
        isFadingOut ? 'opacity-0 translate-y-[-10px] scale-95' : 'opacity-100 translate-y-0 scale-100'
      }`}
    >
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/95 border border-indigo-500/30 shadow-2xl shadow-indigo-950/50 backdrop-blur-2xl relative overflow-hidden group">
        {/* Top Glowing Ambient Border Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white font-display">
                {getGreeting()}, {userDisplayName} 👋
              </h4>
              <p className="text-[11px] text-indigo-300 font-medium">
                You have {todayCount} {todayCount === 1 ? 'item' : 'items'} scheduled today
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsVisible(false)}
            className="p-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Dismiss Preview"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Notifications / Tasks List Preview */}
        <div className="space-y-2 my-2.5">
          {notifications.slice(0, 3).map((item) => (
            <div
              key={item.id}
              onClick={() => {
                setIsVisible(false);
                if (item.sourceType === 'calendar' || item.sourceType === 'task') {
                  if (onOpenCalendar) onOpenCalendar();
                } else {
                  onOpenNotifications();
                }
              }}
              className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-indigo-500/40 hover:bg-slate-950/80 transition-all cursor-pointer flex items-center justify-between gap-2 text-xs"
            >
              <div className="flex items-center gap-2 truncate">
                {item.type === 'calendar' ? (
                  <Calendar className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                ) : item.type === 'task' ? (
                  <CheckSquare className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                ) : (
                  <Bell className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                )}
                <span className="text-slate-200 font-medium truncate">{item.title}</span>
              </div>

              {item.scheduledAt && (
                <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 flex items-center gap-1 flex-shrink-0">
                  <Clock className="w-2.5 h-2.5 text-indigo-400" />
                  {new Date(item.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
          <button
            onClick={() => {
              setIsVisible(false);
              onOpenNotifications();
            }}
            className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>Open Notification Center</span>
            <ArrowRight className="w-3 h-3" />
          </button>

          {onOpenCalendar && (
            <button
              onClick={() => {
                setIsVisible(false);
                onOpenCalendar();
              }}
              className="text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>View Calendar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
