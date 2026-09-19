import React, { useState, useEffect } from 'react';
import { getLocalCachedMeta, commitMetaToTelegram } from '../../telegram/metadata';
import { loadSession } from '../../telegram/session';
import { Settings, HardDrive, ShieldCheck, Download, Check, X } from 'lucide-react';
import { useTranslation } from '../../i18n/context';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [storageLocation, setStorageLocation] = useState<'channel' | 'saved_messages'>('channel');
  const [saved, setSaved] = useState(false);
  const [sessionExported, setSessionExported] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const meta = getLocalCachedMeta();
      setStorageLocation(meta.preferences.storageLocation || 'channel');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    const meta = getLocalCachedMeta();
    meta.preferences.storageLocation = storageLocation;
    await commitMetaToTelegram(meta);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1200);
  };

  const handleExportSession = async () => {
    const s = await loadSession();
    if (!s) return;
    const blob = new Blob([s], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tgdocs_session_backup_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setSessionExported(true);
    setTimeout(() => setSessionExported(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-100">
      <div className="w-full max-w-lg bg-white dark:bg-[#1e1f20] rounded-3xl p-4 sm:p-6 shadow-xl border border-[#e0e3e7] dark:border-[#3c4043] max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-[#e0e3e7] dark:border-[#3c4043]">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#0b57d0] dark:text-[#a8c7fa]" />
            <h3 className="font-semibold text-base text-[#1f1f1f] dark:text-[#e3e3e3]">
              {t('modals.settingsTitle')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-[#747775] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-6 text-xs text-[#444746] dark:text-[#c4c7c5]">
          {/* Storage Peer Choice */}
          <div>
            <h4 className="font-semibold text-sm text-[#1f1f1f] dark:text-[#e3e3e3] mb-1">
              {t('modals.storageLocation')}
            </h4>
            <p className="text-[#747775] dark:text-[#8e918f] mb-3">
              {t('sidebar.storage')}
            </p>

            <div className="space-y-2">
              <label
                onClick={() => setStorageLocation('channel')}
                className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition ${
                  storageLocation === 'channel'
                    ? 'border-[#0b57d0] dark:border-[#a8c7fa] bg-[#c2e7ff]/30 dark:bg-[#004a77]/30'
                    : 'border-[#e0e3e7] dark:border-[#3c4043] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c]'
                }`}
              >
                <input
                  type="radio"
                  name="storageLocation"
                  value="channel"
                  checked={storageLocation === 'channel'}
                  onChange={() => setStorageLocation('channel')}
                  className="mt-0.5"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                      {t('modals.channelOption')}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#747775] dark:text-[#8e918f] mt-0.5">
                    {t('modals.channelDesc')}
                  </p>
                </div>
              </label>

              <label
                onClick={() => setStorageLocation('saved_messages')}
                className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition ${
                  storageLocation === 'saved_messages'
                    ? 'border-[#0b57d0] dark:border-[#a8c7fa] bg-[#c2e7ff]/30 dark:bg-[#004a77]/30'
                    : 'border-[#e0e3e7] dark:border-[#3c4043] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c]'
                }`}
              >
                <input
                  type="radio"
                  name="storageLocation"
                  value="saved_messages"
                  checked={storageLocation === 'saved_messages'}
                  onChange={() => setStorageLocation('saved_messages')}
                  className="mt-0.5"
                />
                <div>
                  <span className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                    {t('modals.savedMsgOption')}
                  </span>
                  <p className="text-[11px] text-[#747775] dark:text-[#8e918f] mt-0.5">
                    {t('modals.savedMsgDesc')}
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Security & Backup */}
          <div className="pt-2 border-t border-[#e0e3e7] dark:border-[#3c4043]">
            <h4 className="font-semibold text-sm text-[#1f1f1f] dark:text-[#e3e3e3] mb-1">
              {t('modals.backupSession')}
            </h4>
            <p className="text-[#747775] dark:text-[#8e918f] mb-3">
              {t('modals.backupDesc')}
            </p>
            <button
              onClick={handleExportSession}
              className="py-2 px-3.5 rounded-xl border border-[#e0e3e7] dark:border-[#3c4043] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-xs font-medium text-[#1f1f1f] dark:text-[#e3e3e3] transition flex items-center gap-2"
            >
              <Download className="w-4 h-4 text-[#747775]" />
              <span>{sessionExported ? t('modals.sessionExported') : t('modals.exportSession')}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#e0e3e7] dark:border-[#3c4043]">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 rounded-xl text-xs font-medium text-[#444746] dark:text-[#c4c7c5] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] transition"
          >
            {t('modals.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="py-2 px-5 rounded-xl bg-[#0b57d0] hover:bg-[#0842a0] dark:bg-[#a8c7fa] dark:hover:bg-[#d3e3fd] text-white dark:text-[#041e49] text-xs font-semibold transition flex items-center gap-1.5"
          >
            {saved ? (
              <>
                <Check className="w-4 h-4" />
                <span>{t('modals.saved')}</span>
              </>
            ) : (
              <span>{t('modals.saveSettings')}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
