import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { logout, openOverlay } from '../services/api';
import { useNavigate } from 'react-router-dom';

const Container = styled.div`
    max-width: 600px;
    margin: 80px auto;
    display: flex;
    flex-direction: column;
    gap: 24px;
`;

const Section = styled.section`
    background: #2e2e2e;
    border-radius: 8px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const SectionTitle = styled.h3`
    margin: 0 0 8px 0;
`;

const ButtonsRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
`;

export default function Dashboard() {
    const navigate = useNavigate();
    const called = useRef(false);

    const handleLogout = async () => {
        await logout();
        navigate('/auth', { replace: true });
    };

    const handleOpenOverlay = () => {
        openOverlay();
    };

    const handlerOpenSettings = () => {
        navigate('/settings', { replace: false });
    };

    useEffect(() => {
        if (!called.current) {
            called.current = true;
            console.log('Called only once, even in Strict Mode');
        }
    }, []);

    return (
        <Container>
            <h2>👋 Вы авторизованы!</h2>
            <Section>
                <SectionTitle>Аккаунт</SectionTitle>
                <p>Здесь будет отображаться информация об аккаунте.</p>
                <ButtonsRow>
                    <button onClick={handleLogout}>Выйти из аккаунта</button>
                </ButtonsRow>
            </Section>

            <Section>
                <SectionTitle>Оверлей</SectionTitle>
                <ButtonsRow>
                    <button onClick={handleOpenOverlay}>Открыть чат в отдельном окне</button>
                    <button>Скопировать ссылку на чат</button>
                </ButtonsRow>
            </Section>

            <Section>
                <SectionTitle>Быстрые действия со стримом</SectionTitle>
                <ButtonsRow>
                    <button disabled>Изменить категорию</button>
                    <button disabled>Изменить теги</button>
                    <button disabled>Забанить пользователя</button>
                </ButtonsRow>
            </Section>

            <Section>
                <ButtonsRow>
                    <button onClick={handlerOpenSettings}>Настройки</button>
                </ButtonsRow>
            </Section>
        </Container>
    );
}
