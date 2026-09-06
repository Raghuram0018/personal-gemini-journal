import React, { useState } from 'react';
import './landing.css';
import { MemoryCore3D } from './MemoryCore3D';
import { DragToStartCTA } from './DragToStartCTA';
import { AskMyJournalDemo } from './AskMyJournalDemo';
import { ConnectedLifeFlow } from './ConnectedLifeFlow';
import {
  BookMarked,
  Sparkles,
  Compass,
  Target,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Menu,
  X,
  Lock,
  User,
  Heart,
  Brain,
  Layers,
} from 'lucide-react';

interface LandingShellProps {
  onStartAuth?: () => void;
}

export const LandingShell: React.FC<LandingShellProps> = ({ onStartAuth }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleLaunchAuth = () => {
    if (onStartAuth) {
      onStartAuth();
    } else {
      setShowAuthModal(true);
    }
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div id="landing-shell-root" className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* 1. HERO NAVIGATION HEADER */}
      <header className="sticky top-0 z-50 backdrop-blur-2xl bg-slate-950/80 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <BookMarked className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-white font-display uppercase">
                  Personal Gemini Journal
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono tracking-wider">AI Memory Ecosystem</p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-300">
            <button
              onClick={() => scrollToSection('product-story')}
              className="hover:text-indigo-400 transition-colors cursor-pointer"
            >
              Explore
            </button>
            <button
              onClick={() => scrollToSection('ask-my-journal-demo')}
              className="hover:text-purple-400 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              Ask My Journal
            </button>
            <button
              onClick={() => scrollToSection('connected-life')}
              className="hover:text-cyan-400 transition-colors cursor-pointer"
            >
              Connected Life
            </button>
          </nav>

          {/* Action CTAs - Directly visible in top corner on all devices */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleLaunchAuth}
              className="hidden sm:block px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all cursor-pointer"
            >
              Sign in
            </button>
            <button
              onClick={handleLaunchAuth}
              className="px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white transition-all shadow-lg shadow-indigo-600/25 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <span>Begin your journey</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Mobile Hamburger Toggle */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg bg-slate-900 text-slate-300 border border-slate-800 cursor-pointer"
                aria-label="Toggle Navigation Menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-800 bg-slate-950 p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
            <button
              onClick={() => scrollToSection('product-story')}
              className="w-full text-left py-2 px-3 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-900"
            >
              Explore Features
            </button>
            <button
              onClick={() => scrollToSection('ask-my-journal-demo')}
              className="w-full text-left py-2 px-3 rounded-lg text-sm font-medium text-purple-300 hover:bg-slate-900 flex items-center justify-between"
            >
              <span>Ask My Journal</span>
              <Sparkles className="w-4 h-4 text-purple-400" />
            </button>
            <button
              onClick={() => scrollToSection('connected-life')}
              className="w-full text-left py-2 px-3 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-900"
            >
              Connected Life Flow
            </button>
            <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-2">
              <button
                onClick={handleLaunchAuth}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white text-center shadow-lg shadow-indigo-600/20"
              >
                Begin your journey &rarr;
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 2. HERO SECTION WITH 3D SPATIAL MEMORY CORE */}
      <section className="relative pt-10 pb-16 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          {/* Main Hero Header Text */}
          <div className="text-center max-w-3xl mx-auto space-y-4 landing-fade-in">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-950/60 text-indigo-300 border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
              <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
              <span>Grounded Personal AI Memory System</span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white font-display leading-[1.1]">
              Your life.{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400">
                Remembered intelligently.
              </span>
            </h1>

            <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed font-sans">
              Write what matters. Understand where you've been. Discover where you're going.
            </p>
          </div>

          {/* 3D Spatial Memory Core Canvas Component */}
          <div className="relative">
            <MemoryCore3D
              onBeginJourney={handleLaunchAuth}
              onNodeSelect={(nodeId) => console.log('Selected node:', nodeId)}
            />
          </div>

          {/* Interactive Draggable Launch CTA */}
          <div className="pt-4">
            <DragToStartCTA onComplete={handleLaunchAuth} label="Begin your journey" />
          </div>
        </div>
      </section>

      {/* 3. PRODUCT STORY SECTION ("Everything you remember. Connected.") */}
      <section id="product-story" className="py-20 relative border-t border-slate-800/60 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-mono uppercase tracking-widest text-indigo-400 font-semibold px-3 py-1 rounded-full bg-indigo-950/60 border border-indigo-800/40">
              Product Story
            </span>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white font-display">
              Everything you remember. Connected.
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Three core pillars that turn scattered reflections into a meaningful personal history.
            </p>
          </div>

          {/* 3 Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pillar 1: Reflect */}
            <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-indigo-500/40 transition-all duration-300 hover:bg-slate-900/80 group">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BookMarked className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white font-display mb-2">Reflect</h3>
              <p className="text-slate-300 text-sm leading-relaxed mb-4">
                Your journal becomes a safe, PIN-guarded space to understand your thoughts via rich text, image attachments, and deep personal context.
              </p>
              <div className="flex items-center gap-1 text-xs text-indigo-400 font-semibold">
                <span>Voice & Text Capture</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            {/* Pillar 2: Discover */}
            <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-purple-500/40 transition-all duration-300 hover:bg-slate-900/80 group">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white font-display mb-2">Discover</h3>
              <p className="text-slate-300 text-sm leading-relaxed mb-4">
                Gemini finds meaningful emotional patterns across your personal history without ever overriding system rules or leaking cross-user data.
              </p>
              <div className="flex items-center gap-1 text-xs text-purple-400 font-semibold">
                <span>Grounded AI Analysis</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            {/* Pillar 3: Grow */}
            <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-pink-500/40 transition-all duration-300 hover:bg-slate-900/80 group">
              <div className="w-12 h-12 rounded-2xl bg-pink-500/10 text-pink-400 border border-pink-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Target className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white font-display mb-2">Grow</h3>
              <p className="text-slate-300 text-sm leading-relaxed mb-4">
                Turn intentions into visual goal milestone maps, tracking timestamped progress, reading logs, and mood correlations over time.
              </p>
              <div className="flex items-center gap-1 text-xs text-pink-400 font-semibold">
                <span>Milestones & Timeline</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. ASK MY JOURNAL DEMONSTRATION SECTION */}
      <AskMyJournalDemo />

      {/* 5. CONNECTED LIFE FLOW SECTION */}
      <ConnectedLifeFlow />

      {/* 6. FINAL CINEMATIC CALL TO ACTION */}
      <section className="py-24 relative overflow-hidden border-t border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-indigo-950/20 to-slate-950 pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-4 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-4 h-4" />
            <span>Authenticated Firebase UID Isolation & Security Active</span>
          </div>

          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white font-display">
            Your story is already being written.{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
              Start remembering it.
            </span>
          </h2>

          <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto">
            Experience a secure, grounded personal memory system built for the Google Cloud Run Challenge.
          </p>

          <div className="pt-4 max-w-md mx-auto">
            <button
              onClick={handleLaunchAuth}
              className="w-full py-4 px-8 rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm tracking-wide shadow-2xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer transform hover:scale-105"
            >
              <span>Begin your journey</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 7. MINIMALIST FOOTER */}
      <footer className="py-8 border-t border-slate-900 bg-slate-950 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs font-display">
              G
            </div>
            <span className="font-semibold text-slate-300">Personal Gemini Journal</span>
            <span className="text-slate-400">|</span>
            <span>Google Cloud Run Social Challenge</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400">
            <span>Label: dev-tutorial=cloud-run-ai-challenge</span>
            <span>v1.0.0</span>
          </div>
        </div>
      </footer>

      {/* AUTH MODAL DIALOG FALLBACK */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-5">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-display">Firebase Authentication</h3>
                <p className="text-xs text-slate-400">UID-isolated secure personal storage</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span>Isolated Boundary: /users/&#123;uid&#125;/*</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Authentication initializes your private Firestore memory store. No custom password databases or client-provided UIDs are used.
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => {
                  setShowAuthModal(false);
                  alert('Firebase Authentication initialized! In the next stages, full OAuth/Email auth flow will sign in the active user session.');
                }}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer"
              >
                <User className="w-4 h-4" />
                <span>Sign In with Firebase Auth</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
