/**
 * TGDocs Metadata Synchronization Service
 * Stores folders, tags, favorites, and file organization in a dedicated private Telegram channel.
 * Enables seamless cross-device synchronization without any 3rd-party servers.
 */

import { getTelegramClient } from './client';

export interface FolderMeta {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
  color?: string;
  channelId?: string;
  accessHash?: string;
}

export interface FileMetaOverride {
  fileId: string;
  folderId: string | null;
  customName?: string;
  isFavorite?: boolean;
  isTrashed?: boolean;
  tags?: string[];
  lastModified?: number;
}

export interface UserPreferences {
  storageLocation: 'channel' | 'saved_messages';
  storageChannelId?: string;
  theme: 'light' | 'dark' | 'system';
  viewMode: 'grid' | 'list';
}

export interface TGDocsState {
  version: number;
  folders: FolderMeta[];
  fileOverrides: Record<string, FileMetaOverride>;
  preferences: UserPreferences;
  updatedAt: number;
}

const META_CHANNEL_TITLE = 'TGDocs Sync (Do Not Delete)';
const META_CHANNEL_ABOUT = 'Internal metadata channel for TGDocs (tgdocs.com) cross-device sync.';
const META_MAGIC_PREFIX = '###TGDOCS_META_V1###\n';

const LOCAL_STORAGE_CACHE_KEY = 'tgdocs_meta_cache';

let cachedState: TGDocsState = {
  version: 1,
  folders: [],
  fileOverrides: {},
  preferences: {
    storageLocation: 'channel',
    theme: 'system',
    viewMode: 'grid',
  },
  updatedAt: Date.now(),
};

let metaChannelEntity: any = null;

export function getLocalCachedMeta(): TGDocsState {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(LOCAL_STORAGE_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        cachedState = { ...cachedState, ...parsed };
      }
    }
  } catch (e) {
    console.warn('Could not read local meta cache:', e);
  }
  return cachedState;
}

function setLocalCachedMeta(state: TGDocsState) {
  cachedState = state;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(state));
    }
  } catch (e) {
    console.warn('Could not save local meta cache:', e);
  }
}

export async function getOrCreateMetaChannel(): Promise<any> {
  if (metaChannelEntity) return metaChannelEntity;
  const client = await getTelegramClient();
  const { Api } = await import('telegram');

  const dialogs = await client.getDialogs({ limit: 100 });
  for (const dialog of dialogs) {
    if (dialog.isChannel && dialog.title === META_CHANNEL_TITLE) {
      metaChannelEntity = dialog.entity;
      return metaChannelEntity;
    }
  }

  const result = await client.invoke(
    new Api.channels.CreateChannel({
      title: META_CHANNEL_TITLE,
      about: META_CHANNEL_ABOUT,
      broadcast: true,
      megagroup: false,
    })
  );

  if (result instanceof Api.Updates) {
    const chats = result.chats as any[];
    if (chats.length > 0) {
      metaChannelEntity = chats[0];
      return metaChannelEntity;
    }
  }

  return null;
}

export async function syncMetaFromTelegram(): Promise<TGDocsState> {
  try {
    const client = await getTelegramClient();
    const channel = await getOrCreateMetaChannel();
    if (!channel) return cachedState;

    const messages = await client.getMessages(channel, { limit: 10 });
    for (const msg of messages) {
      if (msg.message && msg.message.startsWith(META_MAGIC_PREFIX)) {
        const jsonStr = msg.message.replace(META_MAGIC_PREFIX, '');
        const remoteState: TGDocsState = JSON.parse(jsonStr);
        if (remoteState.updatedAt > cachedState.updatedAt) {
          setLocalCachedMeta(remoteState);
        }
        return cachedState;
      }
    }
  } catch (err) {
    console.warn('Metadata sync from Telegram failed:', err);
  }
  return cachedState;
}

export async function commitMetaToTelegram(newState: Partial<TGDocsState>): Promise<TGDocsState> {
  const updated: TGDocsState = {
    ...cachedState,
    ...newState,
    updatedAt: Date.now(),
  };

  setLocalCachedMeta(updated);

  try {
    const client = await getTelegramClient();
    const channel = await getOrCreateMetaChannel();
    if (channel) {
      const payload = META_MAGIC_PREFIX + JSON.stringify(updated);
      await client.sendMessage(channel, { message: payload });
    }
  } catch (err) {
    console.error('Failed to commit metadata to Telegram:', err);
  }

  return updated;
}
