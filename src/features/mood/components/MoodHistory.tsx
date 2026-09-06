import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  Trash2, 
  Edit2, 
  Search,
  Filter,
  MoreVertical,
  ChevronDown
} from 'lucide-react';
import { MoodRecord } from '../../../types';
import { motion, AnimatePresence } from 'motion/react';

interface MoodHistoryProps {
  history: MoodRecord[];
  onDelete: (id: string) => void;
  onEdit: (record: MoodRecord) => void;
}

export const MoodHistory: React.FC<MoodHistoryProps> = ({ history, onDelete, onEdit }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'high' | 'low'>('all');
  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null);

  const filteredHistory = history.filter(m => {
    const matchesSearch = m.mood.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         m.note?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         m.emotions.some(e => e.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (filter === 'high') return matchesSearch && m.intensity >= 8;
    if (filter === 'low') return matchesSearch && m.intensity <= 3;
    return matchesSearch;
  });

  const getMoodEmoji = (mood: string) => {
    const emojis: Record<string, string> = {
      happy: '😊', calm: '😌', excited: '🤩', motivated: '💪',
      neutral: '😐', sad: '😔', worried: '😟', angry: '😡',
      tired: '😴', drained: '😞'
    };
    return emojis[mood.toLowerCase()] || '😶';
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search moods, emotions, or notes..."
            className="w-full pl-12 pr-4 py-3 bg-slate-900/50 border border-slate-800 rounded-2xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-all"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filter === 'all' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
          >
            All
          </button>
          <button 
            onClick={() => setFilter('high')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filter === 'high' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
          >
            High Intensity
          </button>
          <button 
            onClick={() => setFilter('low')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filter === 'low' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
          >
            Low Intensity
          </button>
        </div>
      </div>

      {/* History List */}
      <div className="space-y-4">
        {filteredHistory.length === 0 ? (
          <div className="py-20 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto border border-slate-800 text-slate-700">
              <Search className="w-8 h-8" />
            </div>
            <p className="text-slate-500 font-medium">No mood records match your search.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredHistory.map((record) => (
              <motion.div
                key={record.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="group relative bg-slate-900/40 border border-slate-800/50 hover:border-slate-700 hover:bg-slate-800/40 p-5 rounded-3xl transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl p-3 bg-slate-950 rounded-2xl border border-slate-800 shadow-inner">
                      {getMoodEmoji(record.mood)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-extrabold text-white capitalize">{record.mood}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                          record.intensity >= 8 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                          record.intensity >= 5 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        }`}>
                          Intensity: {record.intensity}/10
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap gap-1.5">
                        {record.emotions.map(e => (
                          <span key={e} className="text-[10px] font-bold text-slate-500 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800/50">
                            {e}
                          </span>
                        ))}
                      </div>

                      {record.note && (
                        <p className="text-sm text-slate-300 mt-2 line-clamp-2 leading-relaxed">
                          {record.note}
                        </p>
                      )}

                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-800/50 text-[10px] text-slate-500 font-mono">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3" />
                          <span>{record.date}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          <span>{record.time}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => onEdit(record)}
                      className="p-2 hover:bg-slate-700 rounded-xl text-slate-400 hover:text-indigo-400 transition-all"
                      title="Edit Entry"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setShowConfirmDelete(record.id)}
                      className="p-2 hover:bg-rose-900/30 rounded-xl text-slate-400 hover:text-rose-400 transition-all"
                      title="Delete Entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Confirm Delete Overlay */}
                <AnimatePresence>
                  {showConfirmDelete === record.id && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute inset-0 z-10 bg-slate-950/90 backdrop-blur-sm rounded-3xl flex items-center justify-center p-6 text-center"
                    >
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <h5 className="text-sm font-bold text-white">Delete this mood record?</h5>
                          <p className="text-[10px] text-slate-400">This action cannot be undone.</p>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setShowConfirmDelete(null)}
                            className="flex-1 px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold transition-all"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={() => {
                              onDelete(record.id);
                              setShowConfirmDelete(null);
                            }}
                            className="flex-1 px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold transition-all"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
