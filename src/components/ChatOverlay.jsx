import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import styled, { createGlobalStyle, ThemeProvider } from 'styled-components';
import ChatMessage from './ChatMessage';
import ChatFollow from './ChatFollow';
import ChatRedemption from './ChatRedemption';
import { defaultTheme } from '../theme';

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

    /* По желанию: плавное появление opacity у нового сообщения */
    .chat-animated {
        animation: fadeIn 300ms ease-out forwards;
    }
    @keyframes fadeIn {
        from { opacity: 0; }
        to   { opacity: 1; }
    }
`;


const BackgroundContainer = styled.div`
    position: absolute;
    z-index: -1;
    background: ${({ theme }) => {
        switch (theme.overlay?.backgroundType ?? "none") {
            case 'none':
                return 'transparent';
            case 'color':
                return theme.overlay?.backgroundColor || 'transparent';
            case 'image':
                return `url(${theme.overlay?.backgroundImage}) no-repeat center / cover`;
            default:
                return 'transparent';
        }
    }};
    ${({ theme }) =>
            theme.overlay?.backgroundType === 'image' && theme.overlay?.backgroundImageAspectRatio
                    ?
                    `
            aspect-ratio: ${theme.overlay.backgroundImageAspectRatio};
            width: ${theme.overlay.containerWidth || 500}px;
        `
                    : ''}
`;


const ChatContainer = styled.div`
    box-sizing: border-box;
    color: #fff;
    overflow-y: auto;
    font-family: Arial, sans-serif;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;

    border-radius: ${({ theme }) => theme.overlay?.borderRadius || 0}px;
    
    margin: ${({ theme }) => {
        return `${theme.overlay?.paddingTop || 0}px  0px 0px ${theme.overlay?.paddingLeft || 0}px`;
    }};

    ${({ theme }) =>
            theme.overlay?.backgroundType === 'image' && theme.overlay?.backgroundImageAspectRatio
                    ?
                    `
            width: ${(theme.overlay.chatWidth || 500)}px;
            height: ${(theme.overlay.chatHeight || 500)}px;
        `
                    : ''}
    &::-webkit-scrollbar {
        width: 0 !important;
        height: 0 !important;
    }
