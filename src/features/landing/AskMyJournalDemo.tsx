import React, { useState } from 'react';
import { Sparkles, MessageSquareText, ShieldCheck, Database, FileText, CheckCircle2 } from 'lucide-react';

interface DemoPrompt {
  id: string;
  userQuery: string;
  aiResponse: string;
  sources: string[];
  groundedTopic: string;
}

export const AskMyJournalDemo: React.FC = () => {
  const samplePrompts: DemoPrompt[] = [
    {
      id: 'struggle',
      userQuery: 'What was I struggling with this month?',
      aiResponse:
        'You mentioned career uncertainty in 5 entries. Your later entries show that your confidence increased after completing two interviews.',
      sources: ['Entry #42: May 12 "Career Direction"', 'Entry #46: May 21 "Interview Debrief"', 'Mood Log: May 22 (Confidence 8/10)'],
      groundedTopic: 'Career & Emotional Growth',
    },
    {
      id: 'books',
      userQuery: 'What books inspired my goal progress recently?',
      aiResponse:
        'In your June reading log, you captured 3 quotes from "Atomic Habits" about identity-based routines. You directly referenced chapter 4 in your Goal Journey milestone for morning meditation.',
      sources: ['Digital Library: "Atomic Habits"', 'Goal Milestone: "Daily 15m Mindfulness"', 'Quote #14 Saved June 3'],
      groundedTopic: 'Reading & Goal Alignment',
    },
    {
      id: 'stress',
      userQuery: 'How did my stress levels correlate with my music memories during vacation?',
      aiResponse:
        'Your Mood Journey map logged a 40% reduction in stress during your coastal trip. Your tagged song "Atmosphere" by Tycho was saved alongside 3 high-energy sunset reflections.',
      sources: ['Mood Map: July 10-16 Coastal Trip', 'Music Memories: "Atmosphere - Tycho"', 'Journal #58: "Evening Tide"'],
      groundedTopic: 'Mood & Soundtrack Synergy',
    },
  ];

  const [selectedPrompt, setSelectedPrompt] = useState<DemoPrompt>(samplePrompts[0]);
  const [isTyping, setIsTyping] = useState<boolean>(false);

  const handleSelectPrompt = (prompt: DemoPrompt) => {
    if (prompt.id === selectedPrompt.id) return;
    setIsTyping(true);
    setSelectedPrompt(prompt);
    setTimeout(() => {
      setIsTyping(false);
    }, 300);
  };

  return (
    <section id="ask-my-journal-demo" className="py-16 relative">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Core Multi-Turn Differentiator</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white font-display">
            Ask My Journal
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            Ask questions about your own historical journal and personal memories. Gemini retrieves only your authorized entries to answer with genuine personal context.
          </p>
        </div>

        {/* Demo Chat Console Frame */}
        <div className="p-1 rounded-3xl bg-gradient-to-r from-purple-500/30 via-indigo-500/30 to-cyan-500/30 shadow-2xl">
          <div className="p-6 sm:p-8 rounded-[22px] bg-slate-950/90 backdrop-blur-2xl border border-slate-800 space-y-6">
            {/* Console Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <MessageSquareText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-display">Interactive Grounded AI Preview</h3>
                  <p className="text-xs text-slate-400">Strictly grounded in user entries — zero fabrication</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-purple-950/60 border border-purple-800/50 text-purple-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> UID Isolated Context
                </span>
              </div>
            </div>

            {/* Prompt Selector Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 mr-1">Try example questions:</span>
              {samplePrompts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectPrompt(p)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer border ${
                    selectedPrompt.id === p.id
                      ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/30'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  "{p.userQuery}"
                </button>
              ))}
            </div>

            {/* Simulated Chat Dialogue */}
            <div className="space-y-4 p-5 rounded-2xl bg-slate-900/60 border border-slate-800/90 font-sans">
              {/* User Message */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-200 flex items-center justify-center text-xs font-bold shrink-0">
                  You
                </div>
                <div className="p-3.5 rounded-2xl rounded-tl-none bg-slate-800/90 text-white text-sm border border-slate-700/80 max-w-2xl font-medium shadow-sm">
                  "{selectedPrompt.userQuery}"
                </div>
              </div>

              {/* Gemini Response */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-600/30">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="flex-1 space-y-3">
                  <div className="p-4 rounded-2xl rounded-tl-none bg-purple-950/30 text-slate-100 text-sm border border-purple-500/20 leading-relaxed shadow-sm">
                    {isTyping ? (
                      <div className="flex items-center gap-2 text-slate-400 text-xs py-1">
                        <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" />
                        <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce [animation-delay:0.2s]" />
                        <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce [animation-delay:0.4s]" />
                        <span>Searching grounded user journal index...</span>
                      </div>
                    ) : (
                      <span>{selectedPrompt.aiResponse}</span>
                    )}
                  </div>

                  {/* Grounding Source Citations */}
                  {!isTyping && (
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5 animate-in fade-in duration-300">
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-purple-300 font-semibold">
                        <Database className="w-3.5 h-3.5 text-purple-400" />
                        <span>Grounded Sources ({selectedPrompt.sources.length} matching entries)</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {selectedPrompt.sources.map((src, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 font-mono"
                          >
                            <FileText className="w-3 h-3 text-indigo-400" />
                            {src}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Security Guarantee Notice */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400 pt-2 border-t border-slate-800/60">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Gemini receives only user-authorized entries retrieved via Firestore UID security rules.</span>
              </div>
              <span className="font-mono text-slate-400">Offline Landing Demo</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
