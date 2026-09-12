/**
 * TGDocs Telegram Storage Provider Implementation
 * Maps the abstract StorageProvider interface to MTProto Telegram calls and sync channel metadata.
 * Folders are mapped 1-to-1 with private Telegram channels.
 */

import type { StorageProvider, TGFile, TGFolder, StorageStats } from './types';
import {
  listTelegramFiles,
  listAllTelegramFiles,
  parseFileId,
  uploadTelegramFile,
  downloadTelegramFile,
  getTelegramFilePreviewUrl,
  deleteTelegramFiles,
  createFolderChannel,
  renameFolderChannel,
  deleteFolderChannel,
  ensureTgdocsFolderInTelegram,
  validateFolderChannels,
} from '../telegram/files';
import {
  getLocalCachedMeta,
  commitMetaToTelegram,
  syncMetaFromTelegram,
  type FolderMeta,
} from '../telegram/metadata';

export class TelegramStorageProvider implements StorageProvider {
  name = 'telegram';

  async init(): Promise<void> {
    await syncMetaFromTelegram();
    await validateFolderChannels();
    await ensureTgdocsFolderInTelegram();
  }

  async getFolders(): Promise<TGFolder[]> {
    const folders = await validateFolderChannels();
    return folders.map((f) => ({
      id: f.id,
      name: f.name,
      parentId: f.parentId,
      createdAt: f.createdAt,
      color: f.color,
      channelId: f.channelId,
      accessHash: f.accessHash,
    }));
  }

  async createFolder(name: string, parentId: string | null): Promise<TGFolder> {
    const meta = getLocalCachedMeta();

    let channelId: string | undefined;
    let accessHash: string | undefined;
    // Create dedicated private Telegram channel for this folder
    const channel = await createFolderChannel(name);
    channelId = channel.channelId;
    accessHash = channel.accessHash;

    const newFolder: FolderMeta = {
      id: 'fld_' + (channelId || Math.random().toString(36).substring(2, 11)),
      name: name.trim(),
      parentId,
      createdAt: Date.now(),
      channelId,
      accessHash,
    };

    meta.folders.push(newFolder);
    await commitMetaToTelegram({ folders: meta.folders });
    await ensureTgdocsFolderInTelegram();

    return {
      ...newFolder,
    };
  }

  async renameFolder(folderId: string, newName: string): Promise<void> {
    const meta = getLocalCachedMeta();
    const folder = meta.folders.find((f) => f.id === folderId);
    if (folder) {
      folder.name = newName.trim();
      await commitMetaToTelegram({ folders: meta.folders });
      await renameFolderChannel(folderId, newName);
    }
  }

  async deleteFolder(folderId: string): Promise<void> {
    const meta = getLocalCachedMeta();
    // Recursively find subfolder IDs
    const toDelete = new Set<string>([folderId]);
    let added = true;
    while (added) {
      added = false;
      for (const f of meta.folders) {
        if (f.parentId && toDelete.has(f.parentId) && !toDelete.has(f.id)) {
          toDelete.add(f.id);
          added = true;
        }
      }
    }

    for (const fId of toDelete) {
      await deleteFolderChannel(fId);
    }

    meta.folders = meta.folders.filter((f) => !toDelete.has(f.id));

    // Also unassign or trash files within deleted folders
    for (const fileId in meta.fileOverrides) {
      if (meta.fileOverrides[fileId].folderId && toDelete.has(meta.fileOverrides[fileId].folderId!)) {
        meta.fileOverrides[fileId].folderId = null;
      }
    }

    await commitMetaToTelegram({
      folders: meta.folders,
      fileOverrides: meta.fileOverrides,
    });
    await ensureTgdocsFolderInTelegram();
  }

  async listFiles(folderId?: string | null): Promise<TGFile[]> {
    const rawFiles =
      folderId === undefined
        ? await listAllTelegramFiles()
        : await listTelegramFiles(folderId);

    return rawFiles.map((f) => ({
      id: f.id,
      name: f.name,
      size: f.size,
      mimeType: f.mimeType,
      date: f.date,
      folderId: f.folderId,
      isFavorite: f.isFavorite,
      isTrashed: f.isTrashed,
      tags: f.tags,
      messageId: f.messageId,
    }));
  }

  async uploadFile(
    file: File,
    folderId: string | null,
    onProgress?: (pct: number) => void
  ): Promise<TGFile> {
    const uploaded = await uploadTelegramFile(file, folderId, onProgress);
    return {
      id: uploaded.id,
      name: uploaded.name,
      size: uploaded.size,
      mimeType: uploaded.mimeType,
      date: uploaded.date,
      folderId: uploaded.folderId,
      isFavorite: uploaded.isFavorite,
      isTrashed: uploaded.isTrashed,
      tags: uploaded.tags,
      messageId: uploaded.messageId,
    };
  }

