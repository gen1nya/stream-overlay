import keytar from 'keytar';
import axios from 'axios';
import {shell, dialog, ipcMain} from 'electron';
import { URLSearchParams } from 'url';
import { EventEmitter } from 'events';
import {fetchUser} from "./authorizedHelixApi";

export interface Tokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope?: string[];
  token_type?: string;
  obtained_at?: number;
  user_id?: string;
  login?: string;
}

export interface DeviceCodeInfo {
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
  device_code: string;
}

const authEmitter = new EventEmitter();

export const CLIENT_ID = '1khb6hwbhh9qftsry0gnkm2eeayipc';
const SCOPES = [
  'channel:read:redemptions',
  'channel:read:subscriptions',
  'channel:read:polls',
  'channel:read:predictions',
  'channel:read:hype_train',
  'channel:read:goals',
  'channel:read:cheers',
  'channel:read:editors',
  'user:read:follows',
  'moderator:read:followers',
  'moderator:manage:chat_messages',
  'moderator:manage:banned_users',
  'moderator:manage:shoutouts',
  'channel:manage:moderators',
  'channel:manage:vips',
  'chat:read',
  'chat:edit',
  'bits:read',
].join(' ');

const SERVICE = 'TwitchWatcherasd';
const ACCOUNT = 'tokens';
const DEVICE_INFO_SERVICE = 'TwitchWatcherDevice';
const DEVICE_INFO_ACCOUNT = 'device_code';

let refreshTimeout: NodeJS.Timeout | null = null;

let authAbortController: AbortController | null = null;
let pollingInterval: NodeJS.Timeout | null = null;


function scheduleRefresh(tokens: Tokens) {
  if (refreshTimeout) clearTimeout(refreshTimeout);

  if (!tokens.expires_in || !tokens.obtained_at) return;

  const SAFETY_MARGIN = 300 * 1000; // 5 min
  const expireAt = tokens.obtained_at + tokens.expires_in * 1000;
  const delay = Math.max(0, expireAt - Date.now() - SAFETY_MARGIN);

  console.log(`⏳ Scheduling token refresh in ${Math.round(delay / 1000)}s`);
  refreshTimeout = setTimeout(async () => {
    try {
      const newTokens = await refreshToken(tokens.refresh_token);
      console.log('🔑 Tokens proactively refreshed');
      await saveTokens(newTokens);
      authEmitter.emit('tokens', newTokens);
      scheduleRefresh(newTokens);
    } catch (err: any) {
      console.error('❌ Scheduled token refresh failed:', err.message);
      refreshTimeout = setTimeout(() => scheduleRefresh(tokens), 60_000);
    }
  }, delay);
}

async function saveTokens(tokens: Tokens): Promise<void> {
  tokens.obtained_at = Date.now();
  await keytar.setPassword(SERVICE, ACCOUNT, JSON.stringify(tokens));
  authEmitter.emit('tokens', tokens);
  scheduleRefresh(tokens);
}

export async function clearTokens(): Promise<void> {
  if (refreshTimeout) {
    clearTimeout(refreshTimeout);
    refreshTimeout = null;
  }
  await keytar.deletePassword(SERVICE, ACCOUNT);
  authEmitter.emit('logout');
}

export async function getTokens(forceRefresh: boolean = false): Promise<Tokens | null> {
  const raw = await keytar.getPassword(SERVICE, ACCOUNT);
  if (!raw) return null;
  let tokens: Tokens = JSON.parse(raw);
  const now = Date.now();
  if (forceRefresh || (tokens.obtained_at && tokens.expires_in && now >= tokens.obtained_at + tokens.expires_in * 1000)) {
    try {
      tokens = await refreshToken(tokens.refresh_token);
    } catch (err: any) {
      console.error('❌ Token refresh failed, clearing tokens:', err.message);
      await clearTokens();
      return null;
    }
  } else {
    scheduleRefresh(tokens);
  }
  return tokens;
}

async function refreshToken(refresh_token: string): Promise<Tokens> {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'refresh_token',
    refresh_token,
  });
  const resp = await axios.post('https://id.twitch.tv/oauth2/token', params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  const newTokens: Tokens = resp.data;
  try {
    const userInfo = await fetchUser(newTokens.access_token);
    console.log('🔑 Fetched user info after token refresh:', userInfo);
    newTokens.user_id = userInfo.id;
    newTokens.login = userInfo.login;
  } catch (err: any) {
    console.warn('⚠️ Failed to fetch user info after token refresh:', err.response?.data || err.message);
  }
  await saveTokens(newTokens);
  authEmitter.emit('tokenRefreshed', newTokens);
  return newTokens;
}

