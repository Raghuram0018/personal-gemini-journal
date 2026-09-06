import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '../services/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to map raw Firebase error codes to user-friendly error messages
function mapFirebaseError(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password. If you do not have an account yet, please select "Create Account" above.';
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters long.';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is not enabled for this Firebase project. Please enable Email/Password sign-in in Firebase Console → Authentication → Sign-in method.';
    case 'auth/configuration-not-found':
      return 'Firebase Authentication is not configured for this project. Please enable Authentication in Firebase Console.';
    case 'auth/too-many-requests':
      return 'Too many failed login attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'Network connection error. Please check your internet connection.';
    case 'auth/popup-closed-by-user':
      return 'Authentication popup was closed before completing.';
    default:
      return code
        ? `Authentication error (${code}). Please try again.`
        : 'An authentication error occurred. Please try again.';
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Listen for Firebase auth state changes
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setLoading(false);
      },
      (err: any) => {
        console.error('Auth state listener error:', err?.code, err?.message);
        setError(mapFirebaseError(err?.code || ''));
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const clearError = () => setError(null);

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: any) {
      console.error('[Firebase Auth] signIn error:', err?.code, err?.message);
      const friendlyMsg = mapFirebaseError(err?.code || '');
      setError(friendlyMsg);
      throw new Error(friendlyMsg);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (name: string, email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (userCredential.user && name.trim()) {
        await updateProfile(userCredential.user, {
          displayName: name.trim(),
        });
        // Force refresh user state to update displayName
        setUser({ ...userCredential.user, displayName: name.trim() });
      }
    } catch (err: any) {
      console.error('[Firebase Auth] signUp error:', err?.code, err?.message);
      const friendlyMsg = mapFirebaseError(err?.code || '');
      setError(friendlyMsg);
      throw new Error(friendlyMsg);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setError(null);
      setLoading(true);
      await firebaseSignOut(auth);
      setUser(null);
    } catch (err: any) {
      console.error('[Firebase Auth] logout error:', err?.code, err?.message);
      const friendlyMsg = mapFirebaseError(err?.code || '');
      setError(friendlyMsg);
      throw new Error(friendlyMsg);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setError(null);
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err: any) {
      console.error('[Firebase Auth] resetPassword error:', err?.code, err?.message);
      const friendlyMsg = mapFirebaseError(err?.code || '');
      setError(friendlyMsg);
      throw new Error(friendlyMsg);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        signIn,
        signUp,
        logout,
        resetPassword,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
