// Settings.js
import React, {useEffect, useState} from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import {
    openPreview,
    setRemoteTheme,
    createNewTheme,
    setTheme,
    importTheme,
    deleteTheme,
    openExternalLink
} from '../../services/api';
import MessageSettingsBlock from "./settings/MessageSettingsBlock";
import FollowSettingsBlock from "./settings/FollowSettingsBlock";
import PlayerSettingsComponent from "./settings/PlayerSettingsComponent";
import { defaultTheme } from '../../theme';
import RedeemPointsBlock from "./settings/RedeemPointsBlock";
import OverlaySettingsComponent from "./settings/OverlaySettingsComponent";
import AllMessagesSettings from "./settings/AllMessagesSettings";
import Separator from "../utils/Separator";
import {Sidebar} from "../utils/Sidebar";
import {FiAward, FiHeart, FiMessageCircle, FiMusic, FiSettings} from "react-icons/fi";
import {MediumSecondaryButton, SettingsBlockHalf, SettingsBlockTitle} from "./settings/SettingBloks";
import ThemePopup from "./settings/ThemePopup";
import ColorPickerPopup from "./settings/ColorPickerPopup";

const Panel = styled.div`
    position: fixed;
    top: 0;
    right: 0;
    width: 100%;
    height: 100vh;
    padding: 0;
    margin: 0;
    background: #171717;
    color: #f6f6f6;
    box-shadow: -4px 0 8px #0002;
    display: flex;
    flex-direction: column;
    gap: 0;
`;

const Toolbar = styled.div`
    box-sizing: border-box;
    padding: 8px ;
    display: flex;
    gap: 8px;
    width: 100%;
    height: 60px;
    background: #1a1a1a;
`;

const ContentWrapper = styled.div`
    display: flex;
    flex-direction: row;
    height: 100%;
`;

const Content = styled.div`
    display: flex;
    flex: 1;
    height: 100%;
    align-content: flex-start;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: space-between;
    overflow-y: scroll;
`;

export const Row = styled.div`
    display: flex;
    flex-direction: row;
    align-items: ${({ align = "center" }) => align};
    justify-content: ${({ justify = "flex-start" }) => justify};
    gap: ${({ gap = "0.5rem" }) => gap};
`;