`;

export default function ChatOverlay() {
    const chatRef = useRef(null);
    const [messages, setMessages] = useState([]);
    const [theme, setTheme] = useState(defaultTheme);

    // Здесь храним рефы для каждого сообщения
    const messageRefs = useRef({});
    // Храним ID «последнего» сообщения после прошлого рендера
    const prevLastIdRef = useRef(null);

    useEffect(() => {
        const ws = new WebSocket('ws://localhost:42001');
        ws.onopen = () => {
            console.log('🟢 WebSocket подключен');
            ws.send(JSON.stringify({ channel: 'theme:get' }));
        };
        ws.onmessage = event => {
            const { channel, payload } = JSON.parse(event.data);
            switch (channel) {
                case 'chat:messages':
                    const initial = payload
                        .map(m => ({ ...m, type: m.type || 'chat' }));
                    setMessages(initial);
                    break;
                case 'theme:update':
                    setTheme(payload);
                    break;
                default:
                    console.log('unknown channel', channel, payload);
            }
        };
        ws.onclose = () => console.log('🔴 WebSocket отключен');
        return () => ws.close();
    }, []);

    /**
     * В useLayoutEffect мы сравниваем ID предыдущего «последнего» сообщения
     * с текущим «последним». Если они разные, значит — новое сообщение,
     * и тогда:
     *   1) Скрытое элементом messageRefs измеряем его высоту
     *   2) Сразу делаем chatContainer translateY(thisHeight) без transition
     *   3) Убираем у нового сообщения visibility:hidden и запускаем у chatContainer
     *      transition: transform 300ms ease → transform: translateY(0)
     *   4) Через 300мс сбрасываем служебные inline-стили
     *
     * Если ID прежнего и нового совпадают (или сообщений нет) → просто скроллим вниз.
     */
    useLayoutEffect(() => {
        const chat = chatRef.current;
        if (!chat) return;

        // Если в текущий момент нет сообщений, просто скроллим вниз и сбрасываем prevLastId
        if (messages.length === 0) {
            chat.scrollTop = chat.scrollHeight;
            prevLastIdRef.current = null;
            return;
        }

        // Смотрим ID «последнего» элемента
        const lastMsg = messages[messages.length - 1];
        const currLastId = lastMsg.id ?? `idx_${messages.length - 1}`;

        // Если ID изменился (или был null раньше) → анимируем «въезд»
        if (prevLastIdRef.current !== currLastId) {
            // Убедимся, что есть реф
            if (!messageRefs.current[currLastId]) {
                messageRefs.current[currLastId] = React.createRef();
            }
            const msgNode = messageRefs.current[currLastId].current;
            if (!msgNode) {
                // вдруг ноды нет — просто скроллим вниз и запоминаем ID
                chat.scrollTop = chat.scrollHeight;
                prevLastIdRef.current = currLastId;
                return;
            }

            // 1) Измеряем высоту «нового» скрытого сообщения
            const newHeight = msgNode.getBoundingClientRect().height;

            // 2) Сдвигаем chatContainer вниз на эту высоту без анимации
            chat.style.transition = 'none';
            chat.style.transform = `translateY(${newHeight}px)`;

            // Форсим reflow, чтобы браузер зафиксировал transform=translateY(newHeight)
            // eslint-disable-next-line no-unused-expressions
            chat.offsetHeight;

            // 3) Показываем сообщение и (опционально) даём ему класс .chat-animated для fadeIn
            msgNode.style.visibility = '';
            msgNode.classList.add('chat-animated');

            // 4) Включаем анимацию контейнера и возвращаем transform → 0
            chat.style.transition = 'transform 300ms ease';
            chat.style.transform = 'translateY(0)';

            // 5) Через 300мс убираем вспомогательные свойства
            setTimeout(() => {
                chat.style.transition = '';
                chat.style.transform = '';
                msgNode.classList.remove('chat-animated');
            }, 300);
        } else {
            // ID не поменялся — просто скроллим в самый низ
            chat.scrollTop = chat.scrollHeight;
        }

        // Запоминаем текущий ID последнего
        prevLastIdRef.current = currLastId;
    }, [messages]);

    return (
        <ThemeProvider theme={theme}>
            <GlobalStyle />
            <BackgroundContainer />
            <ChatContainer ref={chatRef}>
                {messages.map((msg, idx) => {
                    // Определяем «уникальный» ID для рефа
                    const id = msg.id ?? `idx_${idx}`;
                    if (!messageRefs.current[id]) {
                        messageRefs.current[id] = React.createRef();
                    }
                    const nodeRef = messageRefs.current[id];

                    // Теперь isLatest = просто «последний элемент + он не совпадает с prevLastId»
                    const isLatest = idx === messages.length - 1
                        && prevLastIdRef.current !== id;

                    // Если isLatest, изначально скрываем его, чтобы замерить высоту
                    const styleForVisibility = isLatest
                        ? { visibility: 'hidden' }
                        : {};

                    // Выбираем, какой компонент рендерить
                    let Content;
                    if (msg.type === 'chat') {
                        Content = <ChatMessage message={msg} />;
                    } else if (msg.type === 'follow') {
                        Content = <ChatFollow message={msg} />;
                    } else if (msg.type === 'redemption') {
                        Content = <ChatRedemption
                            message={msg}
                            template={theme.redeemMessage.template}
                        />;
                    } else {
                        return null;
                    }

                    return (
                        <div key={id} ref={nodeRef} style={styleForVisibility}>
                            {Content}
                        </div>
                    );
                })}
            </ChatContainer>
        </ThemeProvider>
    );
}
