/**
 * TGDocs Core Storage Provider Types
 * Abstract interface to guarantee client/provider decoupling.
 */

export interface TGFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  date: number; // Unix timestamp
  folderId: string | null;
  isFavorite: boolean;
  isTrashed: boolean;
  tags: string[];
  messageId?: number;
}

export interface TGFolder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
  color?: string;
  isFavorite?: boolean;
  channelId?: string;
  accessHash?: string;
}

export interface StorageStats {
  usedBytes: number;
  totalBytes: number; // Free = 2GB per file limit, total = practically unlimited cloud storage
  fileCount: number;
  folderCount: number;
  isPremium?: boolean;
}

export interface UploadTask {
  id: string;
  file: File;
  folderId: string | null;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export interface StorageProvider {
  name: string;
  init?(): Promise<void>;
  
  // Folders
  getFolders(): Promise<TGFolder[]>;
  createFolder(name: string, parentId: string | null): Promise<TGFolder>;
  renameFolder(folderId: string, newName: string): Promise<void>;
  deleteFolder(folderId: string): Promise<void>;

  // Files
  listFiles(folderId?: string | null): Promise<TGFile[]>;
  uploadFile(file: File, folderId: string | null, onProgress?: (pct: number) => void): Promise<TGFile>;
  downloadFile(fileId: string, onProgress?: (pct: number) => void): Promise<void>;
  getFilePreviewUrl(fileId: string): Promise<string>;
  getFileThumbnailUrl?(fileId: string): Promise<string>;
  renameFile(fileId: string, newName: string): Promise<void>;
  moveFile(fileId: string, targetFolderId: string | null): Promise<void>;
  toggleFavorite(fileId: string): Promise<boolean>;
  trashFiles(fileIds: string[]): Promise<void>;
  restoreFiles(fileIds: string[]): Promise<void>;
  deleteFilesPermanently(fileIds: string[]): Promise<void>;

  // Metadata & Stats
  getStats(): Promise<StorageStats>;
}