export default function Settings() {
    const navigate = useNavigate();

    const [isThemeSelectorOpen, setIsThemeSelectorOpen] = React.useState(false);
    const [selectedTheme, setSelectedTheme] = React.useState( defaultTheme);
    const [selectedThemeName, setSelectedThemeName] = React.useState("default");
    const [themeList, setThemeList] = React.useState({});

    const [drawerOpen, setDrawerOpen] = useState(true);
    const [activePage, setActivePage] = useState("general");

    const [colorPopup, setColorPopup] = useState({
        open: false,
        initialColor: '#ffffff',
        initialAlpha: 1,
        onChange: () => {},
        title: 'Цвет',
    });

    const openColorPopup = ({ initialColor = '#ffffff', onChange, title = 'Цвет', initialAlpha }) => {
        setColorPopup({
            open: true,
            initialColor,
            initialAlpha,
            onChange,
            title,
        });
    };

    const closeColorPopup = () => {
        setColorPopup(prev => ({ ...prev, open: false }));
    };

    useEffect(() => {
        const ws = new WebSocket('ws://localhost:42001');
        ws.onopen = () => {
            console.log('🟢 WebSocket подключен');
            ws.send(JSON.stringify({ channel: 'theme:get-all' }));
        };
        ws.onmessage = (event) => {
            const { channel, payload } = JSON.parse(event.data);
            switch (channel) {
                case "themes:get":
                    const { themes, currentThemeName } = payload;
                    console.log('Получены темы:', themes, 'Текущая тема:', currentThemeName);
                    setThemeList(themes);
                    setSelectedThemeName(currentThemeName);
                    setSelectedTheme(themes[currentThemeName] || defaultTheme);
                    break;
                default:
                    console.log('unknown channel', channel, payload);
            }
        };
        ws.onclose = () => console.log('🔴 WebSocket отключен');
        return () => ws.close();
    }, []);

    /** Единая «точка входа» для всех изменений темы */
    const apply = updaterOrTheme => {
        const nextTheme =
            typeof updaterOrTheme === 'function'
                ? updaterOrTheme(selectedTheme) // превращаем updater-функцию в объект
                : updaterOrTheme;
        console.log("Применение темы:", nextTheme);
        setSelectedTheme(nextTheme);
        setRemoteTheme(nextTheme, selectedThemeName);
    };

    const handleBackButton = () => navigate(-1);
    const handlePreviewButton = async () => {
        await openPreview()
    };
    const handleThemesButton = () => {
        setIsThemeSelectorOpen(true)
    };

    const handleExportTheme = (name) => {
        const theme = themeList[name];
        if (!theme) return;
        const data = JSON.stringify({ [name]: theme }, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${name}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleDeleteTheme = (name) => {
        if (window.confirm(`Delete theme "${name}"?`)) {
            deleteTheme(name);
        }
    };

    const handleThemeChange = (themeName) => {
        setTheme(themeName);
    }

    return (
        <Panel>
            {colorPopup.open && (
                <ColorPickerPopup
                    title={colorPopup.title}
                    initialColor={colorPopup.initialColor}
                    initialAlpha={colorPopup.initialAlpha}
                    onColorChange={colorPopup.onChange}
                    onClose={closeColorPopup}
                />
            )}
            {isThemeSelectorOpen && (
                <ThemePopup
                    onClose={() => setIsThemeSelectorOpen(false)}
                    themeList={themeList}
                    selectedThemeName={selectedThemeName}
                    onChangeTheme={handleThemeChange}
                    onDeleteTheme={handleDeleteTheme}
                    onExportTheme={handleExportTheme}
                    onImportTheme={importTheme}
                    onCreateTheme={(name) => {
                        createNewTheme(name);
                        console.log("Создание новой темы:", name);
                    }}
                />
            )}
            <Toolbar>
                <MediumSecondaryButton onClick={handleBackButton}>Назад</MediumSecondaryButton>
                <MediumSecondaryButton onClick={handlePreviewButton}>Превью</MediumSecondaryButton>
                <MediumSecondaryButton onClick={handleThemesButton}>Темы</MediumSecondaryButton>
                <Separator/>
            </Toolbar>


            <ContentWrapper>
                <Sidebar
                    open={drawerOpen}
                    active={activePage}
                    onSelect={setActivePage}
                    items={[
                        { key: "general", icon: <FiSettings />, label: "Общие" },
                        { key: "chat", icon: <FiMessageCircle />, label: "Сообщения" },
                        { key: "follow", icon: <FiHeart />, label: "Follow" },
                        { key: "channel_points", icon: <FiAward />, label: "Баллы" },
                        { key: "players", icon: <FiMusic />, label: "Плееры" },
                    ]}
                />
                <MainContent
                    page={activePage}
                    apply={ updaterOrTheme => apply(updaterOrTheme) }
                    selectedTheme={selectedTheme}
                    openColorPopup={openColorPopup}
                />
            </ContentWrapper>
        </Panel>
    );
}

const MainContent = ({ page, selectedTheme, apply, openColorPopup}) => {
    switch (page) {
        case "general":
            return (
                <Content>
                    <OverlaySettingsComponent
                        current={selectedTheme}
                        onChange={ updaterOrTheme => apply(updaterOrTheme) }
                    />

                    <AllMessagesSettings
                        current={selectedTheme}
                        onChange={ updaterOrTheme => apply(updaterOrTheme) }
                        openColorPopup={ openColorPopup }
                    />
                </Content>
            );

        case "chat":
            return (
                <Content>
                    <MessageSettingsBlock
                        current={selectedTheme}
                        onChange={ updaterOrTheme => apply(updaterOrTheme) }
                    />
                </Content>
            );

        case "follow":
            return (
                <Content>
                    <FollowSettingsBlock
                        current={selectedTheme}
                        index={0}
                        onChange={ updaterOrTheme => apply(updaterOrTheme) }
                    />
                </Content>
            );

        case "channel_points":
            return (
                <Content>
                    <RedeemPointsBlock
                        current={selectedTheme}
                        onChange={ updaterOrTheme => apply(updaterOrTheme) }
                    />
                </Content>
            );

        case "players":
            const openPlayer1 = () => {
                openExternalLink('http://localhost:5173/audio-modern');
            };

            const openPlayer2 = () => {
                openExternalLink('http://localhost:5173/audio');
            };

            const openDemoFFTColumns = () => {
                openExternalLink('http://localhost:5173/audio-fft-linear-demo');
            }

            const openDemoFFTRing = () => {
                openExternalLink('http://localhost:5173/audio-fft-round-demo');
            }
            return (
                <Content>
                    <PlayerSettingsComponent
                        current={selectedTheme}
                        onChange={ updaterOrTheme => apply(updaterOrTheme) }
                    />
                    <SettingsBlockHalf>
                        <SettingsBlockTitle>Ссылки</SettingsBlockTitle>
                        <MediumSecondaryButton onClick={openPlayer2}>Плеер №2 (пластинка)</MediumSecondaryButton>
                        <MediumSecondaryButton onClick={openPlayer1}>Плеер №1</MediumSecondaryButton>
                        <MediumSecondaryButton onClick={openDemoFFTColumns}>Демо FFT (столбцы)</MediumSecondaryButton>
                        <MediumSecondaryButton onClick={openDemoFFTRing}>Демо FFT (кольцо)</MediumSecondaryButton>
                    </SettingsBlockHalf>
                </Content>
            );
        default:
            return <div>Неизвестная страница</div>;
    }
};