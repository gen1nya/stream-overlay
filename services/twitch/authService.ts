import keytar from 'keytar';
import axios from 'axios';
import { shell, dialog } from 'electron';
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

export async function getTokens(): Promise<Tokens | null> {
  const raw = await keytar.getPassword(SERVICE, ACCOUNT);
  if (!raw) return null;
  let tokens: Tokens = JSON.parse(raw);
  const now = Date.now();
  if (tokens.obtained_at && tokens.expires_in && now >= tokens.obtained_at + tokens.expires_in * 1000) {
    try {
      tokens = await refreshToken(tokens.refresh_token);
    } catch (err: any) {
      console.error('❌ Token refresh failed, clearing tokens:', err.message);
      await clearTokens();
      return null;
    }
  }
  return tokens;
}

async function saveTokens(tokens: Tokens): Promise<void> {
  tokens.obtained_at = Date.now();
  await keytar.setPassword(SERVICE, ACCOUNT, JSON.stringify(tokens));
}

export async function clearTokens(): Promise<void> {
  await keytar.deletePassword(SERVICE, ACCOUNT);
  await keytar.deletePassword(DEVICE_INFO_SERVICE, DEVICE_INFO_ACCOUNT);
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
  return { user_code, verification_uri, expires_in, interval };
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
