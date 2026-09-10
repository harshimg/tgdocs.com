import React from 'react';
import { ShieldCheck, Lock, Cloud, FileCode, CheckCircle, X, ExternalLink } from 'lucide-react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-100">
      <div className="w-full max-w-lg bg-white dark:bg-[#1e1f20] rounded-3xl p-4 sm:p-6 shadow-xl border border-[#e0e3e7] dark:border-[#3c4043] max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-[#e0e3e7] dark:border-[#3c4043]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#34a853] shrink-0" />
            <div>
              <h3 className="font-semibold text-base text-[#1f1f1f] dark:text-[#e3e3e3]">
                Privacy & Architecture
              </h3>
              <p className="text-[11px] text-[#747775] dark:text-[#8e918f]">
                How TGDocs protects your files and privacy
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

        <div className="py-4 space-y-4 text-xs text-[#444746] dark:text-[#c4c7c5]">
          {/* Visual Architecture */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#f0f4f9] dark:bg-[#282a2c] border border-[#e0e3e7] dark:border-[#3c4043] text-center">
            <p className="text-[11px] font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] mb-2 uppercase tracking-wider">
              Direct Peer-to-Peer Cloud Connection
            </p>
            <div className="flex flex-wrap sm:flex-nowrap items-center justify-center gap-2 sm:gap-4 py-2 font-mono text-xs">
              <span className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#1e1f20] shadow-xs font-semibold">
                Your Browser
              </span>
              <span className="text-[#0b57d0] dark:text-[#a8c7fa] font-bold text-[11px] sm:text-xs">
                ══ MTProto (WSS) ══▶
              </span>
              <span className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#1e1f20] shadow-xs font-semibold">
                Telegram DC
              </span>
            </div>
            <p className="text-[11px] text-[#747775] dark:text-[#8e918f] mt-1">
              Zero intermediary servers. TGDocs acts purely as a client-side interface layer.
            </p>
          </div>

          {/* Core Guarantees */}
          <div className="space-y-3">
            <div className="flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-[#34a853] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                  No Backend File Storage or Proxy
                </p>
                <p className="text-[11px] text-[#747775] dark:text-[#8e918f]">
                  Files are transferred directly between your browser and Telegram's data centers. No TGDocs server ever sees or buffers your file data.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-[#0b57d0] dark:text-[#a8c7fa] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                  Hardware-Grade Session Encryption
                </p>
                <p className="text-[11px] text-[#747775] dark:text-[#8e918f]">
                  Your Telegram login session is encrypted via AES-GCM 256-bit with non-extractable Web Crypto keys stored only in your local IndexedDB.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Cloud className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                  Cross-Device Sync Without Databases
                </p>
                <p className="text-[11px] text-[#747775] dark:text-[#8e918f]">
                  Your folder structure, tags, and favorites are synced directly inside a private Telegram channel in your own account.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <FileCode className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[#1f1f1f] dark:text-[#e3e3e3]">
                  100% Free & Open-Source
                </p>
                <p className="text-[11px] text-[#747775] dark:text-[#8e918f]">
                  Licensed under MIT. Fully self-hostable on Cloudflare Pages, Vercel, or any static hosting provider.
                </p>
              </div>
            </div>
          </div>

          {/* Legal Disclaimer */}
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300">
            <strong>Disclaimer:</strong> TGDocs is an independent, community-driven open-source project and is not affiliated with, endorsed by, or sponsored by Telegram FZ-LLC.
          </div>
        </div>

        <div className="flex items-center justify-end pt-4 border-t border-[#e0e3e7] dark:border-[#3c4043]">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 rounded-xl bg-[#0b57d0] hover:bg-[#0842a0] dark:bg-[#a8c7fa] dark:hover:bg-[#d3e3fd] text-white dark:text-[#041e49] text-xs font-semibold transition"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
