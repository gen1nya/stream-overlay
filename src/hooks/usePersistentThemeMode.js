import { get, set } from 'idb-keyval';
import { useEffect, useRef, useState } from 'react';

export function usePersistentThemeMode(key = 'ui.themeMode', defaultValue = 'dark') {
    const [themeMode, setThemeMode] = useState(defaultValue);
    const loadedRef = useRef(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const saved = await get(key);
            if (!cancelled && (saved === 'light' || saved === 'dark')) {
                loadedRef.current = true;
                setThemeMode(saved);
            } else {
                loadedRef.current = true;
            }
        })();
        return () => { cancelled = true; };
    }, [key]);

    useEffect(() => {
        if (!loadedRef.current) return;
        set(key, themeMode);
    }, [themeMode, key]);

    useEffect(() => {
        return () => {
            set(key, themeMode);
        };
    }, [key, themeMode]);

    return [themeMode, setThemeMode];
}
