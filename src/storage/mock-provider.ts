/**
 * TGDocs Demo / Mock Storage Provider
 * Enables interactive preview, testing, and Google Drive UI exploration without needing live Telegram credentials.
 */

import type { StorageProvider, TGFile, TGFolder, StorageStats } from './types';

export class MockStorageProvider implements StorageProvider {
  name = 'mock';

  async init(): Promise<void> {
    // No initialization needed for mock provider
  }

  private folders: TGFolder[] = [
    { id: 'fld_work', name: 'Work Documents', parentId: null, createdAt: Date.now() - 86400000 * 5, color: '#1a73e8' },
    { id: 'fld_projects', name: 'TGDocs Design Assets', parentId: 'fld_work', createdAt: Date.now() - 86400000 * 3 },
    { id: 'fld_personal', name: 'Personal Cloud Backup', parentId: null, createdAt: Date.now() - 86400000 * 10, color: '#34a853' },
    { id: 'fld_photos', name: 'High-Res Photos', parentId: null, createdAt: Date.now() - 86400000 * 2, color: '#ea4335' },
  ];

  private files: TGFile[] = [
    {
      id: 'mock_1',
      name: 'TGDocs_Architecture_Overview.pdf',
      size: 4823412,
      mimeType: 'application/pdf',
      date: Math.floor((Date.now() - 3600000 * 2) / 1000),
      folderId: 'fld_work',
      isFavorite: true,
      isTrashed: false,
      tags: ['spec', 'privacy'],
    },
    {
      id: 'mock_2',
      name: 'Google_Drive_Interface_Mockup.png',
      size: 2150392,
      mimeType: 'image/png',
      date: Math.floor((Date.now() - 3600000 * 6) / 1000),
      folderId: 'fld_projects',
      isFavorite: true,
      isTrashed: false,
      tags: ['design'],
    },
    {
      id: 'mock_3',
      name: 'Financial_Quarterly_Report_2026.xlsx',
      size: 1048576,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      date: Math.floor((Date.now() - 86400000) / 1000),
      folderId: null,
      isFavorite: false,
      isTrashed: false,
      tags: ['finance'],
    },
    {
      id: 'mock_4',
      name: 'Product_Launch_Keynote.mp4',
      size: 89452031,
      mimeType: 'video/mp4',
      date: Math.floor((Date.now() - 86400000 * 4) / 1000),
      folderId: null,
      isFavorite: false,
      isTrashed: false,
      tags: ['video', 'media'],
    },
    {
      id: 'mock_5',
      name: 'Podcast_Episode_12_Cloud_Security.mp3',
      size: 34102914,
      mimeType: 'audio/mpeg',
      date: Math.floor((Date.now() - 86400000 * 7) / 1000),
      folderId: null,
      isFavorite: false,
      isTrashed: false,
      tags: ['audio'],
    },
  ];

  async getFolders(): Promise<TGFolder[]> {
    return [...this.folders];
  }

  async createFolder(name: string, parentId: string | null): Promise<TGFolder> {
    const f: TGFolder = {
      id: 'fld_' + Date.now(),
      name,
      parentId,
      createdAt: Date.now(),
    };
    this.folders.push(f);
    return f;
  }

  async renameFolder(folderId: string, newName: string): Promise<void> {
    const f = this.folders.find((x) => x.id === folderId);
    if (f) f.name = newName;
  }

  async deleteFolder(folderId: string): Promise<void> {
    this.folders = this.folders.filter((f) => f.id !== folderId);
  }

  async listFiles(folderId?: string | null): Promise<TGFile[]> {
    if (folderId !== undefined) {
      return this.files.filter((f) => f.folderId === folderId);
    }
    return [...this.files];
  }

  private uploadedBlobs = new Map<string, { blob: Blob; url: string; name: string }>();

  async uploadFile(file: File, folderId: string | null, onProgress?: (pct: number) => void): Promise<TGFile> {
    if (onProgress) {
      onProgress(35);
      setTimeout(() => onProgress?.(75), 40);
      setTimeout(() => onProgress?.(100), 80);
    }
    const id = 'mock_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const url = URL.createObjectURL(file);
    this.uploadedBlobs.set(id, { blob: file, url, name: file.name });

    const newFile: TGFile = {
      id,
      name: file.name,
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
      date: Math.floor(Date.now() / 1000),
      folderId,
      isFavorite: false,
      isTrashed: false,
      tags: [],
    };
    this.files.unshift(newFile);
    return newFile;
  }

  async downloadFile(fileId: string): Promise<void> {
    const f = this.files.find((x) => x.id === fileId);
    if (!f) return;
    const uploaded = this.uploadedBlobs.get(fileId);
    const blob = uploaded ? uploaded.blob : new Blob([`Mock file content for ${f.name}`], { type: f.mimeType || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = f.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async getFilePreviewUrl(fileId: string): Promise<string> {
    const uploaded = this.uploadedBlobs.get(fileId);
    if (uploaded) {
      return uploaded.url;
    }
    return '';
  }

  async getFileThumbnailUrl(fileId: string): Promise<string> {
    const uploaded = this.uploadedBlobs.get(fileId);
    if (uploaded) {
      return uploaded.url;
    }
    if (fileId === 'mock_2') {
      return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=60';
    }
    if (fileId === 'mock_4') {
      return 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400&auto=format&fit=crop&q=60';
    }
    return '';
  }

  async renameFile(fileId: string, newName: string): Promise<void> {
    const f = this.files.find((x) => x.id === fileId);
    if (f) f.name = newName;
  }

  async moveFile(fileId: string, targetFolderId: string | null): Promise<void> {
    const f = this.files.find((x) => x.id === fileId);
    if (f) f.folderId = targetFolderId;
  }

  async toggleFavorite(fileId: string): Promise<boolean> {
    const f = this.files.find((x) => x.id === fileId);
    if (f) {
      f.isFavorite = !f.isFavorite;
      return f.isFavorite;
    }
    return false;
  }

  async trashFiles(fileIds: string[]): Promise<void> {
    for (const id of fileIds) {
      const f = this.files.find((x) => x.id === id);
      if (f) f.isTrashed = true;
    }
  }

  async restoreFiles(fileIds: string[]): Promise<void> {
    for (const id of fileIds) {
      const f = this.files.find((x) => x.id === id);
      if (f) f.isTrashed = false;
    }
  }

  async deleteFilesPermanently(fileIds: string[]): Promise<void> {
    this.files = this.files.filter((f) => !fileIds.includes(f.id));
  }

  async getStats(): Promise<StorageStats> {
    const usedBytes = this.files.reduce((acc, f) => acc + f.size, 0);
    return {
      usedBytes,
      totalBytes: 15 * 1024 * 1024 * 1024,
      fileCount: this.files.length,
      folderCount: this.folders.length,
    };
  }
}

export const mockProvider = new MockStorageProvider();
