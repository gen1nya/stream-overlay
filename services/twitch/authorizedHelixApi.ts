import {URLSearchParams} from 'url';
import axios from 'axios';
import * as authService from './authService';
import {CLIENT_ID} from './authService';
import {UsersResponse} from "./types/UserData";

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

export async function removeTimeoutOrBan(userId: string): Promise<void> {
  const tokens = await authService.getTokens();
  if (!tokens?.access_token) throw new Error("No access token");
  const broadcaster_id = await authService.getUserId();
  await axios.delete('https://api.twitch.tv/helix/moderation/bans', {
    params: {
      broadcaster_id: broadcaster_id,
      moderator_id: broadcaster_id,
      user_id: userId,
    },
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      'Client-Id': authService.CLIENT_ID,
    },
  });
}

export interface UserRoles {
  isVip: boolean;
  isModerator: boolean;
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

export interface ExtendedTwitchUser {
  user: TwitchUser;
  isModerator: boolean;
  isVIP: boolean;
  followedAt: string | null;
  isBanned: boolean;
  banExpiresAt?: string | null;
}

export interface TwitchUser {
  id: string;
  login: string;
  display_name: string;
  type: string;
  broadcaster_type: string;
  description: string;
  profile_image_url: string;
  offline_image_url: string;
  view_count: number;
  email?: string;
  created_at: string;
}

export interface TwitchUsersResponse {
  data: TwitchUser[];
}

export async function fetchFollowerCount(userId: string | null = null): Promise<number> {
    const tokens = await authService.getTokens();
    if (!tokens?.access_token) throw new Error('No access token');
    const broadcaster_id = userId || tokens.user_id;

    const params = new URLSearchParams({ broadcaster_id: String(broadcaster_id) });
    const response = await axios.get(`https://api.twitch.tv/helix/channels/followers?${params.toString()}`, {
        headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        'Client-Id': authService.CLIENT_ID,
        },
    });

    return response.data.total ?? 0;
}

export async function fetchUser(
    accessToken: string | null = null,
    args: any = {},
): Promise<TwitchUser> {
  let token = accessToken || (await authService.getTokens())?.access_token;
  if (!token) {
    throw new Error('No access token provided');
  }
  const url = new URL('https://api.twitch.tv/helix/users');

  if (args.id) {
    url.searchParams.set('id', args.id);
  } else if (args.login) {
    url.searchParams.set('login', args.login.toLowerCase());
  }

  const response = await axios.get<TwitchUsersResponse>(url.toString(), {
    headers: {
      'Client-ID': CLIENT_ID,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.data.data.length) {
    throw new Error('User not found');
  }

  return response.data.data[0];
}

export async function getFollowDate(user_id: string): Promise<string | null> {
  const tokens = await authService.getTokens();
  if (!tokens?.access_token) throw new Error('No access token');
  const broadcaster_id = await authService.getUserId();

  const params = new URLSearchParams({
    user_id,
    broadcaster_id: String(broadcaster_id),
  });

  const response = await axios.get('https://api.twitch.tv/helix/channels/followers?' + params.toString(), {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      'Client-Id': authService.CLIENT_ID,
    },
  });

  const data = response.data?.data?.[0];
  return data?.followed_at ?? null;
}

export async function isModerator(user_id: string): Promise<boolean> {
  const tokens = await authService.getTokens();
  if (!tokens?.access_token) throw new Error('No access token');
  const broadcaster_id = await authService.getUserId();

  const params = new URLSearchParams({
    user_id,
    broadcaster_id: String(broadcaster_id),
  });

  const response = await axios.get('https://api.twitch.tv/helix/moderation/moderators?' + params.toString(), {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      'Client-Id': authService.CLIENT_ID,
    },
  });

  return response.data?.data?.length > 0;
}

export async function isVIP(user_id: string): Promise<boolean> {
  const tokens = await authService.getTokens();
  if (!tokens?.access_token) throw new Error('No access token');
  const broadcaster_id = await authService.getUserId();

  const params = new URLSearchParams({
    user_id,
    broadcaster_id: String(broadcaster_id),
  });

  const response = await axios.get('https://api.twitch.tv/helix/channels/vips?' + params.toString(), {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      'Client-Id': authService.CLIENT_ID,
    },
  });

  return response.data?.data?.length > 0;
}

export async function isUserBanned(userId: string): Promise<{ isBanned: boolean; banExpiresAt?: string | null }> {
  const tokens = await authService.getTokens();
  if (!tokens?.access_token) throw new Error("No access token");

  const broadcaster_id = await authService.getUserId();

  const response = await axios.get("https://api.twitch.tv/helix/moderation/banned", {
    params: {
      broadcaster_id,
      user_id: userId,
    },
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      'Client-Id': authService.CLIENT_ID,
    },
  });

  const bannedUser = response.data?.data?.[0];

  if (!bannedUser) return { isBanned: false };

  return {
    isBanned: true,
    banExpiresAt: bannedUser.expires_at ?? null
  };
}

type UserQuery = { id: string } | { login: string };

export async function getExtendedUser(query: UserQuery): Promise<ExtendedTwitchUser> {
  const tokens = await authService.getTokens();
  if (!tokens?.access_token) throw new Error("No access token");

  const user = await fetchUser(tokens.access_token, query);
  const userId = user.id;

  const [followedAt, isMod, isVip, banStatus] = await Promise.all([
    getFollowDate(userId),
    isModerator(userId),
    isVIP(userId),
    isUserBanned(userId)
  ]);

  return {
    user,
    isModerator: isMod,
    isVIP: isVip,
    followedAt,
    isBanned: banStatus.isBanned,
    banExpiresAt: banStatus.banExpiresAt
  };
}

export async function getEditorsByBroadcasterId(broadcaster_id: string): Promise<UsersResponse> {
  const tokens = await authService.getTokens();
  if (!tokens?.access_token) throw new Error('No access token');

  const params = new URLSearchParams({ broadcaster_id });
  const response = await axios.get<UsersResponse>(`https://api.twitch.tv/helix/channels/editors?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      'Client-Id': authService.CLIENT_ID,
    },
  });

  return response.data;
}