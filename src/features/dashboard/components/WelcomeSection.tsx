import React from 'react';
import { Sparkles, ShieldCheck, Lock, CheckCircle2 } from 'lucide-react';

interface WelcomeSectionProps {
  userDisplayName: string;
  userUid: string;
}

export const WelcomeSection: React.FC<WelcomeSectionProps> = ({
  userDisplayName,
  userUid,
}) => {
  return (
    <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-slate-900 border border-indigo-500/20 shadow-2xl relative overflow-hidden transition-all duration-500 hover:border-indigo-500/40">
      {/* Background ambient sparkle decoration */}
      <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
        <Sparkles className="w-48 h-48 text-indigo-400" />
      </div>

      <div className="relative z-10 max-w-3xl space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Firebase Authenticated Session Active</span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold text-white font-display tracking-tight">
          Welcome back, <span className="text-indigo-400">{userDisplayName}</span>!
        </h1>

        <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
          Your personal memory ecosystem is initialized and secure. Every journal entry, mood record, and goal milestone will be isolated strictly under your authenticated UID path:
        </p>

        <div className="pt-2 flex flex-wrap items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-indigo-500/30 text-indigo-300 font-mono text-xs flex items-center gap-2 shadow-inner">
            <Lock className="w-3.5 h-3.5 text-indigo-400" />
            <span>/users/{userUid}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-400 font-mono text-xs flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Zero Cross-User Data Leakage Enforced</span>
          </div>
        </div>
      </div>
    </div>
  );
};
