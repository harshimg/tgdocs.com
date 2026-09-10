import React, { useState, useEffect, useRef } from 'react';
import { useFileStore } from '../../store/file-store';
import { Breadcrumbs } from './Breadcrumbs';
import { FileToolbar } from './FileToolbar';
import { FolderCard } from './FolderCard';
import { FileCard } from './FileCard';
import { FileListView } from './FileListView';
import { DetailsPanel } from './DetailsPanel';
import { UploadDropzone } from './UploadDropzone';
import { FilePreviewModal } from './FilePreviewModal';
import { NewFolderModal } from '../modals/NewFolderModal';
import { RenameModal } from '../modals/RenameModal';
import { SettingsModal } from '../modals/SettingsModal';
import { PrivacyModal } from '../modals/PrivacyModal';
import type { TGFile, TGFolder } from '../../storage/types';
import {
  Folder,
  File,
  Loader2,
  Inbox,
  Star,
  Clock,
  Trash2,
  Upload,
  Plus,
  FolderPlus,
} from 'lucide-react';

interface FileManagerProps {
  onOpenPrivacyModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenNewFolderModal?: () => void;
  privacyModalOpen: boolean;
  settingsModalOpen: boolean;
  setPrivacyModalOpen: (open: boolean) => void;
  setSettingsModalOpen: (open: boolean) => void;
}

