import { useState, useCallback } from 'react';
import {mergeWithDefaults} from "../components/utils/defaultBotConfig";

export function useTheme(initialRawTheme = {}) {
    const [_setTheme, _reactSetTheme] = useState(() => mergeWithDefaults(initialRawTheme));
    const setTheme = useCallback((valueOrUpdater) => {
        _reactSetTheme((prev) => {
            const draft =
                typeof valueOrUpdater === 'function'
                    ? valueOrUpdater(prev)
                    : valueOrUpdater;

            return mergeWithDefaults(draft);
        });
    }, []);

    return [_setTheme, setTheme];
}
