import React, {useEffect, useRef, useState} from 'react';
import styled, {createGlobalStyle, ThemeProvider } from 'styled-components';
import ChatMessage from './ChatMessage';
import ChatFollow from './ChatFollow';
import ChatRedemption from './ChatRedemption';
import { defaultTheme } from '../theme';

const showSystemEvents = false;

const GlobalStyle = createGlobalStyle`
    html, body, #root {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        background: transparent !important;
        overflow: hidden;
    }
`;

const ChatContainer = styled.div`
    width: 100%;
    height: 100%;
    background-color: transparent;
    color: #fff;
    overflow-y: scroll;
    font-family: Arial, sans-serif;
`;


export default function ChatOverlay() {
    const [messages, setMessages] = useState([]);
    const [theme, setTheme] = useState(defaultTheme);   // ← новое состояние темы

    /** Приём обычных чатов, как раньше */
    const proceedChatMessage = payload => {
        if (payload.type === 'system' && !showSystemEvents) return;
        setMessages(prev => [...prev, { ...payload, type: 'chat' }]);
    };

    /** Один WebSocket для всего */
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
                case 'theme:update':          // <- сервер пушит новую тему
                    setTheme(payload);
                    break;

                case 'event:follow':
                    setMessages(prev => [...prev, { ...payload, type: 'follow' }]);
                    break;

                case 'event:redemption':
                    setMessages(prev => [...prev, { ...payload, type: 'redemption' }]);
                    break;

                case 'chat:message':
                    proceedChatMessage(payload);
                    break;

                default:
                    console.log('unknown channel', channel, payload);
            }
        };

        ws.onclose = () => console.log('🔴 WebSocket отключен');
        return () => ws.close();
    }, []);

    return (
        <ThemeProvider theme={theme}>
            <GlobalStyle />
            <ChatContainer>
                {messages.map((msg, i) => {
                    switch (msg.type) {
                        case 'chat':
                            return <ChatMessage key={i} message={msg} />;
                        case 'follow':
                            return <ChatFollow key={i} message={msg} />;
                        case 'redemption':
                            return <ChatRedemption key={i} message={msg} />;
                        default:
                            return null;
                    }
                })}
            </ChatContainer>
        </ThemeProvider>
    );
}