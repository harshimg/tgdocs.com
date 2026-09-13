/**
 * TGDocs Telegram File Operations Service
 * Direct browser-to-Telegram MTProto transfers (uploads, downloads, streaming).
 * Folders are mapped 1-to-1 to dedicated private Telegram channels for true two-way sync.
 */

import { Buffer } from 'buffer';
import { getTelegramClient } from './client';
import { getLocalCachedMeta, setLocalCachedMeta, commitMetaToTelegram, type FolderMeta } from './metadata';

if (typeof window !== 'undefined') {
  (window as any).Buffer = (window as any).Buffer || Buffer;
  (window as any).global = (window as any).global || window;
}
if (typeof globalThis !== 'undefined') {
  (globalThis as any).Buffer = (globalThis as any).Buffer || Buffer;
}

export interface TelegramDocumentFile {
  id: string;
  messageId: number;
  name: string;
  size: number;
  mimeType: string;
  date: number;
  folderId: string | null;
  isFavorite: boolean;
  isTrashed: boolean;
  tags: string[];
}

const STORAGE_CHANNEL_TITLE = 'TGDocs Cloud Storage';
const STORAGE_CHANNEL_ABOUT = 'Files stored via TGDocs (tgdocs.com). Private and secure.';

let storageChannelEntity: any = null;

/**
 * Parses a composite fileId (e.g. "fld_123_456" or legacy "456") into folderId and messageId
 */
export function parseFileId(fileId: string): { folderId: string | null; messageId: number } {
  if (fileId && fileId.includes('_')) {
    const lastIdx = fileId.lastIndexOf('_');
    const fId = fileId.substring(0, lastIdx);
    const mId = parseInt(fileId.substring(lastIdx + 1), 10);
    return {
      folderId: fId === 'root' ? null : fId,
      messageId: isNaN(mId) ? 0 : mId,
    };
  }
  return {
    folderId: null,
    messageId: parseInt(fileId, 10) || 0,
  };
}

/**
 * Get or create the root storage channel for unassigned files
 */
export async function getOrCreateStorageChannel(): Promise<any> {
  const meta = getLocalCachedMeta();
  if (meta.preferences.storageLocation === 'saved_messages') {
    return 'me';
  }

  if (storageChannelEntity) return storageChannelEntity;
  const client = await getTelegramClient();
  const { Api } = await import('telegram');

  try {
    const dialogs = await client.getDialogs({ limit: 100 });
    for (const dialog of dialogs) {
      if (dialog.isChannel && dialog.title === STORAGE_CHANNEL_TITLE) {
        storageChannelEntity = dialog.entity;
        return storageChannelEntity;
      }
    }

    const result = await client.invoke(
      new Api.channels.CreateChannel({
        title: STORAGE_CHANNEL_TITLE,
        about: STORAGE_CHANNEL_ABOUT,
        broadcast: true,
        megagroup: false,
      })
    );

    if (result && 'chats' in result) {
      const chats = (result as any).chats as any[];
      if (chats.length > 0) {
        storageChannelEntity = chats[0];
        return storageChannelEntity;
      }
    }
  } catch (err) {
    console.warn('Could not create or get dedicated storage channel, falling back to Saved Messages ("me"):', err);
    return 'me';
  }

  return 'me';
}

/**
 * Creates a dedicated, private Telegram broadcast channel for a folder
 */
export async function createFolderChannel(name: string): Promise<{ channelId: string; accessHash: string }> {
  const client = await getTelegramClient();
  const { Api } = await import('telegram');

  const cleanName = name.trim();
  const title = cleanName.startsWith('📁') ? cleanName : `📁 ${cleanName}`;

  try {
    const result = await client.invoke(
      new Api.channels.CreateChannel({
        title,
        about: `TGDocs Folder: ${cleanName}. Private and secure.`,
        broadcast: true,
        megagroup: false,
      })
    );

    if (result instanceof Api.Updates) {
      const chats = result.chats as any[];
      if (chats.length > 0) {
        const chat = chats[0];
        updateCachedChannelCount(1);
        return {
          channelId: chat.id.toString(),
          accessHash: chat.accessHash ? chat.accessHash.toString() : '',
        };
      }
    }

    throw new Error('Failed to create private Telegram channel for folder');
  } catch (err: any) {
    const errMsg = (err.errorMessage || err.message || '').toUpperCase();
    if (errMsg.includes('CHANNELS_TOO_MUCH')) {
      throw new Error(
        'Telegram channel limit reached (Free: 500, Premium: 1,000). Please leave or remove some inactive channels in Telegram before creating new folders.'
      );
    }
    if (errMsg.includes('CHANNELS_ADMIN_TOO_MUCH')) {
      throw new Error(
        'Telegram administrator limit reached. You are an administrator of too many channels or groups in Telegram.'
      );
    }
    if (errMsg.includes('FLOOD_WAIT')) {
      throw new Error(
        `Telegram rate limit: Channel creation paused temporarily by Telegram (${err.errorMessage || err.message}). Please wait a few moments.`
      );
    }
    if (errMsg.includes('USER_RESTRICTED')) {
      throw new Error(
        'Your Telegram account is currently restricted from creating new channels.'
      );
    }
    throw err;
  }
}

let cachedChannelCount: number | null = null;

/**
 * Counts total channels and supergroups across the user's Telegram account (including existing ones)
 */
export async function getTelegramChannelCount(): Promise<number> {
  if (cachedChannelCount !== null) return cachedChannelCount;
  try {
    const client = await getTelegramClient();
    const dialogs = await client.getDialogs({ limit: 500 });
    const count = dialogs.filter((d: any) => d.isChannel).length;
    cachedChannelCount = count;
    return count;
  } catch (e) {
    console.warn('Failed to fetch Telegram channel count:', e);
    const meta = getLocalCachedMeta();
    return meta.folders.length;
  }
}

