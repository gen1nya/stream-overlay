// Settings.js
import React, {useEffect} from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import {openPreview, setRemoteTheme} from '../services/api';
import MessageSettingsBlock from "./app/MessageSettingsBlock";
import FollowSettingsBlock from "./app/FollowSettingsBlock";
import PlayerSettingsComponent from "./app/PlayerSettingsComponent";
import Popup from "./utils/PopupComponent";


const Panel = styled.div`
    position: fixed;
    top: 0;
    right: 0;
    width: 100%;
    height: 100vh;
    padding: 0px;
    background: #171717;
    color: #f6f6f6;
    box-shadow: -4px 0 8px #0002;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const SettingsBlock = styled.div`
    padding: 0px 12px;
    width: 100%;
    flex-direction: column;
    display: flex;
    gap: 12px;
`

const Toolbar = styled.div`
    width: 100%;
    height: 60px;
`

const Content = styled.div`
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: space-between;
    
`

export const Row = styled.div`
  display: flex;
  flex-direction: row;
  align-items: ${({ align = "center" }) => align};
  justify-content: ${({ justify = "flex-start" }) => justify};
  gap: ${({ gap = "0.5rem" }) => gap};
`;

export default function Settings({ current, onChange }) {
    const navigate = useNavigate();

    const [isThemeSelectorOpen, setIsThemeSelectorOpen] = React.useState(false);
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
                    console.log('Получены темы', payload);
                    break;
                default:
                    console.log('unknown channel', channel, payload);
            }
        };
    }, [])

    /** Единая «точка входа» для всех изменений темы */
    const apply = updaterOrTheme => {
        // 1) локально меняем тему (главное окно)
        onChange(updaterOrTheme);

        // 2) вычисляем «чистый» объект темы
        const nextTheme =
            typeof updaterOrTheme === 'function'
                ? updaterOrTheme(current) // превращаем updater-функцию в объект
                : updaterOrTheme;

        // 3) отправляем наружу (IPC / WS скрыт в setRemoteTheme)
        setRemoteTheme(nextTheme);
    };

    const handleBackButton = () => navigate(-1);
    const handlePreviewButton = async () => {
        await openPreview()
    };
    const handleThemesButton = () => {
        setIsThemeSelectorOpen(true)

    };

    return (
        <Panel>
            {isThemeSelectorOpen && (
                <Popup>
                    <h2>Попап</h2>
                    <button onClick={() => setIsThemeSelectorOpen(false)}>Закрыть</button>
                </Popup>
            )}
            <Toolbar>
                <button onClick={handleBackButton}>Назад</button>
                <button onClick={handlePreviewButton}>Превью</button>
                <button onClick={handleThemesButton}>Темы</button>
            </Toolbar>


            <Content>

                <MessageSettingsBlock
                    current={current}
                    onChange={ updaterOrTheme => apply(updaterOrTheme) }
                />

                <FollowSettingsBlock
                    current={current}
                    onChange={ updaterOrTheme => apply(updaterOrTheme) }
                />

                <PlayerSettingsComponent
                    current={current}
                    onChange={ updaterOrTheme => apply(updaterOrTheme) }
                />

            </Content>
        </Panel>
    );
}
