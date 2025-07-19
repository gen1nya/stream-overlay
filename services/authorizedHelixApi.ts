import { URLSearchParams } from 'url';
import axios from 'axios';
import * as authService from './authService';

export async function timeoutUser(
  user_id: string,
  duration = 600,
  reason = ''
): Promise<void> {
  const tokens = await authService.getTokens();
  if (!tokens?.access_token) throw new Error('No access token');
  const broadcaster_id = await authService.getUserId();
  const moderator_id = broadcaster_id;
  const params = new URLSearchParams({ broadcaster_id: String(broadcaster_id), moderator_id: String(moderator_id) });
  const url = `https://api.twitch.tv/helix/moderation/bans?${params}`;
  const body = { data: { user_id, duration, reason } };
  await axios.post(url, body, {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      'Client-Id': authService.CLIENT_ID,
      'Content-Type': 'application/json',
    },
  });
}

export interface UserRoles {
  isVip: boolean;
  isModerator: boolean;
}

interface RoleCacheEntry {
  roles: UserRoles;
  expiresAt: number;
}

const ROLE_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
const roleCache: Map<string, RoleCacheEntry> = new Map();

export async function getUserRoles(user_id: string): Promise<UserRoles> {
  const cached = roleCache.get(user_id);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.roles;
  }

  const tokens = await authService.getTokens();
  if (!tokens?.access_token) throw new Error('No access token');
  const broadcaster_id = await authService.getUserId();
  if (!broadcaster_id) throw new Error('No broadcaster id');

  const headers = {
    Authorization: `Bearer ${tokens.access_token}`,
    'Client-Id': authService.CLIENT_ID,
  };

  const vipParams = new URLSearchParams({ broadcaster_id: String(broadcaster_id), user_id });
  const modParams = new URLSearchParams({ broadcaster_id: String(broadcaster_id), user_id });

  const [vipResp, modResp] = await Promise.all([
    axios.get(`https://api.twitch.tv/helix/channels/vips?${vipParams}` , { headers }),
    axios.get(`https://api.twitch.tv/helix/moderation/moderators?${modParams}`, { headers }),
  ]);

  const isVip = Array.isArray(vipResp.data.data) && vipResp.data.data.length > 0;
  const isModerator = Array.isArray(modResp.data.data) && modResp.data.data.length > 0;

  const roles = { isVip, isModerator };
  roleCache.set(user_id, { roles, expiresAt: Date.now() + ROLE_CACHE_DURATION });
  return roles;
}

export async function addVip(user_id: string): Promise<void> {
  const tokens = await authService.getTokens();
  if (!tokens?.access_token) throw new Error('No access token');
  const broadcaster_id = await authService.getUserId();
  const params = new URLSearchParams({ broadcaster_id: String(broadcaster_id), user_id });
  await axios.post(`https://api.twitch.tv/helix/channels/vips?${params}`, null, {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      'Client-Id': authService.CLIENT_ID,
    },
  });
}

export async function removeVip(user_id: string): Promise<void> {
  const tokens = await authService.getTokens();
  if (!tokens?.access_token) throw new Error('No access token');
  const broadcaster_id = await authService.getUserId();
  const params = new URLSearchParams({ broadcaster_id: String(broadcaster_id), user_id });
  await axios.delete(`https://api.twitch.tv/helix/channels/vips?${params}`, {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      'Client-Id': authService.CLIENT_ID,
    },
  });
}

export async function addModerator(user_id: string): Promise<void> {
  const tokens = await authService.getTokens();
  if (!tokens?.access_token) throw new Error('No access token');
  const broadcaster_id = await authService.getUserId();
  const params = new URLSearchParams({ broadcaster_id: String(broadcaster_id), user_id });
  await axios.post(`https://api.twitch.tv/helix/moderation/moderators?${params}`, null, {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      'Client-Id': authService.CLIENT_ID,
    },
  });
}

export async function removeModerator(user_id: string): Promise<void> {
  const tokens = await authService.getTokens();
  if (!tokens?.access_token) throw new Error('No access token');
  const broadcaster_id = await authService.getUserId();
  const params = new URLSearchParams({ broadcaster_id: String(broadcaster_id), user_id });
  await axios.delete(`https://api.twitch.tv/helix/moderation/moderators?${params}`, {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      'Client-Id': authService.CLIENT_ID,
    },
  });
}

