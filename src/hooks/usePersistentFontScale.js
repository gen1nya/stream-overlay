import { get, set } from 'idb-keyval';
import { useEffect, useRef, useState } from 'react';

export function usePersistentFontScale(key = 'ui.fontScale', defaultValue = 100) {
    const [fontScale, setFontScale] = useState(defaultValue);
    const loadedRef = useRef(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const saved = await get(key);
            if (!cancelled && typeof saved === 'number' && !Number.isNaN(saved)) {
                loadedRef.current = true;
                setFontScale(saved);
            } else {
                loadedRef.current = true;
            }
        })();
        return () => { cancelled = true; };
    }, [key]);

    useEffect(() => {
        if (!loadedRef.current) return;
        set(key, fontScale);
    }, [fontScale, key]);

    useEffect(() => {
        return () => {
            set(key, fontScale);
        };
    }, [key, fontScale]);

    return [fontScale, setFontScale];
}
