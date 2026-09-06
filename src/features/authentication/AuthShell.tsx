import React from 'react';
import './auth.css';
import { Lock, KeyRound, UserCheck } from 'lucide-react';

export const AuthShell: React.FC = () => {
  return (
    <div id="auth-shell" className="p-5 rounded-2xl border border-emerald-500/20 bg-slate-900/30">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
          <Lock className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Authentication & UID Isolation Module</h3>
          <p className="text-xs text-slate-400">Firebase Auth boundary ready (Zero custom password databases)</p>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
        <span className="auth-shield-badge px-2.5 py-1 rounded-full text-emerald-400 font-mono text-[11px] flex items-center gap-1.5">
          <UserCheck className="w-3.5 h-3.5" /> /users/&#123;uid&#125; Path Enforced
        </span>
        <span className="px-2.5 py-1 rounded-full bg-slate-800/60 text-slate-300 font-mono text-[11px] flex items-center gap-1.5">
          <KeyRound className="w-3.5 h-3.5 text-amber-400" /> Dedicated PIN Boundary
        </span>
      </div>
    </div>
  );
};
