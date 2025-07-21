import React, { useState } from "react";
import styled, { ThemeProvider } from "styled-components";
import useReconnectingWebSocket from '../../hooks/useReconnectingWebSocket';
import ChatMessage from "./ChatMessage";
import ChatFollow from './ChatFollow';
import {defaultTheme} from "../../theme";
import ChatRedemption from "./ChatRedemption";
import {registerFontFace} from "../utils/fontsCache";

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
            opacity: ${theme.overlay?.backgroundOpacity || 1};
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

const ConnectionLost = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    color: red;
    background: rgba(0,0,0,0.5);
    z-index: 10;
`;

export default function PreviewComponent() {
    const [theme, setTheme] = useState(defaultTheme);

    const { isConnected } = useReconnectingWebSocket('ws://localhost:42001', {
        onOpen: (_, socket) => {
            console.log('🟢 WebSocket подключен');
            socket.send(JSON.stringify({ channel: 'theme:get' }));
        },
        onMessage: event => {
            const { channel, payload } = JSON.parse(event.data);
            switch (channel) {
                case 'theme:update':
                    setTheme(payload);
                    payload?.followMessage?.forEach((m, index) => {
                        registerFontFace(m.messageFont.family, m.messageFont.url);
                    })
                    payload?.redeemMessage?.forEach((m, index) => {
                        registerFontFace(m.messageFont.family, m.messageFont.url);
                    })
                    registerFontFace(
                        payload.chatMessage.titleFont.family,
                        payload.chatMessage.titleFont.url
                    );
                    registerFontFace(
                        payload.chatMessage.messageFont.family,
                        payload.chatMessage.messageFont.url
                    );
                    console.log('Тема обновлена:', payload);
                    break;
                default:
                    console.log('unknown channel', channel, payload);
            }
        },
        onClose: () => console.log('🔴 WebSocket отключен'),
    });

    const message = {
        userName: "Пользователь",
        color: "#ffffff",
        htmlBadges: "",
        htmlMessage: "Это пример сообщения в чате.",
    };

    const longMessage = {
        userName: "Пользователь",
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
                <ChatMessage message={message} showSourceChannel={false}/>
                <ChatMessage message={longMessage} showSourceChannel={false}/>
                {theme.redeemMessage?.map((_, index) => (
                    <ChatRedemption
                        key={index}
                        message={redemptionMessage}
                        currentTheme={theme}
                        index={index}
                    />
                ))}
                {theme.followMessage?.map((_, index) => (
                    <ChatFollow
                        key={index}
                        message={followMessage}
                        currentTheme={theme}
                        index={index}
                    />
                ))}
            </MessagePreviewContainer>
            {!isConnected && <ConnectionLost>нет связи с источником</ConnectionLost>}
        </>

    </ThemeProvider>;

}