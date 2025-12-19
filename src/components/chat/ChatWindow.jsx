import React, { useState, useMemo, useRef, useEffect } from 'react';
import styled, { createGlobalStyle, css } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { windowModeThemeDark, windowModeThemeLight, gameModeTheme } from '../../theme';
import { usePersistentOpacity } from '../../hooks/usePersistentOpacity';
import { usePersistentThemeMode } from '../../hooks/usePersistentThemeMode';
import { usePersistentFontScale } from '../../hooks/usePersistentFontScale';
import { Spacer } from '../utils/Separator';
import { FiX, FiSettings } from 'react-icons/fi';
import { getChatGameMode, onGameModeChanged, removeGameModeListener } from '../../services/api';
import ChatMessageList from './ChatMessageList';
import ChatWindowSettings from './ChatWindowSettings';
import ModeratorPopup from './ModeratorPopup';

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

const draggable = css`
    -webkit-app-region: drag;
    user-select: none;
`;

const noDrag = css`
    -webkit-app-region: no-drag;
    user-select: text;
`;

const Frame = styled.div`
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    border-radius: 12px;
    box-sizing: border-box;
    border: 1px solid ${({ $isLight }) => ($isLight ? 'rgba(200, 200, 200, 0.6)' : 'rgba(155, 116, 255, 0.55)')};
    background: ${({ $opacity, $isLight }) =>
        $isLight ? `rgba(245, 245, 245, ${$opacity / 100})` : `rgba(20, 20, 20, ${$opacity / 100})`};

    /* In game mode: no background, no border, click-through */
    ${({ $isGameMode }) => $isGameMode && css`
        pointer-events: none;
        background: transparent;
        border: none;
        border-radius: 0;
    `}
`;

const Toolbar = styled.div`
    ${draggable};
    width: 100%;
    height: 48px;
    display: flex;
    flex-direction: row;
    align-items: center;
    box-sizing: border-box;
    padding: 0 12px;
    background: ${({ $isLight }) => ($isLight ? 'rgba(220, 220, 220, 0.8)' : 'rgba(155, 116, 255, 0.55)')};
    border-radius: 12px 12px 0 0;

    /* Hide toolbar in game mode */
    ${({ $isGameMode }) => $isGameMode && css`
        display: none;
    `}
`;

const ToolbarButton = styled.button`
    ${noDrag};
    background: none;
    border: none;
    box-sizing: border-box;
    width: 40px;
    height: 40px;
    padding: 8px;
    color: ${({ $isLight }) => ($isLight ? '#333' : '#fff')};
    cursor: pointer;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease-in-out;

    &:hover {
        background: ${({ $isLight }) => ($isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.2)')};
    }

    &:active {
        transform: scale(0.95);
    }

    svg {
        width: 20px;
        height: 20px;
    }
`;

const CloseButton = styled(ToolbarButton)`
    &:hover {
        background: rgba(255, 46, 46, 0.2);
        color: #ff2e2e;
    }
`;

const ContentArea = styled.div`
    flex: 1;
    overflow: hidden;
    position: relative;
`;

const SettingsContainer = styled.div`
    position: relative;
`;

/**
 * ChatWindow - Windowed chat mode with controls
 * Independent component for window mode with its own theme management
 */
