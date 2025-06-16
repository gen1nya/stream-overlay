import React, { useEffect, useRef, useState } from 'react';
import styled, {createGlobalStyle} from 'styled-components';
import { logout, openOverlay, getAccountInfo } from '../services/api';
import { useNavigate } from 'react-router-dom';
import Marquee from "react-fast-marquee";


const GlobalStyle = createGlobalStyle`
    html, body, #root {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        background: transparent !important;
        overflow: hidden;
    }
    html, body {
        scroll-behavior: auto;
    }

`;
const Container = styled.div`
    display: flex;
    width: 100%;
    box-sizing: border-box;
    padding-top: 36px;
    padding-left: 24px ;
    padding-right: 24px;
    flex-direction: column;
    gap: 24px;
`;

const Wrapper = styled.div`
    position: relative;
    width: 100%;
    height: 100%;
`;

const Footer = styled.div`
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 24px;
    background: #1e1e1e;
    color: white;
    font-size: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0px;
    z-index: 999;
    overflow: hidden;
`;

const Version = styled.span`
    width: 80px;
    text-align: start;
    font-size: 12px;
    color: #b0b0b0;
    white-space: nowrap;
    overflow: hidden;
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

const AccountRow = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
`;

const Avatar = styled.img`
    width: 48px;
    height: 48px;
    border-radius: 50%;
`;

export default function Dashboard() {
    const navigate = useNavigate();
    const called = useRef(false);
    const [account, setAccount] = useState(null);

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

    const handleCopyChatLink = () => {
        const chatUrl = 'http://localhost:5173/chat-overlay';

        navigator.clipboard.writeText(chatUrl)
            .then(() => {
                console.log('Ссылка скопирована!');
            })
            .catch((err) => {
                console.error('Ошибка при копировании:', err);
            });
    };

    useEffect(() => {
        if (!called.current) {
            called.current = true;
            console.log('Called only once, even in Strict Mode');
            getAccountInfo().then(info => setAccount(info));
        }
    }, []);

    return (
        <>
            <GlobalStyle />
            <Wrapper>
                <Container>
                    <Section>
                        <SectionTitle>Аккаунт</SectionTitle>
                        {account ? (
                            <AccountRow>
                                <Avatar src={account.avatar} alt="avatar" />
                                <div>
                                    <div>{account.displayName || account.login}</div>
                                    <div>Фолловеров: {account.followerCount}</div>
                                </div>
                            </AccountRow>
                        ) : (
                            <p>Загрузка информации об аккаунте...</p>
                        )}
                        <ButtonsRow>
                            <button onClick={handleLogout}>Выйти из аккаунта</button>
                        </ButtonsRow>
                    </Section>

                    <Section>
                        <SectionTitle>Оверлей</SectionTitle>
                        <ButtonsRow>
                            <button onClick={handleOpenOverlay}>Открыть чат в отдельном окне</button>
                            <button onClick={handleCopyChatLink}>Скопировать ссылку на чат</button>
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
                <Footer>
                    <Marquee>Альфа-тест: ellis_leaf</Marquee>
                    <Version>v0.0.2-alpha</Version>
                </Footer>
            </Wrapper>
            </>
    );
}
