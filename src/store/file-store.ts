/**
 * TGDocs File & Directory State Store
 */

import { create } from 'zustand';
import type { TGFile, TGFolder, UploadTask, StorageStats } from '../storage/types';
import { getActiveStorageProvider } from '../storage';

export type NavFilter = 'all' | 'recent' | 'favorites' | 'trash';
export type ViewMode = 'grid' | 'list';
export type SortField = 'name' | 'date' | 'size';

interface FileState {
  // Navigation & Filter
  currentFolderId: string | null;
  activeFilter: NavFilter;
  searchQuery: string;
  viewMode: ViewMode;
  sortBy: SortField;
  sortOrder: 'asc' | 'desc';

  // Data
  files: TGFile[];
  folders: TGFolder[];
  selectedFileIds: string[];
  stats: StorageStats | null;
  isLoading: boolean;
  error: string | null;

  // Upload Queue
  uploadQueue: UploadTask[];

  // Inspection / Details Sidebar
  detailsPanelOpen: boolean;
  inspectedItem: { type: 'file' | 'folder'; data: TGFile | TGFolder } | null;

  // Mobile Navigation Drawer
  mobileSidebarOpen: boolean;

  // Theme
  isDarkMode: boolean;

  // Actions
  toggleTheme: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
  setCurrentFolder: (folderId: string | null) => void;
  setActiveFilter: (filter: NavFilter) => void;
  setSearchQuery: (query: string) => void;
  setViewMode: (mode: ViewMode) => void;
  setSort: (by: SortField) => void;
  toggleSelectFile: (fileId: string, multi?: boolean) => void;
  selectAllFiles: () => void;
  clearSelection: () => void;
  setInspectedItem: (item: { type: 'file' | 'folder'; data: TGFile | TGFolder } | null) => void;
  toggleDetailsPanel: () => void;
  setDetailsPanelOpen: (open: boolean) => void;

  // Storage operations
  loadAll: () => Promise<void>;
  createFolder: (name: string) => Promise<TGFolder | null>;
  renameFolder: (folderId: string, newName: string) => Promise<void>;
  deleteFolder: (folderId: string) => Promise<void>;
  uploadFiles: (files: FileList | File[]) => Promise<void>;
  downloadFile: (fileId: string) => Promise<void>;
  renameFile: (fileId: string, newName: string) => Promise<void>;
  moveFile: (fileId: string, targetFolderId: string | null) => Promise<void>;
  toggleFavorite: (fileId: string) => Promise<void>;
  trashSelectedFiles: () => Promise<void>;
  restoreSelectedFiles: () => Promise<void>;
  deleteSelectedPermanently: () => Promise<void>;
  trashFile: (fileId: string) => Promise<void>;
  restoreFile: (fileId: string) => Promise<void>;
  deleteFilePermanently: (fileId: string) => Promise<void>;
}