export function updateCachedChannelCount(delta: number): void {
  if (cachedChannelCount !== null) {
    cachedChannelCount = Math.max(0, cachedChannelCount + delta);
  }
}

/**
 * Ensures a Telegram Chat Folder (Dialog Filter) named "TGDocs" exists in the user's Telegram app,
 * containing all TGDocs channels (root cloud storage and all folder channels).
 */
export function cleanChannelId(channelId: string): string {
  return (channelId || '').replace(/^-100/, '');
}

export function getExtensionFromMime(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
    'image/bmp': '.bmp',
    'image/x-icon': '.ico',
    'image/vnd.microsoft.icon': '.ico',
    'image/avif': '.avif',
    'image/tiff': '.tiff',
    'video/mp4': '.mp4',
    'video/quicktime': '.mov',
    'video/x-matroska': '.mkv',
    'video/webm': '.webm',
    'video/x-msvideo': '.avi',
    'audio/mpeg': '.mp3',
    'audio/mp3': '.mp3',
    'audio/ogg': '.ogg',
    'audio/wav': '.wav',
    'audio/mp4': '.m4a',
    'audio/x-m4a': '.m4a',
    'audio/flac': '.flac',
    'audio/aac': '.aac',
    'audio/webm': '.weba',
    'application/pdf': '.pdf',
    'application/zip': '.zip',
    'application/x-zip-compressed': '.zip',
    'application/x-rar-compressed': '.rar',
    'application/vnd.rar': '.rar',
    'application/x-7z-compressed': '.7z',
    'application/x-tar': '.tar',
    'application/gzip': '.gz',
    'application/json': '.json',
    'text/plain': '.txt',
    'text/html': '.html',
    'text/css': '.css',
    'text/javascript': '.js',
    'application/javascript': '.js',
    'text/csv': '.csv',
    'text/markdown': '.md',
    'text/xml': '.xml',
    'application/xml': '.xml',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/vnd.ms-powerpoint': '.ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  };
  return map[(mimeType || '').toLowerCase()] || '';
}

export async function ensureTgdocsFolderInTelegram(): Promise<void> {
  try {
    const client = await getTelegramClient();
    const { Api } = await import('telegram');
    const bigInt = (await import('big-integer')).default;
    const meta = getLocalCachedMeta();
    const { getOrCreateMetaChannel } = await import('./metadata');

    // 1. Collect all TGDocs channels to include in the Telegram folder
    const peersToInclude: any[] = [];
    const seenIds = new Set<string>();

    const addPeer = async (entityOrPeer: any) => {
      if (!entityOrPeer) return;
      try {
        const inputPeer = await client.getInputEntity(entityOrPeer);
        if (inputPeer && 'channelId' in inputPeer) {
          const key = cleanChannelId(inputPeer.channelId.toString());
          if (!seenIds.has(key)) {
            seenIds.add(key);
            peersToInclude.push(inputPeer);
          }
        } else if (inputPeer && 'chatId' in inputPeer) {
          const key = cleanChannelId(inputPeer.chatId.toString());
          if (!seenIds.has(key)) {
            seenIds.add(key);
            peersToInclude.push(inputPeer);
          }
        }
      } catch (e) {
        // Silently skip if entity cannot be resolved yet
      }
    };

    // A. Root storage channel ('TGDocs Cloud Storage')
    try {
      const rootPeer = await getOrCreateStorageChannel();
      await addPeer(rootPeer);
    } catch (e) {
      console.warn('Could not add root storage channel to TGDocs Telegram folder:', e);
    }

    // B. Sync metadata channel ('TGDocs Sync (Do Not Delete)')
    try {
      const metaChannel = await getOrCreateMetaChannel();
      await addPeer(metaChannel);
    } catch (e) {
      console.warn('Could not add sync channel to TGDocs Telegram folder:', e);
    }

    // C. All registered folders in metadata
    for (const folder of meta.folders) {
      if (folder.channelId && folder.accessHash) {
        try {
          const p = new Api.InputPeerChannel({
            channelId: bigInt(cleanChannelId(folder.channelId)),
            accessHash: bigInt(folder.accessHash),
          });
          await addPeer(p);
        } catch (e) {
          console.warn(`Could not add folder ${folder.name} to TGDocs Telegram folder:`, e);
        }
      }
    }

    // D. Scan recent dialogs to capture any other channels created for TGDocs (titled '📁 ...' or containing 'TGDocs')
    try {
      const dialogs = await client.getDialogs({ limit: 100 });
      for (const d of dialogs) {
        if (d.isChannel || d.isGroup) {
          const title = d.title || '';
          if (title.toLowerCase().includes('tgdocs') || title.startsWith('📁')) {
            await addPeer(d.entity);
          }
        }
      }
    } catch (e) {
      console.warn('Dialog scan for TGDocs folder:', e);
    }

    // 2. Fetch existing Telegram dialog filters (tabs)
    const filtersRes: any = await client.invoke(new Api.messages.GetDialogFilters());
    const existingFilters: any[] = filtersRes?.filters || [];

    let targetFilterId: number | null = null;
    const usedIds = new Set<number>();

    for (const f of existingFilters) {
      if (typeof f.id === 'number') {
        usedIds.add(f.id);
        const titleText = f.title?.text || (typeof f.title === 'string' ? f.title : '');
        if (titleText.toLowerCase() === 'tgdocs') {
          targetFilterId = f.id;
        }
      }
    }

    if (targetFilterId === null) {
      for (let i = 2; i < 250; i++) {
        if (!usedIds.has(i)) {
          targetFilterId = i;
          break;
        }
      }
    }

    if (targetFilterId === null) {
      targetFilterId = 2;
    }

    // 3. Create or update the TGDocs chat folder in Telegram
    const filter = new Api.DialogFilter({
      id: targetFilterId,
      title: new Api.TextWithEntities({ text: 'TGDocs', entities: [] }),
      emoticon: '📁',
      pinnedPeers: [],
      includePeers: peersToInclude,
      excludePeers: [],
    });

    await client.invoke(
      new Api.messages.UpdateDialogFilter({
        id: targetFilterId,
        filter,
      })
    );
  } catch (err) {
    console.warn('ensureTgdocsFolderInTelegram warning (continuing):', err);
  }
}

