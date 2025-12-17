import axios from 'axios';
import * as authService from './authService';
import {LogService} from "../logService";

interface ChannelInfo {
  displayName: string;
  login: string;
  profileImageUrl: string;
}

export interface ChatRoles {
  isModerator: boolean | false;
  isVip: boolean | false;
  isBroadcaster: boolean | false;
  isStaff: boolean | false;
  isAdmin: boolean | false;
  isGlobalMod: boolean | false;
}

type Envelope<K extends string, P> = {
  id: string;
  type: K;
  timestamp: number;
} & P;

interface Identity {
  userId:    string | null;
  userName:  string | null;
  userNameRaw: string | null;
}

export interface ParsedIrcMessage extends Identity {
  type: 'chat' | 'system' | 'join' | 'part' | 'delete_msg';
  color: string;
  rawMessage: string;
  htmlBadges: string;
  htmlMessage: string;
  id: string | null;
  roomId: string | null;
  sourceRoomId: string | null;
  sourceChannel: {
    displayName?: string | null;
    login?: string | null;
    avatarUrl?: string | null;
  };
  roles: ChatRoles;
  deletedMessageId?: string | null;
}

export interface ParserFollowMessage extends Identity {
  userLogin: string;
  followedAt: string;
}

export interface ParserRedeemMessage extends Identity {
  userLogin: string;
  reward: any;
}

export interface ParserRaidMessage extends Identity {
  fromBroadcasterId: string;
  fromBroadcasterLogin: string;
  fromBroadcasterName: string;
  viewers: number;
}

export interface ParsedBroadcastStatus extends Identity  {
  isOnline: boolean;
}

export type ChatEvent  = Envelope<'chat', ParsedIrcMessage>;
export type SystemEvent  = Envelope<'system', ParsedIrcMessage>;
export type JoinEvent  = Envelope<'join', ParsedIrcMessage>;
export type PartEvent  = Envelope<'part', ParsedIrcMessage>;
export type DeleteEvent  = Envelope<'delete_msg', ParsedIrcMessage>;
export type RedeemEvent  = Envelope<'redemption', ParserRedeemMessage>;
export type FollowEvent  = Envelope<'follow', ParserFollowMessage>;
export type RaidEvent  = Envelope<'raid', ParserRaidMessage>;
export type BroadcastEvent  = Envelope<'broadcast', ParsedBroadcastStatus>;

export type AppEvent = ChatEvent | SystemEvent | FollowEvent | RedeemEvent | RaidEvent | JoinEvent | PartEvent | BroadcastEvent | DeleteEvent;

export const emptyRoles: ChatRoles = {
    isModerator: false,
    isVip: false,
    isBroadcaster: false,
    isStaff: false,
    isAdmin: false,
    isGlobalMod: false,
}

let globalBadges: Record<string, any> = {};
let channelBadges: Record<string, any> = {};
let _7tvGlobalEmotes: Record<string, any> = {};
let bttvGlobalEmotes: Record<string, any> = {};
let cheerEmotes: Record<string, any> = {};
const roomCache: Map<string, ChannelInfo> = new Map();

export function createBotMessage(message: string): ChatEvent {
  return {
    type: 'chat',
    userName: 'Bot',
    color: '#69ff00',
    rawMessage: '',
    htmlBadges: '<img src="https://i.pinimg.com/originals/0c/e7/6b/0ce76b0e96c23be3331372599395b9da.gif" alt="broadcaster" title="broadcaster" style="vertical-align: middle; height: 1em; margin-right: 2px;" />',
    htmlMessage: message,
    id: 'bot_' + crypto.randomUUID(),
    roomId: null,
    sourceRoomId: null,
    userId: null,
    sourceChannel: {displayName:null, login:null, avatarUrl:null},
    roles: emptyRoles,
    timestamp: Date.now(),
    userNameRaw: 'bot',
    deletedMessageId: null,
  };
}

