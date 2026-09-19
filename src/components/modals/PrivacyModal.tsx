import React from 'react';
import { Shield, Lock, Cloud, Code2, X, ExternalLink } from 'lucide-react';
import { useTranslation } from '../../i18n/context';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-100">
      <div className="w-full max-w-lg bg-white dark:bg-[#1e1f20] rounded-3xl p-4 sm:p-6 shadow-xl border border-[#e0e3e7] dark:border-[#3c4043] max-h-[90dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#e0e3e7] dark:border-[#3c4043]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#f0f4f9] dark:bg-[#282a2c] flex items-center justify-center text-[#0b57d0] dark:text-[#a8c7fa] shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-[#1f1f1f] dark:text-[#e3e3e3]">
                {t('modals.privacyTitle')}
              </h3>
              <p className="text-[11px] text-[#747775] dark:text-[#8e918f]">
                {t('modals.privacySubtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-[#747775] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-4 space-y-4 text-xs text-[#444746] dark:text-[#c4c7c5]">
          {/* Brief Overview */}
          <div className="p-3.5 rounded-2xl bg-[#f0f4f9] dark:bg-[#282a2c] border border-[#e0e3e7] dark:border-[#3c4043]">
            <p className="text-xs text-[#444746] dark:text-[#c4c7c5] leading-relaxed">
              TGDocs runs entirely in your browser as a client-side interface. Your files and authentication keys are sent directly to Telegram without passing through any intermediate proxy or server.
            </p>
          </div>

          {/* Key Points */}
          <div className="space-y-3.5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#e9eef6] dark:bg-[#333538] flex items-center justify-center text-[#0b57d0] dark:text-[#a8c7fa] shrink-0 mt-0.5">
                <Cloud className="w-4 h-4" />
              </div>
              <div>
                <p className="font-medium text-xs text-[#1f1f1f] dark:text-[#e3e3e3]">
                  Direct Telegram Connection
                </p>
                <p className="text-[11px] text-[#747775] dark:text-[#8e918f] mt-0.5 leading-relaxed">
                  Files upload and download straight between your browser and Telegram's data centers. No TGDocs server ever stores, proxies, or reads your files.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#e9eef6] dark:bg-[#333538] flex items-center justify-center text-[#0b57d0] dark:text-[#a8c7fa] shrink-0 mt-0.5">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <p className="font-medium text-xs text-[#1f1f1f] dark:text-[#e3e3e3]">
                  Local Session Storage
                </p>
                <p className="text-[11px] text-[#747775] dark:text-[#8e918f] mt-0.5 leading-relaxed">
                  Your Telegram login session is encrypted and stored strictly on your local device (IndexedDB). Your credentials are never transmitted to third parties.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#e9eef6] dark:bg-[#333538] flex items-center justify-center text-[#0b57d0] dark:text-[#a8c7fa] shrink-0 mt-0.5">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <p className="font-medium text-xs text-[#1f1f1f] dark:text-[#e3e3e3]">
                  In-Account Sync
                </p>
                <p className="text-[11px] text-[#747775] dark:text-[#8e918f] mt-0.5 leading-relaxed">
                  Your folder structure, tags, and favorites are synced directly inside your own private Telegram storage chat — eliminating external databases entirely.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#e9eef6] dark:bg-[#333538] flex items-center justify-center text-[#0b57d0] dark:text-[#a8c7fa] shrink-0 mt-0.5">
                <Code2 className="w-4 h-4" />
              </div>
              <div>
                <p className="font-medium text-xs text-[#1f1f1f] dark:text-[#e3e3e3]">
                  Open Source & Transparent
                </p>
                <p className="text-[11px] text-[#747775] dark:text-[#8e918f] mt-0.5 leading-relaxed">
                  TGDocs is 100% open source under the MIT license. You can inspect the code, verify the network calls, or self-host it on your own static domain.
                </p>
              </div>
            </div>
          </div>

          {/* Legal Disclaimer */}
          <div className="p-3 rounded-xl bg-[#f0f4f9] dark:bg-[#282a2c] border border-[#e0e3e7] dark:border-[#3c4043] text-[11px] text-[#747775] dark:text-[#8e918f] leading-relaxed">
            <strong className="text-[#1f1f1f] dark:text-[#e3e3e3]">Disclaimer:</strong> TGDocs is an independent, community-driven open-source project and is not affiliated with, endorsed by, or sponsored by Telegram FZ-LLC.
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-[#e0e3e7] dark:border-[#3c4043] text-[11px] text-[#747775] dark:text-[#8e918f]">
          <div className="flex items-center gap-3">
            <a href="/privacy" target="_blank" rel="noreferrer" className="hover:text-[#0b57d0] dark:hover:text-[#a8c7fa] underline flex items-center gap-1">
              <span>Full Policy</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <span>•</span>
            <a href="/terms" target="_blank" rel="noreferrer" className="hover:text-[#0b57d0] dark:hover:text-[#a8c7fa] underline flex items-center gap-1">
              <span>Terms</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 rounded-xl bg-[#0b57d0] hover:bg-[#0842a0] dark:bg-[#a8c7fa] dark:hover:bg-[#d3e3fd] text-white dark:text-[#041e49] text-xs font-semibold transition cursor-pointer"
          >
            {t('modals.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};
