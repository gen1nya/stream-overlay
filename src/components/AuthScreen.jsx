import React from 'react';
import { authorize } from '../services/api';

export default function AuthScreen({ onAuthorized }) {
    const handleAuth = async () => {
        const success = await authorize();
        if (success) onAuthorized();
    };

    return (
        <div style={{ textAlign: 'center', marginTop: '100px' }}>
            <h2>🎮 Добро пожаловать в Twitch Watcher!</h2>
            <button onClick={handleAuth} style={{ padding: '10px 20px', fontSize: '16px' }}>
                Авторизоваться через Twitch
            </button>
        </div>
    );
}
