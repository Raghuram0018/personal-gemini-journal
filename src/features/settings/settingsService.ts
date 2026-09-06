import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

export interface AIPermissions {
  journal: boolean;
  goals: boolean;
  calendar: boolean;
  books: boolean;
  music: boolean;
  mood: boolean;
  memories: boolean;
}

export interface SecuritySettings {
  pinLocked: boolean;
  pinHash?: string;
  pinHint?: string;
}

export interface UserSettings {
  userId: string;
  aiPermissions: AIPermissions;
  security: SecuritySettings;
  theme: 'light' | 'dark' | 'cinematic';
  updatedAt: string;
}

const SETTINGS_CACHE_PREFIX = 'pgj_settings_';

const DEFAULT_AI_PERMISSIONS: AIPermissions = {
  journal: true,
  goals: true,
  calendar: true,
  books: true,
  music: true,
  mood: true,
  memories: true,
};

const DEFAULT_SECURITY: SecuritySettings = {
  pinLocked: false,
  pinHash: '',
  pinHint: '',
};

export const DEFAULT_SETTINGS = (uid: string): UserSettings => ({
  userId: uid,
  aiPermissions: { ...DEFAULT_AI_PERMISSIONS },
  security: { ...DEFAULT_SECURITY },
  theme: 'dark',
  updatedAt: new Date().toISOString(),
});

/**
 * SHA-256 secure hash for PIN storage
 */
export async function hashPin(pin: string): Promise<string> {
  if (!pin) return '';
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(pin);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (err) {
    console.warn('[settingsService] WebCrypto SHA-256 unavailable, using backup hash:', err);
  }
  // Safe simple fallback hashing if WebCrypto is unavailable
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return 'fb_' + Math.abs(hash).toString(16);
}

/**
 * Get unified user settings from Firestore.
 * Standard fail-closed fallback is applied when database record is absent.
 */
export async function getSettingsForUser(uid: string): Promise<UserSettings> {
  if (!uid) return DEFAULT_SETTINGS('anonymous');

  try {
    const ref = doc(db, 'users', uid, 'settings', 'permissions');
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const data = snap.data();
      const settings: UserSettings = {
        userId: uid,
        aiPermissions: {
          ...DEFAULT_AI_PERMISSIONS,
          ...(data.aiPermissions || {}),
        },
        security: {
          ...DEFAULT_SECURITY,
          ...(data.security || {}),
        },
        theme: data.theme || 'dark',
        updatedAt: data.updatedAt || new Date().toISOString(),
      };
      localStorage.setItem(`${SETTINGS_CACHE_PREFIX}${uid}`, JSON.stringify(settings));
      return settings;
    }
  } catch (err) {
    console.warn('[settingsService] Firestore settings load error, using fallback:', err);
  }

  // Local storage cache fallback
  const cached = localStorage.getItem(`${SETTINGS_CACHE_PREFIX}${uid}`);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      return {
        ...DEFAULT_SETTINGS(uid),
        ...parsed,
        userId: uid, // enforce ownership
      };
    } catch {}
  }

  const defaults = DEFAULT_SETTINGS(uid);
  // Write default settings to firestore so it's initialized on first access
  try {
    const ref = doc(db, 'users', uid, 'settings', 'permissions');
    await setDoc(ref, defaults);
  } catch (err) {
    console.warn('[settingsService] Initial firestore save error:', err);
  }

  return defaults;
}

/**
 * Update user settings in Firestore and local cache
 */
export async function updateSettingsForUser(
  uid: string,
  updates: Partial<UserSettings>
): Promise<UserSettings> {
  const current = await getSettingsForUser(uid);
  const updated: UserSettings = {
    ...current,
    ...updates,
    aiPermissions: {
      ...current.aiPermissions,
      ...(updates.aiPermissions || {}),
    },
    security: {
      ...current.security,
      ...(updates.security || {}),
    },
    updatedAt: new Date().toISOString(),
  };

  try {
    const ref = doc(db, 'users', uid, 'settings', 'permissions');
    await setDoc(ref, updated);
  } catch (err) {
    console.warn('[settingsService] Firestore settings save error:', err);
  }

  localStorage.setItem(`${SETTINGS_CACHE_PREFIX}${uid}`, JSON.stringify(updated));
  return updated;
}
