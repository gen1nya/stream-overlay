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

    useEffect(() => {
        const ws = new WebSocket(url);

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

        return () => {
            ws.close();
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

    const value = {
        isConnected,
        send,
        subscribe,
    };

    return (
        <WebSocketContext.Provider value={value}>
            {children}
        </WebSocketContext.Provider>
    );
};