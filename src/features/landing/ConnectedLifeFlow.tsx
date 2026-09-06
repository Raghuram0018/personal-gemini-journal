import React, { useState } from 'react';
import { BookMarked, Compass, Target, Activity, BookOpen, Music, Calendar, Sparkles, ArrowRight } from 'lucide-react';

interface ConnectedNode {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  borderColor: string;
  badge: string;
}

export const ConnectedLifeFlow: React.FC = () => {
  const nodes: ConnectedNode[] = [
    {
      id: 'journal',
      name: 'Journal',
      description: 'Voice & text thoughts captured with PIN privacy',
      icon: <BookMarked className="w-5 h-5 text-indigo-400" />,
      color: 'bg-indigo-500/10 text-indigo-400',
      borderColor: 'border-indigo-500/30',
      badge: 'Capture',
    },
    {
      id: 'memories',
      name: 'Memories',
      description: '3D spatial carousel uniting milestone moments',
      icon: <Compass className="w-5 h-5 text-cyan-400" />,
      color: 'bg-cyan-500/10 text-cyan-400',
      borderColor: 'border-cyan-500/30',
      badge: 'Preserve',
    },
    {
      id: 'goals',
      name: 'Goals',
      description: 'Map-style milestones with timestamped progress',
      icon: <Target className="w-5 h-5 text-pink-400" />,
      color: 'bg-pink-500/10 text-pink-400',
      borderColor: 'border-pink-500/30',
      badge: 'Intentions',
    },
    {
      id: 'mood',
      name: 'Mood',
      description: 'Stress, energy, and confidence timeline curves',
      icon: <Activity className="w-5 h-5 text-rose-400" />,
      color: 'bg-rose-500/10 text-rose-400',
      borderColor: 'border-rose-500/30',
      badge: 'Emotional',
    },
    {
      id: 'books',
      name: 'Books',
      description: 'Reading status, quote highlights, and reviews',
      icon: <BookOpen className="w-5 h-5 text-amber-400" />,
      color: 'bg-amber-500/10 text-amber-400',
      borderColor: 'border-amber-500/30',
      badge: 'Knowledge',
    },
    {
      id: 'music',
      name: 'Music',
      description: 'Songs and albums anchored to life events',
      icon: <Music className="w-5 h-5 text-fuchsia-400" />,
      color: 'bg-fuchsia-500/10 text-fuchsia-400',
      borderColor: 'border-fuchsia-500/30',
      badge: 'Soundtrack',
    },
    {
      id: 'calendar',
      name: 'Calendar',
      description: 'Scheduled events, tasks, and image attachments',
      icon: <Calendar className="w-5 h-5 text-emerald-400" />,
      color: 'bg-emerald-500/10 text-emerald-400',
      borderColor: 'border-emerald-500/30',
      badge: 'Chronology',
    },
    {
      id: 'ai_insights',
      name: 'AI Insights',
      description: 'Gemini synthesis connecting patterns across all data',
      icon: <Sparkles className="w-5 h-5 text-purple-400" />,
      color: 'bg-purple-500/10 text-purple-400',
      borderColor: 'border-purple-500/30',
      badge: 'Synthesis',
    },
  ];

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  return (
    <section id="connected-life" className="py-16 relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <span className="text-xs font-mono uppercase tracking-widest text-indigo-400 font-semibold px-3 py-1 rounded-full bg-indigo-950/60 border border-indigo-800/40">
            Connected Life Architecture
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white font-display">
            Your story. Unified in one ecosystem.
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            Every entry, milestone, book, song, and mood log is connected through Gemini intelligence into a single living narrative.
          </p>
        </div>

        {/* Connected Graph Flow Container */}
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-950/80 border border-slate-800 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
          {/* Grid Layout of Connected Modules */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
            {nodes.map((node, index) => {
              const isHovered = hoveredNodeId === node.id;
              return (
                <div
                  key={node.id}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer relative ${
                    isHovered
                      ? `bg-slate-900 border-indigo-400 shadow-xl shadow-indigo-500/20 scale-[1.02]`
                      : `bg-slate-900/50 ${node.borderColor} hover:bg-slate-900/80`
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2.5 rounded-xl border ${node.color} ${node.borderColor}`}>
                      {node.icon}
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-950 text-slate-300 border border-slate-800">
                      {node.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white font-display mb-1 flex items-center justify-between">
                    <span>{node.name}</span>
                    {index < nodes.length - 1 && (
                      <ArrowRight className="w-3.5 h-3.5 text-slate-600 hidden lg:block" />
                    )}
                  </h3>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    {node.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Central Connecting Flow Pipeline Line */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-2 font-mono">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
              <span>Flow: Journal &rarr; Memories &rarr; Goals &rarr; AI Insights</span>
            </div>
            <div className="text-slate-400 font-sans">
              All data isolated under user's Firebase UID. Zero cross-user sharing.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
