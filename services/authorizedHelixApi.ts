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
