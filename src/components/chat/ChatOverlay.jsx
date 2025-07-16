import React, {
    useLayoutEffect,
    useRef,
    useState,
    useEffect
} from 'react';
import styled, { createGlobalStyle, ThemeProvider } from 'styled-components';
import useReconnectingWebSocket from '../../hooks/useReconnectingWebSocket';
import ChatMessage from './ChatMessage';
import ChatFollow from './ChatFollow';
import ChatRedemption from './ChatRedemption';
import { defaultTheme } from '../../theme';

/* ---------- Global styles ---------- */
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

    .chat-animated {
        animation: fadeIn 300ms ease-out forwards;
    }
    @keyframes fadeIn {
        from { opacity: 0; }
        to   { opacity: 1; }
    }
`;

/* ---------- Background ---------- */
const BackgroundContainer = styled.div`
    position: absolute;
    z-index: -1;
    background: ${({ theme }) => {
        switch (theme.overlay?.backgroundType ?? 'none') {
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
                    ? `
                opacity: ${theme.overlay?.backgroundOpacity || 1};
                aspect-ratio: ${theme.overlay.backgroundImageAspectRatio};
                width: ${theme.overlay.containerWidth || 500}px;
            `
                    : ''}
`;

/* ---------- Chat container ---------- */
const ChatContainer = styled.div`
    box-sizing: border-box;
    color: #fff;
    overflow-y: auto;
    font-family: Arial, sans-serif;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    height: 100%;

    border-radius: ${({ theme }) => theme.overlay?.borderRadius || 0}px;

    margin: ${({ theme }) => `${theme.overlay?.paddingTop || 0}px  0px 0px ${theme.overlay?.paddingLeft || 0}px`};

    ${({ theme }) =>
            theme.overlay?.backgroundType === 'image' && theme.overlay?.backgroundImageAspectRatio
                    ? `
                width: ${theme.overlay.chatWidth || 500}px;
                height: ${theme.overlay.chatHeight || 500}px;
            `
                    : ''}

    &::-webkit-scrollbar {
        width: 0 !important;
        height: 0 !important;
    }
`;

const ConnectionLost = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    color: red;
    background: rgba(0,0,0,0.5);
    z-index: 10;
`;

/* ---------- Helper ---------- */
const getFollowMax = (theme) =>
    Math.max(theme?.followMessage?.length ?? 0, 1);
const getRedeemMax = (theme) =>
    Math.max(theme?.redeemMessage?.length ?? 0, 1);

export default function ChatOverlay() {
    const chatRef = useRef(null);
    const [messages, setMessages] = useState([]);
    const [showSourceChannel, setShowSourceChannel] = useState([]);
    const [theme, setTheme] = useState(defaultTheme);

    /* refs for follow index */
    const followIndexRef = useRef(0);
    const followMaxRef = useRef(getFollowMax(theme));
    const followIndexByIdRef = useRef({});
    /* refs for redeem index */
    const redeemIndexRef = useRef(0);
    const redeemMaxRef = useRef(getRedeemMax(theme));
    const redeemIndexByIdRef = useRef({});

    /* message refs */
    const messageRefs = useRef({});
    const prevLastIdRef = useRef(null);
    const animationTimeoutRef = useRef(null);

    const { isConnected } = useReconnectingWebSocket('ws://localhost:42001', {
        onOpen: (_, socket) => {
            console.log('🟢 WebSocket подключен');
            socket.send(JSON.stringify({ channel: 'theme:get' }));
        },
        onMessage: (event) => {
            const { channel, payload } = JSON.parse(event.data);
            switch (channel) {
                case 'chat:messages': {
                    const { messages = [], showSourceChannel = false } = payload;
                    const initial = messages.map(m => ({ ...m, type: m.type || 'chat' }));
                    setMessages(initial);
                    setShowSourceChannel(showSourceChannel);
                    break;
                }
                case 'theme:update': {
                    setTheme(payload);
                    break;
                }
                default:
                    console.log('unknown channel', channel, payload);
            }
        },
        onClose: () => {
            console.log('🔴 WebSocket отключен');
        },
    });

    /* update followMax on theme change */
    useEffect(() => {
        followMaxRef.current = getFollowMax(theme);
        if (followIndexRef.current >= followMaxRef.current) {
            followIndexRef.current = 0;
        }
        redeemMaxRef.current = getRedeemMax(theme);
        if (redeemIndexRef.current >= redeemMaxRef.current) {
            redeemIndexRef.current = 0;
        }
    }, [theme]);

    // Очистка рефов при изменении списка сообщений
    useEffect(() => {
        const currentMessageIds = new Set(messages.map((msg, idx) => msg.id ?? `idx_${idx}`));

        // Удаляем рефы для несуществующих сообщений
        Object.keys(messageRefs.current).forEach(id => {
            if (!currentMessageIds.has(id)) {
                delete messageRefs.current[id];
            }
        });

        // Очищаем индексы для несуществующих сообщений
        Object.keys(followIndexByIdRef.current).forEach(id => {
            if (!currentMessageIds.has(id)) {
                delete followIndexByIdRef.current[id];
            }
        });

        Object.keys(redeemIndexByIdRef.current).forEach(id => {
            if (!currentMessageIds.has(id)) {
                delete redeemIndexByIdRef.current[id];
            }
        });

        // Проверяем, существует ли prevLastId в текущем списке
        if (prevLastIdRef.current && !currentMessageIds.has(prevLastIdRef.current)) {
            prevLastIdRef.current = null;
        }
    }, [messages]);

    /* scroll / animation logic */
    useLayoutEffect(() => {
        const chat = chatRef.current;
        if (!chat) return;

        // Очищаем предыдущий таймаут если он есть
        if (animationTimeoutRef.current) {
            clearTimeout(animationTimeoutRef.current);
            animationTimeoutRef.current = null;
        }

        if (messages.length === 0) {
            chat.scrollTop = chat.scrollHeight;
            prevLastIdRef.current = null;
            return;
        }

        const lastMsg = messages[messages.length - 1];
        const currLastId = lastMsg.id ?? `idx_${messages.length - 1}`;

        if (prevLastIdRef.current !== currLastId) {
            if (!messageRefs.current[currLastId]) {
                messageRefs.current[currLastId] = React.createRef();
            }

            // Используем requestAnimationFrame для более плавной работы
            requestAnimationFrame(() => {
                const msgNode = messageRefs.current[currLastId]?.current;
                if (!msgNode) {
                    chat.scrollTop = chat.scrollHeight;
                    prevLastIdRef.current = currLastId;
                    return;
                }

                const newHeight = msgNode.getBoundingClientRect().height;

                chat.style.transition = 'none';
                chat.style.transform = `translateY(${newHeight}px)`;

                chat.offsetHeight; // force reflow

                msgNode.style.visibility = '';
                msgNode.classList.add('chat-animated');

                chat.style.transition = 'transform 300ms ease';
                chat.style.transform = 'translateY(0)';

                animationTimeoutRef.current = setTimeout(() => {
                    if (chat) {
                        chat.style.transition = '';
                        chat.style.transform = '';
                    }
                    if (msgNode && msgNode.isConnected) {
                        msgNode.classList.remove('chat-animated');
                    }
                    animationTimeoutRef.current = null;
                }, 300);
            });
        } else {
            chat.scrollTop = chat.scrollHeight;
        }

        prevLastIdRef.current = currLastId;
    }, [messages]);

    // Очистка таймаута при размонтировании
    useEffect(() => {
        return () => {
            if (animationTimeoutRef.current) {
                clearTimeout(animationTimeoutRef.current);
            }
        };
    }, []);

    /* ---------- Render ---------- */
    return (
        <ThemeProvider theme={theme}>
            <GlobalStyle />
            <>
                <BackgroundContainer />
                <ChatContainer ref={chatRef}>
                    {messages.map((msg, idx) => {
                        const id = msg.id ?? `idx_${idx}`;
                        if (!messageRefs.current[id]) {
                            messageRefs.current[id] = React.createRef();
                        }
                        const nodeRef = messageRefs.current[id];

                        const isLatest = idx === messages.length - 1 && prevLastIdRef.current !== id;
                        const styleForVisibility = isLatest ? { visibility: 'hidden' } : {};

                        /* follow index logic */
                        let followIndex;
                        if (msg.type === 'follow') {
                            if (!(id in followIndexByIdRef.current)) {
                                followIndexByIdRef.current[id] = followIndexRef.current;
                                followIndexRef.current = (followIndexRef.current + 1) % followMaxRef.current;
                            }
                            followIndex = followIndexByIdRef.current[id];
                        }
                        /* redemption index logic */
                        let redemptionIndex;
                        if (msg.type === 'redemption') {
                            if (!(id in redeemIndexByIdRef.current)) {
                                redeemIndexByIdRef.current[id] = redeemIndexRef.current;
                                redeemIndexRef.current = (redeemIndexRef.current + 1) % redeemMaxRef.current;
                            }
                            redemptionIndex = redeemIndexByIdRef.current[id];
                        }

                        let Content;
                        if (msg.type === 'chat') {
                            Content = <ChatMessage message={msg} showSourceChannel={showSourceChannel} />;
                        } else if (msg.type === 'follow') {
                            Content = <ChatFollow
                                message={msg}
                                currentTheme={theme}
                                index={followIndex}
                            />;
                        } else if (msg.type === 'redemption') {
                            Content = <ChatRedemption
                                message={msg}
                                currentTheme={theme}
                                index={redemptionIndex}
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
                {!isConnected && <ConnectionLost>нет связи с источником</ConnectionLost>}
            </>
        </ThemeProvider>
    );
}