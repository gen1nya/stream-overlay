// Settings.js
import React from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import {openPreview, setRemoteTheme} from '../services/api';
import MessageSettingsBlock from "./app/MessageSettingsBlock";
import FollowSettingsBlock from "./app/FollowSettingsBlock";
import PlayerSettingsComponent from "./app/PlayerSettingsComponent";


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

    return (
        <Panel>
            <Toolbar>
                <button onClick={handleBackButton}>Назад</button>
                <button onClick={handlePreviewButton}>Превью</button>
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
