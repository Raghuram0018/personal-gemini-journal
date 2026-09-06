import React from 'react';
import { ShieldCheck, ShieldAlert, Cpu, Database, KeyRound, Sparkles } from 'lucide-react';

interface Props {
  serverStatus: string;
  geminiReady: boolean;
  isolatedFirestoreReady: boolean;
  version: string;
}

export const SecurityStatusCard: React.FC<Props> = ({
  serverStatus,
  geminiReady,
  isolatedFirestoreReady,
  version,
}) => {
  return (
    <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-100 font-display">Foundation Architecture & Security Matrix</h2>
            <p className="text-xs text-slate-400">Strict adherence to permanent project security constitution</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Server {serverStatus === 'healthy' ? 'Online' : 'Initializing'}
          </span>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-slate-800 text-slate-300">
            v{version}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
        {/* 1. Firestore Isolation */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center gap-2 text-indigo-400 mb-2">
            <Database className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider font-mono">Storage Boundary</span>
          </div>
          <div className="text-sm font-medium text-slate-200 mb-1">Firestore UID Isolation</div>
          <p className="text-xs text-slate-400 leading-relaxed font-mono">
            /users/&#123;uid&#125;/*
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Zero Cross-User Access</span>
          </div>
        </div>

        {/* 2. Server-Side Gemini */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center gap-2 text-purple-400 mb-2">
            <Cpu className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider font-mono">Gemini AI Boundary</span>
          </div>
          <div className="text-sm font-medium text-slate-200 mb-1">Server-Side Proxy</div>
          <p className="text-xs text-slate-400 leading-relaxed">
            API key strictly confined to backend. No client exposure.
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-purple-300">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Model: gemini-3.7-flash</span>
          </div>
        </div>

        {/* 3. PIN Security */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center gap-2 text-amber-400 mb-2">
            <KeyRound className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider font-mono">PIN Privacy Guard</span>
          </div>
          <div className="text-sm font-medium text-slate-200 mb-1">Zero Gemini Exposure</div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Journal PINs never sent to AI, logs, analytics, or prompts.
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-amber-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Cryptographic Guard</span>
          </div>
        </div>
      </div>
    </div>
  );
};
