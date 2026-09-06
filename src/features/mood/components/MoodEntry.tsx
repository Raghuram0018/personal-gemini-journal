import React, { useState } from 'react';
import { 
  Smile, 
  ChevronRight, 
  MessageSquare, 
  Save, 
  X,
  Star
} from 'lucide-react';
import { MoodRecord, MoodMetric } from '../../../types';
import { motion, AnimatePresence } from 'motion/react';

interface MoodEntryProps {
  onSave: (mood: MoodMetric, emotions: string[], intensity: number, note: string, stress: number, energy: number, confidence: number) => void;
  onCancel: () => void;
  initialData?: MoodRecord | null;
}

const MOOD_TYPES: { id: MoodMetric; label: string; emoji: string; color: string }[] = [
  { id: 'Radiant', label: 'Radiant', emoji: '🤩', color: 'from-amber-400 to-yellow-500' },
  { id: 'Happy', label: 'Happy', emoji: '😊', color: 'from-emerald-400 to-teal-500' },
  { id: 'Stable', label: 'Stable', emoji: '😌', color: 'from-blue-400 to-indigo-500' },
  { id: 'Tired', label: 'Tired', emoji: '😴', color: 'from-cyan-600 to-blue-700' },
  { id: 'Low', label: 'Low', emoji: '😔', color: 'from-slate-600 to-slate-800' },
  { id: 'Stressed', label: 'Stressed', emoji: '😟', color: 'from-purple-500 to-indigo-700' },
  { id: 'Anxious', label: 'Anxious', emoji: '😰', color: 'from-red-600 to-orange-700' },
];

const EMOTIONAL_LABELS = [
  'Peaceful', 'Grateful', 'Optimistic', 'Proud', 'Inspired',
  'Anxious', 'Frustrated', 'Lonely', 'Bored', 'Restless',
  'Energetic', 'Focused', 'Creative', 'Productive', 'Relaxed'
];

