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
import Popup from "../utils/PopupComponent";
import { defaultTheme } from '../../theme';
import RedeemPointsBlock from "./settings/RedeemPointsBlock";
import OverlaySettingsComponent from "./settings/OverlaySettingsComponent";
import AllMessagesSettings from "./settings/AllMessagesSettings";
import Separator from "../utils/Separator";
import {Sidebar} from "../utils/Sidebar";
import {FiAward, FiHeart, FiMessageCircle, FiMusic, FiSettings} from "react-icons/fi";


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


const ToolbarButton = styled.button`
    box-sizing: border-box;
    height: 40px;
    padding: 0 16px;
    font-size: 14px;
    color: #fff;
    background: #1f1f1f;
    border: 1px solid transparent;
    border-radius: 6px;
    cursor: pointer;

    white-space: nowrap;
    width: fit-content;
    flex: 0 0 auto;
    align-self: flex-start;

    &:hover {
        background: #232323;
        border: 1px solid #646cff;
    }
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

const ThemeName = styled.div`
    flex-grow: 1;
    font-size: 1.2rem;
    font-weight: bold;
    border-radius: 4px;
    background: #252525;
    color: #d6d6d6;
    padding: 8px;
    border: ${({ selected }) => (selected ? '1px solid #00ff00' : '1px solid transparent')};
    width: ${({ selected }) => (selected ? 'calc(100% - 72px)' : '100%')};
    transition: width 0.3s ease;
`;

const ThemeCreate = styled.div`
    display: flex;
    align-items: stretch;
    justify-content: space-between;
    flex-direction: row;
    height: 48px;
`;

const NewThemeInput = styled.input`
    box-sizing: border-box;
    width: auto;
    flex: 1;
    height: 100%;
    padding: 8px;
    border: 1px solid #444;
    border-radius: 4px;
    background: #2e2e2e;
    color: #d6d6d6;
    margin-right: 8px;
    font-size: 1rem;
    &::placeholder {
        color: #888;
    }
`;

const ThemesTitle = styled.h2`
    font-size: 1.5rem;
    font-weight: bold;
    color: #d6d6d6;
    margin: 0;
    padding: 8px 0;
`;

const CreateThemeButton = styled.button`
    border: 1px solid transparent;
    height: auto;
    padding: 8px 12px;
    background: #3a3a3a;
    color: #d6d6d6;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
    &:hover {
        background: #4a4a4a;
        border-color: #646cff;
    }
    &:active {
        background: #5a5a5a;
    }
    &:focus {
        outline: none;
    }
`;

const PopupContent = styled.div`
    display: flex;
    padding: 8px 16px 16px 16px;
    flex-direction: column;
    gap: 8px;
`;

const ThemeItem = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    gap: 4px;
`;

const ThemeActions = styled.div`
    display: flex;
    gap: 4px;
`;

const ActionButton = styled.button`
    border: 1px solid transparent;
    padding: 4px 8px;
    background: #3a3a3a;
    color: #d6d6d6;
    border-radius: 4px;
    cursor: pointer;
    &:hover {
        background: #4a4a4a;
        border-color: #646cff;
    }
`;

const HiddenFileInput = styled.input`
    display: none;
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

    const themeNameRef = React.useRef(null);
    const fileInputRef = React.useRef(null);
    const [isThemeSelectorOpen, setIsThemeSelectorOpen] = React.useState(false);
    const [selectedTheme, setSelectedTheme] = React.useState( defaultTheme);
    const [selectedThemeName, setSelectedThemeName] = React.useState("default");
    const [themeList, setThemeList] = React.useState({});

    const [drawerOpen, setDrawerOpen] = useState(true);
    const [activePage, setActivePage] = useState("general");

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

    const handleCreateThemeButton = () => {
        if (themeNameRef.current && themeNameRef.current.value) {
            const newThemeName = themeNameRef.current.value.trim();
            if (newThemeName) {
                createNewTheme(newThemeName);
                console.log("Создание новой темы:", newThemeName);
            }
        }
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

    const triggerImport = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const data = JSON.parse(reader.result);
                const [name, theme] = Object.entries(data)[0] || [];
                if (name && theme) {
                    importTheme(name, theme);
                }
            } catch (err) {
                console.error('Failed to import theme', err);
            }
        };
        reader.readAsText(file);
    };

    const handleThemeChange = (themeName) => {
        setTheme(themeName);
    }

    return (
        <Panel>
            {isThemeSelectorOpen && (
                <Popup>
                    <PopupContent>
                        <ThemesTitle>Темы</ThemesTitle>
                        { Object.keys(themeList).map((key) => (
                            <ThemeItem key={key}>
                                <ThemeName
                                    onClick={() => { handleThemeChange(key); }}
                                    selected={key === selectedThemeName}
                                >
                                    {key}
                                </ThemeName>
                                {key === selectedThemeName && (
                                    <ThemeActions>
                                        <ActionButton onClick={() => handleExportTheme(key)}>📥</ActionButton>
                                        <ActionButton onClick={() => handleDeleteTheme(key)}>🗑️</ActionButton>
                                    </ThemeActions>
                                )}
                            </ThemeItem>
                        )) }
                        <ThemeCreate>
                            <label>
                                <NewThemeInput
                                    ref={themeNameRef}
                                    name="myInput"
                                    placeholder="Название темы"
                                />
                            </label>
                            <CreateThemeButton onClick={handleCreateThemeButton}>+</CreateThemeButton>
                        </ThemeCreate>
                        <Row justify="space-between">
                            <div>
                                <ActionButton onClick={triggerImport}>Import</ActionButton>
                                <HiddenFileInput ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} />
                            </div>
                            <ActionButton onClick={() => setIsThemeSelectorOpen(false)}>Закрыть</ActionButton>
                        </Row>
                    </PopupContent>
                </Popup>
            )}
            <Toolbar>
                <ToolbarButton onClick={handleBackButton}>Назад</ToolbarButton>
                <ToolbarButton onClick={handlePreviewButton}>Превью</ToolbarButton>
                <ToolbarButton onClick={handleThemesButton}>Темы</ToolbarButton>
                <Separator/>
                <ToolbarButton onClick={openPlayer2}>Плеер №2 (пластинка)</ToolbarButton>
                <ToolbarButton onClick={openPlayer1}>Плеер №1</ToolbarButton>
                <ToolbarButton onClick={openDemoFFTColumns}>Демо FFT (столбцы)</ToolbarButton>
                <ToolbarButton onClick={openDemoFFTRing}>Демо FFT (кольцо)</ToolbarButton>
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
                />
            </ContentWrapper>
        </Panel>
    );
}

const MainContent = ({ page, selectedTheme, apply }) => {
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
            return (
                <Content>
                    <PlayerSettingsComponent
                        current={selectedTheme}
                        onChange={ updaterOrTheme => apply(updaterOrTheme) }
                    />
                </Content>
            );

        default:
            return <div>Неизвестная страница</div>;
    }
};
