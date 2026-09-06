import React, { useMemo } from 'react';
import { 
  TrendingUp, 
  Activity, 
  BarChart2, 
  PieChart,
  Calendar as CalendarIcon,
  Zap,
  Smile,
  Frown
} from 'lucide-react';
import { MoodRecord } from '../../../types';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell
} from 'recharts';

interface MoodAnalyticsProps {
  history: MoodRecord[];
}

export const MoodAnalytics: React.FC<MoodAnalyticsProps> = ({ history }) => {
  // 1. Process data for the intensity line chart (last 14 records)
  const chartData = useMemo(() => {
    return [...history]
      .reverse()
      .slice(-14)
      .map(m => ({
        date: m.date.split('-').slice(1).join('/'), // MM/DD
        intensity: m.intensity,
        mood: m.mood
      }));
  }, [history]);

  // 2. Count mood frequencies
  const moodDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    history.forEach(m => {
      counts[m.mood] = (counts[m.mood] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [history]);

  // 3. Top emotions
  const topEmotions = useMemo(() => {
    const counts: Record<string, number> = {};
    history.forEach(m => {
      m.emotions.forEach(e => {
        counts[e] = (counts[e] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [history]);

  // 4. Stats
  const stats = useMemo(() => {
    if (history.length === 0) return { avgIntensity: 0, mostFrequent: 'N/A', totalEntries: 0 };
    
    const sum = history.reduce((acc, curr) => acc + curr.intensity, 0);
    const mostFreq = moodDistribution[0]?.name || 'N/A';
    
    return {
      avgIntensity: (sum / history.length).toFixed(1),
      mostFrequent: mostFreq,
      totalEntries: history.length
    };
  }, [history, moodDistribution]);

  const MOOD_COLORS: Record<string, string> = {
    happy: '#fbbf24',
    calm: '#34d399',
    excited: '#f472b6',
    motivated: '#818cf8',
    neutral: '#94a3b8',
    sad: '#6366f1',
    worried: '#a855f7',
    angry: '#ef4444',
    tired: '#22d3ee',
    drained: '#475569'
  };

  if (history.length < 2) {
    return (
      <div className="py-20 text-center space-y-4 bg-slate-900/50 border border-slate-800 rounded-3xl">
        <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto border border-indigo-500/20 text-indigo-400">
          <Activity className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-white">Insufficient Data</h3>
          <p className="text-slate-400 text-sm max-w-xs mx-auto">
            You need at least 2 mood records to generate emotional intelligence analytics.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 space-y-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity className="w-12 h-12 text-indigo-400" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Average Intensity</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{stats.avgIntensity}</span>
            <span className="text-xs text-slate-500">/ 10</span>
          </div>
        </div>
        
        <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 space-y-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Smile className="w-12 h-12 text-amber-400" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Most Frequent Mood</p>
          <span className="text-2xl font-black text-white capitalize">{stats.mostFrequent}</span>
        </div>

        <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 space-y-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <BarChart2 className="w-12 h-12 text-emerald-400" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Records</p>
          <span className="text-3xl font-black text-white">{stats.totalEntries}</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Intensity Trend */}
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white font-display">Intensity Trend</h3>
            </div>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorIntensity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  dy={10}
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  domain={[0, 10]}
                  ticks={[0, 2, 4, 6, 8, 10]}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    border: '1px solid #334155', 
                    borderRadius: '12px',
                    fontSize: '12px'
                  }}
                  itemStyle={{ color: '#818cf8' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="intensity" 
                  stroke="#6366f1" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorIntensity)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Mood Distribution */}
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <PieChart className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white font-display">Mood Distribution</h3>
            </div>
          </div>

          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={moodDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  width={80}
                  className="capitalize font-bold"
                />
                <Tooltip 
                  cursor={{ fill: '#1e293b' }}
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    border: '1px solid #334155', 
                    borderRadius: '12px',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} animationDuration={1500}>
                  {moodDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={MOOD_COLORS[entry.name] || '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Emotions Chip Grid */}
      <div className="p-8 rounded-3xl bg-gradient-to-br from-slate-900 to-indigo-950/20 border border-indigo-500/10 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white font-display">Emotional Patterns</h3>
        </div>
        
        <div className="flex flex-wrap gap-3">
          {topEmotions.map((e) => (
            <div 
              key={e.name}
              className="px-6 py-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-4 hover:border-indigo-500/40 transition-all group"
            >
              <span className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors">{e.name}</span>
              <div className="h-4 w-[1px] bg-slate-800" />
              <span className="text-xs font-black text-indigo-400">{e.count}x</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