export const MoodEntry: React.FC<MoodEntryProps> = ({ onSave, onCancel, initialData }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedMood, setSelectedMood] = useState<MoodMetric | null>(initialData?.mood || null);
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>(initialData?.emotions || []);
  const [intensity, setIntensity] = useState<number>(initialData?.intensity || 5);
  const [stress, setStress] = useState<number>(initialData?.stress || 5);
  const [energy, setEnergy] = useState<number>(initialData?.energy || 5);
  const [confidence, setConfidence] = useState<number>(initialData?.confidence || 5);
  const [note, setNote] = useState<string>(initialData?.note || '');

  const toggleEmotion = (label: string) => {
    setSelectedEmotions(prev => 
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  };

  const handleSave = () => {
    if (!selectedMood) return;
    onSave(selectedMood, selectedEmotions, intensity, note, stress, energy, confidence);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-4">
      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-4 mb-8">
        {[1, 2, 3].map((s) => (
          <div 
            key={s} 
            className={`h-1.5 w-16 rounded-full transition-all duration-500 ${
              step >= s ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-slate-800'
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div 
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-extrabold text-white font-display">How are you feeling?</h2>
              <p className="text-slate-400">Select the primary mood that describes your state right now.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {MOOD_TYPES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMood(m.id)}
                  className={`group relative p-4 rounded-3xl border transition-all duration-300 flex flex-col items-center gap-2 ${
                    selectedMood === m.id 
                      ? `bg-gradient-to-br ${m.color} border-white/20 shadow-2xl scale-105` 
                      : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                  }`}
                >
                  <span className="text-4xl group-hover:scale-110 transition-transform">{m.emoji}</span>
                  <span className={`text-xs font-bold ${selectedMood === m.id ? 'text-white' : 'text-slate-400'}`}>
                    {m.label}
                  </span>
                </button>
              ))}
            </div>

            {selectedMood && (
              <div className="pt-4 flex justify-center">
                <button
                  onClick={() => setStep(2)}
                  className="px-8 py-3 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-indigo-900/40 transition-all hover:scale-105 active:scale-95"
                >
                  <span>Next Step</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </motion.div>
        )}

        {step === 2 && (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-extrabold text-white font-display">Life Metrics</h2>
              <p className="text-slate-400">Rate your current intensity, stress, energy, and confidence.</p>
            </div>

            <div className="grid gap-8">
              {/* Intensity Slider */}
              <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                  <label className="text-sm font-black text-slate-300 uppercase tracking-widest">Intensity</label>
                  <span className="text-xs font-mono text-indigo-400">{intensity}/10</span>
                </div>
                <input 
                  type="range" min="1" max="10" step="1"
                  value={intensity}
                  onChange={(e) => setIntensity(parseInt(e.target.value))}
                  className="w-full accent-indigo-500 bg-slate-900 h-1.5 rounded-full appearance-none cursor-pointer"
                />
              </div>

              {/* Stress Slider */}
              <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                  <label className="text-sm font-black text-slate-300 uppercase tracking-widest">Stress</label>
                  <span className="text-xs font-mono text-red-400">{stress}/10</span>
                </div>
                <input 
                  type="range" min="1" max="10" step="1"
                  value={stress}
                  onChange={(e) => setStress(parseInt(e.target.value))}
                  className="w-full accent-red-500 bg-slate-900 h-1.5 rounded-full appearance-none cursor-pointer"
                />
              </div>

              {/* Energy Slider */}
              <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                  <label className="text-sm font-black text-slate-300 uppercase tracking-widest">Energy</label>
                  <span className="text-xs font-mono text-emerald-400">{energy}/10</span>
                </div>
                <input 
                  type="range" min="1" max="10" step="1"
                  value={energy}
                  onChange={(e) => setEnergy(parseInt(e.target.value))}
                  className="w-full accent-emerald-500 bg-slate-900 h-1.5 rounded-full appearance-none cursor-pointer"
                />
              </div>

              {/* Confidence Slider */}
              <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                  <label className="text-sm font-black text-slate-300 uppercase tracking-widest">Confidence</label>
                  <span className="text-xs font-mono text-blue-400">{confidence}/10</span>
                </div>
                <input 
                  type="range" min="1" max="10" step="1"
                  value={confidence}
                  onChange={(e) => setConfidence(parseInt(e.target.value))}
                  className="w-full accent-blue-500 bg-slate-900 h-1.5 rounded-full appearance-none cursor-pointer"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-300 text-center">Refine your emotions (optional)</h3>
              <div className="flex flex-wrap justify-center gap-2">
                {EMOTIONAL_LABELS.map((l) => (
                  <button
                    key={l}
                    onClick={() => toggleEmotion(l)}
                    className={`px-4 py-2 rounded-full border text-xs font-bold transition-all ${
                      selectedEmotions.includes(l)
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 flex justify-between gap-4">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-3 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg shadow-indigo-900/40"
              >
                Next Step
              </button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div 
            key="step3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-extrabold text-white font-display">Want to tell me more?</h2>
              <p className="text-slate-400">Add a note to capture why you're feeling this way.</p>
            </div>

            <div className="relative group">
              <div className="absolute top-4 left-4 text-indigo-400 group-focus-within:scale-110 transition-transform">
                <MessageSquare className="w-5 h-5" />
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What's on your mind? Capture the context of this moment..."
                className="w-full min-h-[200px] bg-slate-900/50 border border-slate-800 rounded-3xl p-6 pl-12 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all resize-none font-medium"
              />
            </div>

            <div className="pt-4 flex flex-col gap-3">
              <button
                onClick={handleSave}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold shadow-xl shadow-indigo-950/60 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95"
              >
                <Save className="w-5 h-5" />
                <span>Save Mood Record</span>
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold transition-all"
                >
                  Back
                </button>
                <button
                  onClick={onCancel}
                  className="flex-1 py-3 rounded-2xl bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-500 font-bold transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
