import React, {useEffect, useState} from "react";
import styled, {createGlobalStyle, ThemeProvider} from "styled-components";
import ChatMessage from "./ChatMessage";
import ChatFollow from './ChatFollow';
import {defaultTheme} from "../theme";
import ChatRedemption from "./ChatRedemption";

const BackgroundContainer = styled.div`
    position: absolute;
    z-index: -1;
    background: ${({ theme }) => {
        switch (theme.overlay?.backgroundType ?? "none") {
            case 'none':
                return 'transparent';
            case 'color':
                return theme.overlay?.backgroundColor || 'transparent';
            case 'image':
                return `url(${theme.overlay?.backgroundImage}) no-repeat center / cover`;
            default:
                return 'transparent';
        }
    }};
    
    ${({ theme }) =>
            theme.overlay?.backgroundType === 'image' && theme.overlay?.backgroundImageAspectRatio
                    ?
                    `
            aspect-ratio: ${theme.overlay.backgroundImageAspectRatio};
            width: ${theme.overlay.containerWidth || 500}px;
        `
                    : ''}
    
`;

const MessagePreviewContainer = styled.div`
    box-sizing: border-box;
    border: 1px solid #ff0000;
    overflow-y: auto;
    scroll-behavior: auto;
    box-shadow: 0 0 4px rgba(97, 97, 97, 0.2);
    display: flex;
    flex-direction: column;

    border-radius: ${({theme}) => theme.overlay?.borderRadius || 0}px;

    margin: ${({theme}) => {
        return `${theme.overlay?.paddingTop || 0}px 0px 0px ${theme.overlay?.paddingLeft || 0}px`;
    }};

    ${({theme}) =>
            theme.overlay?.backgroundType === 'image' && theme.overlay?.backgroundImageAspectRatio
                    ?
                    `
            width: ${(theme.overlay.chatWidth || 500)}px;
            height: ${(theme.overlay.chatHeight || 500)}px;
        `
                    : ''}
    &::-webkit-scrollbar {
        width: 0 !important;
        height: 0 !important;
    }
`;

export default function PreviewComponent() {
    const [theme, setTheme] = useState(defaultTheme);

    useEffect(() => {
        const ws = new WebSocket('ws://localhost:42001');
        ws.onopen = () => {
            console.log('🟢 WebSocket подключен');
            ws.send(JSON.stringify({ channel: 'theme:get' }));
        };
        ws.onmessage = event => {
            const { channel, payload } = JSON.parse(event.data);

            switch (channel) {
                case 'theme:update':
                    setTheme(payload);
                    console.log('Тема обновлена:', payload);
                    break;
                default:
                    console.log('unknown channel', channel, payload);
            }
        }
        ws.onclose = () => console.log('🔴 WebSocket отключен');
        return () => ws.close();
    }, []);

    const message = {
        username: "Пользователь",
        color: "#ffffff",
        htmlBadges: "",
        htmlMessage: "Это пример сообщения в чате.",
    };

    const longMessage = {
        username: "Пользователь",
        color: "#ffffff",
        htmlBadges: "",
        htmlMessage: "Открой волшебный мир Teyvat в Genshin Impact! Собирай команду героев, исследуй потрясающие локации, сражайся с могущественными врагами и раскрывай тайны семи стихий. Бесплатно играй на ПК, PlayStation и мобильных устройствах. Присоединяйся к миллионам игроков по всему миру — начни своё великое приключение уже сегодня! #GenshinImpact #ИграйБесплатно"
    };

    const followMessage = {
        userName: "Пользователь"
    };

    const redemptionMessage = {
        userName: "Пользователь",
        reward: {
            title: "Подарок",
            cost: 100
        }
    }

    return <ThemeProvider theme={theme}>
        <>
            <BackgroundContainer />
            <MessagePreviewContainer>
                <ChatMessage message={message}/>
                <ChatMessage message={longMessage}/>
                <ChatRedemption message={redemptionMessage}/>
                <ChatFollow message={followMessage}/>
            </MessagePreviewContainer>
        </>

    </ThemeProvider>;

}