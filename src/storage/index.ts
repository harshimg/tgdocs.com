import type { StorageProvider } from './types';
import { telegramProvider } from './telegram-provider';
import { mockProvider } from './mock-provider';
import { useAuthStore } from '../store/auth-store';

export function getActiveStorageProvider(): StorageProvider {
  const isAuth = useAuthStore.getState().isAuthenticated;
  const isDemo = useAuthStore.getState().isDemoMode;

  if (isAuth && !isDemo) {
    return telegramProvider;
  }
  return mockProvider;
}

export * from './types';
export { telegramProvider, mockProvider };
