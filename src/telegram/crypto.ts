/**
 * TGDocs Session & Data Encryption Layer
 * Uses native Web Crypto API (SubtleCrypto) with AES-GCM 256-bit encryption.
 * Keys are kept non-extractable in browser storage.
 */

const DB_NAME = 'tgdocs_keystore';
const STORE_NAME = 'keys';
const KEY_ID = 'session_master_key';

/**
 * Open IndexedDB for key storage
 */
function openKeyDB(): Promise<IDBDatabase> {
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
 * Get or generate non-extractable AES-GCM CryptoKey
 */
async function getOrCreateMasterKey(): Promise<CryptoKey> {
  const db = await openKeyDB();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(KEY_ID);

    getReq.onsuccess = async () => {
      if (getReq.result) {
        resolve(getReq.result as CryptoKey);
        return;
      }

      // Generate new AES-GCM 256-bit key
      try {
        const key = await window.crypto.subtle.generateKey(
          {
            name: 'AES-GCM',
            length: 256,
          },
          false, // non-extractable for maximum security
          ['encrypt', 'decrypt']
        );

        const putTx = db.transaction(STORE_NAME, 'readwrite');
        putTx.objectStore(STORE_NAME).put(key, KEY_ID);
        putTx.oncomplete = () => resolve(key);
        putTx.onerror = () => reject(putTx.error);
      } catch (err) {
        reject(err);
      }
    };

    getReq.onerror = () => reject(getReq.error);
  });
}

/**
 * Encrypt a plain text string (e.g. GramJS StringSession)
 */
export async function encryptData(plainText: string): Promise<string> {
  if (!plainText) return '';
  const key = await getOrCreateMasterKey();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encodedData = new TextEncoder().encode(plainText);

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    encodedData
  );

  // Combine IV (12 bytes) + Encrypted data
  const combined = new Uint8Array(iv.byteLength + encryptedBuffer.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encryptedBuffer), iv.byteLength);

  // Convert to Base64
  let binary = '';
  const len = combined.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(combined[i]);
  }
  return window.btoa(binary);
}

/**
 * Decrypt an encrypted Base64 string
 */
export async function decryptData(cipherTextBase64: string): Promise<string> {
  if (!cipherTextBase64) return '';
  const key = await getOrCreateMasterKey();
  const binary = window.atob(cipherTextBase64);
  const combined = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    combined[i] = binary.charCodeAt(i);
  }

  // Extract 12-byte IV and ciphertext
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    data
  );

  return new TextDecoder().decode(decryptedBuffer);
}

/**
 * Purge encryption keys (e.g. on full account reset)
 */
export async function clearMasterKey(): Promise<void> {
  const db = await openKeyDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(KEY_ID);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