async function getChannelInfoByRoomId(roomId: string | null): Promise<ChannelInfo | null> {
  if (!roomId) return null;
  if (roomCache.has(roomId)) return roomCache.get(roomId)!;
  try {
    const tokens = await authService.getTokens();
    if (!tokens) throw new Error('No tokens');
    const response = await axios.get(`https://api.twitch.tv/helix/users?id=${roomId}`, {
      headers: { 'Client-ID': authService.CLIENT_ID, Authorization: `Bearer ${tokens.access_token}` },
    });
    const user = response.data.data?.[0];
    if (!user) throw new Error('User not found');
    const result: ChannelInfo = {
      displayName: user.display_name,
      login: user.login,
      profileImageUrl: user.profile_image_url,
    };
    roomCache.set(roomId, result);
    return result;
  } catch (e: any) {
    console.error(`❌ Failed to fetch user for room ${roomId}:`, e.response?.data || e.message);
    return null;
  }
}

export async function loadCheerEmotes(logService: LogService): Promise<void> {
  try {
    const tokens = await authService.getTokens();
    if (!tokens) throw new Error('No tokens available');
    const response = await axios.get(`https://api.twitch.tv/helix/bits/cheermotes?broadcaster_id=${tokens.user_id}`, {
      headers: { 'Client-ID': authService.CLIENT_ID, Authorization: `Bearer ${tokens.access_token}` },
    });
    response.data.data.forEach((emote: any) => {
      cheerEmotes[emote.prefix] = emote.tiers;
    });
    logLoadingMessage(logService, 'Загружены эмодзи cheers');
  } catch (error: any) {
    console.error('❌ Failed to load cheer emotes:', error.response?.data || error.message);
    logLoadingMessage(logService, 'Ошибка при загрузке эмодзи cheers: ' + (error.response?.data || error.message));
    throw error;
  }
}

export async function loadGlobalBadges(logService: LogService): Promise<void> {
  try {
    const tokens = await authService.getTokens();
    if (!tokens) throw new Error('No tokens available');
    const response = await axios.get('https://api.twitch.tv/helix/chat/badges/global', {
      headers: { 'Client-ID': authService.CLIENT_ID, Authorization: `Bearer ${tokens.access_token}` },
    });
    globalBadges = processBadges(response.data.data);
    logLoadingMessage(logService, 'Загружены глобальные бэджи');
  } catch (error: any) {
    console.error('❌ Failed to load global badges:', error.response?.data || error.message);
    logLoadingMessage(logService, 'Ошибка при загрузке глобальных бэджей: ' + (error.response?.data || error.message));
    throw error;
  }
}

export async function load7tvGlobalEmotes(logService: LogService): Promise<void> {
  try {
    const response = await axios.get('https://api.7tv.app/v3/emote-sets/global');
    _7tvGlobalEmotes = {};
    response.data.emotes.forEach((emote: any) => {
      _7tvGlobalEmotes[emote.id] = {
        name: emote.name,
        data: emote.data,
        urls: ['https:' + emote.data.host.url + '/' + emote.data.host.files[2].name],
      };
    });
    logLoadingMessage(logService, 'Загружены глобальные 7TV эмодзи');
  } catch (error: any) {
    console.error('❌ Failed to load 7TV global emotes:', error.response?.data || error.message);
    logLoadingMessage(logService, 'Ошибка при загрузке глобальных 7TV эмодзи: ' + (error.response?.data || error.message));
    throw error;
  }
}

export async function loadBTTVGlobalEmotes(logService: LogService): Promise<void> {
  try {
    const response = await axios.get('https://api.betterttv.net/3/cached/emotes/global');
    response.data.forEach((emote: any) => {
      bttvGlobalEmotes[emote.id] = { code: emote.code, imageUrl: `https://cdn.betterttv.net/emote/${emote.id}/3x` };
    });
    logLoadingMessage(logService, 'Загружены глобальные BTTV эмодзи');
  } catch (error: any) {
    console.error('❌ Failed to load BTTV global emotes:', error.response?.data || error.message);
    logLoadingMessage(logService, 'Ошибка при загрузке глобальных BTTV эмодзи: ' + (error.response?.data || error.message));
    throw error;
  }
}

