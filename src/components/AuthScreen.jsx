import React from 'react';
import {authorize, onAccountReady} from '../services/api';
import {useNavigate} from "react-router-dom";

export default function AuthScreen() {
    const navigate = useNavigate();
    const handleAuth = async () => {
        const success = await authorize();
        if (success) {
            navigate('/dashboard', { replace: true });
            onAccountReady()
        }
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
