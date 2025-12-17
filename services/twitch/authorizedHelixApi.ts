import {URLSearchParams} from 'url';
import axios from 'axios';
import * as authService from './authService';
import {CLIENT_ID} from './authService';
import {FollowerResponse, ModeratorResponse, UsersResponse, VipsResponse} from "./types/UserData";
import {TwitchStreamResponseType} from "./types/TwitchStreamResponseType";
import {CustomRewardResponse} from "./types/CustomRevardData";

const BASE_URL = 'https://api.twitch.tv/helix';

/**
 * Timeout or ban a user
 * @param user_id - User ID to timeout/ban
 * @param duration - Duration in seconds. If null/undefined, user will be permanently banned
 * @param reason - Reason for timeout/ban
 */
export async function timeoutUser(
    user_id: string,
    duration?: number | null,
    reason = ''
): Promise<void> {
    const tokens = await authService.getTokens();
    if (!tokens?.access_token) throw new Error('No access token');
    const broadcaster_id = await authService.getUserId();
    const moderator_id = broadcaster_id;
    const params = new URLSearchParams({broadcaster_id: String(broadcaster_id), moderator_id: String(moderator_id)});
    const url = `${BASE_URL}/moderation/bans?${params}`;

    // If duration is not provided or null, it's a permanent ban
    const body: any = {
        data: {
            user_id,
            reason
        }
    };

    // Only add duration if it's provided (timeout vs ban)
    if (duration !== null && duration !== undefined) {
        body.data.duration = duration;
    }

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
    await axios.delete(`${BASE_URL}/moderation/bans`, {
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

/**
 * Delete a specific chat message
 * @param message_id - The ID of the message to delete
 */
export async function deleteMessage(message_id: string): Promise<void> {
    const tokens = await authService.getTokens();
    if (!tokens?.access_token) throw new Error('No access token');
    const broadcaster_id = await authService.getUserId();
    const moderator_id = broadcaster_id;

    const params = new URLSearchParams({
        broadcaster_id: String(broadcaster_id),
        moderator_id: String(moderator_id),
        message_id: message_id
    });

    await axios.delete(`${BASE_URL}/moderation/chat?${params.toString()}`, {
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
    const params = new URLSearchParams({broadcaster_id: String(broadcaster_id), user_id});
    await axios.post(`${BASE_URL}/channels/vips?${params}`, null, {
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
    const params = new URLSearchParams({broadcaster_id: String(broadcaster_id), user_id});
    await axios.delete(`${BASE_URL}/channels/vips?${params}`, {
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
    const params = new URLSearchParams({broadcaster_id: String(broadcaster_id), user_id});
    await axios.post(`${BASE_URL}/moderation/moderators?${params}`, null, {
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
    const params = new URLSearchParams({broadcaster_id: String(broadcaster_id), user_id});
    await axios.delete(`${BASE_URL}/moderation/moderators?${params}`, {
        headers: {
            Authorization: `Bearer ${tokens.access_token}`, 'Client-Id': authService.CLIENT_ID,
        },
    });
}

/**
 * Send a shoutout to another broadcaster
 * @param to_broadcaster_id - The ID of the broadcaster to shoutout
 */
export async function sendShoutout(to_broadcaster_id: string): Promise<void> {
    const tokens = await authService.getTokens();
    if (!tokens?.access_token) throw new Error('No access token');
    const broadcaster_id = await authService.getUserId();
    const params = new URLSearchParams({
        from_broadcaster_id: String(broadcaster_id),
        to_broadcaster_id: to_broadcaster_id,
        moderator_id: String(broadcaster_id)
    });
    await axios.post(`${BASE_URL}/chat/shoutouts?${params}`, null, {
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

    const params = new URLSearchParams({broadcaster_id: String(broadcaster_id)});
    const response = await axios.get(`${BASE_URL}/channels/followers?${params.toString()}`, {
        headers: {
            Authorization: `Bearer ${tokens.access_token}`,
            'Client-Id': authService.CLIENT_ID,
        },
    });

    return response.data.total ?? 0;
}


/*
curl -X GET 'https://api.twitch.tv/helix/channels/followers?broadcaster_id=123456' \
  -H 'Authorization: Bearer kpvy3cjboyptmiacwr0c19hotn5s' \
  -H 'Client-Id: hof5gwx0su6owfn0nyan9c87zr6t'
* */
export async function fetchFollower(cursor: string | null): Promise<FollowerResponse> {
    const tokens = await authService.getTokens();
    if (!tokens?.access_token) throw new Error('No access token');
    const broadcaster_id = tokens.user_id;

    const params = new URLSearchParams({
        broadcaster_id: String(broadcaster_id),
        first: '100',
    });
    if (cursor) {
        params.append('after', cursor);
    }
    const response = await axios.get<FollowerResponse>(`${BASE_URL}/channels/followers?${params.toString()}`, {
        headers: {
            Authorization: `Bearer ${tokens.access_token}`,
            'Client-Id': authService.CLIENT_ID,
        },
    });

    return response.data;
}

export async function fetchVips(cursor: string | null): Promise<VipsResponse> {
    const tokens = await authService.getTokens();
    if (!tokens?.access_token) throw new Error('No access token');
    const broadcaster_id = tokens.user_id;

    const params = new URLSearchParams({
        broadcaster_id: String(broadcaster_id),
        first: '20',
    });
    if (cursor) {
        params.append('after', cursor);
    }
    const response = await axios.get<VipsResponse>(`${BASE_URL}/channels/vips?${params.toString()}`, {
        headers: {
            Authorization: `Bearer ${tokens.access_token}`,
            'Client-Id': authService.CLIENT_ID,
        },
    });
    return response.data;
}

export async function fetchModerators(cursor: string | null): Promise<ModeratorResponse> {
    const tokens = await authService.getTokens();
    if (!tokens?.access_token) throw new Error('No access token');
    const broadcaster_id = tokens.user_id;
    const params = new URLSearchParams({
        broadcaster_id: String(broadcaster_id),
        first: '20',
    });
    if (cursor) {
        params.append('after', cursor);
    }
    const response = await axios.get<ModeratorResponse>(`${BASE_URL}/moderation/moderators?${params.toString()}`, {
        headers: {
            Authorization: `Bearer ${tokens.access_token}`,
            'Client-Id': authService.CLIENT_ID,
        },
    });
    return response.data;
}

export async function fetchUser(
    accessToken: string | null = null,
    args: any = {},
): Promise<TwitchUser> {
    let token = accessToken || (await authService.getTokens())?.access_token;
    if (!token) {
        throw new Error('No access token provided');
    }
    const url = new URL(`${BASE_URL}/users`);

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

    const response = await axios.get(`${BASE_URL}/channels/followers?` + params.toString(), {
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

    const response = await axios.get(`${BASE_URL}/moderation/moderators?` + params.toString(), {
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

    const response = await axios.get(`${BASE_URL}/channels/vips?` + params.toString(), {
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

    const response = await axios.get(`${BASE_URL}/moderation/banned`, {
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

    if (!bannedUser) return {isBanned: false};

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

export async function fetchCustomRewards(): Promise<CustomRewardResponse> {
    const tokens = await authService.getTokens();
    if (!tokens?.access_token) throw new Error('No access token');
    const broadcaster_id = await authService.getUserId();

    const params = new URLSearchParams({ broadcaster_id: String(broadcaster_id) });
    const response = await axios.get<CustomRewardResponse>(`${BASE_URL}/channel_points/custom_rewards?${params.toString()}`, {
        headers: {
            Authorization: `Bearer ${tokens.access_token}`,
            'Client-Id': authService.CLIENT_ID,
        },
    });
    return response.data;
}

export async function fetchEditors(): Promise<UsersResponse> {
    const tokens = await authService.getTokens();
    if (!tokens?.access_token) throw new Error('No access token');
    const broadcaster_id = await authService.getUserId();

    const params = new URLSearchParams({
        broadcaster_id: String(broadcaster_id),
        first: '20',
    });
    const response = await axios.get<UsersResponse>(`${BASE_URL}/channels/editors?${params.toString()}`, {
        headers: {
            Authorization: `Bearer ${tokens.access_token}`,
            'Client-Id': authService.CLIENT_ID,
        },
    });

    return response.data;
}

export async function fetchStreams(): Promise<TwitchStreamResponseType> {
    const tokens = await authService.getTokens();
    if (!tokens?.access_token) throw new Error('No access token');
    const broadcaster_id = await authService.getUserId();

    const params = new URLSearchParams({
        user_id: String(broadcaster_id),
    });
    const response = await axios.get<TwitchStreamResponseType>(
        `${BASE_URL}/streams?${params.toString()}`,
        {
            headers: {
                Authorization: `Bearer ${tokens.access_token}`,
                'Client-Id': authService.CLIENT_ID,
            },
        }
    );

    return response.data;
}

// ==================== Chatters ====================

export interface Chatter {
    user_id: string;
    user_login: string;
    user_name: string;
}

export interface ChattersResponse {
    data: Chatter[];
    pagination: {
        cursor?: string;
    };
    total: number;
}

/**
 * Fetch chatters (users currently in chat)
 * Requires scope: moderator:read:chatters
 * @param cursor - Pagination cursor
 */
export async function fetchChatters(cursor: string | null = null): Promise<ChattersResponse> {
    const tokens = await authService.getTokens();
    if (!tokens?.access_token) throw new Error('No access token');
    const broadcaster_id = await authService.getUserId();

    const params = new URLSearchParams({
        broadcaster_id: String(broadcaster_id),
        moderator_id: String(broadcaster_id),
        first: '1000', // Max allowed
    });
    if (cursor) {
        params.append('after', cursor);
    }

    const response = await axios.get<ChattersResponse>(
        `${BASE_URL}/chat/chatters?${params.toString()}`,
        {
            headers: {
                Authorization: `Bearer ${tokens.access_token}`,
                'Client-Id': authService.CLIENT_ID,
            },
        }
    );

    return response.data;
}

/**
 * Fetch all chatters (handles pagination)
 */
export async function fetchAllChatters(): Promise<Chatter[]> {
    const allChatters: Chatter[] = [];
    let cursor: string | null = null;

    do {
        const response = await fetchChatters(cursor);
        allChatters.push(...response.data);
        cursor = response.pagination?.cursor || null;
    } while (cursor);

    return allChatters;
}