export async function loadChannelBadges(logService: LogService): Promise<void> {
  try {
    const tokens = await authService.getTokens();
    if (!tokens) throw new Error('No tokens available');
    const response = await axios.get(`https://api.twitch.tv/helix/chat/badges?broadcaster_id=${tokens.user_id}`, {
      headers: { 'Client-ID': authService.CLIENT_ID, Authorization: `Bearer ${tokens.access_token}` },
    });
    logLoadingMessage(logService, 'Загружены бэджи канала');
    channelBadges = processBadges(response.data.data);
  } catch (error: any) {
    console.error('❌ Failed to load channel badges:', error.response?.data || error.message);
    logLoadingMessage(logService, 'Ошибка при загрузке бэджей канала: ' + (error.response?.data || error.message));
    throw error;
  }
}

function logLoadingMessage(logService: LogService, message: string): void {
  logService.log({
    timestamp: new Date().toISOString(),
    message,
    userId: null,
    userName: null,
  });
}

function processBadges(badgesArray: any[]): Record<string, any> {
  const badges: Record<string, any> = {};
  badgesArray.forEach((badge: any) => {
    const { set_id, versions } = badge;
    badges[set_id] = {};
    versions.forEach((version: any) => {
      badges[set_id][version.id] = version;
    });
  });
  return badges;
}

function getBadgeImage(badgeSet: string, version: string): string | null {
  const badge = channelBadges[badgeSet]?.[version] || globalBadges[badgeSet]?.[version];
  return badge ? badge.image_url_1x : null;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

function parseEmotes(
  message: string,
  emotesTag: string,
  _7tvEmotes: Record<string, any>,
  bttvEmotes: Record<string, any>,
  cheerEmotesMap: Record<string, any>
): string {
  const emoteMap: Record<number, { end: number; emoteId: string }> = {};
  if (emotesTag) {
    emotesTag.split('/').forEach((emoteEntry) => {
      const [emoteId, positions] = emoteEntry.split(':');
      positions.split(',').forEach((range) => {
        const [start, end] = range.split('-').map(Number);
        if (!emoteMap[start]) emoteMap[start] = { end, emoteId };
      });
    });
  }
  const externalEmotesMap: Record<string, string> = {};
  if (_7tvEmotes) {
    Object.keys(_7tvEmotes).forEach((emoteId) => {
      const emote = _7tvEmotes[emoteId];
      if (emote.data && emote.data.host) {
        externalEmotesMap[emote.name] = emote.urls[0];
      }
    });
  }
  if (bttvEmotes) {
    Object.keys(bttvEmotes).forEach((emoteId) => {
      const emote = bttvEmotes[emoteId];
      if (emote.imageUrl) {
        externalEmotesMap[emote.code] = emote.imageUrl;
      }
    });
  }

  const chars = [...message];
  let intermediate = '';
  for (let i = 0; i < chars.length; i++) {
    if (emoteMap[i]) {
      const { end, emoteId } = emoteMap[i];
      intermediate += `<img src="https://static-cdn.jtvnw.net/emoticons/v2/${emoteId}/default/dark/1.0" alt="emote" style="vertical-align: middle; height: 1.25em;" />`;
      i = end;
    } else {
      intermediate += escapeHtml(chars[i]);
    }
  }

  const parts = intermediate.split(/(\s+)/);
  let finalResult = '';
  for (const part of parts) {
    if (part.startsWith('<img') || /^\s+$/.test(part)) {
      finalResult += part;
      continue;
    }
    const match = part.match(/^([A-Za-z]+)(\d+)$/);
    if (match) {
      const [, prefix, bitsStr] = match;
      const bits = parseInt(bitsStr, 10);
      const tiers = cheerEmotesMap[prefix];
      if (tiers) {
        const tier = tiers.filter((t: any) => bits >= t.min_bits).sort((a: any, b: any) => b.min_bits - a.min_bits)[0];
        if (tier) {
          const url = tier.images.dark.animated['1'];
          finalResult += `<span style="display: inline-flex; align-items: center; gap: 0.25em;"><img src="${url}" alt="${part}" style="vertical-align: middle; height: 1.25em;" />${bits}</span>`;
          continue;
        }
      }
    }
    if (externalEmotesMap[part]) {
      finalResult += `<img src="${externalEmotesMap[part]}" alt="${part}" style="vertical-align: middle; height: 1.25em;" />`;
    } else {
      finalResult += part;
    }
  }
  return finalResult;
}

function parseBadges(badgesTag: string): string {
  if (!badgesTag) return '';
  return badgesTag
    .split(',')
    .map((badge) => {
      const [type, version] = badge.split('/');
      const badgeUrl = getBadgeImage(type, version);
      if (!badgeUrl) return '';
      return `<img src="${badgeUrl}" alt="${type}" title="${type}" style="vertical-align: middle; height: 1em; margin-right: 2px;" />`;
    })
    .join('');
}

function cleanMessage(message: string): string {
  return message
      .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '') // zero-width, BOM, nbsp
      .replace(/[\u0000-\u001F\u007F]/g, '')       // ASCII control chars
      .replace(/[\uD800-\uDFFF]/g, '')             // lone surrogates (half of emoji or corrupted pairs)
      .trim();
}

