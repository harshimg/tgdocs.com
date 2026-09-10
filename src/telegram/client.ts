/**
 * TGDocs Telegram Client Singleton
 * Communicates directly with Telegram MTProto servers using WebSockets (WSS).
 * No intermediary servers are involved.
 */

import type { TelegramClient as TelegramClientType } from 'telegram';
import type { StringSession as StringSessionType } from 'telegram/sessions';
import { loadSession, saveSession, loadCredentials } from './session';

// Default public Telegram Web client credentials (used by open-source web clients like WebK & TGStorage)
// These allow any user to sign in directly without needing their own developer API keys.
const envApiId = import.meta.env.PUBLIC_TELEGRAM_API_ID ? Number(import.meta.env.PUBLIC_TELEGRAM_API_ID) : null;
const envApiHash = import.meta.env.PUBLIC_TELEGRAM_API_HASH ? String(import.meta.env.PUBLIC_TELEGRAM_API_HASH).trim() : null;

const DEFAULT_API_ID = (envApiId && !isNaN(envApiId)) ? envApiId : 2040;
const DEFAULT_API_HASH = envApiHash || 'b18441a1ff607e10a989891a5462e627';

let clientInstance: TelegramClientType | null = null;
let currentSession: StringSessionType | null = null;
let clientPromise: Promise<TelegramClientType> | null = null;

export interface ClientCredentials {
  apiId: number;
  apiHash: string;
}

/**
 * Get active credentials from environment, user store, or default
 */
export async function getEffectiveCredentials(): Promise<ClientCredentials> {
  const stored = await loadCredentials();
  if (stored && stored.apiId && stored.apiHash) {
    return stored;
  }
  return {
    apiId: DEFAULT_API_ID,
    apiHash: DEFAULT_API_HASH,
  };
}

/**
 * Get or initialize the Telegram MTProto Client (browser-only)
 */
export async function getTelegramClient(): Promise<TelegramClientType> {
  if (typeof window === 'undefined') {
    throw new Error('TelegramClient can only run in the browser.');
  }

  if (clientInstance && clientInstance.connected) {
    return clientInstance;
  }

  if (clientPromise) {
    return clientPromise;
  }

  clientPromise = (async () => {
    try {
      const [{ TelegramClient }, { StringSession }] = await Promise.all([
        import('telegram'),
        import('telegram/sessions'),
      ]);

      const creds = await getEffectiveCredentials();
      const savedSessionString = await loadSession();

      currentSession = new StringSession(savedSessionString || '');

      const client = new TelegramClient(currentSession, creds.apiId, creds.apiHash, {
        connectionRetries: 5,
        useWSS: true, // Browser WebSocket transport
        deviceModel: 'TGDocs Cloud Web',
        systemVersion: 'Browser / Privacy Edition',
        appVersion: '0.1.0',
      });

      await client.connect();
      clientInstance = client;

      // Only save session if authorized
      try {
        const isAuth = await client.checkAuthorization();
        if (isAuth && currentSession) {
          const sessionStr = client.session.save() as unknown as string;
          if (sessionStr && sessionStr !== savedSessionString) {
            await saveSession(sessionStr);
          }
        }
      } catch {
        // Not yet authorized - do not save unauthenticated session string
      }

      return client;
    } finally {
      clientPromise = null;
    }
  })();

  return clientPromise;
}

/**
 * Disconnect and destroy the client instance
 */
export async function disconnectClient(): Promise<void> {
  if (clientInstance) {
    try {
      await clientInstance.disconnect();
    } catch (e) {
      console.warn('Error disconnecting client:', e);
    }
    clientInstance = null;
    currentSession = null;
    clientPromise = null;
  }
}

/**
 * Check if the client is currently authorized
 */
export async function isClientAuthorized(): Promise<boolean> {
  try {
    const client = await getTelegramClient();
    return await client.checkAuthorization();
  } catch (err) {
    console.warn('Authorization check failed:', err);
    return false;
  }
}
