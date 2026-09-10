/**
 * TGDocs Encrypted Session Store
 * Stores the encrypted GramJS StringSession and API credentials in IndexedDB.
 */

import { encryptData, decryptData, clearMasterKey } from './crypto';

const DB_NAME = 'tgdocs_session_db';
const STORE_NAME = 'auth_data';
const SESSION_KEY = 'encrypted_session_string';
const CREDS_KEY = 'encrypted_credentials';

function openSessionDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save encrypted session string
 */
export async function saveSession(sessionString: string): Promise<void> {
  if (!sessionString) return;
  const encrypted = await encryptData(sessionString);
  const db = await openSessionDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(encrypted, SESSION_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Load and decrypt session string
 */
export async function loadSession(): Promise<string | null> {
  try {
    const db = await openSessionDB();
    const encrypted = await new Promise<string | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(SESSION_KEY);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (!encrypted) return null;
    return await decryptData(encrypted);
  } catch (err) {
    console.error('Failed to load/decrypt session:', err);
    return null;
  }
}

/**
 * Check if a session exists in IndexedDB
 */
export async function hasSession(): Promise<boolean> {
  try {
    const db = await openSessionDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).count(SESSION_KEY);
      req.onsuccess = () => resolve(req.result > 0);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/**
 * Save user API ID and API Hash (if user configured custom credentials)
 */
export async function saveCredentials(apiId: number, apiHash: string): Promise<void> {
  const jsonStr = JSON.stringify({ apiId, apiHash });
  const encrypted = await encryptData(jsonStr);
  const db = await openSessionDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(encrypted, CREDS_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Get user API ID and API Hash
 */
export async function loadCredentials(): Promise<{ apiId: number; apiHash: string } | null> {
  try {
    const db = await openSessionDB();
    const encrypted = await new Promise<string | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(CREDS_KEY);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (!encrypted) return null;
    const jsonStr = await decryptData(encrypted);
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

/**
 * Completely wipe session and crypto keys on logout
 */
export async function removeSession(): Promise<void> {
  try {
    const db = await openSessionDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(SESSION_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    await clearMasterKey();
  } catch (err) {
    console.error('Error clearing session:', err);
  }
}
