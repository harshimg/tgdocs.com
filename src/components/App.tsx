import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/auth-store';
import { useFileStore } from '../store/file-store';
import { LoginView } from './auth/LoginView';
import { Header } from './layout/Header';
import { Sidebar } from './layout/Sidebar';
import { FileManager } from './files/FileManager';
import { NewFolderModal } from './modals/NewFolderModal';
import { SettingsModal } from './modals/SettingsModal';
import { PrivacyModal } from './modals/PrivacyModal';
import { Loader2 } from 'lucide-react';
import { I18nProvider, useTranslation } from '../i18n/context';
import type { SupportedLanguage } from '../i18n/ui';

interface AppProps {
  initialLang?: SupportedLanguage;
}

const AppContent: React.FC = () => {
  const { isAuthenticated, isInitializing, initAuth } = useAuthStore();
  const { isDarkMode } = useFileStore();
  const { t } = useTranslation();

  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Sync dark mode class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f0f4f9] dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] select-none transition-colors">
        <div className="w-12 h-12 rounded-2xl bg-[#0b57d0] dark:bg-[#a8c7fa] flex items-center justify-center shadow-lg mb-4 animate-pulse">
          <svg className="w-7 h-7 text-white dark:text-[#041e49]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold tracking-tight mb-2">TGDocs</h2>
        <div className="flex items-center gap-2 text-xs text-[#747775] dark:text-[#8e918f]">
          <Loader2 className="w-4 h-4 animate-spin text-[#0b57d0] dark:text-[#a8c7fa]" />
          <span>{t('login.verifyingSession')}</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  return (
    <div className="h-[100dvh] w-full flex flex-col overflow-hidden bg-white dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3] transition-colors relative">
      {/* Google Drive Inspired Top Header */}
      <Header
        onOpenPrivacyModal={() => setPrivacyModalOpen(true)}
        onOpenSettingsModal={() => setSettingsModalOpen(true)}
      />

      {/* Main App Body: Sidebar + File Manager */}
      <div className="flex-1 flex overflow-hidden relative">
        <Sidebar
          onOpenNewFolderModal={() => setNewFolderModalOpen(true)}
          onOpenSettingsModal={() => setSettingsModalOpen(true)}
        />

        <FileManager
          onOpenPrivacyModal={() => setPrivacyModalOpen(true)}
          onOpenSettingsModal={() => setSettingsModalOpen(true)}
          onOpenNewFolderModal={() => setNewFolderModalOpen(true)}
          privacyModalOpen={privacyModalOpen}
          settingsModalOpen={settingsModalOpen}
          setPrivacyModalOpen={setPrivacyModalOpen}
          setSettingsModalOpen={setSettingsModalOpen}
        />
      </div>

      {/* Global Modals */}
      <NewFolderModal
        isOpen={newFolderModalOpen}
        onClose={() => setNewFolderModalOpen(false)}
      />
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
      />
      <PrivacyModal
        isOpen={privacyModalOpen}
        onClose={() => setPrivacyModalOpen(false)}
      />
    </div>
  );
};

export const App: React.FC<AppProps> = ({ initialLang }) => {
  return (
    <I18nProvider initialLang={initialLang}>
      <AppContent />
    </I18nProvider>
  );
};
