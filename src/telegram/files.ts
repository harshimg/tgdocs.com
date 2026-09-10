/**
 * TGDocs Telegram File Operations Service
 * Direct browser-to-Telegram MTProto transfers (uploads, downloads, streaming).
 * Folders are mapped 1-to-1 to dedicated private Telegram channels for true two-way sync.
 */

import { getTelegramClient } from './client';
import { getLocalCachedMeta, commitMetaToTelegram } from './metadata';

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

  if (result instanceof Api.Updates) {
    const chats = result.chats as any[];
    if (chats.length > 0) {
      storageChannelEntity = chats[0];
      return storageChannelEntity;
    }
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
      return {
        channelId: chat.id.toString(),
        accessHash: chat.accessHash ? chat.accessHash.toString() : '',
      };
    }
  }

  throw new Error('Failed to create private Telegram channel for folder');
}

/**
 * Ensures a Telegram Chat Folder (Dialog Filter) named "TGDocs" exists in the user's Telegram app,
 * containing all TGDocs channels (root cloud storage and all folder channels).
 */
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
          const key = inputPeer.channelId.toString();
          if (!seenIds.has(key)) {
            seenIds.add(key);
            peersToInclude.push(inputPeer);
          }
        } else if (inputPeer && 'chatId' in inputPeer) {
          const key = inputPeer.chatId.toString();
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
            channelId: bigInt(folder.channelId),
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
      return new Api.InputPeerChannel({
        channelId: bigInt(folder.channelId),
        accessHash: bigInt(folder.accessHash),
      });
    } catch (e) {
      console.warn('Error creating InputPeerChannel:', e);
    }
  }

  // 2. If folder has channelId, check dialogs for accessHash
  if (folder.channelId) {
    try {
      const dialogs = await client.getDialogs({ limit: 100 });
      for (const d of dialogs) {
        if (d.entity && d.entity.id && d.entity.id.toString() === folder.channelId) {
          if (d.entity.accessHash) {
            folder.accessHash = d.entity.accessHash.toString();
            await commitMetaToTelegram({ folders: meta.folders });
          }
          return d.entity;
        }
      }
    } catch (e) {
      console.warn('Error finding folder channel in dialogs:', e);
    }
  }

  // 3. Lazy creation: if legacy folder without channel, create channel now
  try {
    const created = await createFolderChannel(folder.name);
    folder.channelId = created.channelId;
    folder.accessHash = created.accessHash;
    await commitMetaToTelegram({ folders: meta.folders });

    return new Api.InputPeerChannel({
      channelId: bigInt(folder.channelId),
      accessHash: bigInt(folder.accessHash),
    });
  } catch (err) {
    console.warn(`Could not create channel for folder "${folder.name}", falling back to root storage:`, err);
    return await getOrCreateStorageChannel();
  }
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
      channelId: bigInt(folder.channelId),
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
  } catch (err) {
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
      channelId: bigInt(folder.channelId),
      accessHash: bigInt(folder.accessHash),
    });
    await client.invoke(
      new Api.channels.DeleteChannel({
        channel: channelPeer,
      })
    );
  } catch (err) {
    console.warn('Failed to delete channel on Telegram:', err);
  }
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
  } catch (err) {
    console.warn(`Error getting messages for peer (folderId=${folderId}):`, err);
    return [];
  }

  const files: TelegramDocumentFile[] = [];

  for (const msg of messages) {
    if (msg.media && msg.media instanceof Api.MessageMediaDocument) {
      const doc = msg.media.document;
      if (doc instanceof Api.Document) {
        let fileName = 'Unnamed_File';
        for (const attr of doc.attributes) {
          if (attr instanceof Api.DocumentAttributeFilename) {
            fileName = attr.fileName;
            break;
          }
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
          folderId: override.folderId !== undefined ? override.folderId : folderId,
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
 * Uploads a file to a folder's private Telegram channel
 */
export async function uploadTelegramFile(
  file: File,
  folderId: string | null = null,
  onProgress?: (progress: number) => void
): Promise<TelegramDocumentFile> {
  const client = await getTelegramClient();
  const { Api } = await import('telegram');
  const { CustomFile } = await import('telegram/client/uploads');
  const targetPeer = await getFolderPeer(folderId);

  // Read the File bytes into an ArrayBuffer and convert to a Buffer for GramJS
  const arrayBuffer = await file.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);
  const customFile = new CustomFile(file.name, file.size, '', fileBuffer);

  const uploadedFile = await client.uploadFile({
    file: customFile,
    workers: 4,
    onProgress: (percent: number) => {
      if (onProgress) {
        onProgress(Math.round(percent * 100));
      }
    },
  });

  const sentMessage = await client.sendFile(targetPeer, {
    file: uploadedFile,
    caption: file.name,
    forceDocument: true,
    attributes: [
      new Api.DocumentAttributeFilename({ fileName: file.name }),
    ],
  });

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

  const blob = new Blob([buffer as any]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
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

  const buffer = await client.downloadMedia(messages[0], {});
  if (!buffer) return '';

  const blob = new Blob([buffer as any], { type: mimeType });
  return URL.createObjectURL(blob);
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
