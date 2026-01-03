import React, { useEffect, useState } from "react";
import styled, { ThemeProvider } from "styled-components";
import useReconnectingWebSocket from '../../hooks/useReconnectingWebSocket';
import ChatMessage from "./ChatMessage";
import ChatFollow from './ChatFollow';
import {defaultTheme} from "../../theme";
import ChatRedemption from "./ChatRedemption";
import {registerFontFace} from "../utils/fontsCache";
import { useTranslation } from "react-i18next";

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

    ${({ theme }) => {
        switch (theme.overlay?.backgroundType ?? 'none') {
            case 'color':
                return `background-color: ${theme.overlay?.backgroundColor || 'transparent'};`;
            default:
                return 'background: transparent;';
        }
    }};
`;

const ConnectionIndicator = styled.div`
    position: fixed;
    top: 8px;
    right: 8px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${({ $connected }) => $connected ? '#22c55e' : '#ef4444'};
    box-shadow: 0 0 4px ${({ $connected }) => $connected ? '#22c55e' : '#ef4444'};
    opacity: ${({ $connected }) => $connected ? 0 : 1};
    transition: opacity 0.3s ease;
    pointer-events: none;
    z-index: 9999;
`;

export default function PreviewComponent() {
    const [theme, setTheme] = useState(defaultTheme);
    const { t } = useTranslation();

    useEffect(() => {
        document.title = t('preview.title');
    }, [t]);
    const { isConnected } = useReconnectingWebSocket('ws://localhost:42001', {
        onOpen: (_, socket) => {
            console.log(t('preview.logs.wsConnected'));
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
                    console.log(t('preview.logs.themeUpdated'), payload);
                    break;
                default:
                    console.log(t('preview.logs.unknownChannel'), channel, payload);
            }
        },
        onClose: () => console.log(t('preview.logs.wsDisconnected')),
    });

    const message = {
        userName: t('preview.sampleMessage.userName'),
        color: "#ffffff",
        htmlBadges: "",
        htmlMessage: t('preview.sampleMessage.shortMessage'),
    };

    const longMessage = {
        userName: t('preview.sampleMessage.userName'),
        color: "#ffffff",
        htmlBadges: "",
        htmlMessage: t('preview.sampleMessage.longMessage')
    };

    const followMessage = {
        userName: t('preview.sampleMessage.userName')
    };

    const redemptionMessage = {
        userName: t('preview.sampleMessage.userName'),
        reward: {
            title: t('preview.sampleMessage.rewardTitle'),
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
            <ConnectionIndicator $connected={isConnected} />
        </>

    </ThemeProvider>;

}