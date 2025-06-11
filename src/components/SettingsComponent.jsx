// Settings.js
import React, {useEffect} from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import {openPreview, setRemoteTheme, createNewTheme, setTheme} from '../services/api';
import MessageSettingsBlock from "./app/MessageSettingsBlock";
import FollowSettingsBlock from "./app/FollowSettingsBlock";
import PlayerSettingsComponent from "./app/PlayerSettingsComponent";
import Popup from "./utils/PopupComponent";
import { defaultTheme } from '../theme';


const Panel = styled.div`
    position: fixed;
    top: 0;
    right: 0;
    width: 100%;
    height: 100vh;
    padding: 0;
    background: #171717;
    color: #f6f6f6;
    box-shadow: -4px 0 8px #0002;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const Toolbar = styled.div`
    width: 100%;
    height: 60px;
`;

const Content = styled.div`
    display: flex;
    height: 100%;
    align-content: flex-start;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: space-between;
    overflow-y: scroll;
`;

const ThemeName = styled.div`
    font-size: 1.2rem;
    font-weight: bold;
    border-radius: 4px;
    background: #252525;
    color: #d6d6d6;
    padding: 8px;
    border: ${({ selected }) => (selected ? '1px solid #00ff00' : '1px solid transparent')};
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
    const [isThemeSelectorOpen, setIsThemeSelectorOpen] = React.useState(false);
    const [selectedTheme, setSelectedTheme] = React.useState( defaultTheme);
    const [selectedThemeName, setSelectedThemeName] = React.useState("default");
    const [themeList, setThemeList] = React.useState({});

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

    const handleCreateThemeButton = () => {
        if (themeNameRef.current && themeNameRef.current.value) {
            const newThemeName = themeNameRef.current.value.trim();
            if (newThemeName) {
                createNewTheme(newThemeName);
                console.log("Создание новой темы:", newThemeName);
            }
        }
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
                        { Object.keys(themeList).map((key, i) => (
                            <ThemeName
                                key={key}
                                onClick={ () => { handleThemeChange(key) } }
                                selected={key === selectedThemeName}
                            >
                                {key}
                            </ThemeName>
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
                        <button onClick={() => setIsThemeSelectorOpen(false)}>Закрыть</button>
                    </PopupContent>
                </Popup>
            )}
            <Toolbar>
                <button onClick={handleBackButton}>Назад</button>
                <button onClick={handlePreviewButton}>Превью</button>
                <button onClick={handleThemesButton}>Темы</button>
            </Toolbar>


            <Content>

                <MessageSettingsBlock
                    current={selectedTheme}
                    onChange={ updaterOrTheme => apply(updaterOrTheme) }
                />

                <FollowSettingsBlock
                    current={selectedTheme}
                    onChange={ updaterOrTheme => apply(updaterOrTheme) }
                />

                <PlayerSettingsComponent
                    current={selectedTheme}
                    onChange={ updaterOrTheme => apply(updaterOrTheme) }
                />

            </Content>
        </Panel>
    );
}
