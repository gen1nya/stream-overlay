const axios = require('axios');
const authService = require('./authService');

let globalBadges = {};
let channelBadges = {};

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

function parseEmotes(message, emotesTag) {
    if (!emotesTag) return escapeHtml(message);

    const emoteMap = {};
    emotesTag.split('/').forEach(emoteEntry => {
        const [emoteId, positions] = emoteEntry.split(':');
        positions.split(',').forEach(range => {
            const [start, end] = range.split('-').map(Number);
            if (!emoteMap[start]) emoteMap[start] = { end, emoteId };
        });
    });

    const chars = [...message];
    let result = '';
    for (let i = 0; i < chars.length; i++) {
        if (emoteMap[i]) {
            const { end, emoteId } = emoteMap[i];
            result += `<img src="https://static-cdn.jtvnw.net/emoticons/v2/${emoteId}/default/dark/1.0" alt="emote" style="vertical-align: middle; height: 1em;" />`;
            i = end;
        } else {
            result += escapeHtml(chars[i]);
        }
    }

    return result;
}

function parseBadges(badgesTag) {
    if (!badgesTag) return '';

    return badgesTag.split(',').map(badge => {
        const [type, version] = badge.split('/');
        const badgeUrl = getBadgeImage(type, version);
        if (!badgeUrl) return '';
        return `<img src="${badgeUrl}" alt="${type}" title="${type}" style="vertical-align: middle; margin-right: 2px;" />`;
    }).join('');
}

function parseIrcMessage(rawLine) {
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

    return {
        type: type,                    // 'chat' или 'system'
        username,
        color,
        rawMessage: messageContent,
        htmlBadges: parseBadges(badgesTag),
        htmlMessage: parseEmotes(messageContent, emotes),
        id: id
    };
}

function extractUsername(rawLine) {
    const userMatch = rawLine.match(/^:([^!]+)!/);
    return userMatch ? userMatch[1] : null;
}


module.exports = {
    parseIrcMessage,
    loadGlobalBadges,
    loadChannelBadges
};