export const FileManager: React.FC<FileManagerProps> = ({
  privacyModalOpen,
  settingsModalOpen,
  onOpenNewFolderModal,
  setPrivacyModalOpen,
  setSettingsModalOpen,
}) => {
  const {
    folders,
    files,
    currentFolderId,
    activeFilter,
    searchQuery,
    viewMode,
    sortBy,
    sortOrder,
    isLoading,
    loadAll,
    uploadFiles,
  } = useFileStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const fabFileInputRef = useRef<HTMLInputElement>(null);
  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);
  const [renameItem, setRenameItem] = useState<{ type: 'file' | 'folder'; data: TGFile | TGFolder } | null>(null);
  const [previewFile, setPreviewFile] = useState<TGFile | null>(null);
  const [fabOpen, setFabOpen] = useState(false);

  const currentFolder = folders.find((f) => f.id === currentFolderId);
  const currentFolderName = currentFolder ? currentFolder.name : 'My Storage';

  useEffect(() => {
    loadAll();
  }, []);

  // Filter folders
  const visibleFolders = folders.filter((folder) => {
    if (activeFilter !== 'all') return false;
    if (searchQuery) {
      return folder.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return folder.parentId === currentFolderId;
  });

  // Filter files
  const visibleFiles = files
    .filter((file) => {
      // Trash filter
      if (activeFilter === 'trash') {
        return file.isTrashed;
      }
      if (file.isTrashed) return false;

      // Starred filter
      if (activeFilter === 'favorites') {
        return file.isFavorite;
      }

      // Recent filter
      if (activeFilter === 'recent') {
        return true; // We will sort by date
      }

      // Search
      if (searchQuery) {
        return (
          file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          file.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      }

      // Folder filtering
      return file.folderId === currentFolderId;
    })
    .sort((a, b) => {
      if (activeFilter === 'recent') {
        return b.date - a.date;
      }

      let cmp = 0;
      if (sortBy === 'name') {
        cmp = a.name.localeCompare(b.name);
      } else if (sortBy === 'date') {
        cmp = a.date - b.date;
      } else if (sortBy === 'size') {
        cmp = a.size - b.size;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });

  const getEmptyStateMessage = () => {
    if (searchQuery) return 'No matching files or folders found';
    if (activeFilter === 'favorites') return 'No starred items yet';
    if (activeFilter === 'recent') return 'No recent files';
    if (activeFilter === 'trash') return 'Trash is empty';
    return 'This folder is empty';
  };

  const getEmptyStateIcon = () => {
    if (activeFilter === 'favorites') return <Star className="w-12 h-12 text-[#747775]" />;
    if (activeFilter === 'recent') return <Clock className="w-12 h-12 text-[#747775]" />;
    if (activeFilter === 'trash') return <Trash2 className="w-12 h-12 text-[#747775]" />;
    return <Inbox className="w-12 h-12 text-[#747775]" />;
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-[#131314] transition-colors select-none">
      {/* Breadcrumbs & Toolbar */}
      <div className="px-3 sm:px-6 pt-2 sm:pt-3 pb-1 border-b border-[#e0e3e7] dark:border-[#3c4043] bg-white dark:bg-[#1e1f20]">
        <Breadcrumbs />
      </div>
      <FileToolbar />

      {/* Main Workspace Area + Right Details Panel */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Content Scroll Area */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 pb-24 lg:pb-6 transition-colors">
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-[#747775] dark:text-[#8e918f]">
              <Loader2 className="w-8 h-8 animate-spin text-[#0b57d0] dark:text-[#a8c7fa]" />
              <p className="text-xs">Loading storage files...</p>
            </div>
          ) : visibleFolders.length === 0 && visibleFiles.length === 0 ? (
            activeFilter === 'all' && !searchQuery ? (
              <div className="h-full min-h-[380px] sm:min-h-[460px] flex flex-col items-center justify-center text-center p-4 sm:p-8 select-none animate-in fade-in duration-200">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      uploadFiles(e.target.files);
                      e.target.value = '';
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-16 h-16 rounded-2xl bg-[#d3e3fd]/60 dark:bg-[#004a77]/50 hover:bg-[#c2e7ff] dark:hover:bg-[#004a77] flex items-center justify-center text-[#0b57d0] dark:text-[#a8c7fa] mb-4 transition-transform hover:scale-110 active:scale-95 cursor-pointer shadow-sm"
                  title="Click to browse files"
                >
                  <Upload className="w-7 h-7" />
                </button>
                <h3 className="text-lg sm:text-xl font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] mb-1 tracking-tight">
                  Drop files here to upload to {currentFolderName}
                </h3>
                <p className="text-xs sm:text-sm text-[#747775] dark:text-[#8e918f]">
                  or click the upload icon to browse from your device
                </p>
              </div>
            ) : (
              <div className="h-80 flex flex-col items-center justify-center gap-3 text-center text-[#747775] dark:text-[#8e918f] p-4">
                {getEmptyStateIcon()}
                <h4 className="text-base font-medium text-[#1f1f1f] dark:text-[#e3e3e3]">
                  {getEmptyStateMessage()}
                </h4>
                <p className="text-xs max-w-xs">
                  Drag and drop files here, or click '+ New' to upload files directly to your Telegram Cloud.
                </p>
              </div>
            )
          ) : viewMode === 'list' ? (
            <FileListView
              folders={visibleFolders}
              files={visibleFiles}
              onRenameFolder={(f) => setRenameItem({ type: 'folder', data: f })}
              onRenameFile={(f) => setRenameItem({ type: 'file', data: f })}
              onPreviewFile={(f) => setPreviewFile(f)}
            />
          ) : (
            <div className="space-y-6 sm:space-y-8">
              {/* Folders Section (Google Drive Style) */}
              {visibleFolders.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-[#444746] dark:text-[#c4c7c5] uppercase tracking-wider mb-2.5 sm:mb-3">
                    Folders
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
                    {visibleFolders.map((folder) => (
                      <FolderCard
                        key={folder.id}
                        folder={folder}
                        onRename={(f) => setRenameItem({ type: 'folder', data: f })}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Files Section (Google Drive Style) */}
              {visibleFiles.length > 0 ? (
                <div>
                  <h3 className="text-xs font-semibold text-[#444746] dark:text-[#c4c7c5] uppercase tracking-wider mb-2.5 sm:mb-3">
                    Files
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-4">
                    {visibleFiles.map((file) => (
                      <FileCard
                        key={file.id}
                        file={file}
                        onRename={(f) => setRenameItem({ type: 'file', data: f })}
                        onPreview={(f) => setPreviewFile(f)}
                      />
                    ))}
                  </div>

                  {/* Google Drive Dropzone Area below files */}
                  {activeFilter === 'all' && !searchQuery && (
                    <div className="mt-12 py-8 flex flex-col items-center justify-center text-center select-none">
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            uploadFiles(e.target.files);
                            e.target.value = '';
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-14 h-14 rounded-2xl bg-[#d3e3fd]/60 dark:bg-[#004a77]/50 hover:bg-[#c2e7ff] dark:hover:bg-[#004a77] flex items-center justify-center text-[#0b57d0] dark:text-[#a8c7fa] mb-3 transition-transform hover:scale-110 active:scale-95 cursor-pointer shadow-sm"
                        title="Click to browse files"
                      >
                        <Upload className="w-6 h-6" />
                      </button>
                      <h4 className="text-sm font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] mb-1">
                        Drop files here to upload to {currentFolderName}
                      </h4>
                      <p className="text-xs text-[#747775] dark:text-[#8e918f]">
                        or click the upload icon to browse from your device
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                activeFilter === 'all' && !searchQuery && (
                  <div className="mt-8 py-8 flex flex-col items-center justify-center text-center select-none">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          uploadFiles(e.target.files);
                          e.target.value = '';
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-14 h-14 rounded-2xl bg-[#d3e3fd]/60 dark:bg-[#004a77]/50 hover:bg-[#c2e7ff] dark:hover:bg-[#004a77] flex items-center justify-center text-[#0b57d0] dark:text-[#a8c7fa] mb-3 transition-transform hover:scale-110 active:scale-95 cursor-pointer shadow-sm"
                      title="Click to browse files"
                    >
                      <Upload className="w-6 h-6" />
                    </button>
                    <h4 className="text-sm font-semibold text-[#1f1f1f] dark:text-[#e3e3e3] mb-1">
                      Drop files here to upload to {currentFolderName}
                    </h4>
                    <p className="text-xs text-[#747775] dark:text-[#8e918f]">
                      or click the upload icon to browse from your device
                    </p>
                  </div>
                )
              )}
            </div>
          )}
        </main>

        {/* Right Details Panel */}
        <DetailsPanel />
      </div>

      {/* Hidden file input for FAB file upload */}
      <input
        ref={fabFileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            uploadFiles(e.target.files);
            e.target.value = '';
          }
        }}
      />

      {/* Google Drive Mobile Floating Action Button (FAB) */}
      <div className="lg:hidden fixed bottom-5 right-5 z-30">
        {/* Backdrop when FAB menu is open */}
        {fabOpen && (
          <div
            onClick={() => setFabOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-30 animate-in fade-in duration-100"
          />
        )}

        <div className="relative z-40 flex flex-col items-end gap-2.5">
          {/* Expanded FAB Menu Items */}
          {fabOpen && (
            <div className="flex flex-col items-end gap-2 mb-1 animate-in slide-in-from-bottom-4 duration-150">
              <button
                onClick={() => {
                  setFabOpen(false);
                  if (onOpenNewFolderModal) {
                    onOpenNewFolderModal();
                  } else {
                    setNewFolderModalOpen(true);
                  }
                }}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-white dark:bg-[#282a2c] text-[#1f1f1f] dark:text-[#e3e3e3] shadow-xl border border-[#e0e3e7] dark:border-[#3c4043] text-xs font-semibold cursor-pointer active:scale-95 transition"
              >
                <span>New folder</span>
                <FolderPlus className="w-4 h-4 text-[#0b57d0] dark:text-[#a8c7fa]" />
              </button>

              <button
                onClick={() => {
                  setFabOpen(false);
                  fabFileInputRef.current?.click();
                }}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-white dark:bg-[#282a2c] text-[#1f1f1f] dark:text-[#e3e3e3] shadow-xl border border-[#e0e3e7] dark:border-[#3c4043] text-xs font-semibold cursor-pointer active:scale-95 transition"
              >
                <span>Upload files</span>
                <Upload className="w-4 h-4 text-[#0b57d0] dark:text-[#a8c7fa]" />
              </button>
            </div>
          )}

          {/* Main Floating '+' Button */}
          <button
            onClick={() => setFabOpen(!fabOpen)}
            className="w-14 h-14 rounded-2xl bg-white dark:bg-[#282a2c] text-[#0b57d0] dark:text-[#a8c7fa] shadow-[0_4px_16px_rgba(0,0,0,0.25)] hover:shadow-2xl active:scale-90 flex items-center justify-center transition-all cursor-pointer border border-[#e0e3e7] dark:border-[#3c4043]"
            title="Create new or upload"
            aria-label="Create new or upload"
          >
            <Plus
              className={`w-7 h-7 transition-transform duration-200 ${
                fabOpen ? 'rotate-45 text-red-500 dark:text-red-400' : ''
              }`}
              strokeWidth={2.5}
            />
          </button>
        </div>
      </div>

      {/* Floating Drag & Drop Dropzone */}
      <UploadDropzone />

      {/* Modals */}
      <NewFolderModal
        isOpen={newFolderModalOpen}
        onClose={() => setNewFolderModalOpen(false)}
      />

      <RenameModal
        item={renameItem}
        onClose={() => setRenameItem(null)}
      />

      <FilePreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
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
