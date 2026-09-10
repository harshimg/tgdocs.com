import React, { useState } from 'react';
import { useFileStore } from '../../store/file-store';
import { FolderPlus, X } from 'lucide-react';

interface NewFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewFolderModal: React.FC<NewFolderModalProps> = ({ isOpen, onClose }) => {
  const { createFolder } = useFileStore();
  const [folderName, setFolderName] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    setLoading(true);
    await createFolder(folderName.trim());
    setLoading(false);
    setFolderName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-100">
      <div className="w-full max-w-sm bg-white dark:bg-[#1e1f20] rounded-3xl p-5 sm:p-6 shadow-xl border border-[#e0e3e7] dark:border-[#3c4043]">
        <div className="flex items-center justify-between pb-3 border-b border-[#e0e3e7] dark:border-[#3c4043]">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-[#0b57d0] dark:text-[#a8c7fa]" />
            <h3 className="font-semibold text-base text-[#1f1f1f] dark:text-[#e3e3e3]">New folder</h3>
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
            placeholder="Untitled folder"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            className="w-full px-4 py-3 sm:py-2.5 rounded-xl bg-[#f8fafd] dark:bg-[#282a2c] border border-[#e0e3e7] dark:border-[#3c4043] text-base sm:text-sm text-[#1f1f1f] dark:text-[#e3e3e3] focus:outline-none focus:ring-2 focus:ring-[#0b57d0] dark:focus:ring-[#a8c7fa]"
          />

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 sm:py-2 px-4 rounded-xl text-xs font-medium text-[#444746] dark:text-[#c4c7c5] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !folderName.trim()}
              className="py-2.5 sm:py-2 px-5 rounded-xl bg-[#0b57d0] hover:bg-[#0842a0] dark:bg-[#a8c7fa] dark:hover:bg-[#d3e3fd] text-white dark:text-[#041e49] text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
