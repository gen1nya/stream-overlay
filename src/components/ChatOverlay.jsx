import React, {useEffect, useRef, useState} from 'react';
import styled, {createGlobalStyle} from 'styled-components';
import ChatMessage from './ChatMessage';
import ChatFollow from './ChatFollow';
import ChatRedemption from './ChatRedemption';

const showSystemEvents = false;

const GlobalStyle = createGlobalStyle`
    html, body, #root {
        margin: 0;
        padding: 0;
        background: transparent !important;
        overflow: hidden;
    }
`;

const ChatContainer = styled.div`
    width: 100%;
    height: 720px;
    background-color: transparent;
    color: #fff;
    padding: 10px;
    overflow-y: scroll;
    font-family: Arial, sans-serif;
`;

export default function ChatOverlay() {
    const [messages, setMessages] = useState([]);

    function proceedChatMessage(channel, payload) {
        switch (payload.type) {
            case 'system':
                if (showSystemEvents) {
                    setMessages(prev => [...prev, { ...payload, type: 'chat' }]);
                }
                break;
            case 'chat':
                setMessages(prev => [...prev, { ...payload, type: 'chat' }]);
                break;
            default:
                console.log("unknown payload type", payload);
        }
    }

    useEffect(() => {
        const ws = new WebSocket('ws://localhost:42001');


        ws.onopen = () => {
            console.log('🟢 WebSocket подключен');
        };

        ws.onmessage = (event) => {
            const { channel, payload } = JSON.parse(event.data);

            switch (channel) {
                case 'event:follow':
                    setMessages(prev => [...prev, { ...payload, type: 'follow' }]);
                    break;
                case 'event:redemption':
                    setMessages(prev => [...prev, { ...payload, type: 'redemption' }]);
                    break;

                case 'chat:message':
                    proceedChatMessage(channel, payload);
                    break;
                default:
                    console.log("unknown channel", channel, payload)
            }
        };

        ws.onclose = () => {
            console.log('🔴 WebSocket отключен');
        };

        return () => {
            ws.close();
        };
    }, []);


    return (
        <>
        <GlobalStyle/>
        <ChatContainer>
            {messages.map((msg, index) => {
                switch (msg.type) {
                    case 'chat':
                        return <ChatMessage key={index} message={msg} />;
                    case 'follow':
                        return <ChatFollow key={index} message={msg} />;
                    case 'redemption':
                        return <ChatRedemption key={index} message={msg} />;
                    default:
                        return null; // Пропускаем неизвестные типы
                }
            })}
        </ChatContainer>
        </>
    );
}