import React, { useState, useEffect, useMemo } from 'react';
import './dashboard.css';
import { useAuth } from '../../context/AuthContext';
import { selectMotivationalMessage } from '../motivation/motivationService';
import { MotivationalMessageOverlay } from '../motivation/MotivationalMessageOverlay';
import { MotivationalMessage } from '../motivation/motivationalMessages';

import { HomeTopBar } from './components/HomeTopBar';
import { WelcomeSection } from './components/WelcomeSection';
import { JournalCreateCard } from './components/JournalCreateCard';
import { JournalSearch } from './components/JournalSearch';
import { JournalCategories, JournalCategoryTab } from './components/JournalCategories';
import { JournalFilters } from './components/JournalFilters';
import { RecentJournals } from './components/RecentJournals';
import { MacDock, DockFeatureId } from './components/MacDock';

import { getJournalsForUser, createJournalForUser, deleteJournalForUser, toggleBookmarkJournal, updateJournalForUser } from '../journal/journalService';
import { getCalendarEventsForUser, createCalendarEvent } from '../calendar/calendarService';
import { getMoodHistory, saveMoodRecord } from '../mood/moodService';
import { addMusicItem } from '../../services/canonicalService';
import { JournalEntry, JournalPrivacyLevel, AppNotification } from '../../types';

// Import Feature Shells for Dock & Modal Navigation
import { LibraryShell } from '../library/LibraryShell';
import { MusicShell } from '../music/MusicShell';
import { MusicPage } from '../music/MusicPage';
import { MoodPage } from '../mood/MoodPage';
import { AssistantShell } from '../assistant/AssistantShell';
import { AskMyJournalShell } from '../ask-my-journal/AskMyJournalShell';
import { GoalsShell } from '../goals/GoalsShell';
import { GoalsPage } from '../goals/GoalsPage';
import { CalendarShell } from '../calendar/CalendarShell';
import { MemoriesShell } from '../memories/MemoriesShell';
import { MemoriesPage } from '../memories/MemoriesPage';
import { SettingsPage } from '../settings/SettingsPage';
import { NotificationsShell } from '../notifications/NotificationsShell';
import { LoginNotificationPreview } from '../notifications/LoginNotificationPreview';
import { getNotificationsForUser } from '../notifications/notificationService';
import { FeatureNavigation } from '../../components/common/FeatureNavigation';
import { PersistentTopPlayer } from '../music/components/PersistentTopPlayer';
import { NowPlayingModal } from '../music/components/NowPlayingModal';
import { MusicQueueDrawer } from '../music/components/MusicQueueDrawer';
import { ArrowLeft, X, Sparkles, KeyRound } from 'lucide-react';
import { getSettingsForUser, updateSettingsForUser, hashPin, UserSettings, DEFAULT_SETTINGS } from '../settings/settingsService';

interface DashboardShellProps {
  onLogout?: () => void;
}

