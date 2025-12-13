let ipcRenderer = null;

if (typeof window !== 'undefined' && window.require) {
    try {
        const electron = window.require('electron');
        ipcRenderer = electron.ipcRenderer;
    } catch (e) {
        console.warn('📢 IPC недоступен в этой среде.');
    }
} else {
    console.warn('📢 window.require не определён. Работает обычный браузер.');
}

export const createNewTheme = (newThemeName) => {
    return ipcRenderer?.invoke('theme:create', newThemeName);
}

export const setTheme = (themeName) => {
    return ipcRenderer?.invoke('theme:set', themeName);
}

export const openPreview = () => {
    return ipcRenderer?.invoke('setting:open-preview');
};

export const getTokens = () => {
    return ipcRenderer?.invoke('auth:getTokens');
};

export const logout = () => {
    return ipcRenderer?.invoke('auth:logout');
};

export const onAccountReady = () => {
    return ipcRenderer?.invoke('auth:onAccountReady');
};

export const getAccountInfo = () => {
    return ipcRenderer?.invoke('auth:getAccountInfo');
};

export const openOverlay = () => {
    return ipcRenderer?.invoke('chat:open-overlay');
};

export const openTerminal = () => {
    return ipcRenderer?.invoke('arg:create-terminal');
}

export const setRemoteTheme = (theme, name) => {
    ipcRenderer.send('theme:update', theme, name);
}

export const importTheme = (name, theme) => {
    return ipcRenderer?.invoke('theme:import', { name, theme });
};

export const deleteTheme = (name) => {
    return ipcRenderer?.invoke('theme:delete', name);
};

export const getStats = () => {
    return ipcRenderer?.invoke('system:get-stats');
};

export const reconnect = () => {
    return ipcRenderer?.invoke('system:reconnect');
};

export const openExternalLink = (url) => {
    return ipcRenderer?.invoke('utils:open_url', url);
};

export const getAvailableLocales = async () => {
    if (!ipcRenderer) {
        return [
            { code: 'ru', name: 'Русский' },
            { code: 'en', name: 'English' },
        ];
    }
    return ipcRenderer.invoke('locale:list');
};

export const getCurrentLocale = async () => {
    if (!ipcRenderer) {
        return 'ru';
    }
    return ipcRenderer.invoke('locale:get');
};

export const setLocale = async (localeCode) => {
    if (!ipcRenderer) {
        return localeCode;
    }
    return ipcRenderer.invoke('locale:set', localeCode);
};

export const saveImageBuffer = (buffer, name) => {
    return ipcRenderer?.invoke('utils:save_image_buffer', buffer, name);
};

export const getImageUrl = (fileName) => {
    return ipcRenderer?.invoke('utils:get_image_url', fileName);
};

export async function getUserById(userId) {
    return ipcRenderer?.invoke('user:getById', {userId});
}

export async function getUserByLogin(login) {
    return ipcRenderer?.invoke('user:getByLogin', {login});
}

export async function updateRoles(userId, roles) {
    return ipcRenderer?.invoke('user:updateRoles', {userId, roles});
}

export async function muteUser(userId, reason, duration) {
    return ipcRenderer?.invoke('user:mute', {userId, reason, duration});
}

export async function unbanUser(userId) {
    return ipcRenderer?.invoke('user:unban', {userId});
}

export async function deleteMessage(messageId) {
    return ipcRenderer?.invoke('message:delete', {messageId});
}

export async function getThemes() {
    return ipcRenderer?.invoke('themes:get-all');
}


// Audio API functions
export async function getAudioDeviceList() {
    return ipcRenderer?.invoke('audio:getDevices');
}

export async function setAudioDevice(id, name, flow) {
    return ipcRenderer?.invoke('audio:setDevice', {id, name, flow});
}

export async function getAudioDevice() {
    return ipcRenderer?.invoke('audio:getCurrentDevice');
}

export async function enableFFT(enable) {
    return ipcRenderer?.invoke('audio:enableFFT', enable);
}

export async function setFFTGain(gain) {
    return ipcRenderer?.invoke('audio:setFFTGain', gain);
}

export async function setFFTdbFloor(dbFloor) {
    return ipcRenderer?.invoke('audio:setFFTDbFloor', dbFloor);
}

export async function setFFTTilt(tilt) {
    return ipcRenderer?.invoke('audio:setFFTTilt', tilt);
}

export async function getFFTconfig() {
    return ipcRenderer?.invoke('audio:getFFTConfig');
}

// YouTube API functions

export async function enableYouTubeScraper(enable) {
    return ipcRenderer?.invoke('youtube:enableScraper', enable);
}

export async function getYoutubeStreams() {
    return ipcRenderer?.invoke('youtube:getLiveStreams');
}

export async function setChannelName(channelName) {
    return ipcRenderer?.invoke('youtube:setChannelName', channelName);
}

export async function getYoutubeConfig() {
    return ipcRenderer?.invoke('youtube:getConfig');
}