/**
 * Resolve the Telegram Peer (InputPeerChannel or Dialog Entity) for a given folderId.
 * Automatically creates a private channel for folders that don't have one yet.
 */
export async function getFolderPeer(folderId: string | null = null): Promise<any> {
  if (!folderId || folderId === 'root') {
    return await getOrCreateStorageChannel();
  }

  const meta = getLocalCachedMeta();
  const folder = meta.folders.find((f) => f.id === folderId);
  if (!folder) {
    return await getOrCreateStorageChannel();
  }

  const client = await getTelegramClient();
  const { Api } = await import('telegram');
  const bigInt = (await import('big-integer')).default;

  // 1. If folder already has channelId & accessHash, construct InputPeerChannel
  if (folder.channelId && folder.accessHash) {
    try {
      const cleanId = cleanChannelId(folder.channelId);
      return new Api.InputPeerChannel({
        channelId: bigInt(cleanId),
        accessHash: bigInt(folder.accessHash),
      });
    } catch (e) {
      console.warn('Error creating InputPeerChannel:', e);
    }
  }

  // 2. If folder has channelId, check dialogs for accessHash
  if (folder.channelId) {
    try {
      const cleanFolderId = cleanChannelId(folder.channelId);
      const dialogs = await client.getDialogs({ limit: 150 });
      for (const d of dialogs) {
        if (d.entity && d.entity.id) {
          const cleanEntityId = cleanChannelId(d.entity.id.toString());
          if (cleanEntityId === cleanFolderId) {
            const entityAny = d.entity as any;
            if (entityAny.accessHash) {
              folder.accessHash = entityAny.accessHash.toString();
              await commitMetaToTelegram({ folders: meta.folders });
            }
            return d.entity;
          }
        }
      }
    } catch (e) {
      console.warn('Error finding folder channel in dialogs:', e);
    }

    // Try resolving entity directly if channelId is known
    try {
      const cleanId = cleanChannelId(folder.channelId);
      const entity = await client.getEntity(bigInt(cleanId));
      if (entity) {
        const entityAny = entity as any;
        if (entityAny.accessHash && !folder.accessHash) {
          folder.accessHash = entityAny.accessHash.toString();
          await commitMetaToTelegram({ folders: meta.folders });
        }
        return entity;
      }
    } catch (e) {
      console.warn(`Could not get entity for channel ${folder.channelId}:`, e);
    }
  }

  // 3. Lazy creation: ONLY IF folder has NO channelId at all (legacy folder created before channel mapping)
  if (!folder.channelId) {
    try {
      const created = await createFolderChannel(folder.name);
      folder.channelId = created.channelId;
      folder.accessHash = created.accessHash;
      await commitMetaToTelegram({ folders: meta.folders });

      return new Api.InputPeerChannel({
        channelId: bigInt(cleanChannelId(folder.channelId)),
        accessHash: bigInt(folder.accessHash),
      });
    } catch (err) {
      console.warn(`Could not create channel for folder "${folder.name}", falling back to root storage:`, err);
      return await getOrCreateStorageChannel();
    }
  }

  return await getOrCreateStorageChannel();
}

/**
 * Renames a folder's channel title in Telegram
 */
export async function renameFolderChannel(folderId: string, newTitle: string): Promise<void> {
  const meta = getLocalCachedMeta();
  const folder = meta.folders.find((f) => f.id === folderId);
  if (!folder || !folder.channelId || !folder.accessHash) return;

  const client = await getTelegramClient();
  const { Api } = await import('telegram');
  const bigInt = (await import('big-integer')).default;

  try {
    const channelPeer = new Api.InputChannel({
      channelId: bigInt(cleanChannelId(folder.channelId)),
      accessHash: bigInt(folder.accessHash),
    });
    const cleanName = newTitle.trim();
    const title = cleanName.startsWith('📁') ? cleanName : `📁 ${cleanName}`;
    await client.invoke(
      new Api.channels.EditTitle({
        channel: channelPeer,
        title,
      })
    );
  } catch (err: any) {
    const errMsg = (err.errorMessage || err.message || '').toUpperCase();
    if (
      errMsg.includes('CHANNEL_INVALID') ||
      errMsg.includes('CHANNEL_PRIVATE') ||
      errMsg.includes('PEER_ID_INVALID')
    ) {
      await removeDeletedFolder(folderId);
    }
    console.warn('Failed to edit channel title on Telegram:', err);
  }
}

/**
 * Deletes a folder's private channel in Telegram
 */
