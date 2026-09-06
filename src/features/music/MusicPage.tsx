import React, { useState } from 'react';
import { MusicLibrary } from './components/MusicLibrary';
import { MusicTimelineView } from './components/MusicTimelineView';
import { MusicMoodView } from './components/MusicMoodView';
import { GeminiMusicAssistant } from './components/GeminiMusicAssistant';
import { ConnectJournalModal } from './components/ConnectJournalModal';
import { MusicTrack } from './musicTypes';
import { Music, Clock, Smile, Sparkles, Disc } from 'lucide-react';
import { FeatureNavigation } from '../../components/common/FeatureNavigation';

interface MusicPageProps {
  onBackToHome: () => void;
}

export const MusicPage: React.FC<MusicPageProps> = ({ onBackToHome }) => {
  const [activeTab, setActiveTab] = useState<'library' | 'timeline' | 'moods' | 'assistant'>('library');
  const [connectingTrack, setConnectingTrack] = useState<MusicTrack | null>(null);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-28">
      <FeatureNavigation
        title="Music Memories & Soundscape"
        onBack={onBackToHome}
        onClose={onBackToHome}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-6 pb-32">
        {/* Sub-header Tabs & Badge */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl shadow-xl">
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20 text-xs font-bold">
              <Disc className="w-3.5 h-3.5" /> Soundtrack of Life
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('library')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'library'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>Library</span>
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'timeline'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Timeline</span>
            </button>
            <button
              onClick={() => setActiveTab('moods')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'moods'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smile className="w-3.5 h-3.5" />
              <span>Moods</span>
            </button>
            <button
              onClick={() => setActiveTab('assistant')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'assistant'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Gemini Curator</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'library' && (
          <MusicLibrary onConnectJournal={(track) => setConnectingTrack(track)} />
        )}
        {activeTab === 'timeline' && <MusicTimelineView />}
        {activeTab === 'moods' && <MusicMoodView />}
        {activeTab === 'assistant' && <GeminiMusicAssistant />}

        {connectingTrack && (
          <ConnectJournalModal
            track={connectingTrack}
            onClose={() => setConnectingTrack(null)}
          />
        )}
      </main>
    </div>
  );
};
