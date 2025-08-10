import { get, set } from 'idb-keyval';
import { useEffect, useRef, useState } from 'react';

export function usePersistentOpacity(key = 'ui.opacity', defaultValue = 100, delay = 100) {
    const [opacity, setOpacity] = useState(defaultValue);
    const loadedRef = useRef(false);
    const tRef = useRef(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const saved = await get(key);
            if (!cancelled && typeof saved === 'number' && !Number.isNaN(saved)) {
                loadedRef.current = true;
                setOpacity(saved);
            } else {
                loadedRef.current = true;
            }
        })();
        return () => { cancelled = true; };
    }, [key]);

    useEffect(() => {
        if (!loadedRef.current) return; // не пишем пока не загрузили старт
        clearTimeout(tRef.current);
        tRef.current = setTimeout(() => { set(key, opacity); }, delay);
        return () => clearTimeout(tRef.current);
    }, [opacity, key, delay]);

    useEffect(() => {
        return () => {
            clearTimeout(tRef.current);
            set(key, opacity);
        };
    }, [key, opacity]);

    return [opacity, setOpacity];
}
