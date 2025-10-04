import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

const WebSocketContext = createContext(null);

export const useWebSocket = () => {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWebSocket must be used within WebSocketProvider');
    }
    return context;
};

export const WebSocketProvider = ({ children, url = 'ws://localhost:42001' }) => {
    const wsRef = useRef(null);
    const [isConnected, setIsConnected] = useState(false);
    const listenersRef = useRef(new Map());
    const isUnmountingRef = useRef(false);

    useEffect(() => {
        const ws = new WebSocket(url);
        isUnmountingRef.current = false;

        ws.onopen = () => {
            console.log('🟢 WebSocket подключен');
            setIsConnected(true);
            wsRef.current = ws;
        };

        ws.onmessage = (event) => {
            const { channel, payload } = JSON.parse(event.data);
            console.log('WS message:', channel, payload);
            const channelListeners = listenersRef.current.get(channel) || [];
            channelListeners.forEach(callback => callback(payload));
        };

        ws.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
        };

        ws.onclose = () => {
            console.log('🔴 WebSocket отключен');
            setIsConnected(false);
            wsRef.current = null;
        };

        // Обработчик закрытия окна/вкладки
        const handleBeforeUnload = () => {
            isUnmountingRef.current = true;
            if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                ws.close(1000, 'Window closing');
            }
        };

        // Для десктоп приложений (Electron и т.п.)
        const handleWindowClose = () => {
            isUnmountingRef.current = true;
            if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                ws.close(1000, 'Window closing');
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('unload', handleWindowClose);

        return () => {
            isUnmountingRef.current = true;

            // Удаляем обработчики событий
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('unload', handleWindowClose);

            // Закрываем WebSocket
            if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                ws.close(1000, 'Component unmounting');
            }

            // Очищаем refs
            wsRef.current = null;
            listenersRef.current.clear();
        };
    }, [url]);

    // Отправка сообщения
    const send = useCallback((message) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket не подключен');
        }
    }, []);

    // Подписка на канал
    const subscribe = useCallback((channel, callback) => {
        if (!listenersRef.current.has(channel)) {
            listenersRef.current.set(channel, []);
        }
        listenersRef.current.get(channel).push(callback);

        return () => {
            const listeners = listenersRef.current.get(channel) || [];
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
            if (listeners.length === 0) {
                listenersRef.current.delete(channel);
            }
        };
    }, []);

    // Явное отключение
    const disconnect = useCallback(() => {
        if (wsRef.current) {
            const ws = wsRef.current;
            if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                ws.close(1000, 'Manual disconnect');
            }
            wsRef.current = null;
            listenersRef.current.clear();
            setIsConnected(false);
        }
    }, []);

    const value = {
        isConnected,
        send,
        subscribe,
        disconnect,
    };

    return (
        <WebSocketContext.Provider value={value}>
            {children}
        </WebSocketContext.Provider>
    );
};