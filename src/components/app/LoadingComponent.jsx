import React, {useEffect, useRef} from 'react';
import { useNavigate } from 'react-router-dom';
import { getTokens, onAccountReady } from "../../services/api";

export default function LoadingComponent() {

    const navigate = useNavigate();

    const called = useRef(false);

    useEffect(() => {
        if (called.current) return; // предотвращаем повторный вызов
        called.current = true; // помечаем, что вызов уже был
        try {
            getTokens().then(tokens => {
                if (tokens && tokens.access_token) {
                    // Если токены получены, перенаправляем на Dashboard
                    onAccountReady()
                    navigate('/dashboard', { replace: true });
                } else {
                    // Если токены не получены, перенаправляем на страницу авторизации
                    navigate('/auth', { replace: true });
                }
            });
        } catch (e) {
            console.log(e);
        }
    })

    return(
        <div style={{ textAlign: 'center', margin: '0 auto' }} >
            <h2>loading...</h2>
        </div>
    )
}