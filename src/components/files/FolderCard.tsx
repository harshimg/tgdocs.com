import React, { useState, useRef, useEffect } from 'react';
import type { TGFolder } from '../../storage/types';
import { useFileStore } from '../../store/file-store';
import { Folder, MoreVertical, Edit2, Trash2, Info } from 'lucide-react';

interface FolderCardProps {
  folder: TGFolder;
  onRename: (folder: TGFolder) => void;
}

export const FolderCard: React.FC<FolderCardProps> = ({ folder, onRename }) => {
  const { setCurrentFolder, deleteFolder, setInspectedItem, setDetailsPanelOpen } = useFileStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    // If clicking menu trigger or menu itself, don't trigger folder open
    if (menuRef.current && menuRef.current.contains(e.target as Node)) {
      return;
    }
    setCurrentFolder(folder.id);
  };

  return (
    <div
      onClick={handleClick}
      onDoubleClick={() => setCurrentFolder(folder.id)}
      className="group relative flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-[#f0f4f9] dark:bg-[#282a2c] hover:bg-[#e9eef6] dark:hover:bg-[#333538] border border-transparent hover:border-[#c4c7c5] dark:hover:border-[#5e6266] transition cursor-pointer select-none"
    >
      <div className="flex items-center gap-2.5 sm:gap-3 overflow-hidden min-w-0">
        <Folder
          className="w-5 h-5 shrink-0 text-[#444746] dark:text-[#c4c7c5] group-hover:text-[#1f1f1f] dark:group-hover:text-white"
          fill={folder.color || 'currentColor'}
          fillOpacity={0.15}
        />
        <span className="text-xs sm:text-sm font-medium text-[#1f1f1f] dark:text-[#e3e3e3] truncate">
          {folder.name}
        </span>
      </div>

      <div className="relative shrink-0" ref={menuRef}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
          className="p-1.5 rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-[#dde3ea] dark:hover:bg-[#3c4043] text-[#444746] dark:text-[#c4c7c5] transition cursor-pointer"
          title="Folder options"
          aria-label="Folder options"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-[#1e1f20] rounded-xl shadow-xl border border-[#e0e3e7] dark:border-[#3c4043] py-1.5 z-40">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                setInspectedItem({ type: 'folder', data: folder });
                setDetailsPanelOpen(true);
              }}
              className="w-full text-left px-3 py-2 text-xs text-[#1f1f1f] dark:text-[#e3e3e3] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] flex items-center gap-2 cursor-pointer"
            >
              <Info className="w-3.5 h-3.5 text-[#747775]" />
              <span>Folder details</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                onRename(folder);
              }}
              className="w-full text-left px-3 py-2 text-xs text-[#1f1f1f] dark:text-[#e3e3e3] hover:bg-[#f0f4f9] dark:hover:bg-[#282a2c] flex items-center gap-2 cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-[#747775]" />
              <span>Rename</span>
            </button>
            <div className="my-1 border-t border-[#e0e3e7] dark:border-[#3c4043]" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                deleteFolder(folder.id);
              }}
              className="w-full text-left px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete folder</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
