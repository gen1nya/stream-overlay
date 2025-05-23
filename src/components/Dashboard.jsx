import React, {useEffect, useRef} from 'react';
import { logout, onAccountReady, openOverlay } from '../services/api';


export default function Dashboard({ onLogout }) {
    const handleLogout = async () => {
        await logout();
        onLogout();
    };

    const handleOpenOverlay = () => {
        openOverlay();
    };


    const called = useRef(false);

    useEffect(() => {
        if (!called.current) {
            called.current = true;
            console.log("Called only once, even in Strict Mode");
            onAccountReady();
        }
    }, []);

    return (
        <div style={{ textAlign: 'center', marginTop: '100px' }}>
            <h2>👋 Вы авторизованы!</h2>
            <button onClick={handleLogout} style={{ padding: '10px 20px', fontSize: '16px' }}>
                Выйти из аккаунта
            </button>
            <div style={{ marginTop: '50px' }}>
                <button onClick={handleOpenOverlay} style={{ marginRight: '20px' }}>Открыть чат в отдельном окне</button>
                <button>Скопировать ссылку на чат</button>
            </div>
        </div>
    );
}
