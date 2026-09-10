/**
 * TGDocs Auth State Store
 */

import { create } from 'zustand';
import {
  sendAuthCode,
  signInWithCode,
  signInWith2FA,
  getCurrentUser,
  logout as telegramLogout,
  type TelegramUser,
} from '../telegram/auth';
import { hasSession, removeSession } from '../telegram/session';

interface AuthState {
  isAuthenticated: boolean;
  isDemoMode: boolean;
  isInitializing: boolean;
  isLoading: boolean;
  user: TelegramUser | null;
  phoneNumber: string | null;
  phoneCodeHash: string | null;
  requires2FA: boolean;
  error: string | null;

  initAuth: () => Promise<void>;
  requestPhoneCode: (phone: string) => Promise<boolean>;
  verifyPhoneCode: (code: string) => Promise<boolean>;
  submit2FA: (password: string) => Promise<boolean>;
  enterDemoMode: () => void;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isDemoMode: false,
  isInitializing: true,
  isLoading: false,
  user: null,
  phoneNumber: null,
  phoneCodeHash: null,
  requires2FA: false,
  error: null,

  clearError: () => set({ error: null }),

  initAuth: async () => {
    set({ isInitializing: true, error: null });
    try {
      const exists = await hasSession();
      if (!exists) {
        set({ isAuthenticated: false, isInitializing: false, user: null });
        return;
      }

      // 6-second timeout for session restoration to avoid hanging if session is stale
      const userPromise = getCurrentUser();
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000));
      const user = await Promise.race([userPromise, timeoutPromise]);

      if (user) {
        set({ isAuthenticated: true, user, isInitializing: false, isDemoMode: false });
      } else {
        await removeSession();
        set({ isAuthenticated: false, isInitializing: false, user: null });
      }
    } catch (e: any) {
      console.warn('Auth check error:', e);
      await removeSession();
      set({ isAuthenticated: false, isInitializing: false, user: null, error: e.message || 'Auth initialization failed' });
    }
  },

  requestPhoneCode: async (phone: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await sendAuthCode(phone);
      set({
        phoneNumber: phone,
        phoneCodeHash: res.phoneCodeHash,
        isLoading: false,
        requires2FA: false,
      });
      return true;
    } catch (err: any) {
      console.error('sendAuthCode error:', err);
      let msg = err.message || 'Failed to send login code. Check phone format (+1234567890).';
      if (err.errorMessage && err.errorMessage.includes('FLOOD_WAIT')) {
        msg = `Telegram rate limit. Please wait a few moments before requesting another code. (${err.errorMessage})`;
      } else if (err.errorMessage && err.errorMessage.includes('PHONE_NUMBER_INVALID')) {
        msg = 'Invalid phone number format. Please include your country code (e.g. +1234567890).';
      } else if (err.message && err.message.includes('PHONE_NUMBER_INVALID')) {
        msg = 'Invalid phone number format. Please include your country code (e.g. +1234567890).';
      }
      set({
        isLoading: false,
        error: msg,
      });
      return false;
    }
  },

  verifyPhoneCode: async (code: string) => {
    const { phoneNumber, phoneCodeHash } = get();
    if (!phoneNumber || !phoneCodeHash) {
      set({ error: 'Phone verification state missing. Please request code again.' });
      return false;
    }

    set({ isLoading: true, error: null });
    try {
      const result = await signInWithCode(phoneNumber, phoneCodeHash, code);
      if (result.requires2FA) {
        set({ requires2FA: true, isLoading: false });
        return false;
      }

      if (result.user) {
        set({
          isAuthenticated: true,
          user: result.user,
          isLoading: false,
          phoneCodeHash: null,
          isDemoMode: false,
        });
        return true;
      }
      return false;
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.message || 'Invalid confirmation code.',
      });
      return false;
    }
  },

  submit2FA: async (password: string) => {
    set({ isLoading: true, error: null });
    try {
      const user = await signInWith2FA(password);
      set({
        isAuthenticated: true,
        user,
        requires2FA: false,
        isLoading: false,
        phoneCodeHash: null,
        isDemoMode: false,
      });
      return true;
    } catch (err: any) {
      console.error('2FA verification error:', err);
      let errorMsg = 'Incorrect 2FA password. Please check and try again.';
      if (err.errorMessage && err.errorMessage.includes('PASSWORD_HASH_INVALID')) {
        errorMsg = 'Incorrect 2FA password. Please check your cloud password and try again.';
      } else if (err.message && err.message.includes('PASSWORD_HASH_INVALID')) {
        errorMsg = 'Incorrect 2FA password. Please check your cloud password and try again.';
      } else if (err.message) {
        errorMsg = err.message;
      }
      set({
        isLoading: false,
        error: errorMsg,
      });
      return false;
    }
  },

  enterDemoMode: () => {
    set({
      isAuthenticated: true,
      isDemoMode: true,
      isLoading: false,
      user: {
        id: 'demo_user',
        firstName: 'Demo',
        lastName: 'Account',
        username: 'tgdocs_explorer',
      },
    });
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      if (!get().isDemoMode) {
        await telegramLogout();
      }
    } finally {
      set({
        isAuthenticated: false,
        isDemoMode: false,
        user: null,
        phoneCodeHash: null,
        phoneNumber: null,
        isLoading: false,
      });
    }
  },
}));
