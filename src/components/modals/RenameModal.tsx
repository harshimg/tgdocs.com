import React, { useState, useEffect } from 'react';
import { useFileStore } from '../../store/file-store';
import { Edit2, X } from 'lucide-react';
import type { TGFile, TGFolder } from '../../storage/types';
import { useTranslation } from '../../i18n/context';

interface RenameModalProps {
  item: { type: 'file' | 'folder'; data: TGFile | TGFolder } | null;
  onClose: () => void;
}

export const RenameModal: React.FC<RenameModalProps> = ({ item, onClose }) => {
  const { renameFile, renameFolder } = useFileStore();
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item) {
      setName(item.data.name);
    }
  }, [item]);

  if (!item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    if (item.type === 'file') {
      await renameFile(item.data.id, name.trim());
    } else {
      await renameFolder(item.data.id, name.trim());
    }
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-100">
      <div className="w-full max-w-sm bg-white dark:bg-[#1e1f20] rounded-3xl p-5 sm:p-6 shadow-xl border border-[#e0e3e7] dark:border-[#3c4043]">
        <div className="flex items-center justify-between pb-3 border-b border-[#e0e3e7] dark:border-[#3c4043]">
          <div className="flex items-center gap-2">
            <Edit2 className="w-5 h-5 text-[#0b57d0] dark:text-[#a8c7fa]" />
            <h3 className="font-semibold text-base text-[#1f1f1f] dark:text-[#e3e3e3]">
              {t('modals.renameTitle')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] text-[#747775] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <input
            type="text"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 sm:py-2.5 rounded-xl bg-[#f8fafd] dark:bg-[#282a2c] border border-[#e0e3e7] dark:border-[#3c4043] text-base sm:text-sm text-[#1f1f1f] dark:text-[#e3e3e3] focus:outline-none focus:ring-2 focus:ring-[#0b57d0] dark:focus:ring-[#a8c7fa]"
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 sm:py-2 px-4 rounded-xl text-xs font-medium text-[#444746] dark:text-[#c4c7c5] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] transition cursor-pointer"
            >
              {t('modals.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="py-2.5 sm:py-2 px-5 rounded-xl bg-[#0b57d0] hover:bg-[#0842a0] dark:bg-[#a8c7fa] dark:hover:bg-[#d3e3fd] text-white dark:text-[#041e49] text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? '...' : t('modals.rename')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
