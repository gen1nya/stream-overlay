import React, { useRef, useEffect } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import HorizontalSlider from '../utils/HorizontalSlider';
import Switch from '../utils/Switch';
import NumericEditorComponent from '../utils/NumericEditorComponent';

const SettingsPanel = styled.div`
    position: absolute;
    top: 56px;
    left: 16px;
    width: 280px;
    background: ${({ $isLight }) => ($isLight ? 'rgba(255, 255, 255, 0.98)' : 'rgba(30, 30, 30, 0.98)')};
    border: 1px solid ${({ $isLight }) => ($isLight ? 'rgba(200, 200, 200, 0.8)' : 'rgba(100, 100, 100, 0.5)')};
    border-radius: 8px;
    padding: 16px 16px 6px 16px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    z-index: 1000;
    backdrop-filter: blur(10px);
    -webkit-app-region: no-drag;
    user-select: none;
`;

const SettingGroup = styled.div`
    margin-bottom: 8px;

    &:last-child {
        margin-bottom: 0;
    }
`;

const SettingLabel = styled.div`
    font-size: 13px;
    font-weight: 600;
    color: ${({ $isLight }) => ($isLight ? '#333' : '#ddd')};
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const ThemeToggleContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 0;
`;

const ThemeLabel = styled.span`
    font-size: 14px;
    color: ${({ $isLight }) => ($isLight ? '#333' : '#ddd')};
    display: flex;
    align-items: center;
    gap: 8px;
`;

const ThemeIcon = styled.span`
    font-size: 18px;
`;

const OpacityValue = styled.div`
    font-size: 12px;
    color: ${({ $isLight }) => ($isLight ? '#666' : '#999')};
    text-align: right;
    margin-top: 4px;
`;

// Light theme color scheme for NumericEditorComponent
const lightColorScheme = {
    labelText: '#333',
    background: '#f5f5f5',
    backgroundHover: '#efefef',
    border: '#d0d0d0',
    borderHover: '#bbb',
    borderFocus: '#9b74ff',
    inputText: '#333',
    inputPlaceholder: '#999',
    buttonText: '#666',
    buttonTextHover: '#333',
    buttonHoverBg: 'rgba(0, 0, 0, 0.05)',
    buttonActiveBg: 'rgba(0, 0, 0, 0.1)',
    resetBorder: '#d0d0d0',
    resetHoverBg: 'rgba(255, 193, 7, 0.15)',
    resetHoverText: '#d89e00',
    infoText: '#999',
    errorText: '#dc2626',
    errorBg: 'rgba(220, 38, 38, 0.08)',
};

/**
 * ChatWindowSettings - Settings panel for chat window
 *
 * @param {boolean} isOpen - Whether the panel is open
 * @param {Function} onClose - Callback when clicking outside
 * @param {number} opacity - Current opacity value
 * @param {Function} onOpacityChange - Callback for opacity change
 * @param {string} themeMode - Current theme mode ('light' or 'dark')
 * @param {Function} onThemeModeChange - Callback for theme mode change
 * @param {number} fontScale - Current font scale value
 * @param {Function} onFontScaleChange - Callback for font scale change
 * @param {boolean} isLight - Whether light theme is active
 * @param {Object} triggerButtonRef - Ref to the button that triggers the panel
 */
export default function ChatWindowSettings({
    isOpen,
    onClose,
    opacity,
    onOpacityChange,
    themeMode,
    onThemeModeChange,
    fontScale,
    onFontScaleChange,
    isLight,
    triggerButtonRef,
}) {
    const { t } = useTranslation();
    const panelRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event) => {
            // Check if click is inside panel
            if (panelRef.current && panelRef.current.contains(event.target)) {
                return;
            }

            // Check if click is on the trigger button (to allow toggle behavior)
            if (triggerButtonRef?.current && triggerButtonRef.current.contains(event.target)) {
                return;
            }

            // Close if clicked outside both panel and button
            onClose();
        };

        // Add delay to prevent immediate closing
        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 100);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose, triggerButtonRef]);

    if (!isOpen) return null;

    const handleThemeToggle = (checked) => {
        onThemeModeChange(checked ? 'light' : 'dark');
    };

    return (
        <SettingsPanel ref={panelRef} $isLight={isLight}>
            <SettingGroup>
                <SettingLabel $isLight={isLight}>{t('chatWindow.settings.opacity')}</SettingLabel>
                <HorizontalSlider
                    style={{ width: '100%' }}
                    label=""
                    min={0}
                    max={100}
                    value={opacity}
                    onChange={onOpacityChange}
                    throttleMs={10}
                />
            </SettingGroup>

            <SettingGroup>
                <SettingLabel $isLight={isLight}>{t('chatWindow.settings.theme.label')}</SettingLabel>
                <ThemeToggleContainer>
                    <ThemeLabel $isLight={isLight}>
                        <ThemeIcon>{isLight ? '☀️' : '🌙'}</ThemeIcon>
                        {isLight ? t('chatWindow.settings.theme.light') : t('chatWindow.settings.theme.dark')}
                    </ThemeLabel>
                    <Switch checked={isLight} onChange={(e) => handleThemeToggle(e.target.checked)} />
                </ThemeToggleContainer>
            </SettingGroup>

            <SettingGroup>
                <SettingLabel $isLight={isLight}>{t('chatWindow.settings.fontScale')}</SettingLabel>
                <NumericEditorComponent
                    value={fontScale}
                    onChange={onFontScaleChange}
                    min={50}
                    max={200}
                    step={5}
                    defaultValue={100}
                    showRange={false}
                    showReset={true}
                    placeholder="100"
                    colorScheme={isLight ? lightColorScheme : undefined}
                />
            </SettingGroup>
        </SettingsPanel>
    );
}
