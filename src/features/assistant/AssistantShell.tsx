import React from 'react';
import './assistant.css';
import { Bot, Sparkles, Brain } from 'lucide-react';

export const AssistantShell: React.FC = () => {
  return (
    <div id="assistant-shell" className="assistant-pulse-glow p-5 rounded-2xl border border-indigo-500/30 bg-slate-900/30">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
          <Bot className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Personal AI Life Assistant Module</h3>
          <p className="text-xs text-slate-400">Multi-turn proactive insights, habit coaching, and historical memory synthesis</p>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
        <span className="px-2.5 py-1 rounded-lg bg-slate-950/60 border border-slate-800 text-indigo-300 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Multi-Turn Conversation
        </span>
        <span className="px-2.5 py-1 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-300 flex items-center gap-1.5">
          <Brain className="w-3.5 h-3.5 text-purple-400" /> Life Insights & Habit Analysis
        </span>
      </div>
    </div>
  );
};
