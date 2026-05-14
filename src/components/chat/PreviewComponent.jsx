import React, { useEffect, useMemo, useState } from "react";
import styled, { ThemeProvider } from "styled-components";
import useReconnectingWebSocket from '../../hooks/useReconnectingWebSocket';
import ChatMessage from "./ChatMessage";
import ChatMessageV2 from "./ChatMessageV2";
import ChatFollow from './ChatFollow';
import {defaultTheme, defaultV2Message} from "../../theme";
import ChatRedemption from "./ChatRedemption";
import {registerFontFace} from "../utils/fontsCache";
import { useTranslation } from "react-i18next";
import merge from 'lodash/merge';

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

    ${({theme}) => {
        const o = theme.overlay;
        const hasImageSize = o?.backgroundType === 'image' && o?.backgroundImageAspectRatio;
        const isManual = o?.autoSize === false;
        return (hasImageSize || isManual)
            ? `
                width: ${(o?.chatWidth || 500)}px;
                height: ${(o?.chatHeight || 500)}px;
            `
            : '';
    }}
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
                    // V2 fonts
                    if (payload.v2?.message) {
                        const v2msg = payload.v2.message;
                        if (v2msg.content?.header?.font) {
                            registerFontFace(v2msg.content.header.font.family, v2msg.content.header.font.url);
                        }
                        if (v2msg.content?.text?.font) {
                            registerFontFace(v2msg.content.text.font.family, v2msg.content.text.font.url);
                        }
                    }
                    console.log(t('preview.logs.themeUpdated'), payload);
                    break;
                default:
                    console.log(t('preview.logs.unknownChannel'), channel, payload);
            }
        },
        onClose: () => console.log(t('preview.logs.wsDisconnected')),
    });

    const sampleEmote = '<img src="https://static-cdn.jtvnw.net/emoticons/v2/425618/default/dark/1.0" alt="LUL" style="width:28px;height:28px;vertical-align:middle">';

    // Static Twitch badge URLs for the preview only. Real overlays receive
    // these via Helix /chat/badges; mirroring the fetched data here would be
    // overkill for a demo. Keep in sync with the role list in parseBadges.
    const PREVIEW_TWITCH_BADGE_URL = {
        broadcaster:    'https://static-cdn.jtvnw.net/badges/v1/5527c58c-fb7d-422d-b71b-f309dcb85cc1/1',
        lead_moderator: 'https://static-cdn.jtvnw.net/badges/v1/9a8c357c-c4d4-4179-b310-fbf1bf21cda6/1',
        moderator:      'https://static-cdn.jtvnw.net/badges/v1/3267646d-33f0-4b17-b3df-f923a41db1d0/1',
        vip:            'https://static-cdn.jtvnw.net/badges/v1/b817aba4-fad8-49e2-b88a-7cc744dfa6ec/1',
        artist:         'https://static-cdn.jtvnw.net/badges/v1/4300a897-03dc-4e83-8c0e-c332fee7057f/1',
        subscriber:     'https://static-cdn.jtvnw.net/badges/v1/5d9f2208-5dd8-11e7-8513-8b9af3ba2d2c/1',
    };

    const buildPreviewBadge = (role) => {
        const emotes = mergedV2?.content?.header?.emotes;
        const customImg = emotes?.customBadges?.[role]?.image;
        const useCustom = emotes?.source === 'custom' && !!customImg;
        const url = useCustom ? customImg : PREVIEW_TWITCH_BADGE_URL[role];
        if (!url) return '';
        return `<img src="${url}" alt="${role}" title="${role}" style="vertical-align:middle;height:1em;margin-right:2px" />`;
    };

    const broadcasterMessage = {
        userName: t('preview.sampleMessage.broadcasterName', 'PreviewStreamer'),
        color: "#ff6b6b",
        htmlBadges: buildPreviewBadge('broadcaster'),
        htmlMessage: `${t('preview.sampleMessage.shortMessage')} ${sampleEmote}`,
    };

    const moderatorMessage = {
        userName: t('preview.sampleMessage.moderatorName', 'PreviewMod'),
        color: "#3aa0ff",
        htmlBadges: buildPreviewBadge('moderator'),
        htmlMessage: `${t('preview.sampleMessage.shortMessage')} ${sampleEmote}`,
    };

    const longMessage = {
        userName: t('preview.sampleMessage.userName'),
        color: "#ffffff",
        htmlBadges: "",
        htmlMessage: `${t('preview.sampleMessage.longMessage')} ${sampleEmote} ${sampleEmote}`
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

    const v2Config = theme.v2?.message;
    const mergedV2 = useMemo(
        () => v2Config ? merge({}, defaultV2Message, v2Config) : null,
        [v2Config]
    );

    const ChatMsg = mergedV2
        ? (props) => <ChatMessageV2 {...props} v2Config={mergedV2} />
        : ChatMessage;

    return <ThemeProvider theme={theme}>
        <>
            <BackgroundContainer />
            <MessagePreviewContainer>
                <ChatMsg message={broadcasterMessage} showSourceChannel={false}/>
                <ChatMsg message={moderatorMessage} showSourceChannel={false}/>
                <ChatMsg message={longMessage} showSourceChannel={false}/>
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