import React, { useState, useRef, useEffect } from 'react';
import { useFileStore } from '../../store/file-store';
import { formatBytes } from '../../utils/file-utils';
import {
  Plus,
  FolderPlus,
  Upload,
  HardDrive,
  Star,
  Clock,
  Trash2,
  ChevronRight,
  ChevronDown,
  Folder,
  Cloud,
  X,
} from 'lucide-react';

interface SidebarProps {
  onOpenNewFolderModal: () => void;
  onOpenSettingsModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenNewFolderModal, onOpenSettingsModal }) => {
  const {
    activeFilter,
    currentFolderId,
    folders,
    stats,
    setActiveFilter,
    setCurrentFolder,
    uploadFiles,
    mobileSidebarOpen,
    setMobileSidebarOpen,
  } = useFileStore();

  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [foldersExpanded, setFoldersExpanded] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setNewMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFileUploadTrigger = () => {
    setNewMenuOpen(false);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files);
      e.target.value = '';
      if (mobileSidebarOpen) setMobileSidebarOpen(false);
    }
  };

  const handleNavClick = (filter: 'all' | 'favorites' | 'recent' | 'trash') => {
    setActiveFilter(filter);
    if (mobileSidebarOpen) setMobileSidebarOpen(false);
  };

  const handleFolderClick = (folderId: string) => {
    setCurrentFolder(folderId);
    if (mobileSidebarOpen) setMobileSidebarOpen(false);
  };

  // Build top-level folders
  const rootFolders = folders.filter((f) => !f.parentId);

  return (
    <>
      {/* Mobile Drawer Backdrop Overlay */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 lg:hidden animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      {/* Sidebar: Fixed drawer on mobile, static column on desktop */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 lg:z-auto w-72 lg:w-64 flex flex-col justify-between p-4 border-r border-[#e0e3e7] dark:border-[#3c4043] bg-[#f8fafd] dark:bg-[#1e1f20] shrink-0 transition-transform duration-300 ease-in-out select-none shadow-xl lg:shadow-none ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Mobile Header with Close Button */}
        <div className="flex items-center justify-between pb-3 mb-1 border-b border-[#e0e3e7] dark:border-[#3c4043] lg:hidden">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.svg"
              alt="TGDocs Logo"
              className="w-8 h-8 rounded-lg object-contain shrink-0"
            />
            <span className="font-semibold text-sm text-[#1f1f1f] dark:text-[#e3e3e3]">TGDocs Drive</span>
          </div>
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="p-1.5 rounded-full hover:bg-[#e9eef6] dark:hover:bg-[#282a2c] text-[#747775] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] transition"
            title="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hidden file input */}
        <input
          type="file"
          multiple
          accept="*/*"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

      <div className="space-y-4">
        {/* Google Drive "+ New" Pill Button */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setNewMenuOpen(!newMenuOpen)}
            className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-white dark:bg-[#282a2c] hover:bg-[#f0f4f9] dark:hover:bg-[#333538] text-[#1f1f1f] dark:text-[#e3e3e3] font-medium text-sm shadow-[0_1px_3px_0_rgba(60,64,67,0.3),0_4px_8px_3px_rgba(60,64,67,0.15)] hover:shadow-[0_2px_6px_2px_rgba(60,64,67,0.15),0_1px_2px_0_rgba(60,64,67,0.3)] transition-all"
          >
            {/* Multi-colored Google plus icon */}
            <div className="relative w-6 h-6 flex items-center justify-center">
              <Plus className="w-6 h-6 text-[#0b57d0] dark:text-[#a8c7fa]" strokeWidth={2.5} />
            </div>
            <span>New</span>
          </button>

          {/* New Menu Dropdown */}
          {newMenuOpen && (
            <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-[#282a2c] rounded-2xl shadow-xl border border-[#e0e3e7] dark:border-[#3c4043] py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              <button
                onClick={() => {
                  setNewMenuOpen(false);
                  onOpenNewFolderModal();
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-[#1f1f1f] dark:text-[#e3e3e3] hover:bg-[#f0f4f9] dark:hover:bg-[#333538] flex items-center gap-3 transition"
              >
                <FolderPlus className="w-4 h-4 text-[#747775] dark:text-[#8e918f]" />
                <span>New folder</span>
              </button>

              <div className="my-1 border-t border-[#e0e3e7] dark:border-[#3c4043]" />

              <button
                onClick={handleFileUploadTrigger}
                className="w-full text-left px-4 py-2.5 text-sm text-[#1f1f1f] dark:text-[#e3e3e3] hover:bg-[#f0f4f9] dark:hover:bg-[#333538] flex items-center gap-3 transition"
              >
                <Upload className="w-4 h-4 text-[#747775] dark:text-[#8e918f]" />
                <span>File upload</span>
              </button>
            </div>
          )}
        </div>

        {/* Navigation List */}
        <nav className="space-y-1 text-sm font-medium">
          {/* Storage / All Files */}
          <button
            onClick={() => handleNavClick('all')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-full transition cursor-pointer ${
              activeFilter === 'all' && currentFolderId === null
                ? 'bg-[#c2e7ff] text-[#001d35] font-semibold dark:bg-[#004a77] dark:text-[#c2e7ff]'
                : 'text-[#444746] dark:text-[#c4c7c5] hover:bg-[#e9eef6] dark:hover:bg-[#282a2c]'
            }`}
          >
            <HardDrive className="w-5 h-5 shrink-0" />
            <span>My Storage</span>
          </button>

          {/* Starred */}
          <button
            onClick={() => handleNavClick('favorites')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-full transition cursor-pointer ${
              activeFilter === 'favorites'
                ? 'bg-[#c2e7ff] text-[#001d35] font-semibold dark:bg-[#004a77] dark:text-[#c2e7ff]'
                : 'text-[#444746] dark:text-[#c4c7c5] hover:bg-[#e9eef6] dark:hover:bg-[#282a2c]'
            }`}
          >
            <Star className="w-5 h-5 shrink-0" />
            <span>Starred</span>
          </button>

          {/* Recent */}
          <button
            onClick={() => handleNavClick('recent')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-full transition cursor-pointer ${
              activeFilter === 'recent'
                ? 'bg-[#c2e7ff] text-[#001d35] font-semibold dark:bg-[#004a77] dark:text-[#c2e7ff]'
                : 'text-[#444746] dark:text-[#c4c7c5] hover:bg-[#e9eef6] dark:hover:bg-[#282a2c]'
            }`}
          >
            <Clock className="w-5 h-5 shrink-0" />
            <span>Recent</span>
          </button>

          {/* Trash */}
          <button
            onClick={() => handleNavClick('trash')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-full transition cursor-pointer ${
              activeFilter === 'trash'
                ? 'bg-[#c2e7ff] text-[#001d35] font-semibold dark:bg-[#004a77] dark:text-[#c2e7ff]'
                : 'text-[#444746] dark:text-[#c4c7c5] hover:bg-[#e9eef6] dark:hover:bg-[#282a2c]'
            }`}
          >
            <Trash2 className="w-5 h-5 shrink-0" />
            <span>Trash</span>
          </button>
        </nav>

        {/* Folders Accordion List */}
        {rootFolders.length > 0 && (
          <div className="pt-2 border-t border-[#e0e3e7] dark:border-[#3c4043]">
            <button
              onClick={() => setFoldersExpanded(!foldersExpanded)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-[#747775] dark:text-[#8e918f] hover:text-[#1f1f1f] dark:hover:text-[#e3e3e3] cursor-pointer"
            >
              <span className="font-semibold uppercase tracking-wider text-[10px]">Folders</span>
              {foldersExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>

            {foldersExpanded && (
              <div className="mt-1 space-y-0.5 max-h-48 overflow-y-auto pr-1">
                {rootFolders.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => handleFolderClick(f.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition truncate cursor-pointer ${
                      currentFolderId === f.id
                        ? 'bg-[#c2e7ff] text-[#001d35] font-medium dark:bg-[#004a77] dark:text-[#c2e7ff]'
                        : 'text-[#444746] dark:text-[#c4c7c5] hover:bg-[#e9eef6] dark:hover:bg-[#282a2c]'
                    }`}
                  >
                    <Folder className="w-4 h-4 shrink-0 text-[#747775] dark:text-[#8e918f]" />
                    <span className="truncate">{f.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Storage Quota widget */}
      <div className="pt-4 border-t border-[#e0e3e7] dark:border-[#3c4043] space-y-2">
        <div className="flex items-center gap-2 text-xs font-medium text-[#444746] dark:text-[#c4c7c5]">
          <Cloud className="w-4 h-4 text-[#0b57d0] dark:text-[#a8c7fa]" />
          <span>Storage</span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-[#e0e3e7] dark:bg-[#3c4043] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#0b57d0] dark:bg-[#a8c7fa] rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(5, ((stats?.usedBytes || 0) / (15 * 1024 * 1024 * 1024)) * 100))}%` }}
          />
        </div>

        <p className="text-[11px] text-[#747775] dark:text-[#8e918f]">
          {formatBytes(stats?.usedBytes || 0)} used · Telegram Cloud
        </p>

        <button
          onClick={() => {
            if (mobileSidebarOpen) setMobileSidebarOpen(false);
            onOpenSettingsModal();
          }}
          className="w-full mt-1 py-1.5 px-3 rounded-lg border border-[#e0e3e7] dark:border-[#3c4043] hover:bg-[#e9eef6] dark:hover:bg-[#282a2c] text-[11px] font-medium text-[#0b57d0] dark:text-[#a8c7fa] transition text-center cursor-pointer"
        >
          Storage options
        </button>
      </div>
    </aside>
  </>
  );
};