export async function parseIrcMessage(rawLine: string): Promise<AppEvent> {
  const parsed: ParsedIrcLine = parseIrcLine(rawLine);
  const { tags, command, params, prefix } = parsed;

  // Команда → тип события
  const type: 'chat' | 'system' | 'join' | 'part' | 'delete_msg' = (() => {
    switch (command) {
      case 'PRIVMSG':   return 'chat';
      case 'JOIN':      return 'join';
      case 'PART':      return 'part';
      case 'CLEARMSG':  return 'delete_msg';
      default:          return 'system';
    }
  })();

  // Текст сообщения:
  // - для PRIVMSG: trailing-параметр (обычно params[1])
  // - для остальных: последний параметр, если он есть (например NOTICE/CLEARMSG)
  let messageContent = '';
  if (command === 'PRIVMSG') {
    const trailing = params.length >= 2 ? params[1] : params.at(-1) ?? '';
    messageContent = cleanMessage(trailing);
  } else {
    messageContent = params.at(-1) ?? '';
  }

  // Идентификатор:
  // - Для обычного сообщения берём @id, иначе генерируем.
  // - Для CLEARMSG id нам не критичен как «событию», ведь удаление по target-msg-id.
  const id = (command === 'PRIVMSG' ? (tags['id'] as string | undefined) : undefined) ?? crypto.randomUUID();

  // Логин/ник:
  // - Для CLEARMSG Twitch кладёт автора удалённого сообщения в @login
  // - Для PRIVMSG — display-name, потом префикс до '!' как fallback
  const displayName = (tags['display-name'] as string | undefined) ?? null;
  const loginFromClear = (tags['login'] as string | undefined) ?? null;
  const userFromPrefix = prefix && prefix.includes('!') ? prefix.slice(0, prefix.indexOf('!')) : prefix || null;

  const userName =
      displayName ??
      loginFromClear ??
      userFromPrefix ??
      'unknown';

  const color        = (tags['color'] as string | undefined) ?? '#FFFFFF';
  const emotes       = (tags['emotes'] as string | undefined) ?? '';
  const badgesTag    = (tags['badges'] as string | undefined) ?? '';
  const roomId       = (tags['room-id'] as string | undefined) ?? null;
  const sourceRoomId = (tags['source-room-id'] as string | undefined) ?? null;
  const userId       = (tags['user-id'] as string | undefined) ?? null;

  const deletedMessageId =
      command === 'CLEARMSG'
          ? ((tags['target-msg-id'] as string | undefined) ?? null)
          : null;

  const channelInfo = await getChannelInfoByRoomId(sourceRoomId);
  const roles = extractRolesFromBadges(badgesTag);

  return {
    type,
    timestamp: Date.now(),
    userName,
    color,
    rawMessage: messageContent,
    htmlBadges: parseBadges(badgesTag),
    htmlMessage: parseEmotes(messageContent, emotes, _7tvGlobalEmotes, bttvGlobalEmotes, cheerEmotes),
    id,
    roomId,
    userId,
    sourceRoomId,
    sourceChannel: {
      displayName: channelInfo?.displayName,
      login:       channelInfo?.login,
      avatarUrl:   channelInfo?.profileImageUrl,
    },
    roles,
    userNameRaw: userFromPrefix ?? userName,
    deletedMessageId,
  };
}

