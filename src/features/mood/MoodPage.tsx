import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  ArrowLeft, 
  History, 
  BarChart2, 
  Map as MapIcon,
  Plus,
  Zap,
  Shield,
  Search
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { MoodRecord, JournalEntry, MoodMetric } from '../../types';
import { getMoodHistory, saveMoodRecord, deleteMoodRecord } from './moodService';
import { MoodEntry } from './components/MoodEntry';
import { MoodHistory } from './components/MoodHistory';
import { MoodAnalytics } from './components/MoodAnalytics';
import { MoodCalendar } from './components/MoodCalendar';
import { motion, AnimatePresence } from 'motion/react';
import { FeatureNavigation } from '../../components/common/FeatureNavigation';

interface MoodPageProps {
  onBackToHome: () => void;
  journals?: JournalEntry[];
}

type MoodTab = 'entry' | 'history' | 'analytics' | 'calendar';

export const MoodPage: React.FC<MoodPageProps> = ({ onBackToHome, journals }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<MoodTab>('history');
  const [moodHistory, setMoodHistory] = useState<MoodRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRecord, setEditingRecord] = useState<MoodRecord | null>(null);

  const fetchHistory = async () => {
    if (!user?.uid) return;
    setLoading(true);
    const data = await getMoodHistory(user.uid);
    setMoodHistory(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchHistory();
  }, [user]);

  const handleSaveMood = async (
    mood: MoodMetric, 
    emotions: string[], 
    intensity: number, 
    note: string,
    stress: number,
    energy: number,
    confidence: number
  ) => {
    if (!user?.uid) return;
    
    const newRecord: MoodRecord = editingRecord ? {
      ...editingRecord,
      mood,
      emotions,
      intensity,
      stress,
      energy,
      confidence,
      note,
      updatedAt: new Date().toISOString()
    } : {
      id: Math.random().toString(36).substring(2, 11),
      userId: user.uid,
      mood,
      emotions,
      intensity,
      stress,
      energy,
      confidence,
      note,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      journalIds: [],
      calendarEventIds: [],
      musicActivityIds: [],
      bookIds: [],
      memoryIds: []
    };

    try {
      await saveMoodRecord(user.uid, newRecord);
      await fetchHistory();
      setActiveTab('history');
      setEditingRecord(null);
    } catch (err) {
      console.error('Failed to save mood:', err);
    }
  };

  const handleDeleteMood = async (id: string) => {
    if (!user?.uid) return;
    try {
      await deleteMoodRecord(user.uid, id);
      setMoodHistory(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error('Failed to delete mood:', err);
    }
  };

  const handleEditMood = (record: MoodRecord) => {
    setEditingRecord(record);
    setActiveTab('entry');
  };

  const TABS = [
    { id: 'history', label: 'Recent Journey', icon: History },
    { id: 'analytics', label: 'Emotional Intelligence', icon: BarChart2 },
    { id: 'calendar', label: 'Memory Journey', icon: MapIcon },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      <FeatureNavigation 
        title="Mood Journey Map" 
        onBack={onBackToHome}
        onClose={onBackToHome}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
        {/* Futuristic Header Card */}
        <div className="relative p-8 rounded-3xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-purple-950/30 border border-indigo-500/20 shadow-2xl overflow-hidden group">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 blur-[100px] pointer-events-none group-hover:bg-indigo-500/20 transition-all" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-500/10 blur-[100px] pointer-events-none group-hover:bg-purple-500/20 transition-all" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Shield className="w-3.5 h-3.5" />
                Isolated User Session: /users/{user?.uid?.slice(0, 8)}...
              </div>
              <h1 className="text-4xl font-black text-white font-display tracking-tight">
                Your Emotional Landscape
              </h1>
              <p className="text-slate-400 text-sm max-w-xl leading-relaxed">
                Track patterns, analyze triggers, and build emotional intelligence by mapping your daily journey. 
                Your moods are securely isolated and preserved.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingRecord(null);
                setActiveTab('entry');
              }}
              className="px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm shadow-xl shadow-indigo-950/60 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95"
            >
              <Plus className="w-5 h-5" />
              <span>Record Current Mood</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as MoodTab);
                setEditingRecord(null);
              }}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-black whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40 translate-y-[-2px]'
                  : 'bg-slate-900/50 text-slate-500 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-white' : 'text-slate-600'}`} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Dynamic Content Area */}
        <div className="relative min-h-[400px]">
          <AnimatePresence mode="wait">
            {activeTab === 'entry' && (
              <motion.div
                key="entry"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
              >
                <MoodEntry 
                  onSave={handleSaveMood}
                  onCancel={() => {
                    setActiveTab('history');
                    setEditingRecord(null);
                  }}
                  initialData={editingRecord}
                />
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
              >
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <Zap className="w-10 h-10 text-indigo-500 animate-pulse" />
                    <p className="text-slate-500 font-mono text-xs uppercase tracking-widest">Retrieving Secure History...</p>
                  </div>
                ) : (
                  <MoodHistory 
                    history={moodHistory} 
                    onDelete={handleDeleteMood}
                    onEdit={handleEditMood}
                  />
                )}
              </motion.div>
            )}

            {activeTab === 'analytics' && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
              >
                <MoodAnalytics history={moodHistory} />
              </motion.div>
            )}

            {activeTab === 'calendar' && (
              <motion.div
                key="calendar"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
              >
                <MoodCalendar history={moodHistory} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};
