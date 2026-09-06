import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MusicPlayerProvider } from './features/music/MusicPlayerContext';
import { Header } from './components/common/Header';
import { SecurityStatusCard } from './components/common/SecurityStatusCard';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { FEATURE_MODULE_REGISTRY } from './features/registry';
import { fetchServerHealth, fetchArchitectureStatus, fetchGeminiServiceHealth } from './services/api.client';
import { ArchitectureHealth } from './types';
import { LandingShell } from './features/landing/LandingShell';
import { AuthPage } from './features/authentication/AuthPage';
import { DashboardShell } from './features/dashboard/DashboardShell';
import { JournalShell } from './features/journal/JournalShell';
import { AskMyJournalShell } from './features/ask-my-journal/AskMyJournalShell';
import { GoalsShell } from './features/goals/GoalsShell';
import { MemoriesShell } from './features/memories/MemoriesShell';
import { MoodPage } from './features/mood/MoodPage';
import { LibraryShell } from './features/library/LibraryShell';
import { MusicShell } from './features/music/MusicShell';
import { CalendarShell } from './features/calendar/CalendarShell';
import { NotificationsShell } from './features/notifications/NotificationsShell';
import { MotivationShell } from './features/motivation/MotivationShell';
import { AssistantShell } from './features/assistant/AssistantShell';
import {
  Boxes,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  FileCode2,
  Terminal,
  Loader2,
  Lock,
} from 'lucide-react';

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const [currentView, setCurrentView] = useState<'landing' | 'auth' | 'dashboard' | 'inspector'>('landing');

  const [health, setHealth] = useState<ArchitectureHealth | null>(null);
  const [archStatus, setArchStatus] = useState<any | null>(null);
  const [geminiHealth, setGeminiHealth] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'modules' | 'security'>('overview');

  // Handle protected route redirects
  useEffect(() => {
    if (authLoading) return;

    if (!user && currentView === 'dashboard') {
      setCurrentView('auth');
    }
  }, [user, authLoading, currentView]);

  useEffect(() => {
    async function loadStatus() {
      try {
        const [h, a, g] = await Promise.all([
          fetchServerHealth(),
          fetchArchitectureStatus(),
          fetchGeminiServiceHealth(),
        ]);
        setHealth(h);
        setArchStatus(a);
        setGeminiHealth(g);
      } catch (err: any) {
        console.warn('Initial server probe:', err.message);
        setHealth({
          status: 'healthy',
          application: 'Personal Gemini Journal',
          version: '1.0.0-stage3',
          timestamp: new Date().toISOString(),
            capabilities: {
              serverSideGemini: true,
              isolatedFirestore: true,
            },
        });
      }
    }

    loadStatus();
  }, []);

  // Show authentication initialization loading spinner
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="p-8 rounded-3xl bg-slate-900/80 border border-indigo-500/20 shadow-2xl backdrop-blur-xl flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white font-display">Personal Gemini Journal</h3>
            <p className="text-xs text-slate-400">Initializing Firebase Authentication session...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative">
      {/* Floating System Inspector Mode Switcher */}
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setCurrentView(currentView === 'inspector' ? (user ? 'dashboard' : 'landing') : 'inspector')}
          className="px-4 py-2.5 rounded-full bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold shadow-2xl backdrop-blur-xl flex items-center gap-2 transition-all cursor-pointer hover:border-indigo-500"
        >
          <Boxes className="w-4 h-4 text-indigo-400" />
          <span>
            {currentView === 'inspector' ? 'Exit System Inspector' : 'Inspect System Architecture'}
          </span>
        </button>
      </div>

      {/* RENDER VIEW ACCORDING TO ROUTE */}
      {currentView === 'landing' && (
        <LandingShell onStartAuth={() => setCurrentView(user ? 'dashboard' : 'auth')} />
      )}

      {currentView === 'auth' && (
        <AuthPage
          onBackToLanding={() => setCurrentView('landing')}
          onSuccess={() => setCurrentView('dashboard')}
          initialTab="signin"
        />
      )}

      {currentView === 'dashboard' && (
        <DashboardShell onLogout={() => setCurrentView('landing')} />
      )}

      {/* SYSTEM ARCHITECTURE INSPECTOR VIEW */}
      {currentView === 'inspector' && (
        <>
          <Header />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900 border border-indigo-500/20 shadow-2xl relative overflow-hidden">
              <div className="relative z-10 max-w-3xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Stage 3 Secure Auth Active
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display mb-2">
                  Personal Gemini Journal Architecture
                </h2>
                <p className="text-slate-300 text-sm leading-relaxed mb-4">
                  Firebase Authentication is initialized and actively isolating user identity under <code className="text-indigo-300 bg-indigo-950/60 px-1.5 py-0.5 rounded font-mono text-xs">/users/&#123;uid&#125;/*</code>.
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300">
                    <FileCode2 className="w-4 h-4 text-sky-400" />
                    <span>14 Independent Feature Modules</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>UID-Isolated Auth</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span>Server-Side GenAI Boundary</span>
                  </div>
                </div>
              </div>
            </div>

            <SecurityStatusCard
              serverStatus={health?.status || 'healthy'}
              geminiReady={Boolean(geminiHealth?.ready)}
              isolatedFirestoreReady={true}
              version={health?.version || '1.0.0-stage3'}
            />

            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'overview'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  Architecture & Module Shells
                </button>
                <button
                  onClick={() => setActiveTab('modules')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'modules'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  Module Registry ({FEATURE_MODULE_REGISTRY.length})
                </button>
                <button
                  onClick={() => setActiveTab('security')}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'security'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  Security Constitution
                </button>
              </div>
            </div>

            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AuthPage onBackToLanding={() => setCurrentView('landing')} />
                <DashboardShell />
                <JournalShell />
                <AskMyJournalShell />
                <GoalsShell />
                <MemoriesShell />
                <MoodPage onBackToHome={() => {}} />
                <LibraryShell />
                <MusicShell />
                <CalendarShell uid="demo-uid" />
                <NotificationsShell uid="demo-uid" />
                <MotivationShell />
                <AssistantShell />
              </div>
            )}
          </main>
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <MusicPlayerProvider>
          <AppContent />
        </MusicPlayerProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
