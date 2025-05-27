import React, {useEffect, useState} from "react";
import styled, {createGlobalStyle, ThemeProvider} from "styled-components";
import ChatMessage from "./ChatMessage";
import {defaultTheme} from "../theme";

const MessagePreviewContainer = styled.div`
    padding: 4px;
    border: 1px solid #909090;
    background: #5e5e5e;
    border-radius: 8px;
    box-shadow: 0 0 4px rgba(97, 97, 97, 0.2);
    display: flex;
    flex-direction: column;
`

export default function PreviewComponent() {
    const [theme, setTheme] = useState(defaultTheme);

    useEffect(() => {
        const ws = new WebSocket('ws://localhost:42001');
        ws.onopen = () => {
            console.log('🟢 WebSocket подключен');
            // Запрашиваем актуальную тему у сервера
            ws.send(JSON.stringify({ channel: 'theme:get' }));
        };
        ws.onmessage = event => {
            const { channel, payload } = JSON.parse(event.data);

            switch (channel) {
                case 'theme:update':
                    setTheme(payload);
                    console.log('Тема обновлена:', payload);
                    break;
                default:
                    console.log('unknown channel', channel, payload);
            }
        }
        ws.onclose = () => console.log('🔴 WebSocket отключен');
        return () => ws.close();
    }, []);

    const message = {
        username: "Пользователь",
        color: "#ffffff",
        htmlBadges: "",
        htmlMessage: "Это пример сообщения в чате.",
    };

    const longMessage = {
        username: "Пользователь",
        color: "#ffffff",
        htmlBadges: "",
        htmlMessage: "Открой волшебный мир Teyvat в Genshin Impact! Собирай команду героев, исследуй потрясающие локации, сражайся с могущественными врагами и раскрывай тайны семи стихий. Бесплатно играй на ПК, PlayStation и мобильных устройствах. Присоединяйся к миллионам игроков по всему миру — начни своё великое приключение уже сегодня! #GenshinImpact #ИграйБесплатно"
    };

    return <ThemeProvider theme={theme}>
        <MessagePreviewContainer>
            <ChatMessage message={message}/>
            <ChatMessage message={longMessage}/>
        </MessagePreviewContainer>

    </ThemeProvider>;

}