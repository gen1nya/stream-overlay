import { useState, useEffect } from 'react';
import { getThemes, setTheme, deleteTheme, importTheme, createNewTheme } from '../services/api';
import { useTheme } from './useTheme';
import { defaultTheme } from '../theme';
import { useWebSocket } from '../context/WebSocketContext';

export const useThemeManager = () => {
    const [themes, setThemes] = useState({});
    const [selectedTheme, setSelectedTheme] = useTheme(defaultTheme);
    const [selectedThemeName, setSelectedThemeName] = useState('');
    const [isThemeSelectorOpen, setIsThemeSelectorOpen] = useState(false);

    const { send, subscribe, isConnected } = useWebSocket();

    // Загрузка тем при монтировании через API
    useEffect(() => {
        getThemes()
            .then(response => {
                const { themes, currentThemeName } = response;
                if (themes && typeof themes === 'object') {
                    setThemes(themes);
                } else {
                    console.warn('Темы не являются объектом:', themes);
                    setThemes({});
                }
                setSelectedThemeName(currentThemeName || '');
            })
            .catch(err => {
                console.error('Ошибка загрузки тем:', err);
                setThemes({});
            });
    }, []);

    // Подписка на обновления тем через WebSocket
    useEffect(() => {
        if (isConnected) {
            send({ channel: 'theme:get-all' });
        }

        const unsubscribe = subscribe('themes:get', (payload) => {
            const { themes, currentThemeName } = payload;
            console.log('Получены темы:', themes, 'Текущая тема:', currentThemeName);
            setThemes(themes);
            setSelectedThemeName(currentThemeName);
            setSelectedTheme(themes[currentThemeName] || defaultTheme);
        });

        return unsubscribe;
    }, [isConnected, send, subscribe, setSelectedTheme]);

    const handleExportTheme = (name) => {
        let theme;
        if (name === selectedThemeName) {
            theme = selectedTheme;
        } else {
            theme = themes[name];
        }
        if (!theme) return;

        const data = JSON.stringify({ [name]: theme }, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${name}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleDeleteTheme = (name) => {
        if (window.confirm(`Delete theme "${name}"?`)) {
            deleteTheme(name);
        }
    };

    const handleThemeChange = (themeName) => {
        setTheme(themeName);
    };

    const openThemeSelector = () => setIsThemeSelectorOpen(true);
    const closeThemeSelector = () => setIsThemeSelectorOpen(false);

    return {
        // State
        themes,
        selectedTheme,
        selectedThemeName,
        setSelectedThemeName,
        isThemeSelectorOpen,
        setSelectedTheme,

        // Actions
        openThemeSelector,
        closeThemeSelector,
        handleExportTheme,
        handleDeleteTheme,
        handleThemeChange,
        handleImportTheme: importTheme,
        handleCreateTheme: createNewTheme,
    };
};