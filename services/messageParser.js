const axios = require('axios');
const authService = require('./authService');

let globalBadges = {};
let channelBadges = {};
let _7tvGlobalEmotes = {};
let bttvGlobalEmotes = {};
let cheerEmotes = {};
const roomCache = new Map();


async function getChannelInfoByRoomId(roomId) {
    if (!roomId) return null;
    if (roomCache.has(roomId)) return roomCache.get(roomId);

    try {
        const tokens = await authService.getTokens();
        if (!tokens) throw new Error('No tokens');

        const response = await axios.get(`https://api.twitch.tv/helix/users?id=${roomId}`, {
            headers: {
                'Client-ID': authService.CLIENT_ID,
                'Authorization': `Bearer ${tokens.access_token}`
            }
        });

        const user = response.data.data?.[0];
        if (!user) throw new Error('User not found');

        const result = {
            displayName: user.display_name,
            login: user.login,
            profileImageUrl: user.profile_image_url
        };

        roomCache.set(roomId, result);
        return result;
    } catch (e) {
        console.error(`❌ Failed to fetch user for room ${roomId}:`, e.response?.data || e.message);
        return null;
    }
}

async function loadCheerEmotes() {
    try {
        const tokens = await authService.getTokens();
        if (!tokens) throw new Error('No tokens available');

        const response = await axios.get(`https://api.twitch.tv/helix/bits/cheermotes?broadcaster_id=${tokens.user_id}`, {
            headers: {
                'Client-ID': authService.CLIENT_ID,
                'Authorization': `Bearer ${tokens.access_token}`
            }
        });

        response.data.data.forEach(emote => {
            cheerEmotes[emote.prefix] = emote.tiers;
        });
        console.log('✅ Loaded cheer emotes'/*, JSON.stringify(response.data, null, 2)*/);
    } catch (error) {
        console.error('❌ Failed to load cheer emotes:', error.response?.data || error.message);
    }
}

async function loadGlobalBadges() {
    try {
        const tokens = await authService.getTokens();
        if (!tokens) throw new Error('No tokens available');

        const response = await axios.get('https://api.twitch.tv/helix/chat/badges/global', {
            headers: {
                'Client-ID': authService.CLIENT_ID,
                'Authorization': `Bearer ${tokens.access_token}`
            }
        });

        globalBadges = processBadges(response.data.data);
        console.log('✅ Loaded global badges');
    } catch (error) {
        console.error('❌ Failed to load global badges:', error.response?.data || error.message);
    }
}

async function load7tvGlobalEmotes() {
    try {
        const response = await axios.get('https://api.7tv.app/v3/emote-sets/global');
        _7tvGlobalEmotes = {};
        response.data.emotes.forEach(emote => {
            _7tvGlobalEmotes[emote.id] = {
                name: emote.name,
                data: emote.data,
                urls: [
                    "https:" + emote.data.host.url+ "/" + emote.data.host.files[2].name
                ]
            };
        });
        console.log('✅ Loaded 7TV global emotes');
    } catch (error) {
        console.error('❌ Failed to load 7TV global emotes:', error.response?.data || error.message);
    }
}

async function loadBTTVGlobalEmotes() {
    try {
        const response = await axios.get('https://api.betterttv.net/3/cached/emotes/global');
        response.data.forEach(emote => {
            bttvGlobalEmotes[emote.id] = {code: emote.code, imageUrl: `https://cdn.betterttv.net/emote/${emote.id}/3x`};
        });
        console.log('✅ Loaded BTTV global emotes');
    } catch (error) {
        console.error('❌ Failed to load BTTV global emotes:', error.response?.data || error.message);
    }
}

async function loadChannelBadges() {
    try {
        const tokens = await authService.getTokens();
        if (!tokens) throw new Error('No tokens available');

        const response = await axios.get(`https://api.twitch.tv/helix/chat/badges?broadcaster_id=${tokens.user_id}`, {
            headers: {
                'Client-ID': authService.CLIENT_ID,
                'Authorization': `Bearer ${tokens.access_token}`
            }
        });

        channelBadges = processBadges(response.data.data);
        console.log('✅ Loaded channel badges');
    } catch (error) {
        console.error('❌ Failed to load channel badges:', error.response?.data || error.message);
    }
}

function processBadges(badgesArray) {
    const badges = {};
    badgesArray.forEach(badge => {
        const { set_id, versions } = badge;
        badges[set_id] = {};
        versions.forEach(version => {
            badges[set_id][version.id] = version;
        });
    });
    return badges;
}

function getBadgeImage(badgeSet, version) {
    const badge =
        (channelBadges[badgeSet]?.[version]) ||
        (globalBadges[badgeSet]?.[version]);
    return badge ? badge.image_url_1x : null;
}

