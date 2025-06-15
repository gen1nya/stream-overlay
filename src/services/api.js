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

export const authorize = () => {
    return ipcRenderer?.invoke('auth:authorize');
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

export const setRemoteTheme = (theme, name) => {
    ipcRenderer.send('theme:update', theme, name);
}
