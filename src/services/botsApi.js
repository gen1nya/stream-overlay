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

export const getBots = () => {
    return ipcRenderer.invoke('bot:get-all');
};
export const updateBot = (botName, botConfig) => {
    return ipcRenderer.invoke('bot:set', botName, botConfig);
};
export const getCurrentBot = () => {
    return ipcRenderer.invoke('bot:get-current');
};
export const setCurrentBot = (botName) => {
    return ipcRenderer.invoke('bot:create', botName);
};
export const deleteBot = (botName) => {
    return ipcRenderer.invoke('bot:delete', botName);
};
export const selectBot = (botName) => {
    return ipcRenderer.invoke('bot:select', botName);
};
export const getByName = (botName) => {
    return ipcRenderer.invoke('bot:get-by-name', botName);
};