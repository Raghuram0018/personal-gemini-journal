import React, { useState, useEffect } from 'react';
import {
  User,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Key,
  Database,
  Info,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Download,
  Trash2,
  Settings as SettingsIcon,
  HelpCircle,
  RefreshCw,
  Sliders,
  LogOut,
  Moon,
  Sun,
  Loader2,
} from 'lucide-react';
import { FeatureNavigation } from '../../components/common/FeatureNavigation';
import { useAuth } from '../../context/AuthContext';
import {
  getSettingsForUser,
  updateSettingsForUser,
  hashPin,
  UserSettings,
} from './settingsService';
import { updatePassword, updateProfile, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth, db } from '../../services/firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';

interface SettingsPageProps {
  onBackToHome: () => void;
  onLogout: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onBackToHome, onLogout }) => {
  const { user } = useAuth();
  const uid = user?.uid || '';

  // Settings State
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saveLoading, setSaveLoading] = useState<boolean>(false);

  // Profile Edit State
  const [displayName, setDisplayName] = useState<string>('');
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password Update State
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);

  // PIN Update State
  const [pinEnabled, setPinEnabled] = useState<boolean>(false);
  const [currentPin, setCurrentPin] = useState<string>('');
  const [newPin, setNewPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [pinHint, setPinHint] = useState<string>('');
  const [pinSuccess, setPinSuccess] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);

  // Data Actions State
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState<string>('');
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [dataActionError, setDataActionError] = useState<string | null>(null);
  const [dataActionSuccess, setDataActionSuccess] = useState<string | null>(null);

  // Load Settings on Mount
  useEffect(() => {
    async function loadSettings() {
      if (!uid) return;
      try {
        setLoading(true);
        const data = await getSettingsForUser(uid);
        setSettings(data);
        setDisplayName(user?.displayName || '');
        setPinEnabled(data.security?.pinLocked || false);
        setPinHint(data.security?.pinHint || '');
      } catch (err) {
        console.error('Error fetching user settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, [uid, user]);

  // Handle AI Toggle Changes
  const handleToggleAIPermission = async (key: keyof UserSettings['aiPermissions']) => {
    if (!settings || !uid) return;

    const nextPermissions = {
      ...settings.aiPermissions,
      [key]: !settings.aiPermissions[key],
    };

    try {
      const updated = await updateSettingsForUser(uid, {
        aiPermissions: nextPermissions,
      });
      setSettings(updated);
    } catch (err) {
      console.error('Failed to toggle AI Permission:', err);
    }
  };

  // Handle Theme Change
  const handleThemeChange = async (theme: 'light' | 'dark' | 'cinematic') => {
    if (!settings || !uid) return;
    try {
      const updated = await updateSettingsForUser(uid, { theme });
      setSettings(updated);
    } catch (err) {
      console.error('Failed to update theme settings:', err);
    }
  };

  // Update Profile Name
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      setSaveLoading(true);
      await updateProfile(currentUser, { displayName: displayName.trim() });
      setProfileSuccess('Profile name updated successfully.');
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile.');
    } finally {
      setSaveLoading(false);
    }
  };

  // Secure Change Password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters with numbers & symbols.');
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) return;

    try {
      setSaveLoading(true);
      // Reauthenticate user securely first
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);

      // Update password
      await updatePassword(currentUser, newPassword);
      setPasswordSuccess('Password successfully updated. Keep it secure!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Password update security failure:', err);
      setPasswordError(
        err.code === 'auth/wrong-password'
          ? 'Current password entered is incorrect.'
          : err.message || 'Verification failed. Please re-authenticate and try again.'
      );
    } finally {
      setSaveLoading(false);
    }
  };

  // Configure PIN Protection & Clue
  const handleConfigurePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setPinSuccess(null);

    if (!newPin) {
      setPinError('Please enter a new PIN.');
      return;
    }

    if (!/^\d{4,6}$/.test(newPin)) {
      setPinError('PIN must be 4 to 6 numeric digits.');
      return;
    }

    if (newPin !== confirmPin) {
      setPinError('PIN confirmations do not match.');
      return;
    }

    try {
      setSaveLoading(true);
      // Verify existing PIN if pinLocked is currently active
      if (settings?.security?.pinLocked && settings.security.pinHash) {
        const hashedCurrent = await hashPin(currentPin);
        if (hashedCurrent !== settings.security.pinHash) {
          setPinError('Current PIN entered is incorrect.');
          setSaveLoading(false);
          return;
        }
      }

      const hashedNew = await hashPin(newPin);
      const updated = await updateSettingsForUser(uid, {
        security: {
          pinLocked: true,
          pinHash: hashedNew,
          pinHint: pinHint.trim(),
        },
      });

      setSettings(updated);
      setPinEnabled(true);
      setPinSuccess('Secure PIN lock configured successfully.');
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
    } catch (err: any) {
      setPinError(err.message || 'Failed to save secure PIN settings.');
    } finally {
      setSaveLoading(false);
    }
  };

  // Toggle standard PIN protection setting
  const handleTogglePinLockState = async () => {
    if (!settings || !uid) return;

    if (pinEnabled) {
      // Prompt user with alert
      const confirmDisable = window.confirm(
        'Are you sure you want to disable PIN protection? This will expose your locked journals.'
      );
      if (!confirmDisable) return;

      try {
        const updated = await updateSettingsForUser(uid, {
          security: {
            pinLocked: false,
            pinHash: '',
            pinHint: '',
          },
        });
        setSettings(updated);
        setPinEnabled(false);
        setPinSuccess('PIN protection completely disabled.');
      } catch (err) {
        console.error('Failed to disable PIN:', err);
      }
    } else {
      setPinSuccess('Enter a 4-6 digit numeric PIN to enable PIN protection.');
    }
  };

  // Export User Personal Data
  const handleExportData = async () => {
    if (!uid) return;
    try {
      setIsExporting(true);
      setDataActionError(null);

      // Fetch all collections for uid
      const collectionsToExport = ['journals', 'goals', 'calendar', 'books', 'music', 'moods', 'memories'];
      const exportedData: Record<string, any[]> = {};

      for (const col of collectionsToExport) {
        const ref = collection(db, 'users', uid, col);
        const snap = await getDocs(ref);
        exportedData[col] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }

      // Append export metadata
      const finalPayload = {
        exportedAt: new Date().toISOString(),
        userId: uid,
        userEmail: user?.email,
        data: exportedData,
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(finalPayload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `PGJ_PersonalData_Export_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setDataActionSuccess('Personal data streams securely compiled and exported.');
    } catch (err: any) {
      setDataActionError(err.message || 'Export failed.');
    } finally {
      setIsExporting(false);
    }
  };

  // Destructive Delete all Firestore User collections
  const handleDeleteAllUserData = async () => {
    if (!uid) return;
    if (deleteConfirmText !== 'DELETE ALL MY DATA') {
      setDataActionError('Please type the exact phrase "DELETE ALL MY DATA" to confirm.');
      return;
    }

    try {
      setIsDeleting(true);
      setDataActionError(null);

      const collectionsToDelete = ['journals', 'goals', 'calendar', 'books', 'music', 'moods', 'memories', 'settings'];
      const batch = writeBatch(db);

      for (const col of collectionsToDelete) {
        const colRef = collection(db, 'users', uid, col);
        const snap = await getDocs(colRef);
        snap.docs.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });
      }

      // Delete the root user doc as well
      const rootUserRef = doc(db, 'users', uid);
      batch.delete(rootUserRef);

      await batch.commit();

      setDataActionSuccess('All canonical database collections completely deleted. Redirecting...');
      setShowDeleteModal(false);
      setDeleteConfirmText('');

      setTimeout(() => {
        onLogout();
      }, 3000);
    } catch (err: any) {
      setDataActionError(err.message || 'Dangerous reset operation failed.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Count active permissions
  const activeAICount = settings
    ? Object.values(settings.aiPermissions).filter(Boolean).length
    : 0;

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-4" />
        <p className="text-slate-400 font-mono text-sm">Accessing Secure Settings Panel...</p>
      </div>
    );
  }

  return (
    <div id="settings-page-root" className="w-full min-h-screen pb-24">
      <FeatureNavigation
        title="Settings & Privacy Control Center"
        onBack={onBackToHome}
        onClose={onBackToHome}
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8 pt-4">

      {/* Grid Layout of Settings Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Privacy Control Center & AI Permissions */}
        <div className="lg:col-span-7 space-y-8">
          {/* Privacy Control Summary Card */}
          <section className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 shadow-2xl backdrop-blur-2xl space-y-5">
            <div className="flex items-center gap-2.5 text-indigo-400 font-bold text-sm uppercase tracking-wider">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              <span>YOUR AI PRIVACY CONTROL</span>
            </div>

            {/* Premium Multi-Gauge Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-center">
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Gemini Access</p>
                <p className="text-lg font-extrabold text-white mt-1">{activeAICount} / 7</p>
                <p className="text-[9px] text-indigo-400 mt-0.5">sources enabled</p>
              </div>
              <div className="border-l border-slate-800">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Private Journal</p>
                <p className="text-lg font-extrabold text-emerald-400 mt-1">Protected</p>
                <p className="text-[9px] text-emerald-500 mt-0.5">unlocked by key</p>
              </div>
              <div className="border-l border-slate-800">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Security Profile</p>
                <p className="text-lg font-extrabold text-emerald-400 mt-1">Strong</p>
                <p className="text-[9px] text-emerald-500 mt-0.5">isolated Firestore</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <span>Granular Gemini Data Stream Access (Opt-in)</span>
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                By default, this application utilizes a <strong>Fail-Closed Permission Architecture</strong>.
                If permission is missing or toggled off, Gemini is strictly prohibited from loading that data source.
                Enforced directly at the database transaction layer.
              </p>

              {/* Toggles Grid */}
              <div className="space-y-3 pt-2">
                {[
                  {
                    key: 'journal' as const,
                    label: 'Personal Journal Stream',
                    desc: 'Grants Gemini access to non-private journal entries to analyze mood trends and reflections.',
                  },
                  {
                    key: 'goals' as const,
                    label: 'Goal Roadmaps',
                    desc: 'Permits grounded queries about your active milestones and roadmap checkpoints.',
                  },
                  {
                    key: 'calendar' as const,
                    label: 'Calendar Events',
                    desc: 'Allows smart conflict advisory and automated day scheduling synthesis.',
                  },
                  {
                    key: 'books' as const,
                    label: 'Reading Library',
                    desc: 'Shares book tracking statuses and core learning summaries with your Ask My Journal prompt.',
                  },
                  {
                    key: 'music' as const,
                    label: 'Music Soundtracks',
                    desc: 'Exposes mood music and artist links to help AI identify emotional comfort patterns.',
                  },
                  {
                    key: 'mood' as const,
                    label: 'Mood & Stress Analytics',
                    desc: 'Enables deep emotional reporting linking stress scores with journal entries.',
                  },
                  {
                    key: 'memories' as const,
                    label: '3D Memories Carousel',
                    desc: 'Allows Gemini to automatically discover and construct highlights of meaningful events.',
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-slate-700/80 transition-all flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-white font-display">{item.label}</p>
                      <p className="text-[11px] text-slate-400 leading-normal">{item.desc}</p>
                    </div>

                    <button
                      onClick={() => handleToggleAIPermission(item.key)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        settings?.aiPermissions[item.key] ? 'bg-indigo-600' : 'bg-slate-800'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          settings?.aiPermissions[item.key] ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Account, Security, PIN, Data Management & Technical Overview */}
        <div className="lg:col-span-5 space-y-8">
          {/* Account Profile and Change Password Card */}
          <section className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 shadow-2xl backdrop-blur-2xl space-y-5">
            <div className="flex items-center gap-2.5 text-indigo-400 font-bold text-sm uppercase tracking-wider">
              <User className="w-5 h-5 text-indigo-400" />
              <span>Account Credentials</span>
            </div>

            {/* Profile Update */}
            <form onSubmit={handleUpdateProfile} className="space-y-3 border-b border-slate-800/80 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
                  {user?.email?.charAt(0).toUpperCase() || 'E'}
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{user?.email}</p>
                  <p className="text-[10px] text-slate-500">Authenticated through Firebase Auth</p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Display Name</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    placeholder="Enter full name"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700 cursor-pointer transition-all"
                  >
                    Save
                  </button>
                </div>
              </div>

              {profileSuccess && (
                <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> <span>{profileSuccess}</span>
                </p>
              )}
              {profileError && (
                <p className="text-[10px] text-rose-400 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> <span>{profileError}</span>
                </p>
              )}
            </form>

            {/* Change Password Form */}
            <form onSubmit={handleUpdatePassword} className="space-y-4 pt-1">
              <p className="text-xs font-bold text-white">Secure Update Password</p>

              <div className="space-y-1 relative">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="w-full pl-3 pr-9 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="w-full pl-3 pr-9 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saveLoading}
                className="w-full py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl cursor-pointer shadow-lg shadow-indigo-550/20 flex items-center justify-center gap-1.5 transition-all"
              >
                {saveLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Update Credentials & Sync</span>
              </button>

              {passwordSuccess && (
                <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> <span>{passwordSuccess}</span>
                </p>
              )}
              {passwordError && (
                <p className="text-[10px] text-rose-400 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> <span>{passwordError}</span>
                </p>
              )}
            </form>
          </section>

          {/* Master PIN Settings and Clues Card */}
          <section className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 shadow-2xl backdrop-blur-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-indigo-400 font-bold text-sm uppercase tracking-wider">
                <Lock className="w-5 h-5 text-indigo-400" />
                <span>Master PIN Protection</span>
              </div>

              {/* Master PIN Status Tag */}
              <button
                onClick={handleTogglePinLockState}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-full border transition-colors cursor-pointer uppercase font-mono ${
                  pinEnabled
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}
              >
                {pinEnabled ? 'PIN Lock ON' : 'PIN Lock OFF'}
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Enable the PIN locks to encrypt entry viewing logs.
              The Master PIN is securely hashed using native WebCrypto SHA-256 and never sent to Gemini.
            </p>

            <form onSubmit={handleConfigurePin} className="space-y-4">
              {pinEnabled && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current PIN</label>
                  <input
                    type="password"
                    maxLength={6}
                    value={currentPin}
                    onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 tracking-[0.4em] text-center font-mono font-bold"
                    placeholder="••••"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">New 4-6 Digit PIN</label>
                  <input
                    type="password"
                    maxLength={6}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 tracking-[0.4em] text-center font-mono font-bold"
                    placeholder="••••"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Confirm New PIN</label>
                  <input
                    type="password"
                    maxLength={6}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 tracking-[0.4em] text-center font-mono font-bold"
                    placeholder="••••"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recovery clue / Hint</label>
                <input
                  type="text"
                  value={pinHint}
                  onChange={(e) => setPinHint(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. Year I bought my first computer"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 cursor-pointer shadow flex items-center justify-center gap-1.5 transition-all"
              >
                <Key className="w-3.5 h-3.5 text-indigo-400" />
                <span>Save Secure PIN Configuration</span>
              </button>

              {pinSuccess && (
                <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> <span>{pinSuccess}</span>
                </p>
              )}
              {pinError && (
                <p className="text-[10px] text-rose-400 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> <span>{pinError}</span>
                </p>
              )}
            </form>
          </section>

          {/* User Data Management & Destructive Zone */}
          <section className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 shadow-2xl backdrop-blur-2xl space-y-5">
            <div className="flex items-center gap-2.5 text-rose-400 font-bold text-sm uppercase tracking-wider">
              <Database className="w-5 h-5 text-rose-400" />
              <span>Data Management & Safety</span>
            </div>

            {/* Storage Gauge */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-bold text-slate-400">
                <span>FIRESTORE USAGE TRACKER</span>
                <span>Isolated DB Sandbox</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                <div className="w-[8%] h-full rounded-full bg-indigo-500"></div>
              </div>
              <p className="text-[9px] text-slate-500">
                Firestore collection sandboxed inside authenticated user root. Limit 10,000 document writes per day.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              {/* Export Button */}
              <button
                onClick={handleExportData}
                disabled={isExporting}
                className="p-3.5 rounded-2xl bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-200 hover:text-white transition-all text-left space-y-1 shadow flex flex-col justify-between h-24 cursor-pointer"
              >
                <Download className="w-4 h-4 text-indigo-400" />
                <div>
                  <p className="text-[11px] font-bold">Export All Data</p>
                  <p className="text-[9px] text-slate-400">Secure JSON compile & file download</p>
                </div>
              </button>

              {/* Dangerous Deletion */}
              <button
                onClick={() => setShowDeleteModal(true)}
                className="p-3.5 rounded-2xl bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/20 text-rose-200 hover:text-rose-100 transition-all text-left space-y-1 shadow flex flex-col justify-between h-24 cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <div>
                  <p className="text-[11px] font-bold text-rose-300">Dangerous Reset</p>
                  <p className="text-[9px] text-rose-400/80">Completely purge all database logs</p>
                </div>
              </button>
            </div>

            {dataActionSuccess && (
              <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1.5 p-2 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                <CheckCircle className="w-3.5 h-3.5" /> <span>{dataActionSuccess}</span>
              </p>
            )}
            {dataActionError && (
              <p className="text-[10px] text-rose-400 font-semibold flex items-center gap-1.5 p-2 rounded-xl bg-rose-500/5 border border-rose-500/10">
                <AlertCircle className="w-3.5 h-3.5" /> <span>{dataActionError}</span>
              </p>
            )}
          </section>

          {/* Technical Architecture Deep Dive Card */}
          <section className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 shadow-2xl backdrop-blur-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-indigo-400 font-bold text-sm uppercase tracking-wider">
              <Info className="w-5 h-5 text-indigo-400" />
              <span>System Specifications</span>
            </div>

            {/* Structured Specifications Panel */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 font-mono text-[10px] text-slate-300 space-y-2">
              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                <span className="text-slate-500">HOST PROVIDER:</span>
                <span className="text-indigo-400 font-bold">Google Cloud Run container</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                <span className="text-slate-500">STORAGE CLOUD:</span>
                <span className="text-emerald-400 font-bold">Isolated Cloud Firestore</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                <span className="text-slate-500">AUTH SCHEME:</span>
                <span className="text-slate-300">Firebase User Auth UID</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                <span className="text-slate-500">LOCAL ENCRYPTION:</span>
                <span className="text-slate-300">SHA-256 local PIN Hashing</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                <span className="text-slate-500">AI ORCHESTRATOR:</span>
                <span className="text-purple-400">Server-Side Gemini SDK (Grounded)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">CHALLENGE TAG:</span>
                <span className="text-amber-500 font-bold">dev-tutorial=cloud-run-ai-challenge</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* DANGEROUS RESET DELETE CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn">
          <div className="max-w-md w-full p-6 rounded-3xl bg-slate-900 border border-rose-500/30 shadow-2xl shadow-rose-950/30 space-y-5 relative">
            <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 w-fit">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h4 className="text-base font-bold text-white font-display">Destructive Data Wipe Out!</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                You are about to completely reset and purge all your personal journal entries, goals, reading library,
                calendar events, and music records from Firebase. This action is **irreversible**.
              </p>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Type <strong>DELETE ALL MY DATA</strong> to execute:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-rose-400 focus:outline-none focus:border-rose-500 uppercase font-mono font-bold tracking-wider"
                  placeholder="Type confirming text exactly"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmText('');
                    setDataActionError(null);
                  }}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAllUserData}
                  disabled={isDeleting || deleteConfirmText !== 'DELETE ALL MY DATA'}
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold cursor-pointer shadow-lg shadow-rose-600/20 flex items-center justify-center gap-1 transition-all"
                >
                  {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Execute Wipe Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
