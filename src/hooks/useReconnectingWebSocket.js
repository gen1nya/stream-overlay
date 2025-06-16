import { useEffect, useRef, useState } from 'react';

export default function useReconnectingWebSocket(url, handlers = {}) {
    const { onOpen, onMessage, onClose } = handlers;
    const wsRef = useRef(null);
    const reconnectRef = useRef(0);
    const timerRef = useRef(null);
    const [isConnected, setIsConnected] = useState(false);

    const connect = () => {
        clearTimeout(timerRef.current);
        const ws = new WebSocket(url);
        wsRef.current = ws;
        ws.onopen = (e) => {
            reconnectRef.current = 0;
            setIsConnected(true);
            if (onOpen) onOpen(e, ws);
        };
        if (onMessage) ws.onmessage = onMessage;
        ws.onclose = (e) => {
            setIsConnected(false);
            if (onClose) onClose(e);
            scheduleReconnect();
        };
        ws.onerror = () => {
            ws.close();
        };
    };

    const scheduleReconnect = () => {
        const delay = Math.min(1000 * Math.pow(2, reconnectRef.current), 16000);
        reconnectRef.current += 1;
        timerRef.current = setTimeout(connect, delay);
    };

    useEffect(() => {
        connect();
        return () => {
            clearTimeout(timerRef.current);
            if (wsRef.current) wsRef.current.close();
        };
    }, [url]);

    return { isConnected };
}
