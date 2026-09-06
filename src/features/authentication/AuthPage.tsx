import React, { useState, useRef, useEffect } from 'react';
import './auth.css';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../services/firebase';
import { selectMotivationalMessage } from '../motivation/motivationService';
import { MotivationalMessageOverlay } from '../motivation/MotivationalMessageOverlay';
import { MOTIVATIONAL_MESSAGES, MotivationalMessage } from '../motivation/motivationalMessages';
import {
  BookMarked,
  Lock,
  Mail,
  User,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  Loader2,
} from 'lucide-react';

interface AuthPageProps {
  onBackToLanding?: () => void;
  onSuccess?: () => void;
  initialTab?: 'signin' | 'signup';
}

export const AuthPage: React.FC<AuthPageProps> = ({
  onBackToLanding,
  onSuccess,
  initialTab = 'signin',
}) => {
  const { user, signIn, signUp, resetPassword, loading, error, clearError } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>(initialTab);
  const [loginMotivation, setLoginMotivation] = useState<MotivationalMessage | null>(null);
  const isAuthenticatingRef = useRef<boolean>(false);
  
  // Auto-redirect to dashboard if user is ALREADY authenticated on mount (and not in active login overlay flow)
  useEffect(() => {
    if (user && !isAuthenticatingRef.current && !loginMotivation) {
      if (onSuccess) onSuccess();
    }
  }, [user, loginMotivation, onSuccess]);

  // Sign In Form state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  // Sign Up Form state
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showSignUpConfirmPassword, setShowSignUpConfirmPassword] = useState(false);

  // Forgot Password Form state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccessMsg, setForgotSuccessMsg] = useState<string | null>(null);

  // Local validation error message
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reset tab errors when changing mode
  const switchMode = (newMode: 'signin' | 'signup' | 'forgot') => {
    clearError();
    setValidationError(null);
    setForgotSuccessMsg(null);
    setMode(newMode);
  };

  // Handle Sign In Submit
  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuthenticatingRef.current) return;

    setValidationError(null);

    if (!signInEmail.trim()) {
      setValidationError('Please enter your email address.');
      return;
    }
    if (!signInPassword) {
      setValidationError('Please enter your password.');
      return;
    }

    try {
      setSubmitting(true);
      isAuthenticatingRef.current = true;
      try {
        await signIn(signInEmail, signInPassword);
      } catch (signInErr: any) {
        // If the ideathon evaluator account doesn't exist yet, auto-provision and sign in seamlessly
        if (signInEmail.trim().toLowerCase() === 'ragha@gmail.com') {
          console.info('[AuthPage] Auto-provisioning ideathon evaluator test account (ragha@gmail.com)...');
          await signUp('Ragha Evaluator', signInEmail, signInPassword);
        } else {
          throw signInErr;
        }
      }

      const uid = auth.currentUser?.uid || user?.uid || 'authenticated-user';
      let msg: MotivationalMessage;
      try {
        msg = await selectMotivationalMessage(uid, 'login');
      } catch (mErr) {
        console.warn('[AuthPage] Motivation selection fallback:', mErr);
        msg = MOTIVATIONAL_MESSAGES[0];
      }
      setLoginMotivation(msg);
    } catch (err) {
      isAuthenticatingRef.current = false;
      // Error handled by AuthContext error state
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Create Account Submit
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuthenticatingRef.current) return;

    setValidationError(null);

    if (!signUpName.trim()) {
      setValidationError('Please enter your name.');
      return;
    }
    if (!signUpEmail.trim()) {
      setValidationError('Please enter your email address.');
      return;
    }
    if (signUpPassword.length < 6) {
      setValidationError('Password must be at least 6 characters long.');
      return;
    }
    if (signUpPassword !== signUpConfirmPassword) {
      setValidationError('Passwords do not match. Please check and try again.');
      return;
    }

    try {
      setSubmitting(true);
      isAuthenticatingRef.current = true;
      await signUp(signUpName, signUpEmail, signUpPassword);

      const uid = auth.currentUser?.uid || user?.uid || 'authenticated-user';
      let msg: MotivationalMessage;
      try {
        msg = await selectMotivationalMessage(uid, 'login');
      } catch (mErr) {
        console.warn('[AuthPage] Motivation selection fallback:', mErr);
        msg = MOTIVATIONAL_MESSAGES[0];
      }
      setLoginMotivation(msg);
    } catch (err) {
      isAuthenticatingRef.current = false;
      // Error handled by AuthContext error state
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Forgot Password Submit
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setForgotSuccessMsg(null);

    if (!forgotEmail.trim()) {
      setValidationError('Please enter your email address to reset password.');
      return;
    }

    try {
      setSubmitting(true);
      await resetPassword(forgotEmail);
      setForgotSuccessMsg('Password reset link sent! Check your inbox to reset your password.');
    } catch (err) {
      // Error handled by AuthContext
    } finally {
      setSubmitting(false);
    }
  };

  const activeError = validationError || error;

  return (
    <div id="auth-page-root" className="flex flex-col justify-between p-4 sm:p-6 lg:p-8 selection:bg-indigo-500 selection:text-white">
      {/* Background Orbs */}
      <div className="auth-glow-orb-1" />
      <div className="auth-glow-orb-2" />

      {/* Top Header Navigation */}
      <div className="relative z-10 max-w-7xl w-full mx-auto flex items-center justify-between mb-6">
        <button
          onClick={onBackToLanding}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-900 border border-slate-800 transition-all cursor-pointer backdrop-blur-md"
        >
          <ArrowLeft className="w-4 h-4 text-slate-400" />
          <span>Back to Landing</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <BookMarked className="w-4 h-4 text-white" />
          </div>
          <span className="text-xs font-bold tracking-tight text-white font-display uppercase hidden sm:inline-block">
            Personal Gemini Journal
          </span>
        </div>
      </div>

      {/* Main Center Auth Container */}
      <div className="relative z-10 max-w-md w-full mx-auto my-auto py-6">
        <div className="auth-glass-card rounded-3xl p-6 sm:p-8 space-y-6">
          
          {/* Header & Title */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Firebase Authenticated Session</span>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight">
              {mode === 'forgot'
                ? 'Reset Password'
                : mode === 'signin'
                ? 'Welcome Back'
                : 'Begin Your Journey'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              {mode === 'forgot'
                ? 'Enter your email to receive a password recovery link.'
                : 'Your journey is waiting for you.'}
            </p>
          </div>

          {/* Segmented Control Tabs (Sign In vs Create Account) */}
          {mode !== 'forgot' && (
            <div className="p-1 rounded-2xl bg-slate-950/80 border border-slate-800/80 grid grid-cols-2 gap-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className={`py-2.5 rounded-xl transition-all cursor-pointer text-center ${
                  mode === 'signin' ? 'auth-tab-active' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className={`py-2.5 rounded-xl transition-all cursor-pointer text-center ${
                  mode === 'signup' ? 'auth-tab-active' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Dynamic Error Feedback Alert */}
          {activeError && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{activeError}</div>
            </div>
          )}

          {/* Forgot Password Success Alert */}
          {forgotSuccessMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{forgotSuccessMsg}</div>
            </div>
          )}

          {/* MODE 1: SIGN IN FORM */}
          {mode === 'signin' && (
            <form onSubmit={handleSignInSubmit} className="space-y-4">
              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-400" /> Email Address
                </label>
                <input
                  type="email"
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="auth-input w-full px-4 py-3 rounded-xl text-xs sm:text-sm font-sans"
                />
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-purple-400" /> Password
                  </label>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors font-medium cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showSignInPassword ? 'text' : 'password'}
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="auth-input w-full pl-4 pr-11 py-3 rounded-xl text-xs sm:text-sm font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignInPassword(!showSignInPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {showSignInPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={submitting || loading}
                className="w-full py-3.5 px-4 rounded-xl font-semibold text-xs sm:text-sm bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {submitting || loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Ideathon Demo Quick-Fill */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setSignInEmail('ragha@gmail.com');
                    setSignInPassword('ragha@11');
                    setValidationError(null);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-indigo-500/30 text-indigo-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Use Ideathon Demo Account (ragha@gmail.com)</span>
                </button>
              </div>

              {/* Switch to Sign Up */}
              <div className="text-center pt-2 text-xs text-slate-400">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer underline underline-offset-4"
                >
                  Create an account
                </button>
              </div>
            </form>
          )}

          {/* MODE 2: CREATE ACCOUNT FORM */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUpSubmit} className="space-y-3.5">
              {/* Name Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-400" /> Full Name
                </label>
                <input
                  type="text"
                  value={signUpName}
                  onChange={(e) => setSignUpName(e.target.value)}
                  placeholder="What should we call you?"
                  required
                  className="auth-input w-full px-4 py-3 rounded-xl text-xs sm:text-sm font-sans"
                />
              </div>

              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-purple-400" /> Email Address
                </label>
                <input
                  type="email"
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="auth-input w-full px-4 py-3 rounded-xl text-xs sm:text-sm font-sans"
                />
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-pink-400" /> Password
                </label>
                <div className="relative">
                  <input
                    type={showSignUpPassword ? 'text' : 'password'}
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    placeholder="Create a password (min 6 chars)"
                    required
                    className="auth-input w-full pl-4 pr-11 py-3 rounded-xl text-xs sm:text-sm font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {showSignUpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" /> Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showSignUpConfirmPassword ? 'text' : 'password'}
                    value={signUpConfirmPassword}
                    onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    required
                    className="auth-input w-full pl-4 pr-11 py-3 rounded-xl text-xs sm:text-sm font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignUpConfirmPassword(!showSignUpConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {showSignUpConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={submitting || loading}
                className="w-full py-3.5 px-4 rounded-xl font-semibold text-xs sm:text-sm bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {submitting || loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <span>Begin My Journey</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Switch to Sign In */}
              <div className="text-center pt-2 text-xs text-slate-400">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer underline underline-offset-4"
                >
                  Sign In
                </button>
              </div>
            </form>
          )}

          {/* MODE 3: FORGOT PASSWORD FORM */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-400" /> Registered Email Address
                </label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="Enter your account email"
                  required
                  className="auth-input w-full px-4 py-3 rounded-xl text-xs sm:text-sm font-sans"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || loading}
                className="w-full py-3.5 px-4 rounded-xl font-semibold text-xs sm:text-sm bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting || loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Sending email...</span>
                  </>
                ) : (
                  <span>Send Reset Link</span>
                )}
              </button>

              <div className="text-center pt-2 text-xs text-slate-400">
                Remember your password?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer underline underline-offset-4"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}

          {/* UID Isolation Security Badge Footer */}
          <div className="pt-4 border-t border-slate-800/80">
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Protected Path: <code className="text-emerald-300 font-mono">/users/&#123;uid&#125;</code></span>
              </div>
              <span className="font-mono text-[10px] text-slate-400">Firebase Auth</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="relative z-10 text-center text-xs text-slate-400 py-4">
        <span>Personal Gemini Journal &copy; 2026</span>
        <span className="mx-2">•</span>
        <span>Google Cloud Run AI Challenge</span>
      </div>

      {/* Motivational Message Overlay on Login / Signup */}
      {loginMotivation && (
        <MotivationalMessageOverlay
          message={loginMotivation}
          mode="login"
          onComplete={() => {
            setLoginMotivation(null);
            isAuthenticatingRef.current = false;
            if (onSuccess) onSuccess();
          }}
        />
      )}
    </div>
  );
};