export async function deleteFolderChannel(folderId: string): Promise<void> {
  const meta = getLocalCachedMeta();
  const folder = meta.folders.find((f) => f.id === folderId);
  if (!folder || !folder.channelId || !folder.accessHash) return;

  const client = await getTelegramClient();
  const { Api } = await import('telegram');
  const bigInt = (await import('big-integer')).default;

  try {
    const channelPeer = new Api.InputChannel({
      channelId: bigInt(cleanChannelId(folder.channelId)),
      accessHash: bigInt(folder.accessHash),
    });
    await client.invoke(
      new Api.channels.DeleteChannel({
        channel: channelPeer,
      })
    );
    updateCachedChannelCount(-1);
  } catch (err: any) {
    const errMsg = (err.errorMessage || err.message || '').toUpperCase();
    if (
      errMsg.includes('CHANNEL_INVALID') ||
      errMsg.includes('CHANNEL_PRIVATE') ||
      errMsg.includes('PEER_ID_INVALID')
    ) {
      updateCachedChannelCount(-1);
    }
    console.warn('Failed to delete channel on Telegram:', err);
  }
}

/**
 * Immediately removes a specific folder from metadata when its channel is confirmed deleted or invalid.
 */
export async function removeDeletedFolder(folderId: string): Promise<void> {
  const meta = getLocalCachedMeta();
  const deadFolderIds = new Set<string>([folderId]);

  let added = true;
  while (added) {
    added = false;
    for (const f of meta.folders) {
      if (f.parentId && deadFolderIds.has(f.parentId) && !deadFolderIds.has(f.id)) {
        deadFolderIds.add(f.id);
        added = true;
      }
    }
  }

  meta.folders = meta.folders.filter((f) => !deadFolderIds.has(f.id));
  for (const fileId in meta.fileOverrides) {
    if (meta.fileOverrides[fileId]?.folderId && deadFolderIds.has(meta.fileOverrides[fileId].folderId!)) {
      meta.fileOverrides[fileId].folderId = null;
    }
  }

  setLocalCachedMeta(meta);

  try {
    await commitMetaToTelegram({
      folders: meta.folders,
      fileOverrides: meta.fileOverrides,
    });
    updateCachedChannelCount(-deadFolderIds.size);
    ensureTgdocsFolderInTelegram().catch(() => {});
  } catch (err) {
    console.warn('[TGDocs] Failed to commit meta after removeDeletedFolder:', err);
  }
}

let lastValidationTime = 0;
const VALIDATION_CACHE_TTL = 3000; // 3-second throttle to avoid spamming Telegram during rapid UI transitions

/**
 * Validates that all folders recorded in metadata still correspond to active channels in Telegram.
 * If a channel was deleted or is inaccessible on Telegram, removes the folder and cleans up references.
 */
export async function validateFolderChannels(force = false): Promise<FolderMeta[]> {
  const now = Date.now();
  if (!force && now - lastValidationTime < VALIDATION_CACHE_TTL) {
    return getLocalCachedMeta().folders;
  }
  lastValidationTime = now;

  const meta = getLocalCachedMeta();
  if (!meta.folders) {
    meta.folders = [];
  }

  try {
    const client = await getTelegramClient();
    const { Api } = await import('telegram');
    const bigInt = (await import('big-integer')).default;

    // 1. Fetch user's active dialogs to check channels quickly
    const activeDialogChannelIds = new Set<string>();
    let totalDialogs = 0;
    let hasDiscoveredFolders = false;

    try {
      const dialogs = await client.getDialogs({ limit: 200 });
      totalDialogs = dialogs.length;
      for (const d of dialogs) {
        if (d.isChannel || d.isGroup) {
          const rawId = d.entity?.id?.toString();
          if (rawId) {
            const cleanId = cleanChannelId(rawId);
            activeDialogChannelIds.add(cleanId);
            activeDialogChannelIds.add(rawId);
            const title = d.title || '';
            const about = (d.entity as any)?.about || '';
            const isTgdocsFolderChannel =
              title.startsWith('📁') ||
              about.includes('TGDocs Folder') ||
              (title.toLowerCase().includes('tgdocs') && !title.includes('Cloud Storage') && !title.includes('Sync'));
            const accessHash = (d.entity as any)?.accessHash ? (d.entity as any).accessHash.toString() : '';

            // Update accessHash for known folders
            for (const f of meta.folders) {
              if (f.channelId && (f.channelId === rawId || cleanChannelId(f.channelId) === cleanId)) {
                if (accessHash && f.accessHash !== accessHash) {
                  f.accessHash = accessHash;
                }
              }
            }

            // Auto-discover previous TGDocs folder channels missing from local metadata
            if (isTgdocsFolderChannel && !title.includes('Cloud Storage') && !title.includes('Sync (Do Not Delete)')) {
              const alreadyExists = meta.folders.some(
                (f) => f.channelId === rawId || (f.channelId && cleanChannelId(f.channelId) === cleanId)
              );
              if (!alreadyExists) {
                const folderName = title.replace(/^📁\s*/, '').trim() || 'Folder';
                meta.folders.push({
                  id: 'fld_' + cleanId,
                  name: folderName,
                  parentId: null,
                  createdAt: (d as any).date ? (d as any).date * 1000 : Date.now(),
                  channelId: rawId,
                  accessHash: accessHash,
                });
                hasDiscoveredFolders = true;
              }
            }
          }
        }
      }

      if (hasDiscoveredFolders) {
        setLocalCachedMeta(meta);
        await commitMetaToTelegram({ folders: meta.folders }).catch(() => {});
      }
    } catch (e) {
      console.warn('[TGDocs] Could not fetch dialogs for folder validation:', e);
    }

    const deadFolderIds = new Set<string>();

    for (const folder of meta.folders) {
      if (!folder.channelId) continue;
      const cleanFolderChannelId = cleanChannelId(folder.channelId);

      // Fast check: if the channel is present in active dialogs, it is 100% active
      if (activeDialogChannelIds.has(cleanFolderChannelId) || activeDialogChannelIds.has(folder.channelId)) {
        continue;
      }

      // Channel is not in recent dialogs.
      // If user has < 200 dialogs, this means the channel is definitely not in the user's account.
      // To be 100% resilient and verify whether the channel is truly deleted or just inactive:
      if (folder.accessHash) {
        try {
          const inputChannel = new Api.InputChannel({
            channelId: bigInt(cleanFolderChannelId),
            accessHash: bigInt(folder.accessHash),
          });
          await client.invoke(new Api.channels.GetFullChannel({ channel: inputChannel }));
        } catch (err: any) {
          const errMsg = (err.errorMessage || err.message || '').toUpperCase();
          if (
            errMsg.includes('CHANNEL_INVALID') ||
            errMsg.includes('CHANNEL_PRIVATE') ||
            errMsg.includes('PEER_ID_INVALID')
          ) {
            console.warn(`[TGDocs] Folder channel was deleted in Telegram: "${folder.name}" (${folder.channelId})`);
            deadFolderIds.add(folder.id);
          }
        }
      }
    }

    if (deadFolderIds.size > 0) {
      let added = true;
      while (added) {
        added = false;
        for (const f of meta.folders) {
          if (f.parentId && deadFolderIds.has(f.parentId) && !deadFolderIds.has(f.id)) {
            deadFolderIds.add(f.id);
            added = true;
          }
        }
      }

      console.log(`[TGDocs] Pruning ${deadFolderIds.size} deleted folder(s) from metadata.`);
      meta.folders = meta.folders.filter((f) => !deadFolderIds.has(f.id));

      for (const fileId in meta.fileOverrides) {
        if (meta.fileOverrides[fileId]?.folderId && deadFolderIds.has(meta.fileOverrides[fileId].folderId!)) {
          meta.fileOverrides[fileId].folderId = null;
        }
      }

      setLocalCachedMeta(meta);

      try {
        await commitMetaToTelegram({
          folders: meta.folders,
          fileOverrides: meta.fileOverrides,
        });
        updateCachedChannelCount(-deadFolderIds.size);
        ensureTgdocsFolderInTelegram().catch(() => {});
      } catch (e) {
        console.warn('[TGDocs] Failed to commit meta after pruning dead folders:', e);
      }
    }
  } catch (err) {
    console.warn('[TGDocs] Folder channel validation error:', err);
  }

  return getLocalCachedMeta().folders;
}

