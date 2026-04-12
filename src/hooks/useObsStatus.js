import { useEffect, useState } from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import { getObsStatus } from '../services/api';

const DEFAULT_STATUS = {
    status: 'disconnected',
    lastError: null,
    host: 'localhost',
    port: 4455,
};

export const useObsStatus = () => {
    const { subscribe } = useWebSocket();
    const [status, setStatus] = useState(DEFAULT_STATUS);

    useEffect(() => {
        let mounted = true;

        getObsStatus()
            .then((snapshot) => {
                if (mounted && snapshot) setStatus(snapshot);
            })
            .catch(() => { /* ignore — default remains */ });

        const unsubscribe = subscribe('obs:status', (snapshot) => {
            if (snapshot) setStatus(snapshot);
        });

        return () => {
            mounted = false;
            unsubscribe?.();
        };
    }, [subscribe]);

    return status;
};
