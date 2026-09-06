import React from 'react';
import { 
  Sparkles,
  Map as MapIcon,
  Clock,
  ChevronDown
} from 'lucide-react';
import { MoodRecord, MoodMetric } from '../../../types';
import { motion } from 'motion/react';

interface MoodCalendarProps {
  history: MoodRecord[];
}

export const MoodCalendar: React.FC<MoodCalendarProps> = ({ history }) => {
  // Sort history by date and time descending
  const sortedHistory = [...history].sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time || '00:00'}`);
    const dateB = new Date(`${b.date}T${b.time || '00:00'}`);
    return dateB.getTime() - dateA.getTime();
  });

  const getMoodColor = (mood: MoodMetric) => {
    const colors: Record<MoodMetric, string> = {
      Radiant: 'bg-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.6)] border-amber-300',
      Happy: 'bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.6)] border-emerald-300',
      Stable: 'bg-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.6)] border-blue-300',
      Tired: 'bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.6)] border-cyan-400',
      Low: 'bg-slate-500 shadow-[0_0_15px_rgba(107,114,128,0.6)] border-slate-400',
      Stressed: 'bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.6)] border-purple-400',
      Anxious: 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)] border-red-400'
    };
    return colors[mood] || 'bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.6)] border-indigo-400';
  };

  const getMoodEmoji = (mood: MoodMetric) => {
    const emojis: Record<MoodMetric, string> = {
      Radiant: '🤩',
      Happy: '😊',
      Stable: '😌',
      Tired: '😴',
      Low: '😔',
      Stressed: '😟',
      Anxious: '😰'
    };
    return emojis[mood] || '✨';
  };

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 rounded-3xl border border-slate-800 border-dashed">
        <MapIcon className="w-12 h-12 text-slate-700 mb-4" />
        <p className="text-slate-500 font-black uppercase tracking-widest text-xs">No emotional journey records found</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <MapIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white font-display tracking-tight">Emotional Path</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Your Winding Memory Journey</p>
          </div>
        </div>
      </div>

      <div className="relative max-w-2xl mx-auto px-4 py-12">
        {/* The Central Path Line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500/50 via-purple-500/50 to-transparent -translate-x-1/2 rounded-full hidden md:block" />
        
        <div className="space-y-16 relative">
          {sortedHistory.map((record, index) => {
            const isEven = index % 2 === 0;
            const moodColor = getMoodColor(record.mood);
            
            return (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, x: isEven ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                className={`relative flex items-center ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} flex-col gap-6 md:gap-0`}
              >
                {/* Connector for Mobile */}
                <div className="absolute left-1/2 top-[-64px] h-16 w-0.5 bg-slate-800 md:hidden -translate-x-1/2" />

                {/* Content Side */}
                <div className={`md:w-1/2 ${isEven ? 'md:pr-12 md:text-right' : 'md:pl-12 md:text-left'} flex flex-col items-center md:items-start w-full`}>
                  <div className={`p-6 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-md shadow-xl hover:border-slate-700 transition-all group w-full md:w-auto min-w-[280px]`}>
                    <div className={`flex items-center gap-3 mb-4 ${isEven ? 'md:flex-row-reverse' : 'md:flex-row'} justify-center md:justify-start`}>
                      <div className={`w-12 h-12 rounded-2xl ${moodColor} border-2 flex items-center justify-center text-2xl shadow-lg transform group-hover:scale-110 transition-transform`}>
                        {getMoodEmoji(record.mood)}
                      </div>
                      <div className={isEven ? 'md:text-right' : 'md:text-left'}>
                        <h4 className="text-lg font-black text-white">{record.mood}</h4>
                        <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                          <Clock className="w-3 h-3" />
                          <span>{record.date} • {record.time}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-sm text-slate-300 leading-relaxed italic">
                        "{record.note || "No notes for this entry..."}"
                      </p>
                      
                      <div className={`flex flex-wrap gap-2 ${isEven ? 'md:justify-end' : 'md:justify-start'} justify-center`}>
                        {record.emotions.slice(0, 3).map(e => (
                          <span key={e} className="px-2 py-0.5 rounded-full bg-slate-950/60 border border-slate-800 text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                            {e}
                          </span>
                        ))}
                      </div>

                      <div className="pt-3 border-t border-slate-800/50 grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[8px] font-black text-slate-500 uppercase">
                            <span>Stress</span>
                            <span>{record.stress}/10</span>
                          </div>
                          <div className="h-1 bg-slate-950 rounded-full overflow-hidden">
                            <div className="h-full bg-red-500" style={{ width: `${record.stress * 10}%` }} />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[8px] font-black text-slate-500 uppercase">
                            <span>Energy</span>
                            <span>{record.energy}/10</span>
                          </div>
                          <div className="h-1 bg-slate-950 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: `${record.energy * 10}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Center Node */}
                <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center z-10 hidden md:flex">
                  <div className={`w-4 h-4 rounded-full ${moodColor} border-4 border-slate-950 shadow-2xl scale-125 group-hover:scale-150 transition-all cursor-pointer`} />
                  <div className={`absolute w-12 h-12 rounded-full ${moodColor} opacity-20 blur-xl animate-pulse`} />
                </div>

                {/* Empty Spacer for desktop */}
                <div className="md:w-1/2 hidden md:block" />
              </motion.div>
            );
          })}
        </div>

        {/* Start/End Markers */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-6 hidden md:block">
          <div className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[8px] font-black uppercase tracking-widest">
            Latest State
          </div>
        </div>

        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-12 hidden md:block">
          <ChevronDown className="w-6 h-6 text-slate-800 animate-bounce" />
        </div>
      </div>
    </div>
  );
};
