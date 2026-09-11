/**
 * TGDocs Telegram Authentication Service
 * Manages phone number login, confirmation codes, and 2FA cloud passwords.
 */

import { getTelegramClient, disconnectClient, getEffectiveCredentials } from './client';
import { saveSession, removeSession } from './session';

export interface TelegramUser {
  id: string;
  firstName: string;
  lastName?: string;
  username?: string;
  phone?: string;
  isPremium?: boolean;
}

/**
 * Send authentication code to user's Telegram phone number
 */
export async function sendAuthCode(phoneNumber: string): Promise<{ phoneCodeHash: string }> {
  let client = await getTelegramClient();
  const creds = await getEffectiveCredentials();

  const formattedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');

  try {
    const res = await client.sendCode(
      {
        apiId: creds.apiId,
        apiHash: creds.apiHash,
      },
      formattedPhone
    );

    return {
      phoneCodeHash: res.phoneCodeHash,
    };
  } catch (err: any) {
    // If stale session causes auth key failure, reset client and retry once with fresh session
    if (
      err.message &&
      (err.message.includes('AUTH_KEY') ||
        err.message.includes('SESSION_REVOKED') ||
        err.message.includes('SESSION_EXPIRED'))
    ) {
      await removeSession();
      await disconnectClient();
      client = await getTelegramClient();
      const res = await client.sendCode(
        {
          apiId: creds.apiId,
          apiHash: creds.apiHash,
        },
        formattedPhone
      );
      return { phoneCodeHash: res.phoneCodeHash };
    }
    throw err;
  }
}

/**
 * Sign in user using phone number, phone code hash, and received confirmation code
 */
export async function signInWithCode(
  phoneNumber: string,
  phoneCodeHash: string,
  phoneCode: string
): Promise<{ user?: TelegramUser; requires2FA?: boolean }> {
  const client = await getTelegramClient();
  const { Api } = await import('telegram');
  const formattedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');

  try {
    const user = await client.invoke(
      new Api.auth.SignIn({
        phoneNumber: formattedPhone,
        phoneCodeHash,
        phoneCode,
      })
    );

    // Save session string
    const sessionStr = client.session.save() as unknown as string;
    await saveSession(sessionStr);

    if (user instanceof Api.auth.Authorization) {
      const u = user.user as any;
      return {
        user: {
          id: u.id.toString(),
          firstName: u.firstName || '',
          lastName: u.lastName || '',
          username: u.username || '',
          phone: u.phone || '',
          isPremium: !!u.premium,
        },
      };
    }

    return {};
  } catch (err: any) {
    if (err.message && err.message.includes('SESSION_PASSWORD_NEEDED')) {
      return { requires2FA: true };
    }
    throw err;
  }
}

/**
 * Complete sign in using 2FA cloud password
 */
export async function signInWith2FA(password: string): Promise<TelegramUser> {
  const client = await getTelegramClient();
  const { Api } = await import('telegram');
  const { computeCheck } = await import('telegram/Password');

  // 1. Fetch current 2FA password SRP parameters from Telegram
  const passwordSrpResult = await client.invoke(new Api.account.GetPassword());

  // 2. Compute the SRP client check
  const passwordSrpCheck = await computeCheck(passwordSrpResult, password);

  // 3. Fix browser dual-buffer polyfill mismatch:
  // In browser environments, crypto-browserify returns buffers from safe-buffer,
  // whose constructor differs from the global Buffer polyfill checked by GramJS's serializeBytes.
  // Re-wrapping A and M1 ensures serializeBytes passes `instanceof Buffer`.
  const BufferClass =
    (passwordSrpCheck as any).A?.constructor ||
    (typeof Buffer !== 'undefined' ? Buffer : (globalThis as any).Buffer);

  if (passwordSrpCheck instanceof Api.InputCheckPasswordSRP) {
    if (passwordSrpCheck.A) {
      passwordSrpCheck.A = BufferClass.from(new Uint8Array(passwordSrpCheck.A));
    }
    if (passwordSrpCheck.M1) {
      passwordSrpCheck.M1 = BufferClass.from(new Uint8Array(passwordSrpCheck.M1));
    }
  }

  // 4. Send the CheckPassword verification request
  const res = await client.invoke(
    new Api.auth.CheckPassword({
      password: passwordSrpCheck,
    })
  );

  // 5. Save authenticated session string
  const sessionStr = client.session.save() as unknown as string;
  await saveSession(sessionStr);

  if (res instanceof Api.auth.Authorization) {
    const u = res.user as any;
    return {
      id: u.id.toString(),
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      username: u.username || '',
      phone: u.phone || '',
      isPremium: !!u.premium,
    };
  }

  const me = await client.getMe();
  if (me instanceof Api.User) {
    return {
      id: me.id.toString(),
      firstName: me.firstName || '',
      lastName: me.lastName || '',
      username: me.username || '',
      phone: me.phone || '',
      isPremium: !!(me as any).premium,
    };
  }
  throw new Error('Could not retrieve user information');
}

/**
 * Get current authenticated user details
 */
export async function getCurrentUser(): Promise<TelegramUser | null> {
  try {
    const client = await getTelegramClient();
    const { Api } = await import('telegram');
    const me = await client.getMe();
    if (!me || !(me instanceof Api.User)) return null;

    return {
      id: me.id.toString(),
      firstName: me.firstName || '',
      lastName: me.lastName || '',
      username: me.username || '',
      phone: me.phone || '',
      isPremium: !!(me as any).premium,
    };
  } catch {
    return null;
  }
}

/**
 * Log out and destroy session data completely
 */
export async function logout(): Promise<void> {
  try {
    const client = await getTelegramClient();
    const { Api } = await import('telegram');
    try {
      await client.invoke(new Api.auth.LogOut());
    } catch (e) {
      console.warn('Telegram logout invoke failed:', e);
    }
  } catch (e) {
    console.warn('Client retrieval for logout failed:', e);
  } finally {
    await disconnectClient();
    await removeSession();
  }
}
