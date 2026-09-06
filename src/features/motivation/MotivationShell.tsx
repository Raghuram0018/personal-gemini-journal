import React, { useState } from 'react';
import './motivation.css';
import { MOTIVATIONAL_MESSAGES, MotivationalMessage } from './motivationalMessages';
import { selectMotivationalMessage } from './motivationService';
import { MotivationalMessageOverlay } from './MotivationalMessageOverlay';
import { Quote, Flame, SunMedium, Sparkles, Filter, RefreshCw, Layers } from 'lucide-react';

export const MotivationShell: React.FC = () => {
  const [selectedSection, setSelectedSection] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [previewOverlay, setPreviewOverlay] = useState<{
    message: MotivationalMessage;
    mode: 'login' | 'logout' | 'daily';
  } | null>(null);

  const sections = [
    { id: 0, title: 'All 500 Messages' },
    { id: 1, title: '1. A.P.J. Abdul Kalam (1–50)' },
    { id: 2, title: '2. Mahabharata & Bhagavad Gita (51–100)' },
    { id: 3, title: '3. Consistency & Daily Discipline (101–200)' },
    { id: 4, title: '4. Success & Achievement (201–300)' },
    { id: 5, title: '5. Feel-Good, Positive & Uplifting (301–400)' },
    { id: 6, title: '6. Resilience & Mindset (401–500)' },
  ];

  const filteredMessages = MOTIVATIONAL_MESSAGES.filter((msg) => {
    const matchesSection = selectedSection === 0 || msg.sectionId === selectedSection;
    const matchesSearch =
      searchQuery.trim() === '' ||
      msg.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSection && matchesSearch;
  });

  const triggerSampleOverlay = async (mode: 'login' | 'logout' | 'daily') => {
    const msg = await selectMotivationalMessage('demo-user-uid', mode === 'daily' ? 'login' : mode);
    setPreviewOverlay({ message: msg, mode });
  };

  return (
    <div id="motivation-shell" className="motivation-card-gradient p-6 rounded-3xl border border-slate-800 bg-slate-900/40 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Quote className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white font-display">
                Motivational Message Library
              </h3>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                500 Curated Quotes
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Personalized event-driven login & logout reflection engine
            </p>
          </div>
        </div>

        {/* Interactive Overlay Triggers */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => triggerSampleOverlay('login')}
            className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Test Login Overlay</span>
          </button>
          <button
            onClick={() => triggerSampleOverlay('logout')}
            className="px-3 py-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Test Logout Overlay</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search quotes by text, author, or category..."
            className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        <select
          value={selectedSection}
          onChange={(e) => setSelectedSection(Number(e.target.value))}
          className="px-3 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
        >
          {sections.map((sec) => (
            <option key={sec.id} value={sec.id}>
              {sec.title}
            </option>
          ))}
        </select>
      </div>

      {/* Quote Grid / List */}
      <div className="space-y-3 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
        {filteredMessages.slice(0, 50).map((msg) => (
          <div
            key={msg.id}
            onClick={() => setPreviewOverlay({ message: msg, mode: 'daily' })}
            className="p-4 rounded-2xl bg-slate-950/60 hover:bg-slate-950 border border-slate-800/80 hover:border-indigo-500/40 transition-all cursor-pointer group space-y-2"
          >
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-mono text-amber-400 font-bold uppercase tracking-wider text-[10px]">
                {msg.category}
              </span>
              <span className="text-slate-400 font-mono text-[10px]">Quote #{msg.id}</span>
            </div>
            <p className="text-xs text-slate-200 font-serif leading-relaxed italic">
              "{msg.text}"
            </p>
            <div className="text-[11px] text-slate-400 font-medium text-right">
              — {msg.author}
            </div>
          </div>
        ))}

        {filteredMessages.length > 50 && (
          <div className="text-center py-2 text-xs text-slate-400 font-mono">
            Showing first 50 of {filteredMessages.length} matching quotes
          </div>
        )}

        {filteredMessages.length === 0 && (
          <div className="text-center py-8 text-xs text-slate-400">
            No quotes found matching your search.
          </div>
        )}
      </div>

      {/* Interactive Overlay Modal Preview */}
      {previewOverlay && (
        <MotivationalMessageOverlay
          message={previewOverlay.message}
          mode={previewOverlay.mode}
          onComplete={() => setPreviewOverlay(null)}
        />
      )}
    </div>
  );
};
