import React from 'react';
import {
  BookMarked,
  Mic,
  Radio,
  Bell,
  LogOut,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface HomeTopBarProps {
  userDisplayName: string;
  userEmail?: string | null;
  userUid: string;
  onOpenNotifications: () => void;
  onSignOut: () => void;
  notificationCount?: number;
}

export const HomeTopBar: React.FC<HomeTopBarProps> = ({
  userDisplayName,
  userEmail,
  userUid,
  onOpenNotifications,
  onSignOut,
  notificationCount = 2,
}) => {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-2xl bg-slate-950/70 border-b border-slate-800/70 shadow-2xl shadow-slate-950/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-2">
        {/* Left: App Brand & Security Badge */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 border border-white/20">
            <BookMarked className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-bold tracking-tight text-white font-display uppercase">
                Personal Gemini Journal
              </span>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Protected Workspace
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono hidden md:block">
              UID Isolation: /users/{userUid.slice(0, 8)}...
            </p>
          </div>
        </div>

        {/* Right: Notifications & User Profile */}
        <div className="flex items-center gap-2.5">
          {/* Notifications Button */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer group"
            title="Notifications & Reminders"
          >
            <Bell className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-500 text-white text-[9px] font-bold flex items-center justify-center border border-slate-950">
                {notificationCount}
              </span>
            )}
          </button>

          {/* User Profile Pill */}
          <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold font-mono shadow">
              {userDisplayName.charAt(0).toUpperCase()}
            </div>
            <div className="text-left hidden lg:block">
              <div className="text-xs font-semibold text-slate-200 leading-tight">{userDisplayName}</div>
              <div className="text-[10px] text-slate-400 truncate max-w-[120px]">{userEmail}</div>
            </div>
          </div>

          {/* Sign Out Action */}
          <button
            onClick={onSignOut}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-950/30 hover:scale-102"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
