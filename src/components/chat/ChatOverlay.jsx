import React, { useState, useEffect } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { defaultTheme } from '../../theme';
import { registerFontFace } from '../utils/fontsCache';
import ChatMessageList from './ChatMessageList';
import ChatWindow from './ChatWindow';

/* ---------- Global styles ---------- */
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

    .chat-animated {
        animation: fadeIn 300ms ease-out forwards;
    }
    @keyframes fadeIn {
        from { opacity: 0; }
        to   { opacity: 1; }
    }

    /* Improved fade-out animation - prevent conflicts with container animation */
    .fade-enter {
        opacity: 0;
        transform: scale(0.95);
    }
    .fade-enter-active {
        opacity: 1;
        transform: scale(1);
        transition: opacity 250ms ease-out, transform 250ms ease-out;
    }
    .fade-exit {
        opacity: 1;
        transform: scale(1);
        filter: blur(0);
    }
    .fade-exit-active {
        opacity: 0;
        transform: scale(0.8);
        filter: blur(4px);
        transition: opacity 250ms ease-in, transform 250ms ease-in, filter 250ms ease-in;
    }

    /* Critical: prevent container transforms from affecting exiting messages */
    .fade-exit,
    .fade-exit-active {
        position: relative;
        z-index: 1;
    }

    /* Ensure chat-animated doesn't interfere with exit animations */
    .fade-exit .chat-animated,
    .fade-exit-active .chat-animated {
        animation: none !important;
    }
`;

/* ---------- Background ---------- */
const BackgroundContainer = styled.div`
    position: absolute;
    z-index: -1;
    background: ${({ theme }) => {
        switch (theme.overlay?.backgroundType ?? 'none') {
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
            ? `
                opacity: ${theme.overlay?.backgroundOpacity || 1};
                aspect-ratio: ${theme.overlay.backgroundImageAspectRatio};
                width: ${theme.overlay.containerWidth || 500}px;
            `
            : ''}
`;

function useIsWindowMode() {
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') === 'window';
}

function getThemeFromUriParam() {
    const params = new URLSearchParams(window.location.search);
    const themeName = params.get('theme');
    if (themeName) {
        return themeName;
    }
    return null;
}

/**
 * ChatOverlay - Transparent overlay mode
 * Uses user-selected theme from backend
 */
function ChatOverlay() {
    const [currentTheme, setCurrentTheme] = useState(defaultTheme);
    const [currentThemeName, setCurrentThemeName] = useState(getThemeFromUriParam());

    function applyTheme(theme) {
        setCurrentTheme(theme);
        theme?.followMessage?.forEach((m) => {
            if (m.messageFont?.family && m.messageFont?.url) {
                registerFontFace(m.messageFont.family, m.messageFont.url);
            }
        });
        theme?.redeemMessage?.forEach((m) => {
            if (m.messageFont?.family && m.messageFont?.url) {
                registerFontFace(m.messageFont.family, m.messageFont.url);
            }
        });
        if (theme?.chatMessage?.titleFont?.family && theme.chatMessage?.titleFont?.url) {
            registerFontFace(theme.chatMessage.titleFont.family, theme.chatMessage.titleFont.url);
        }
        if (theme?.chatMessage?.messageFont?.family && theme.chatMessage?.messageFont?.url) {
            registerFontFace(theme.chatMessage.messageFont.family, theme.chatMessage.messageFont.url);
        }
    }

    function handleThemeRequest(socket) {
        if (currentThemeName) {
            socket.send(JSON.stringify({ channel: 'theme:get-by-name', payload: { name: currentThemeName } }));
        } else {
            socket.send(JSON.stringify({ channel: 'theme:get' }));
        }
    }

    function handleThemeUpdate(payload, channel) {
        if (channel === 'theme:update-by-name') {
            const { name, theme } = payload;
            console.log('🔵 preparing for theme update:', payload);
            if (currentThemeName !== name) return; // Ignore if theme name doesn't match
            if (!theme) setCurrentThemeName(null); // Reset theme if not found
            console.log('🔵 Theme updated:', name);
            applyTheme(theme);
        } else if (channel === 'theme:update') {
            if (currentThemeName) return;
            applyTheme(payload);
        }
    }

    return (
        <>
            <GlobalStyle />
            <BackgroundContainer theme={currentTheme} />
            <ChatMessageList
                theme={currentTheme}
                onThemeRequest={handleThemeRequest}
                onThemeUpdate={handleThemeUpdate}
                requestThemeOnConnect={true}
            />
        </>
    );
}

/**
 * Main overlay widget router
 * Renders either ChatWindow (window mode) or ChatOverlay (transparent overlay)
 */
export default function OverlayWidget() {
    const isWindow = useIsWindowMode();

    return isWindow ? <ChatWindow /> : <ChatOverlay />;
}