export const DashboardShell: React.FC<DashboardShellProps> = ({ onLogout }) => {
  const { user, logout } = useAuth();
  const userDisplayName = user?.displayName || user?.email?.split('@')[0] || 'Explorer';
  const userUid = user?.uid || 'authenticated-user-uid';
  const [logoutMotivation, setLogoutMotivation] = useState<MotivationalMessage | null>(null);

  // Journal State
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [loadingJournals, setLoadingJournals] = useState<boolean>(true);

  // Notification State for Login Preview
  const [todayNotifications, setTodayNotifications] = useState<AppNotification[]>([]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<JournalCategoryTab>('All');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [favoritesOnly, setFavoritesOnly] = useState<boolean>(false);
  const [privateOnly, setPrivateOnly] = useState<boolean>(false);

  // Active Dock Feature Modal / View
  const [activeDockFeature, setActiveDockFeature] = useState<DockFeatureId | null>(null);
  const [navHistory, setNavHistory] = useState<DockFeatureId[]>([]);
  const [showNotificationsModal, setShowNotificationsModal] = useState<boolean>(false);
  // Compute if any modal, feature workspace, or editor is active to hide the bottom dock
  const [isJournalModalOpen, setIsJournalModalOpen] = useState<boolean>(false);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState<boolean>(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState<boolean>(false);

  // PIN & Settings States
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [showPinSetupModal, setShowPinSetupModal] = useState<boolean>(false);
  const [setupPinValue, setSetupPinValue] = useState<string>('');
  const [setupPinConfirm, setSetupPinConfirm] = useState<string>('');
  const [setupPinError, setSetupPinError] = useState<string>('');
  const [setupPinSuccess, setSetupPinSuccess] = useState<string>('');
  const [assistantQuery, setAssistantQuery] = useState<string>('');

  const reloadSettings = async () => {
    if (userUid && userUid !== 'authenticated-user-uid') {
      const fresh = await getSettingsForUser(userUid);
      setUserSettings(fresh);
    }
  };

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupPinError('');
    setSetupPinSuccess('');

    if (!setupPinValue) {
      setSetupPinError('Please enter a PIN.');
      return;
    }

    if (setupPinValue.length < 4) {
      setSetupPinError('PIN must be at least 4 digits.');
      return;
    }

    if (setupPinValue !== setupPinConfirm) {
      setSetupPinError('PINs do not match.');
      return;
    }

    try {
      const hashed = await hashPin(setupPinValue);
      await updateSettingsForUser(userUid, {
        security: {
          pinHash: hashed,
          pinLocked: false,
        }
      });
      setSetupPinSuccess('PIN successfully set! You can now use it for private journals.');
      setSetupPinValue('');
      setSetupPinConfirm('');
      setTimeout(() => {
        setShowPinSetupModal(false);
        setSetupPinSuccess('');
        reloadSettings();
      }, 2000);
    } catch (err) {
      setSetupPinError('Failed to save PIN. Please try again.');
    }
  };

  // Settings loading
  useEffect(() => {
    if (userUid && userUid !== 'authenticated-user-uid') {
      getSettingsForUser(userUid).then(setUserSettings);
    }
  }, [userUid]);

  // Navigation helpers that maintain step-by-step history
  const navigateToFeature = (featureId: DockFeatureId | null) => {
    if (featureId === null) {
      setNavHistory([]);
      setActiveDockFeature(null);
    } else {
      if (activeDockFeature && activeDockFeature !== featureId) {
        setNavHistory((prev) => [...prev, activeDockFeature]);
      }
      setActiveDockFeature(featureId);
    }
  };

  const goBackOneStep = () => {
    if (navHistory.length > 0) {
      const prev = navHistory[navHistory.length - 1];
      setNavHistory((prevList) => prevList.slice(0, -1));
      setActiveDockFeature(prev);
    } else {
      setActiveDockFeature(null);
    }
  };

  const closeToHome = () => {
    setNavHistory([]);
    setActiveDockFeature(null);
  };

  // Compute if any modal, feature workspace, or editor is active to hide the bottom dock
  const isAnyOverlayActive = Boolean(
    activeDockFeature ||
    showNotificationsModal ||
    isJournalModalOpen ||
    isMemoryModalOpen ||
    isGoalModalOpen
  );

  // Load User Journals & Today's Notifications on Mount
  useEffect(() => {
    let isMounted = true;

    async function loadUserData() {
      if (!userUid) return;
      try {
        setLoadingJournals(true);
        const [fetchedJournals, fetchedNotifs] = await Promise.all([
          getJournalsForUser(userUid),
          getNotificationsForUser(userUid),
        ]);

        if (isMounted) {
          setJournals(fetchedJournals);
          setTodayNotifications(fetchedNotifs);
        }
      } catch (err) {
        console.warn('[DashboardShell] Error loading user data:', err);
      } finally {
        if (isMounted) {
          setLoadingJournals(false);
        }
      }
    }

    loadUserData();
    return () => {
      isMounted = false;
    };
  }, [userUid]);

  // Handle Journal Entry Creation
  const handleCreateEntry = async (entryData: {
    title: string;
    content: string;
    category: JournalEntry['category'];
    privacy: JournalPrivacyLevel;
    tags: string[];
  }) => {
    const created = await createJournalForUser(userUid, entryData);
    setJournals((prev) => [created, ...prev.filter((j) => j.id !== created.id)]);
  };

  // Handle Journal Entry Deletion
  const handleDeleteJournal = async (id: string) => {
    await deleteJournalForUser(userUid, id);
    setJournals((prev) => prev.filter((j) => j.id !== id));
  };

  // Handle Journal Bookmark Toggle
  const handleToggleBookmark = async (id: string) => {
    const nextState = await toggleBookmarkJournal(userUid, id);
    setJournals((prev) =>
      prev.map((j) => (j.id === id ? { ...j, isBookmarked: nextState } : j))
    );
  };

  // Handle Journal Entry Update
  const handleUpdateJournal = async (id: string, updates: Partial<JournalEntry>) => {
    const updated = await updateJournalForUser(userUid, id, updates);
    setJournals((prev) => prev.map((j) => (j.id === id ? updated : j)));
  };

  // Handle Logout with Motivation Overlay
  const handleSignOut = async () => {
    try {
      const msg = await selectMotivationalMessage(userUid, 'logout');
      setLogoutMotivation(msg);
    } catch (err) {
      console.warn('Motivation selection error on signout, proceeding to logout:', err);
      try {
        await logout();
      } catch (e) {
        console.error('Logout error:', e);
      }
      if (onLogout) onLogout();
    }
  };

  // Filtered and Sorted Journals List
  const filteredJournals = useMemo(() => {
    return journals
      .filter((j) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = j.title?.toLowerCase().includes(q);
          const matchContent = j.content?.toLowerCase().includes(q);
          const matchTags = j.tags?.some((t) => t.toLowerCase().includes(q));
          if (!matchTitle && !matchContent && !matchTags) return false;
        }

        if (favoritesOnly && !j.isBookmarked) {
          return false;
        }

        if (selectedCategory !== 'All') {
          const cat = (j.category || '').toLowerCase();
          const isPrivate = j.privacy === 'private' || j.privacy === 'pin_locked' || j.isPinLocked;
          if (selectedCategory === 'Personal') {
            if (!cat.includes('reflection') && !cat.includes('personal')) return false;
          } else if (selectedCategory === 'Goals') {
            if (!cat.includes('goal') && !cat.includes('gratitude')) return false;
          } else if (selectedCategory === 'Ideas') {
            if (!cat.includes('idea')) return false;
          } else if (selectedCategory === 'Memories') {
            if (!cat.includes('memory')) return false;
          } else if (selectedCategory === 'Private') {
            if (!isPrivate) return false;
          }
        }

        if (privateOnly) {
          if (j.privacy !== 'private' && j.privacy !== 'pin_locked' && !j.isPinLocked) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
      });
  }, [journals, searchQuery, selectedCategory, favoritesOnly, privateOnly, sortOrder]);

  // Compute Category Counts
  const categoryCounts = useMemo(() => {
    const counts: Record<JournalCategoryTab, number> = {
      All: journals.length,
      Personal: 0,
      Goals: 0,
      Ideas: 0,
      Memories: 0,
      Private: 0,
    };

    journals.forEach((j) => {
      const cat = (j.category || '').toLowerCase();
      if (cat.includes('reflection') || cat.includes('personal')) counts.Personal++;
      if (cat.includes('goal') || cat.includes('gratitude')) counts.Goals++;
      if (cat.includes('idea')) counts.Ideas++;
      if (cat.includes('memory')) counts.Memories++;
      if (j.privacy === 'private' || j.privacy === 'pin_locked' || j.isPinLocked) counts.Private++;
    });

    return counts;
  }, [journals]);

  return (
    <div
      id="dashboard-shell-root"
      className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white pt-16 pb-32 relative overflow-x-hidden dashboard-grid-pattern"
    >
      {/* Login Notification Preview Toast */}
      {todayNotifications.length > 0 && (
        <LoginNotificationPreview
          notifications={todayNotifications}
          userDisplayName={userDisplayName}
          onOpenNotifications={() => setShowNotificationsModal(true)}
          onOpenCalendar={() => setActiveDockFeature('calendar')}
        />
      )}

      {/* Background Ambient Glowing Orbs */}
      <div className="fixed top-1/4 -left-32 w-96 h-96 rounded-full bg-indigo-600/15 blur-3xl pointer-events-none dashboard-ambient-orb-1"></div>
      <div className="fixed bottom-1/3 -right-32 w-96 h-96 rounded-full bg-purple-600/15 blur-3xl pointer-events-none dashboard-ambient-orb-2"></div>

      {/* Top Glass Navigation Bar (rendered when not on full page view) */}
      {activeDockFeature !== 'memories' && activeDockFeature !== 'goals' && activeDockFeature !== 'calendar' && (
        <HomeTopBar
          userDisplayName={userDisplayName}
          userEmail={user?.email}
          userUid={userUid}
          onOpenNotifications={() => setShowNotificationsModal(true)}
          onSignOut={handleSignOut}
        />
      )}

      {/* Main Home Workspace Content or Dedicated Full-Page Routes */}
      {activeDockFeature === 'mood' ? (
        <MoodPage 
          onBackToHome={closeToHome} 
          journals={journals} 
        />
      ) : activeDockFeature === 'memories' ? (
        <MemoriesPage
          onBackToHome={closeToHome}
          onNavigateToJournal={(jId) => {
            closeToHome();
            setSearchQuery('');
          }}
          onNavigateToGoal={(gId) => {
            navigateToFeature('goals');
          }}
          onModalStateChange={setIsMemoryModalOpen}
        />
      ) : activeDockFeature === 'goals' ? (
        <GoalsPage
          onBackToHome={closeToHome}
          onNavigateToJournal={(jId) => {
            closeToHome();
            setSearchQuery('');
          }}
          onNavigateToMemory={(mId) => {
            navigateToFeature('memories');
          }}
          onModalStateChange={setIsGoalModalOpen}
        />
      ) : activeDockFeature === 'calendar' ? (
        <CalendarShell
          uid={userUid}
          onBackToHome={closeToHome}
          onNavigateToGoal={(gId) => navigateToFeature('goals')}
        />
      ) : activeDockFeature === 'settings' ? (
        <SettingsPage onBackToHome={closeToHome} onLogout={handleSignOut} />
      ) : activeDockFeature === 'assistant' ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 relative z-10 h-[calc(100vh-140px)] flex flex-col">
          <AskMyJournalShell
            uid={userUid}
            onNavigateHome={closeToHome}
            initialQuery={assistantQuery}
          />
        </div>
      ) : activeDockFeature === 'books' ? (
        <div className="w-full min-h-screen pb-24">
          <FeatureNavigation
            title="Digital Library & Reading Logs"
            onBack={goBackOneStep}
            onClose={closeToHome}
          />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 relative z-10">
            <LibraryShell />
          </div>
        </div>
      ) : activeDockFeature === 'music' ? (
        <MusicPage onBackToHome={closeToHome} />
      ) : (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-8 relative z-10">
          {/* Welcome Section */}
          <WelcomeSection userDisplayName={userDisplayName} userUid={userUid} />

          {/* Primary Journal Creation Surface (Center Stage) */}
          <JournalCreateCard
            onCreateEntry={handleCreateEntry}
            hasPin={Boolean(userSettings?.security?.pinHash)}
            onPromptSetPin={() => setShowPinSetupModal(true)}
          />

          {/* Journal Discovery Section (Search, Filters & Categories) */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <h2 className="text-xl font-extrabold text-white font-display tracking-tight flex items-center gap-2">
                <span>My Memory Log</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                  {filteredJournals.length} {filteredJournals.length === 1 ? 'entry' : 'entries'}
                </span>
              </h2>

              {/* Quick Filters */}
              <JournalFilters
                sortOrder={sortOrder}
                onSortChange={setSortOrder}
                favoritesOnly={favoritesOnly}
                onToggleFavorites={() => setFavoritesOnly(!favoritesOnly)}
                privateOnly={privateOnly}
                onTogglePrivate={() => setPrivateOnly(!privateOnly)}
              />
            </div>

            {/* Search Bar & Categories Navigation */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
              <JournalSearch searchQuery={searchQuery} onSearchChange={setSearchQuery} />
              <JournalCategories
                activeCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                counts={categoryCounts}
              />
            </div>

            {/* Previous / Recent Journals Display Grid */}
            <RecentJournals
              journals={filteredJournals}
              loading={loadingJournals}
              onDeleteJournal={handleDeleteJournal}
              onToggleBookmark={handleToggleBookmark}
              onUpdateJournal={handleUpdateJournal}
              onModalStateChange={setIsJournalModalOpen}
              onCreateFirstEntryClick={() => {
                window.scrollTo({ top: 200, behavior: 'smooth' });
              }}
              hasPin={Boolean(userSettings?.security?.pinHash)}
              onPromptSetPin={() => setShowPinSetupModal(true)}
              userSettings={userSettings}
            />
          </div>
        </main>
      )}

      {/* Top Floating Unified Navigation Controller Bar for Feature Views */}
      {activeDockFeature && (
        <div className="fixed top-4 left-4 sm:left-6 z-[100] flex items-center gap-2.5 p-2 rounded-full bg-slate-950/90 border border-indigo-500/30 shadow-2xl backdrop-blur-2xl animate-fadeIn pointer-events-auto max-w-[90vw]">
          {/* Back Button (Previous State Step) */}
          <button
            onClick={goBackOneStep}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full hover:bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:border-indigo-500/40 transition-all text-xs font-bold cursor-pointer group shadow-inner"
            title="Go back to previous feature state"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-indigo-400 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back</span>
          </button>

          <span className="w-[1px] h-4.5 bg-slate-800" />

          {/* Current Active Context Label */}
          <span className="px-1 text-[11px] font-extrabold text-slate-400 uppercase tracking-widest select-none capitalize">
            {activeDockFeature === 'assistant' ? 'Ask My Journal' : activeDockFeature}
          </span>
        </div>
      )}

      {/* Bottom Floating macOS-Inspired Dock */}
      <MacDock
        activeFeature={activeDockFeature || 'home'}
        onSelectFeature={(featureId) => {
          if (featureId === 'home') {
            navigateToFeature(null);
          } else if (activeDockFeature === featureId) {
            navigateToFeature(null);
          } else {
            navigateToFeature(featureId);
          }
        }}
        hidden={isAnyOverlayActive}
      />

      {/* Persistent Bottom Music Player */}
      <PersistentTopPlayer />
      
      {/* Music Feature Modals */}
      <NowPlayingModal />
      <MusicQueueDrawer />


      {/* Notifications & Reminders Modal */}
      {showNotificationsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-fadeIn">
          <div className="max-w-2xl w-full p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-5 relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white font-display">Notifications & Reminders</h3>
              <button
                onClick={() => setShowNotificationsModal(false)}
                className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <NotificationsShell
              uid={userUid}
              onNavigateToSource={(sourceType) => {
                setShowNotificationsModal(false);
                if (sourceType === 'calendar' || sourceType === 'task') {
                  setActiveDockFeature('calendar');
                } else if (sourceType === 'goal') {
                  setActiveDockFeature('goals');
                } else if (sourceType === 'memory') {
                  setActiveDockFeature('memories');
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Set Master PIN Modal */}
      {showPinSetupModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-fadeIn">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-slate-900 border border-rose-500/30 shadow-2xl space-y-6 relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-display">Configure Master PIN</h3>
                  <p className="text-[10px] text-rose-400 font-medium font-mono uppercase tracking-wider">Required for Private Journals</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPinSetupModal(false);
                  setSetupPinValue('');
                  setSetupPinConfirm('');
                  setSetupPinError('');
                  setSetupPinSuccess('');
                }}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              All your private journals will be guarded and hidden behind this single PIN. If you close a private journal, it will automatically lock itself.
            </p>

            <form onSubmit={handleSavePin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  New Master PIN (at least 4 digits)
                </label>
                <input
                  type="password"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  maxLength={12}
                  value={setupPinValue}
                  onChange={(e) => setSetupPinValue(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-rose-500 font-mono text-center text-lg tracking-widest"
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Confirm Master PIN
                </label>
                <input
                  type="password"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  maxLength={12}
                  value={setupPinConfirm}
                  onChange={(e) => setSetupPinConfirm(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-rose-500 font-mono text-center text-lg tracking-widest"
                />
              </div>

              {setupPinError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 font-medium">
                  ⚠️ {setupPinError}
                </div>
              )}

              {setupPinSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-medium">
                  ✓ {setupPinSuccess}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPinSetupModal(false);
                    setSetupPinValue('');
                    setSetupPinConfirm('');
                    setSetupPinError('');
                    setSetupPinSuccess('');
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-900/20 transition-all cursor-pointer"
                >
                  Save Master PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Motivational Overlay on Logout (Preserved 100%) */}
      {logoutMotivation && (
        <MotivationalMessageOverlay
          message={logoutMotivation}
          mode="logout"
          onComplete={async () => {
            try {
              await logout();
            } catch (err) {
              console.error('Logout error:', err);
            } finally {
              setLogoutMotivation(null);
              if (onLogout) onLogout();
            }
          }}
        />
      )}
    </div>
  );
};