/**
 * badges=moderator/1,vip/1,subscriber/6  →  { isModerator: true, isVip: true, … }
 */
function extractRolesFromBadges(badgesTag: string): ChatRoles {
  const badgeIds = badgesTag
      ? badgesTag.split(',').map((b) => b.split('/')[0])
      : [];

  return {
    isModerator:  badgeIds.includes('moderator'),
    isVip:        badgeIds.includes('vip'),
    isBroadcaster: badgeIds.includes('broadcaster'),
    isStaff:      badgeIds.includes('staff'),
    isAdmin:      badgeIds.includes('admin'),
    isGlobalMod:  badgeIds.includes('global_mod'),
  };
}

export interface ParsedIrcLine {
  raw: string;                 // исходная строка IRC
  tags: Record<string, string | boolean>; // @теги (ключ → значение)
  prefix: string | null;       // префикс, например "tmi.twitch.tv" или "user!user@user.tmi.twitch.tv"
  command: string | null;      // команда IRC, например "PRIVMSG", "CLEARMSG", "NOTICE", "PING"
  params: string[];            // список параметров, включая канал и текст сообщения
}

/**
 * Универсальный парсер IRC-сообщений Twitch.
 * Работает со всеми типами строк (PRIVMSG, CLEARMSG, NOTICE, PING и др.)
 */
export function parseIrcLine(rawLine: string): ParsedIrcLine {
  const result: ParsedIrcLine = {
    raw: rawLine,
    tags: {},
    prefix: null,
    command: null,
    params: [],
  };

  let line = rawLine.trim();

  // Теги (начинаются с @)
  if (line.startsWith('@')) {
    const tagPartEnd = line.indexOf(' ');
    const tagPart = line.slice(1, tagPartEnd);
    line = line.slice(tagPartEnd + 1);
    for (const tag of tagPart.split(';')) {
      const [key, val] = tag.split('=');
      result.tags[key] = val ?? true;
    }
  }

  // Префикс (начинается с :)
  if (line.startsWith(':')) {
    const prefixEnd = line.indexOf(' ');
    result.prefix = line.slice(1, prefixEnd);
    line = line.slice(prefixEnd + 1);
  }

  // Команда (первое слово)
  const spaceIdx = line.indexOf(' ');
  if (spaceIdx === -1) {
    result.command = line;
    return result;
  }

  result.command = line.slice(0, spaceIdx);
  line = line.slice(spaceIdx + 1).trim();

  // Параметры
  while (line.length) {
    if (line.startsWith(':')) {
      result.params.push(line.slice(1));
      break;
    }
    const nextSpace = line.indexOf(' ');
    if (nextSpace === -1) {
      result.params.push(line);
      break;
    }
    result.params.push(line.slice(0, nextSpace));
    line = line.slice(nextSpace + 1);
  }

  return result;
}