// socks proxy settings
export async function getProxyConfig(){
    return ipcRenderer?.invoke('proxy:getConfig');
}
export async function setProxyConfig(config) {
    return ipcRenderer?.invoke('proxy:setConfig', config);
}
export async function enableProxy(enable){
    return ipcRenderer?.invoke('proxy:enable', enable);
}
export async function testProxyConnection(config) {
    return ipcRenderer?.invoke('proxy:testConnection', config);
}

// twitch users api
export async function getTwitchUsers(offset, limit) {
    try {
        const result = await ipcRenderer.invoke('twitch:get-users', {offset, limit });
        console.log('getTwitchUsers result:', result);
        return {
            users: result.data || [],
            total: result.total || 0
        };
    } catch (error) {
        console.error('Error getting twitch users:', error);
        throw error;
    }
}

export async function searchTwitchUsers(query, offset, limit) {
    try {
        const result = await ipcRenderer.invoke('twitch:search-users', {query, offset, limit});
        return {
            users: result.data || [],
            total: result.total || 0
        };
    } catch (error) {
        console.error('Error searching twitch users:', error);
        throw error;
    }
}

export async function getTwitchRewards() {
    return ipcRenderer?.invoke('twitch:get-rewards');
}

// gacha users api
export const getGachaUsers = async (offset, limit) => {
    return await ipcRenderer.invoke('gatcha:get-users', { offset, limit });
};

export const searchGachaUsers = async (query, offset, limit) => {
    return await ipcRenderer.invoke('gatcha:search-users', { query, offset, limit });
};

export const deleteGachaUser = async (userId) => {
    return await ipcRenderer.invoke('gatcha:delete-user', { userId });
};

export const updateGachaUser = async (userId, userName, pityData) => {
    return await ipcRenderer.invoke('gatcha:update-user', {
        userId,
        userName,
        pullsSince5Star: pityData.pullsSince5Star,
        pullsSince4Star: pityData.pullsSince4Star,
        pity4StarFailedRateUp: pityData.pity4StarFailedRateUp,
        isGuaranteed5Star: pityData.isGuaranteed5Star
    });
};

// lottery api
export const getLotteryMonths = async () => {
    return await ipcRenderer?.invoke('lottery:get-months');
};

export const getLotteryDrawsByMonth = async (year, month) => {
    return await ipcRenderer?.invoke('lottery:get-draws-by-month', { year, month });
};

export const getLotteryMonthlyStats = async () => {
    return await ipcRenderer?.invoke('lottery:get-monthly-stats');
};

export const getLotteryHistory = async (limit = 50, offset = 0) => {
    return await ipcRenderer?.invoke('lottery:get-history', { limit, offset });
};

export const exportLotteryData = async () => {
    return await ipcRenderer?.invoke('lottery:export');
};

export const clearAllLotteryData = async () => {
    return await ipcRenderer?.invoke('lottery:clear-all');
};

export const clearLotteryMonth = async (year, month) => {
    return await ipcRenderer?.invoke('lottery:clear-month', { year, month });
};

// listener
export const onLogout = (callback) => {
    ipcRenderer.on('logout:success', callback);
}

export const onAccountUpdated = (callback) => {
    ipcRenderer?.on('auth:accountUpdated', (event, data) => callback(data));
}

export const authorize = async () => {
    const result = await ipcRenderer.invoke('auth:start');
    return result.success;
};

// Отменить авторизацию
export const cancelAuth = async () => {
    await ipcRenderer.invoke('auth:cancel');
};

// События авторизации
export const onAuthCodeReady = (callback) => {
    ipcRenderer.on('auth:code-ready', (event, data) => {
        callback(data);
    });
};

export const onAuthPolling = (callback) => {
    ipcRenderer.on('auth:polling', (event, data) => {
        callback(data);
    });
};

export const onAuthSuccess = (callback) => {
    ipcRenderer.on('auth:success', (event, data) => {
        callback(data);
    });
};

export const onAuthError = (callback) => {
    ipcRenderer.on('auth:error', (event, data) => {
        callback(data);
    });
};

export const onAuthCancelled = (callback) => {
    ipcRenderer.on('auth:cancelled', (event) => {
        callback();
    });
};

export const removeAuthListeners = () => {
    ipcRenderer.removeAllListeners('auth:code-ready');
    ipcRenderer.removeAllListeners('auth:polling');
    ipcRenderer.removeAllListeners('auth:success');
    ipcRenderer.removeAllListeners('auth:error');
    ipcRenderer.removeAllListeners('auth:cancelled');
};

// Backend logs API
export const openBackendLogs = () => {
    return ipcRenderer?.invoke('backend-logs:open');
};

export const getBackendLogsBuffer = () => {
    return ipcRenderer?.invoke('backend-logs:get-buffer');
};

export const clearBackendLogs = () => {
    return ipcRenderer?.invoke('backend-logs:clear');
};

export const getBackendLogsConfig = () => {
    return ipcRenderer?.invoke('backend-logs:get-config');
};

export const updateBackendLogsConfig = (config) => {
    return ipcRenderer?.invoke('backend-logs:update-config', config);
};