/**
 * List files stored in a specific folder channel (or root channel)
 */
export async function listTelegramFiles(
  folderId: string | null = null,
  offsetId = 0,
  limit = 100
): Promise<TelegramDocumentFile[]> {
  const client = await getTelegramClient();
  const { Api } = await import('telegram');
  const targetPeer = await getFolderPeer(folderId);
  const meta = getLocalCachedMeta();

  let messages: any[] = [];
  try {
    messages = await client.getMessages(targetPeer, {
      limit,
      offsetId,
    });
  } catch (err: any) {
    const errMsg = (err.errorMessage || err.message || '').toUpperCase();
    if (
      errMsg.includes('CHANNEL_INVALID') ||
      errMsg.includes('CHANNEL_PRIVATE') ||
      errMsg.includes('PEER_ID_INVALID')
    ) {
      console.warn(`[TGDocs] Folder channel warning for folderId=${folderId}:`, errMsg);
      // Verify via validateFolderChannels before deciding it is dead
      if (folderId && folderId !== 'root') {
        const folders = await validateFolderChannels(true);
        if (!folders.some((f) => f.id === folderId)) {
          return [];
        }
      }
    } else {
      console.warn(`Error getting messages for peer (folderId=${folderId}):`, err);
    }
    return [];
  }

  const files: TelegramDocumentFile[] = [];

  for (const msg of messages) {
    // 1. MessageMediaDocument (files, videos, audio, documents, uncompressed photos)
    if (msg.media && msg.media instanceof Api.MessageMediaDocument) {
      const doc = msg.media.document;
      if (doc instanceof Api.Document) {
        let fileName = '';
        let isAudio = false;
        let isVideo = false;
        let audioTitle = '';
        let audioPerformer = '';

        for (const attr of doc.attributes) {
          if (attr instanceof Api.DocumentAttributeFilename) {
            fileName = attr.fileName;
          } else if (attr instanceof Api.DocumentAttributeAudio) {
            isAudio = true;
            if (attr.title) audioTitle = attr.title;
            if (attr.performer) audioPerformer = attr.performer;
          } else if (attr instanceof Api.DocumentAttributeVideo) {
            isVideo = true;
          }
        }

        // If no filename in attributes, check caption or audio title
        if (!fileName) {
          if (msg.message && msg.message.trim()) {
            fileName = msg.message.trim().split('\n')[0].replace(/[\\/:*?"<>|]/g, '_');
          } else if (isAudio && audioTitle) {
            fileName = audioPerformer ? `${audioPerformer} - ${audioTitle}` : audioTitle;
          }
        }

        const ext = getExtensionFromMime(doc.mimeType || '');
        if (!fileName) {
          const dateStr = new Date(msg.date * 1000).toISOString().slice(0, 19).replace(/[:T]/g, '-');
          if (isVideo) {
            fileName = `Video_${dateStr}${ext || '.mp4'}`;
          } else if (isAudio) {
            fileName = `Audio_${dateStr}${ext || '.mp3'}`;
          } else {
            fileName = `File_${dateStr}${ext || ''}`;
          }
        } else if (ext && !fileName.includes('.')) {
          fileName = `${fileName}${ext}`;
        }

        const fileId = `${folderId || 'root'}_${msg.id}`;
        const override = meta.fileOverrides[fileId] || meta.fileOverrides[msg.id.toString()] || {};

        files.push({
          id: fileId,
          messageId: msg.id,
          name: override.customName || fileName,
          size: Number(doc.size),
          mimeType: doc.mimeType || 'application/octet-stream',
          date: msg.date,
          folderId: (override.folderId !== undefined && override.folderId !== null)
            ? override.folderId
            : (folderId || parseFileId(fileId).folderId),
          isFavorite: !!override.isFavorite,
          isTrashed: !!override.isTrashed,
          tags: override.tags || [],
        });
      }
    }
    // 2. MessageMediaPhoto (compressed images/photos uploaded directly via Telegram)
    else if (msg.media && msg.media instanceof Api.MessageMediaPhoto) {
      const photo = msg.media.photo;
      if (photo instanceof Api.Photo) {
        let photoSize = 0;
        if (Array.isArray(photo.sizes)) {
          for (const s of photo.sizes) {
            if ('size' in s && typeof s.size === 'number' && s.size > photoSize) {
              photoSize = s.size;
            } else if ('sizes' in s && Array.isArray((s as any).sizes)) {
              const maxS = Math.max(...(s as any).sizes);
              if (maxS > photoSize) photoSize = maxS;
            }
          }
        }

        let fileName = '';
        if (msg.message && msg.message.trim()) {
          const captionName = msg.message.trim().split('\n')[0].replace(/[\\/:*?"<>|]/g, '_');
          fileName = captionName.includes('.') ? captionName : `${captionName}.jpg`;
        } else {
          const dateStr = new Date(msg.date * 1000).toISOString().slice(0, 19).replace(/[:T]/g, '-');
          fileName = `Photo_${dateStr}.jpg`;
        }

        const fileId = `${folderId || 'root'}_${msg.id}`;
        const override = meta.fileOverrides[fileId] || meta.fileOverrides[msg.id.toString()] || {};

        files.push({
          id: fileId,
          messageId: msg.id,
          name: override.customName || fileName,
          size: photoSize || 50000,
          mimeType: 'image/jpeg',
          date: msg.date,
          folderId: (override.folderId !== undefined && override.folderId !== null)
            ? override.folderId
            : (folderId || parseFileId(fileId).folderId),
          isFavorite: !!override.isFavorite,
          isTrashed: !!override.isTrashed,
          tags: override.tags || [],
        });
      }
    }
  }

  return files;
}

/**
 * List files across root storage channel and all created folder channels.
 */
export async function listAllTelegramFiles(limit = 100): Promise<TelegramDocumentFile[]> {
  const meta = getLocalCachedMeta();
  const rootPromise = listTelegramFiles(null, 0, limit);
  const folderPromises = (meta.folders || []).map(async (folder) => {
    try {
      return await listTelegramFiles(folder.id, 0, limit);
    } catch (err) {
      console.warn(`Error listing files for folder ${folder.name} (${folder.id}):`, err);
      return [];
    }
  });

  const [rootFiles, ...folderFileArrays] = await Promise.all([rootPromise, ...folderPromises]);
  return [...rootFiles, ...folderFileArrays.flat()];
}

/**
 * Uploads a file to a folder's private Telegram channel
 */
export async function uploadTelegramFile(
  file: File,
  folderId: string | null = null,
  onProgress?: (progress: number) => void
): Promise<TelegramDocumentFile> {
  const client = await getTelegramClient();
  const { Api } = await import('telegram');
  const targetPeer = await getFolderPeer(folderId);

  // Upload file with high parallelism (8 workers) for maximum throughput matching Telegram desktop speed
  const uploadedFile = await client.uploadFile({
    file: file,
    workers: 8,
    maxBufferSize: Number.MAX_SAFE_INTEGER,
    onProgress: (percent: number) => {
      if (onProgress) {
        onProgress(Math.round(percent * 100));
      }
    },
  });

  const mimeType = file.type || 'application/octet-stream';

  let sentMessage: any;
  try {
    sentMessage = await client.sendFile(targetPeer, {
      file: uploadedFile,
      caption: file.name,
      forceDocument: true,
      fileSize: file.size,
      mimeType,
      attributes: [
        new Api.DocumentAttributeFilename({ fileName: file.name }),
      ],
    } as any);
  } catch (err: any) {
    const errMsg = (err.errorMessage || err.message || '').toUpperCase();
    if (
      errMsg.includes('CHANNEL_INVALID') ||
      errMsg.includes('CHANNEL_PRIVATE') ||
      errMsg.includes('PEER_ID_INVALID')
    ) {
      if (folderId && folderId !== 'root') {
        await removeDeletedFolder(folderId);
      }
      throw new Error('This folder channel was deleted from Telegram and is no longer available.');
    }
    throw err;
  }

  const fileId = `${folderId || 'root'}_${sentMessage.id}`;

  const meta = getLocalCachedMeta();
  meta.fileOverrides[fileId] = {
    fileId,
    folderId,
    customName: file.name,
    isFavorite: false,
    isTrashed: false,
    lastModified: Date.now(),
  };
  await commitMetaToTelegram(meta);

  return {
    id: fileId,
    messageId: sentMessage.id,
    name: file.name,
    size: file.size,
    mimeType: file.type || 'application/octet-stream',
    date: Math.floor(Date.now() / 1000),
    folderId,
    isFavorite: false,
    isTrashed: false,
    tags: [],
  };
}

/**
 * Downloads a file from the appropriate Telegram channel
 */
export async function downloadTelegramFile(
  fileId: string,
  fileName: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  const { folderId, messageId } = parseFileId(fileId);
  const client = await getTelegramClient();
  const targetPeer = await getFolderPeer(folderId);

  const messages = await client.getMessages(targetPeer, { ids: messageId });
  if (!messages || messages.length === 0) {
    throw new Error('File message not found in Telegram');
  }

  const msg = messages[0];
  const buffer = await client.downloadMedia(msg, {
    progressCallback: (downloaded: any, total: any) => {
      if (onProgress && total) {
        const pct = Math.round((Number(downloaded) / Number(total)) * 100);
        onProgress(pct);
      }
    },
  });

  if (!buffer) {
    throw new Error('Could not download file buffer from Telegram');
  }

  // Resolve best fileName
  let resolvedFileName = fileName;
  const { Api } = await import('telegram');
  if (!resolvedFileName || resolvedFileName.startsWith('file_')) {
    if (msg.media instanceof Api.MessageMediaDocument && msg.media.document instanceof Api.Document) {
      for (const attr of msg.media.document.attributes) {
        if (attr instanceof Api.DocumentAttributeFilename) {
          resolvedFileName = attr.fileName;
          break;
        }
      }
      if (!resolvedFileName || resolvedFileName.startsWith('file_')) {
        const ext = getExtensionFromMime(msg.media.document.mimeType || '');
        resolvedFileName = `File_${msg.id}${ext}`;
      }
    } else if (msg.media instanceof Api.MessageMediaPhoto) {
      resolvedFileName = `Photo_${msg.id}.jpg`;
    }
  }

  const blob = new Blob([buffer as any]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = resolvedFileName || `file_${msg.id}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Gets a blob preview URL for a file
 */
export async function getTelegramFilePreviewUrl(fileId: string, mimeType = 'application/octet-stream'): Promise<string> {
  const { folderId, messageId } = parseFileId(fileId);
  const client = await getTelegramClient();
  const targetPeer = await getFolderPeer(folderId);

  const messages = await client.getMessages(targetPeer, { ids: messageId });
  if (!messages || messages.length === 0) return '';

  const msg = messages[0];
  const { Api } = await import('telegram');

  let resolvedMime = mimeType;
  if (resolvedMime === 'application/octet-stream') {
    if (msg.media instanceof Api.MessageMediaPhoto) {
      resolvedMime = 'image/jpeg';
    } else if (msg.media instanceof Api.MessageMediaDocument && msg.media.document instanceof Api.Document) {
      resolvedMime = msg.media.document.mimeType || 'application/octet-stream';
    }
  }

  const buffer = await client.downloadMedia(msg, {});
  if (!buffer) return '';

  const blob = new Blob([buffer as any], { type: resolvedMime });
  return URL.createObjectURL(blob);
}

// Thumbnail URL in-memory cache to prevent duplicate network downloads
const thumbnailCache = new Map<string, string>();
const thumbnailPending = new Map<string, Promise<string>>();

/**
 * Gets a lightweight blob thumbnail URL for an image, video, or document
 * Uses Telegram's native small thumbnail sizes or stripped inline JPEG.
 */
export async function getTelegramFileThumbnailUrl(fileId: string): Promise<string> {
  if (thumbnailCache.has(fileId)) {
    return thumbnailCache.get(fileId)!;
  }
  if (thumbnailPending.has(fileId)) {
    return thumbnailPending.get(fileId)!;
  }

  const promise = (async () => {
    try {
      const { folderId, messageId } = parseFileId(fileId);
      const client = await getTelegramClient();
      const targetPeer = await getFolderPeer(folderId);

      const messages = await client.getMessages(targetPeer, { ids: messageId });
      if (!messages || messages.length === 0) return '';

      const msg = messages[0];
      if (!msg.media) return '';

      const { Api } = await import('telegram');
      let buffer: any = null;

      // 1. Photo message
      if (msg.media instanceof Api.MessageMediaPhoto && msg.media.photo instanceof Api.Photo) {
        const photo = msg.media.photo;
        const sizes = photo.sizes || [];

        // Check for instant stripped photo size
        const stripped = sizes.find((s: any) => s instanceof Api.PhotoStrippedSize);
        if (stripped && (stripped as any).bytes) {
          try {
            const { strippedPhotoToJpg } = await import('telegram/Utils');
            const jpgBuf = strippedPhotoToJpg((stripped as any).bytes);
            const blob = new Blob([jpgBuf as any], { type: 'image/jpeg' });
            const url = URL.createObjectURL(blob);
            thumbnailCache.set(fileId, url);
            return url;
          } catch (err) {
            console.warn('[TGDocs] Failed to parse stripped photo thumb:', err);
          }
        }

        // Download lightweight thumbnail
        try {
          buffer = await client.downloadMedia(msg, { thumb: 1 });
        } catch {
          buffer = null;
        }
        if (!buffer) {
          try {
            buffer = await client.downloadMedia(msg, { thumb: 0 });
          } catch {
            buffer = null;
          }
        }
      }
      // 2. Document message (videos, images uploaded as files, PDFs, etc.)
      else if (msg.media instanceof Api.MessageMediaDocument && msg.media.document instanceof Api.Document) {
        const doc = msg.media.document;
        const thumbs = (doc.thumbs || []).filter((t: any) => !(t instanceof Api.PhotoPathSize));

        // Check for instant stripped thumbnail in doc.thumbs
        const stripped = thumbs.find((s: any) => s instanceof Api.PhotoStrippedSize);
        if (stripped && (stripped as any).bytes) {
          try {
            const { strippedPhotoToJpg } = await import('telegram/Utils');
            const jpgBuf = strippedPhotoToJpg((stripped as any).bytes);
            const blob = new Blob([jpgBuf as any], { type: 'image/jpeg' });
            const url = URL.createObjectURL(blob);
            thumbnailCache.set(fileId, url);
            return url;
          } catch (err) {
            console.warn('[TGDocs] Failed to parse stripped doc thumb:', err);
          }
        }

        // Determine filename and mime type to support all image/video formats (SVG, PNG, WebP, GIF, MP4, etc.)
        let docFileName = '';
        for (const attr of doc.attributes) {
          if (attr instanceof Api.DocumentAttributeFilename) {
            docFileName = attr.fileName;
          }
        }
        if (!docFileName && msg.message) {
          docFileName = msg.message.trim().split('\n')[0];
        }

        const meta = getLocalCachedMeta();
        const override = meta.fileOverrides[fileId];
        const effectiveName = (override?.customName || docFileName || '').toLowerCase();
        const rawMime = (doc.mimeType || '').toLowerCase();

        const isSvg = effectiveName.endsWith('.svg') || effectiveName.endsWith('.svgz') || rawMime.includes('svg');
        const isImage =
          isSvg ||
          rawMime.startsWith('image/') ||
          /\.(jpg|jpeg|png|gif|webp|bmp|ico|avif|tiff|tif|heic|heif)$/i.test(effectiveName);
        const isVideo =
          rawMime.startsWith('video/') ||
          /\.(mp4|mkv|mov|webm|avi|flv|wmv|m4v|3gp|ts)$/i.test(effectiveName);

        let resolvedBlobMime = 'image/jpeg';
        let isDirect = false;

        // Try downloading official Telegram thumbnail first (videos & photos uploaded as documents)
        if (thumbs.length > 0) {
          const thumbIndex = Math.min(1, thumbs.length - 1);
          try {
            buffer = await client.downloadMedia(msg, { thumb: thumbIndex });
          } catch {
            buffer = null;
          }
          if (!buffer && thumbIndex !== 0) {
            try {
              buffer = await client.downloadMedia(msg, { thumb: 0 });
            } catch {
              buffer = null;
            }
          }
        }

        // If no thumbnail was generated (e.g. SVG files, raw images) or thumb download failed:
        // For SVG and images under 10MB, download the file itself directly
        if (!buffer && isImage && Number(doc.size) < 10 * 1024 * 1024) {
          try {
            buffer = await client.downloadMedia(msg, {});
            isDirect = true;
          } catch {
            buffer = null;
          }
        }

        // Apply correct MIME type so browsers render SVG and images properly
        if (isDirect) {
          if (isSvg) {
            resolvedBlobMime = 'image/svg+xml';
          } else if (rawMime && rawMime.startsWith('image/')) {
            resolvedBlobMime = rawMime;
          } else if (effectiveName.endsWith('.png')) {
            resolvedBlobMime = 'image/png';
          } else if (effectiveName.endsWith('.webp')) {
            resolvedBlobMime = 'image/webp';
          } else if (effectiveName.endsWith('.gif')) {
            resolvedBlobMime = 'image/gif';
          } else if (effectiveName.endsWith('.ico')) {
            resolvedBlobMime = 'image/x-icon';
          } else if (effectiveName.endsWith('.bmp')) {
            resolvedBlobMime = 'image/bmp';
          } else if (effectiveName.endsWith('.avif')) {
            resolvedBlobMime = 'image/avif';
          }
        }
      }

      if (buffer && buffer.length > 0) {
        let finalMime = 'image/jpeg';
        // If buffer starts with SVG xml header or tag
        if (buffer[0] === 0x3c) { // '<' character
          const snippet = buffer.slice(0, 100).toString();
          if (snippet.includes('<svg') || snippet.includes('<?xml')) {
            finalMime = 'image/svg+xml';
          }
        } else if (
          buffer[0] === 0x89 &&
          buffer[1] === 0x50 &&
          buffer[2] === 0x4e &&
          buffer[3] === 0x47
        ) {
          finalMime = 'image/png';
        } else if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
          finalMime = 'image/gif';
        } else if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
          finalMime = 'image/webp';
        }

        const blob = new Blob([buffer as any], { type: finalMime });
        const url = URL.createObjectURL(blob);
        thumbnailCache.set(fileId, url);
        return url;
      }

      return '';
    } catch (e) {
      console.warn(`[TGDocs] Could not load thumbnail for file ${fileId}:`, e);
      return '';
    } finally {
      thumbnailPending.delete(fileId);
    }
  })();

  thumbnailPending.set(fileId, promise);
  return promise;
}


/**
 * Deletes files from Telegram channels
 */
export async function deleteTelegramFiles(fileIds: string[]): Promise<void> {
  const client = await getTelegramClient();
  const meta = getLocalCachedMeta();

  // Group message IDs by folderId
  const byFolder = new Map<string | null, number[]>();
  for (const fid of fileIds) {
    const { folderId, messageId } = parseFileId(fid);
    const list = byFolder.get(folderId) || [];
    list.push(messageId);
    byFolder.set(folderId, list);
    delete meta.fileOverrides[fid];
  }

  for (const [folderId, msgIds] of byFolder.entries()) {
    try {
      const peer = await getFolderPeer(folderId);
      await client.deleteMessages(peer, msgIds, { revoke: true });
    } catch (e) {
      console.warn(`Failed to delete messages in folder ${folderId}:`, e);
    }
  }

  await commitMetaToTelegram(meta);
}
