import { useState, useEffect, useCallback } from 'react';
import { getCurrentBot, updateBot } from '../services/botsApi';

export const useBotConfig = () => {
    const [isBotConfigOpen, setIsBotConfigOpen] = useState(false);
    const [botName, setBotName] = useState('');
    const [botConfig, setBotConfig] = useState(null);

    const loadBotConfig = useCallback(async () => {
        try {
            const botData = await getCurrentBot();
            setBotName(botData.name);
            setBotConfig(botData.config);
            console.log('Загружена конфигурация бота:', botData);
        } catch (error) {
            console.error('Ошибка загрузки конфигурации бота:', error);
            setBotName('');
            setBotConfig(null);
        }
    }, []);

    useEffect(() => {
        loadBotConfig();
    }, [loadBotConfig]);

    const applyBotConfig = useCallback((updateOrConfig) => {
        setBotConfig((prev) => {
            const next =
                typeof updateOrConfig === 'function'
                    ? updateOrConfig(prev)
                    : updateOrConfig;
            console.log('Bot config updated:', next);
            updateBot(botName, next);
            return next;
        });
    }, [botName]);

    const openBotConfig = () => setIsBotConfigOpen(true);
    const closeBotConfig = () => setIsBotConfigOpen(false);

    const handleBotChange = useCallback((name) => {
        setBotName(name);
        loadBotConfig();
    }, [loadBotConfig]);

    return {
        // State
        isBotConfigOpen,
        botName,
        botConfig,

        // Actions
        openBotConfig,
        closeBotConfig,
        handleBotChange,
        applyBotConfig,
        loadBotConfig,
    };
};