function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function parseEmotes(message, emotesTag, _7tvEmotes, bttvEmotes, cheerEmotes) {
    const emoteMap = {};
    if (emotesTag) {
        emotesTag.split('/').forEach(emoteEntry => {
            const [emoteId, positions] = emoteEntry.split(':');
            positions.split(',').forEach(range => {
                const [start, end] = range.split('-').map(Number);
                if (!emoteMap[start]) emoteMap[start] = {end, emoteId};
            });
        });
    }

    const externalEmotesMap = {};
    if (_7tvEmotes) {
        Object.keys(_7tvEmotes).forEach(emoteId => {
            const emote = _7tvEmotes[emoteId];
            if (emote.data && emote.data.host) {
                externalEmotesMap[emote.name] = emote.urls[0];
            }
        });
    }
    if (bttvEmotes) {
        Object.keys(bttvEmotes).forEach(emoteId => {
           const emote = bttvEmotes[emoteId];
           if(emote.imageUrl) {
               externalEmotesMap[emote.code] = emote.imageUrl;
           }
        });
    }

    const chars = [...message];
    let intermediate  = '';
    for (let i = 0; i < chars.length; i++) {
        if (emoteMap[i]) {
            const { end, emoteId } = emoteMap[i];
            intermediate  += `<img src="https://static-cdn.jtvnw.net/emoticons/v2/${emoteId}/default/dark/1.0" alt="emote" style="vertical-align: middle; height: 1.25em;" />`;
            i = end;
        } else {
            intermediate  += escapeHtml(chars[i]);
        }
    }

    const parts = intermediate.split(/(\s+)/); // разделяем слова и пробелы
    let finalResult = '';
    for (const part of parts) {
        if (part.startsWith('<img') || /^\s+$/.test(part)) {
            finalResult += part;
            continue;
        }
        const match = part.match(/^([A-Za-z]+)(\d+)$/); // Например, Cheer100
        if (match) {
            const [_, prefix, bitsStr] = match;
            const bits = parseInt(bitsStr, 10);
            const tiers = cheerEmotes[prefix];
            if (tiers) {
                const tier = tiers
                    .filter(t => bits >= t.min_bits)
                    .sort((a, b) => b.min_bits - a.min_bits)[0];

                if (tier) {
                    const url = tier.images.dark.animated['1']; // или другой размер
                    finalResult += `<span style="display: inline-flex; align-items: center; gap: 0.25em;">
                    <img src="${url}" alt="${part}" style="vertical-align: middle; height: 1.25em;" />${bits}
                    </span>`;
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

function parseBadges(badgesTag) {
    if (!badgesTag) return '';

    return badgesTag.split(',').map(badge => {
        const [type, version] = badge.split('/');
        const badgeUrl = getBadgeImage(type, version);
        if (!badgeUrl) return '';
        return `<img src="${badgeUrl}" alt="${type}" title="${type}" style="vertical-align: middle; height: 1em; margin-right: 2px;" />`;
    }).join('');
}

async function parseIrcMessage(rawLine) {
    const tagMatch = rawLine.match(/^@([^ ]+) /);
    const tags = {};

    if (tagMatch) {
        tagMatch[1].split(';').forEach(tag => {
            const [key, value] = tag.split('=');
            tags[key] = value;
        });
    }

    const isPrivMsg = rawLine.includes('PRIVMSG');
    let messageContent = '';
    let type = 'system'; // по умолчанию считаем системным

    if (isPrivMsg) {
        const messageStart = rawLine.indexOf('PRIVMSG');
        messageContent = rawLine.substring(rawLine.indexOf(':', messageStart) + 1).trim();
        type = 'chat';
    } else {
        // Пробуем вытащить системное сообщение, если оно есть
        const parts = rawLine.split(':');
        if (parts.length > 1) {
            messageContent = parts.slice(1).join(':').trim();
        } else {
            messageContent = rawLine.trim();
        }
    }

    const id = tags['id'] || null;
    const username = tags['display-name'] || extractUsername(rawLine) || 'unknown';
    const color = tags['color'] || '#FFFFFF';
    const emotes = tags['emotes'] || '';
    const badgesTag = tags['badges'] || '';
    const roomId = tags['room-id'] || null;
    const sourceRoomId = tags['source-room-id'] || null;

    console.log("extracted sourceRoomId", sourceRoomId, "roomId", roomId);
    const channelInfo = await getChannelInfoByRoomId(roomId)

    return {
        type: type,                    // 'chat' или 'system'
        username,
        color,
        rawMessage: messageContent,
        htmlBadges: parseBadges(badgesTag),
        htmlMessage: parseEmotes(messageContent, emotes, _7tvGlobalEmotes, bttvGlobalEmotes, cheerEmotes),
        id: id,
        roomId: roomId,
        sourceRoomId: sourceRoomId,
        sourceChannel: {
            displayName: channelInfo?.displayName,
            login: channelInfo?.login,
            avatarUrl: channelInfo?.profileImageUrl
        }
    };
}

function extractUsername(rawLine) {
    const userMatch = rawLine.match(/^:([^!]+)!/);
    return userMatch ? userMatch[1] : null;
}


module.exports = {
    loadCheerEmotes,
    loadBTTVGlobalEmotes,
    load7tvGlobalEmotes,
    parseIrcMessage,
    loadGlobalBadges,
    loadChannelBadges
};