async function requestDeviceCode(): Promise<DeviceCodeInfo> {
  const params = new URLSearchParams({ client_id: CLIENT_ID, scopes: SCOPES });
  const resp = await axios.post('https://id.twitch.tv/oauth2/device', params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  const { device_code, user_code, verification_uri, expires_in, interval } = resp.data;
  await keytar.setPassword(DEVICE_INFO_SERVICE, DEVICE_INFO_ACCOUNT, device_code);
  return { user_code, device_code, verification_uri, expires_in, interval };
}

async function pollForToken(): Promise<Tokens> {
  const deviceCode = await keytar.getPassword(DEVICE_INFO_SERVICE, DEVICE_INFO_ACCOUNT);
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    device_code: deviceCode!,
  }).toString();

  while (true) {
    try {
      const resp = await axios.post('https://id.twitch.tv/oauth2/token', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      const tokens: Tokens = resp.data;
      await saveTokens(tokens);
      authEmitter.emit('tokenRefreshed', tokens);
      await keytar.deletePassword(DEVICE_INFO_SERVICE, DEVICE_INFO_ACCOUNT);
      return tokens;
    } catch (err: any) {
      const error = err.response?.data;
      if (error?.message === 'authorization_pending') {
        await new Promise((r) => setTimeout(r, (error.interval || 5) * 1000));
        continue;
      }
      if (error?.message === 'expired_token' || error?.message === 'access_denied') {
        throw new Error(`Device flow failed: ${error.message}`);
      }
      console.error('❌ Device token error:', error || err.message);
      throw err;
    }
  }
}


ipcMain.handle('auth:start', async (event) => {
  const tokens = await getTokens();
  if (tokens) {
    return { success: true, alreadyAuthorized: true };
  }

  try {
    authAbortController = new AbortController();

    const { user_code, device_code, verification_uri, expires_in, interval } =
        await requestDeviceCode();

    event.sender.send('auth:code-ready', {
      userCode: user_code,
      verificationUri: verification_uri,
      expiresIn: expires_in
    });

    shell.openExternal(verification_uri);

    startPolling(event.sender, device_code, interval || 5);

    return { success: true, alreadyAuthorized: false };

  } catch (err: any) {
    console.error('❌ Authorization failed:', err.message);
    event.sender.send('auth:error', { message: err.message });
    return { success: false, error: err.message };
  }
});

function startPolling(
    sender: Electron.WebContents,
    deviceCode: string,
    intervalSeconds: number
) {
  let attemptCount = 0;

  pollingInterval = setInterval(async () => {
    if (authAbortController?.signal.aborted) {
      clearInterval(pollingInterval!);
      pollingInterval = null;
      if (!sender.isDestroyed()) {
        sender.send('auth:cancelled');
      }
      return;
    }

    attemptCount++;
    sender.send('auth:polling', { attempt: attemptCount });

    try {
      const tokens = await checkDeviceCodeStatus(deviceCode);

      if (tokens) {
        clearInterval(pollingInterval!);
        pollingInterval = null;
        authAbortController = null;

        const userInfo = await fetchUser(tokens.access_token);
        if (userInfo) {
          tokens.user_id = userInfo.id;
          tokens.login = userInfo.login;
          await saveTokens(tokens);
        }

        sender.send('auth:success', {
          userId: userInfo?.id,
          login: userInfo?.login
        });
      }

    } catch (err: any) {
      if (err.message !== 'authorization_pending') {
        clearInterval(pollingInterval!);
        pollingInterval = null;
        authAbortController = null;

        sender.send('auth:error', { message: err.message });
      }
    }

  }, intervalSeconds * 1000);
}

async function checkDeviceCodeStatus(deviceCode: string) {
  const response = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      device_code: deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
    })
  });

  const data = await response.json();

  if (!response.ok) {
    if (data.message === 'authorization_pending') {
      throw new Error('authorization_pending');
    }
    throw new Error(data.message || 'Token request failed');
  }

  return data;
}

ipcMain.handle('auth:cancel', async (event) => {
  if (authAbortController) {
    authAbortController.abort();
    authAbortController = null;
  }
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }

  event.sender.send('auth:cancelled');
  return { success: true };
});

export async function authorizeIfNeeded(): Promise<boolean> {
  const tokens = await getTokens();
  if (tokens) {
    return true;
  }
  try {
    const { user_code, verification_uri } = await requestDeviceCode();
    const message = `To authorize, go to ${verification_uri} and enter code ${user_code}`;
    shell.openExternal(verification_uri);
    dialog.showMessageBox({ type: 'info', message, buttons: ['OK'] });
    const newTokens = await pollForToken();
    const userInfo = await fetchUser(newTokens.access_token);
    if (userInfo) {
      newTokens.user_id = userInfo.id;
      newTokens.login = userInfo.login;
      await saveTokens(newTokens);
    }
    return true;
  } catch (err: any) {
    console.error('❌ Authorization failed:', err.message);
    return false;
  }
}

export async function getUserId(): Promise<string | null> {
  const tokens = await getTokens();
  if (!tokens) return null;
  return tokens.user_id || null;
}

export async function getCurrentLogin(): Promise<string | null> {
  const tokens = await getTokens();
  return tokens?.login || null;
}

export function onTokenRefreshed(listener: (t: Tokens) => void): void {
  authEmitter.on('tokenRefreshed', listener);
}

export function onLogout(listener: () => void): void {
  authEmitter.on('logout', listener);
}