import React, {useEffect, useRef} from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getTokens, onAccountReady } from "../../services/api";

export default function LoadingComponent() {

    const navigate = useNavigate();
    const { t } = useTranslation();

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
            <h2>{t('loading.title')}</h2>
        </div>
    )
}