  async downloadFile(fileId: string, onProgress?: (pct: number) => void): Promise<void> {
    const meta = getLocalCachedMeta();
    const override = meta.fileOverrides[fileId];
    let name = override?.customName;
    if (!name) {
      const { useFileStore } = await import('../store/file-store');
      const storeFile = useFileStore.getState().files.find((f) => f.id === fileId);
      if (storeFile?.name) {
        name = storeFile.name;
      }
    }
    await downloadTelegramFile(fileId, name || `file_${fileId}`, onProgress);
  }

  async getFilePreviewUrl(fileId: string): Promise<string> {
    const { useFileStore } = await import('../store/file-store');
    const storeFile = useFileStore.getState().files.find((f) => f.id === fileId);
    return await getTelegramFilePreviewUrl(fileId, storeFile?.mimeType || 'application/octet-stream');
  }

  async renameFile(fileId: string, newName: string): Promise<void> {
    const meta = getLocalCachedMeta();
    if (!meta.fileOverrides[fileId]) {
      const parsed = parseFileId(fileId);
      meta.fileOverrides[fileId] = {
        fileId,
        folderId: parsed.folderId,
      };
    }
    meta.fileOverrides[fileId].customName = newName.trim();
    await commitMetaToTelegram({ fileOverrides: meta.fileOverrides });
  }

  async moveFile(fileId: string, targetFolderId: string | null): Promise<void> {
    const meta = getLocalCachedMeta();
    if (targetFolderId && !meta.folders.some((f) => f.id === targetFolderId)) {
      throw new Error('Target folder no longer exists');
    }
    if (!meta.fileOverrides[fileId]) {
      meta.fileOverrides[fileId] = {
        fileId,
        folderId: targetFolderId,
      };
    } else {
      meta.fileOverrides[fileId].folderId = targetFolderId;
    }
    await commitMetaToTelegram({ fileOverrides: meta.fileOverrides });
  }

  async toggleFavorite(fileId: string): Promise<boolean> {
    const meta = getLocalCachedMeta();
    const parsed = parseFileId(fileId);
    if (!meta.fileOverrides[fileId]) {
      meta.fileOverrides[fileId] = {
        fileId,
        folderId: parsed.folderId,
        isFavorite: true,
      };
    } else {
      meta.fileOverrides[fileId].isFavorite = !meta.fileOverrides[fileId].isFavorite;
      if (!meta.fileOverrides[fileId].folderId && parsed.folderId) {
        meta.fileOverrides[fileId].folderId = parsed.folderId;
      }
    }
    await commitMetaToTelegram({ fileOverrides: meta.fileOverrides });
    return !!meta.fileOverrides[fileId].isFavorite;
  }

  async trashFiles(fileIds: string[]): Promise<void> {
    const meta = getLocalCachedMeta();
    for (const fid of fileIds) {
      const parsed = parseFileId(fid);
      if (!meta.fileOverrides[fid]) {
        meta.fileOverrides[fid] = {
          fileId: fid,
          folderId: parsed.folderId,
          isTrashed: true,
        };
      } else {
        meta.fileOverrides[fid].isTrashed = true;
        if (!meta.fileOverrides[fid].folderId && parsed.folderId) {
          meta.fileOverrides[fid].folderId = parsed.folderId;
        }
      }
    }
    await commitMetaToTelegram({ fileOverrides: meta.fileOverrides });
  }

  async restoreFiles(fileIds: string[]): Promise<void> {
    const meta = getLocalCachedMeta();
    for (const fid of fileIds) {
      if (meta.fileOverrides[fid]) {
        meta.fileOverrides[fid].isTrashed = false;
      }
    }
    await commitMetaToTelegram({ fileOverrides: meta.fileOverrides });
  }

  async deleteFilesPermanently(fileIds: string[]): Promise<void> {
    await deleteTelegramFiles(fileIds);
  }

  async getStats(): Promise<StorageStats> {
    const files = await listAllTelegramFiles();
    const meta = getLocalCachedMeta();

    const usedBytes = files.reduce((acc, f) => acc + f.size, 0);
    const { useAuthStore } = await import('../store/auth-store');
    const isPremium = !!useAuthStore.getState().user?.isPremium;

    return {
      usedBytes,
      totalBytes: (isPremium ? 4 : 2) * 1024 * 1024 * 1024 * 1000, // virtually unlimited
      fileCount: files.length,
      folderCount: meta.folders.length,
      isPremium,
    };
  }
}

export const telegramProvider = new TelegramStorageProvider();
