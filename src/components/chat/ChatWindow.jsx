import React, { useState } from 'react';
import styled, { createGlobalStyle, css } from 'styled-components';
import { windowModeThemeDark, windowModeThemeLight } from '../../theme';
import { usePersistentOpacity } from '../../hooks/usePersistentOpacity';
import { usePersistentThemeMode } from '../../hooks/usePersistentThemeMode';
import HorizontalSlider from '../utils/HorizontalSlider';
import { Spacer } from '../utils/Separator';
import { FiX } from 'react-icons/fi';
import Switch from '../utils/Switch';
import ChatMessageList from './ChatMessageList';

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
`;

const Toolbar = styled.div`
    ${draggable};
    width: 100%;
    height: 48px;
    display: flex;
    flex-direction: row;
    align-items: center;
    box-sizing: border-box;
    padding: 0 0 0 24px;
    background: ${({ $isLight }) => ($isLight ? 'rgba(220, 220, 220, 0.8)' : 'rgba(155, 116, 255, 0.55)')};
    border-radius: 12px 12px 0 0;
`;

const StyledHorizontalSlider = styled(HorizontalSlider)`
    ${noDrag}
`;

const StyledSwitch = styled.div`
    ${noDrag}
    display: flex;
    align-items: center;
    gap: 8px;
`;

const ThemeLabel = styled.span`
    font-size: 18px;
    color: ${({ $isLight }) => ($isLight ? '#333' : '#fff')};
    user-select: none;
    line-height: 1;
`;

const StyledCloseButton = styled(FiX)`
    ${noDrag};
    box-sizing: border-box;
    width: 48px;
    height: 48px;
    padding: 12px;
    color: ${({ $isLight }) => ($isLight ? '#333' : '#fff')};

    &:hover {
        color: #ff2e2e;
        cursor: pointer;
        transform: scale(1.5);
    }

    transition: all 0.2s ease-in-out;
`;

const ContentArea = styled.div`
    flex: 1;
    overflow: hidden;
    position: relative;
`;

/**
 * ChatWindow - Windowed chat mode with controls
 * Independent component for window mode with its own theme management
 */
export default function ChatWindow() {
    const [opacity, setOpacity] = usePersistentOpacity('ui.opacity', 100, 100);
    const [themeMode, setThemeMode] = usePersistentThemeMode('ui.themeMode', 'dark');

    const currentTheme = themeMode === 'light' ? windowModeThemeLight : windowModeThemeDark;
    const isLight = themeMode === 'light';

    const handleCloseClick = () => {
        console.log('Closing chat window');
        window.close();
    };

    const handleThemeToggle = (e) => {
        setThemeMode(e.target.checked ? 'light' : 'dark');
    };

    return (
        <>
            <GlobalStyle />
            <Frame $opacity={opacity} $isLight={isLight}>
                <Toolbar $isLight={isLight}>
                    <StyledHorizontalSlider
                        style={{ width: '200px' }}
                        label=""
                        min={0}
                        max={100}
                        value={opacity}
                        onChange={(newOpacity) => setOpacity(newOpacity)}
                        throttleMs={10}
                    />
                    <Spacer />
                    <StyledSwitch>
                        <ThemeLabel $isLight={isLight}>{isLight ? '☀' : '🌙'}</ThemeLabel>
                        <Switch checked={isLight} onChange={handleThemeToggle} />
                    </StyledSwitch>
                    <Spacer />
                    <StyledCloseButton size={24} onClick={handleCloseClick} $isLight={isLight} />
                </Toolbar>
                <ContentArea>
                    <ChatMessageList
                        theme={currentTheme}
                        requestThemeOnConnect={false}
                        onThemeRequest={null}
                        onThemeUpdate={null}
                    />
                </ContentArea>
            </Frame>
        </>
    );
}