export const useFileStore = create<FileState>((set, get) => ({
  currentFolderId: null,
  activeFilter: 'all',
  searchQuery: '',
  viewMode: 'grid',
  sortBy: 'date',
  sortOrder: 'desc',

  files: [],
  folders: [],
  selectedFileIds: [],
  stats: null,
  isLoading: false,
  error: null,
  uploadQueue: [],

  detailsPanelOpen: false,
  inspectedItem: null,
  mobileSidebarOpen: false,

  isDarkMode: typeof window !== 'undefined'
    ? (localStorage.getItem('tgdocs_theme')
        ? localStorage.getItem('tgdocs_theme') === 'dark'
        : document.documentElement.classList.contains('dark') || true)
    : true,

  toggleTheme: () => {
    const next = !get().isDarkMode;
    set({ isDarkMode: next });
    if (typeof window !== 'undefined') {
      localStorage.setItem('tgdocs_theme', next ? 'dark' : 'light');
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  },

  setMobileSidebarOpen: (mobileSidebarOpen) => set({ mobileSidebarOpen }),

  setCurrentFolder: (folderId) => {
    set({ currentFolderId: folderId, activeFilter: 'all', selectedFileIds: [] });
    get().loadAll();
  },

  setActiveFilter: (filter) => {
    set({ activeFilter: filter, currentFolderId: null, selectedFileIds: [] });
    get().loadAll();
  },

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  setViewMode: (viewMode) => set({ viewMode }),

  setSort: (by) => {
    const { sortBy, sortOrder } = get();
    if (sortBy === by) {
      set({ sortOrder: sortOrder === 'asc' ? 'desc' : 'asc' });
    } else {
      set({ sortBy: by, sortOrder: 'desc' });
    }
  },

  toggleSelectFile: (fileId, multi = false) => {
    const { selectedFileIds, files } = get();
    let updated: string[];
    if (multi) {
      if (selectedFileIds.includes(fileId)) {
        updated = selectedFileIds.filter((id) => id !== fileId);
      } else {
        updated = [...selectedFileIds, fileId];
      }
    } else {
      updated = [fileId];
    }
    set({ selectedFileIds: updated });

    if (updated.length === 1) {
      const f = files.find((item) => item.id === updated[0]);
      if (f) {
        set({ inspectedItem: { type: 'file', data: f } });
      }
    } else if (updated.length === 0) {
      set({ inspectedItem: null });
    }
  },

  selectAllFiles: () => {
    const { files } = get();
    set({ selectedFileIds: files.map((f) => f.id) });
  },

  clearSelection: () => set({ selectedFileIds: [], inspectedItem: null }),

  setInspectedItem: (item) => {
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
    set({
      inspectedItem: item,
      detailsPanelOpen: isDesktop ? !!item : false,
    });
  },

  toggleDetailsPanel: () => set((s) => ({ detailsPanelOpen: !s.detailsPanelOpen })),

  setDetailsPanelOpen: (open: boolean) => set({ detailsPanelOpen: open }),

  loadAll: async () => {
    set({ isLoading: true, error: null });
    try {
      const provider = getActiveStorageProvider();
      await provider.init?.();
      const folders = await provider.getFolders();

      const { currentFolderId, activeFilter } = get();
      let validFolderId = currentFolderId;
      if (currentFolderId && !folders.some((f) => f.id === currentFolderId)) {
        validFolderId = null;
      }

      const targetFolderId = activeFilter === 'all' ? (validFolderId ?? undefined) : undefined;
      const [folderFiles, stats] = await Promise.all([
        provider.listFiles(targetFolderId),
        provider.getStats(),
      ]);

      set({
        currentFolderId: validFolderId,
        folders,
        files: folderFiles,
        stats,
        isLoading: false,
      });
    } catch (e: any) {
      set({ isLoading: false, error: e.message || 'Error loading storage content' });
    }
  },

  createFolder: async (name: string) => {
    const provider = getActiveStorageProvider();
    const { currentFolderId } = get();
    set({ error: null });
    try {
      const newFolder = await provider.createFolder(name, currentFolderId);
      set((state) => ({ folders: [...state.folders, newFolder], error: null }));
      return newFolder;
    } catch (e: any) {
      set({ error: e.message || 'Could not create folder' });
      return null;
    }
  },

  renameFolder: async (folderId: string, newName: string) => {
    const provider = getActiveStorageProvider();
    try {
      await provider.renameFolder(folderId, newName);
      set((state) => ({
        folders: state.folders.map((f) => (f.id === folderId ? { ...f, name: newName } : f)),
      }));
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  deleteFolder: async (folderId: string) => {
    const provider = getActiveStorageProvider();
    try {
      await provider.deleteFolder(folderId);
      set((state) => ({
        folders: state.folders.filter((f) => f.id !== folderId && f.parentId !== folderId),
      }));
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  uploadFiles: async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const provider = getActiveStorageProvider();
    const { currentFolderId } = get();

    for (const file of files) {
      const taskId = 'up_' + Math.random().toString(36).substring(2, 9);
      const newTask: UploadTask = {
        id: taskId,
        file,
        folderId: currentFolderId,
        progress: 0,
        status: 'uploading',
      };

      set((s) => ({ uploadQueue: [newTask, ...s.uploadQueue] }));

      try {
        const uploadedFile = await provider.uploadFile(file, currentFolderId, (pct) => {
          set((s) => ({
            uploadQueue: s.uploadQueue.map((t) => (t.id === taskId ? { ...t, progress: pct } : t)),
          }));
        });

        // Update files list and refresh stats
        let stats: StorageStats | null = null;
        try {
          stats = await provider.getStats();
        } catch {
          // ignore stats refresh error
        }

        set((s) => ({
          files: [uploadedFile, ...s.files.filter((f) => f.id !== uploadedFile.id)],
          ...(stats ? { stats } : {}),
          uploadQueue: s.uploadQueue.map((t) =>
            t.id === taskId ? { ...t, status: 'completed', progress: 100 } : t
          ),
        }));
      } catch (err: any) {
        console.error('Upload failed for', file.name, err);
        set((s) => ({
          uploadQueue: s.uploadQueue.map((t) =>
            t.id === taskId ? { ...t, status: 'error', error: err.message || 'Upload failed' } : t
          ),
        }));
      }
    }
  },

  downloadFile: async (fileId: string) => {
    const provider = getActiveStorageProvider();
    await provider.downloadFile(fileId);
  },

  renameFile: async (fileId: string, newName: string) => {
    const provider = getActiveStorageProvider();
    await provider.renameFile(fileId, newName);
    set((state) => ({
      files: state.files.map((f) => (f.id === fileId ? { ...f, name: newName } : f)),
    }));
  },

  moveFile: async (fileId: string, targetFolderId: string | null) => {
    const provider = getActiveStorageProvider();
    await provider.moveFile(fileId, targetFolderId);
    set((state) => ({
      files: state.files.map((f) => (f.id === fileId ? { ...f, folderId: targetFolderId } : f)),
    }));
  },

  toggleFavorite: async (fileId: string) => {
    const provider = getActiveStorageProvider();
    const isFav = await provider.toggleFavorite(fileId);
    set((state) => ({
      files: state.files.map((f) => (f.id === fileId ? { ...f, isFavorite: isFav } : f)),
    }));
  },

  trashSelectedFiles: async () => {
    const { selectedFileIds } = get();
    const provider = getActiveStorageProvider();
    await provider.trashFiles(selectedFileIds);
    set((state) => ({
      files: state.files.map((f) =>
        selectedFileIds.includes(f.id) ? { ...f, isTrashed: true } : f
      ),
      selectedFileIds: [],
    }));
  },

  restoreSelectedFiles: async () => {
    const { selectedFileIds } = get();
    const provider = getActiveStorageProvider();
    await provider.restoreFiles(selectedFileIds);
    set((state) => ({
      files: state.files.map((f) =>
        selectedFileIds.includes(f.id) ? { ...f, isTrashed: false } : f
      ),
      selectedFileIds: [],
    }));
  },

  deleteSelectedPermanently: async () => {
    const { selectedFileIds } = get();
    const provider = getActiveStorageProvider();
    await provider.deleteFilesPermanently(selectedFileIds);
    set((state) => ({
      files: state.files.filter((f) => !selectedFileIds.includes(f.id)),
      selectedFileIds: [],
    }));
  },

  trashFile: async (fileId: string) => {
    const provider = getActiveStorageProvider();
    await provider.trashFiles([fileId]);
    set((state) => ({
      files: state.files.map((f) => (f.id === fileId ? { ...f, isTrashed: true } : f)),
      selectedFileIds: state.selectedFileIds.filter((id) => id !== fileId),
    }));
  },

  restoreFile: async (fileId: string) => {
    const provider = getActiveStorageProvider();
    await provider.restoreFiles([fileId]);
    set((state) => ({
      files: state.files.map((f) => (f.id === fileId ? { ...f, isTrashed: false } : f)),
      selectedFileIds: state.selectedFileIds.filter((id) => id !== fileId),
    }));
  },

  deleteFilePermanently: async (fileId: string) => {
    const provider = getActiveStorageProvider();
    await provider.deleteFilesPermanently([fileId]);
    set((state) => ({
      files: state.files.filter((f) => f.id !== fileId),
      selectedFileIds: state.selectedFileIds.filter((id) => id !== fileId),
    }));
  },
}));