export default function ChatWindow() {
    const { t } = useTranslation();
    const [opacity, setOpacity] = usePersistentOpacity('ui.opacity', 100, 100);
    const [themeMode, setThemeMode] = usePersistentThemeMode('ui.themeMode', 'dark');
    const [fontScale, setFontScale] = usePersistentFontScale('ui.fontScale', 100);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [isModPopupOpen, setIsModPopupOpen] = useState(false);
    const [isGameMode, setIsGameMode] = useState(false);
    const settingsButtonRef = useRef(null);

    const isLight = themeMode === 'light';

    // Select base theme based on mode
    const baseTheme = useMemo(() => {
        if (isGameMode) return gameModeTheme;
        return isLight ? windowModeThemeLight : windowModeThemeDark;
    }, [isGameMode, isLight]);

    // Sync game mode state from backend via IPC events
    useEffect(() => {
        // Get initial state
        getChatGameMode().then(state => setIsGameMode(state ?? false));

        // Subscribe to changes from main process
        onGameModeChanged(setIsGameMode);

        return () => removeGameModeListener();
    }, []);

    // Calculate blended opacity for messages
    // Formula: 50% at 0 opacity, 100% at 100 opacity
    const messagesOpacity = useMemo(() => {
        return 0.5 + (opacity / 100) * 0.5;
    }, [opacity]);

    // Apply font scale and localized templates to theme
    const currentTheme = useMemo(() => {
        const scale = fontScale / 100;
        const followTemplate = t('chatWindow.templates.follow');
        const redeemTemplate = t('chatWindow.templates.redeem');

        return {
            ...baseTheme,
            chatMessage: {
                ...baseTheme.chatMessage,
                fontSize: Math.round(baseTheme.chatMessage.fontSize * scale),
                titleFontSize: Math.round(baseTheme.chatMessage.titleFontSize * scale),
            },
            followMessage: baseTheme.followMessage?.map(msg => ({
                ...msg,
                fontSize: Math.round(msg.fontSize * scale),
                template: followTemplate,
            })),
            redeemMessage: baseTheme.redeemMessage?.map(msg => ({
                ...msg,
                fontSize: Math.round(msg.fontSize * scale),
                template: redeemTemplate,
            })),
        };
    }, [baseTheme, fontScale, t]);

    const handleCloseClick = () => {
        console.log('Closing chat window');
        window.close();
    };

    const toggleSettings = () => {
        setIsSettingsOpen((prev) => !prev);
    };

    const handleMessageClick = (message) => {
        console.log('Message clicked:', message);
        setSelectedMessage(message);
        setIsModPopupOpen(true);
    };

    const handleCloseModPopup = () => {
        setIsModPopupOpen(false);
        setSelectedMessage(null);
    };

    return (
        <>
            <GlobalStyle />
            <Frame $opacity={opacity} $isLight={isLight} $isGameMode={isGameMode}>
                <Toolbar $isLight={isLight} $isGameMode={isGameMode}>
                    <SettingsContainer>
                        <ToolbarButton
                            ref={settingsButtonRef}
                            $isLight={isLight}
                            onClick={toggleSettings}
                            title={t('chatWindow.settings.title')}
                        >
                            <FiSettings />
                        </ToolbarButton>
                        <ChatWindowSettings
                            isOpen={isSettingsOpen}
                            onClose={() => setIsSettingsOpen(false)}
                            opacity={opacity}
                            onOpacityChange={setOpacity}
                            themeMode={themeMode}
                            onThemeModeChange={setThemeMode}
                            fontScale={fontScale}
                            onFontScaleChange={setFontScale}
                            isLight={isLight}
                            triggerButtonRef={settingsButtonRef}
                        />
                    </SettingsContainer>
                    <Spacer />
                    <CloseButton $isLight={isLight} onClick={handleCloseClick} title={t('chatWindow.close')}>
                        <FiX />
                    </CloseButton>
                </Toolbar>
                <ContentArea>
                    <ChatMessageList
                        theme={currentTheme}
                        requestThemeOnConnect={false}
                        onThemeRequest={null}
                        onThemeUpdate={null}
                        messagesChannel="chat:window-messages"
                        messagesRequestChannel="chat:window-messages-request"
                        blendedOpacity={messagesOpacity}
                        onMessageClick={handleMessageClick}
                    />
                </ContentArea>
            </Frame>

            {isModPopupOpen && selectedMessage && (
                <ModeratorPopup
                    message={selectedMessage}
                    onClose={handleCloseModPopup}
                    isLight={isLight}
                />
            )}
        </>
    );
}
