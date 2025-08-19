import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import {
    logout,
    openOverlay,
    getAccountInfo,
    getStats,
    reconnect,
    openExternalLink,
    getThemes // Добавляем новый импорт
} from '../../services/api';
import { useNavigate } from 'react-router-dom';
import Marquee from 'react-fast-marquee';
import UserInfoPopup from './UserInfoPopup';
// Импорты иконок
import { FiSettings, FiLogOut, FiExternalLink, FiCopy, FiMessageSquare } from 'react-icons/fi';

const Wrapper = styled.div`
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
`;

const MainArea = styled.div`
    flex: 1;
    display: flex;
    overflow: hidden;
`;

const Content = styled.div`
    flex: 1;
    padding: 36px 24px;
    display: flex;
    flex-direction: column;
    gap: 24px;
    overflow-y: auto;
`;

const Section = styled.section`
    background: #2e2e2e;
    border-radius: 10px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
`;

const SectionTitle = styled.h3`
    margin: 0;
    font-size: 1.2rem;
    font-weight: 600;
    color: #fff;
    border-bottom: 1px solid #444;
    padding-bottom: 6px;
`;

const ButtonsRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 10px;

    button {
        background: #444;
        border: none;
        color: #fff;
        padding: 8px 14px;
        border-radius: 6px;
        cursor: pointer;
        transition: background 0.2s;
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 14px;
        
        svg {
            width: 16px;
            height: 16px;
        }
    }
    button:hover {
        background: #555;
    }
`;

// Новые стили для группы кнопка + селектор
const LinkGroup = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: #383838;
    border-radius: 8px;
    border: 1px solid #555;
    
    &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        width: 3px;
        height: 100%;
        background: #666;
        border-radius: 1.5px;
    }
    
    position: relative;
    padding-left: 12px;
`;

const LinkButton = styled.button`
    background: #4a4a4a !important;
    margin: 0 !important;
    display: flex !important;
    align-items: center !important;
    gap: 6px !important;
    
    &:hover {
        background: #5a5a5a !important;
    }
    
    svg {
        width: 16px !important;
        height: 16px !important;
    }
`;

const ThemeSelector = styled.select`
    background: #2a2a2a;
    color: #fff;
    border: 1px solid #555;
    border-radius: 4px;
    padding: 6px 8px;
    font-size: 12px;
    cursor: pointer;
    min-width: 120px;
    
    &:hover {
        background: #333;
        border-color: #666;
    }
    
    &:focus {
        outline: none;
        border-color: #777;
        background: #333;
    }
    
    option {
        background: #2a2a2a;
        color: #fff;
    }
`;

const ThemeLabel = styled.span`
    font-size: 11px;
    color: #999;
    white-space: nowrap;
`;

const AccountRow = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
`;

const AccountInfo = styled.div`
    flex: 1;
`;

const AccountActions = styled.div`
    display: flex;
    gap: 8px;
`;

const IconButton = styled.button`
    background: #444 !important;
    border: none !important;
    color: #fff !important;
    padding: 8px 14px !important;
    border-radius: 6px !important;
    cursor: pointer !important;
    transition: background 0.2s !important;
    display: flex !important;
    align-items: center !important;
    gap: 6px !important;
    font-size: 14px !important;

    &:hover {
        background: #555 !important;
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;

const LogoutButton = styled(IconButton)`
    background: #664444 !important;

    &:hover {
        background: #775555 !important;
    }
`;

const Avatar = styled.img`
    width: 56px;
    height: 56px;
    border-radius: 50%;
`;

const LogPanel = styled.div`
    width: 280px;
    background: #1a1a1a;
    border-left: 1px solid #333;
    display: flex;
    flex-direction: column;
    font-size: 12px;
    color: #ccc;
`;

const LogHeader = styled.div`
    background: #222;
    padding: 6px 10px;
    font-weight: bold;
    border-bottom: 1px solid #333;
`;

const LogContent = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const LogLine = styled.div`
    white-space: pre-wrap;
    word-break: break-word;

    span.username {
        color: #4ea1ff;
        font-weight: bold;
        cursor: pointer;
    }
`;

const StatusBlock = styled.div`
    position: absolute;
    right: 12px;
    bottom: 40px;
    background: #2e2e2e;
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    border: 1px solid #444;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    opacity: 0.7;
    transition: opacity 0.2s ease;
    &:hover {
        opacity: 1;
    }
`;

const Footer = styled.div`
    height: 28px;
    background: #1e1e1e;
    color: white;
    font-size: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    overflow: hidden;
`;

const Version = styled.span`
    width: 80px;
    text-align: start;
    font-size: 12px;
    color: #b0b0b0;
    white-space: nowrap;
    overflow: hidden;
    padding-right: 6px;
`;

export default function Dashboard() {
    const navigate = useNavigate();
    const called = useRef(false);
    const [account, setAccount] = useState(null);
    const [stats, setStats] = useState({ startTime: Date.now(), lastEventSub: Date.now(), lastIRC: Date.now() });
    const [logs, setLogs] = useState([]);
    const logPanelRef = useRef(null);

    const [userInfoPopup, setUserInfoPopup] = useState({ id: '', open: false });

    // Новое состояние для тем
    const [themes, setThemes] = useState({});
    const [selectedTheme, setSelectedTheme] = useState('');

    const openUserInfoPopup = (userId, userName) => {
        setUserInfoPopup({ id: userId, userName: userName, open: true });
    };

    const streamers = [
        'ellis_leaf',
        'kururun_chan',
        'fox1k_ru',
        'sonamint',
        'kigudi',
        'kurosakissora',
        'qvik_l'
    ];

    useEffect(() => {
        if (logPanelRef.current) {
            logPanelRef.current.scrollTop = logPanelRef.current.scrollHeight;
        }
    }, [logs]);

    const handleLogout = async () => {
        await logout();
        navigate('/auth', { replace: true });
    };

    const handleOpenOverlay = () => {
        openOverlay();
    };

    const openPlayer1 = () => {
        openExternalLink('http://localhost:5173/audio-modern');
    };

    const openPlayer2 = () => {
        openExternalLink('http://localhost:5173/audio');
    };


    const handlerOpenSettings = () => {
        navigate('/settings', { replace: false });
    };

    const handleCopyChatLink = () => {
        let chatUrl = 'http://localhost:5173/chat-overlay';

        // Добавляем параметр темы, если выбрана
        if (selectedTheme) {
            const encodedTheme = encodeURIComponent(selectedTheme);
            chatUrl += `?theme=${encodedTheme}`;
        }

        navigator.clipboard.writeText(chatUrl).catch(console.error);
    };

    useEffect(() => {
        if (!called.current) {
            called.current = true;
            getAccountInfo().then(info => {
                const { accountInfo } = info;
                setAccount(accountInfo);
                document.title = `Оверлеешная - ${accountInfo.displayName || accountInfo.login}`;
            });

            // Загружаем темы
            getThemes().then(response => {
                const { themes, currentThemeName } = response;
                // Проверяем, что themes - это объект
                if (themes && typeof themes === 'object') {
                    setThemes(themes);
                } else {
                    console.warn('Темы не являются объектом:', themes);
                    setThemes({});
                }
                setSelectedTheme(currentThemeName || '');
            }).catch(err => {
                console.error('Ошибка загрузки тем:', err);
                setThemes({}); // На случай ошибки устанавливаем пустой объект
            });
        }
        const update = async () => {
            const s = await getStats();
            if (s) setStats(s);
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const ws = new WebSocket('ws://localhost:42001');
        ws.onopen = () => ws.send(JSON.stringify({ channel: 'log:get' }));
        ws.onmessage = (event) => {
            const { channel, payload } = JSON.parse(event.data);
            if (channel === 'log:updated') setLogs(payload.logs);
        };
        return () => ws.close();
    }, []);

    const now = Date.now();
    const uptime = now - stats.startTime;
    const sinceEventSub = now - stats.lastEventSub;
    const sinceIRC = now - stats.lastIRC;

    const formatDuration = (ms) => {
        const totalSeconds = Math.floor(ms / 1000);
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
    };

    const eventSubColor = sinceEventSub > 120000 ? 'red' : sinceEventSub > 30000 ? 'yellow' : '#b0b0b0';
    const ircColor = sinceIRC > 360000 ? 'red' : sinceIRC > 300000 ? 'yellow' : '#b0b0b0';

    const handleReconnect = () => reconnect();

    return (
        <Wrapper>
            {userInfoPopup.open && (
                <UserInfoPopup
                    userId={userInfoPopup.id}
                    userName={userInfoPopup.userName}
                    onClose={() => setUserInfoPopup({ id: '', open: false, userName: '' })}
                />
            )}
            <MainArea>
                <Content>
                    <Section>
                        <SectionTitle>Аккаунт</SectionTitle>
                        {account ? (
                            <AccountRow>
                                <Avatar src={account.avatar} alt="avatar" />
                                <AccountInfo>
                                    <div>{account.displayName || account.login}</div>
                                    <div>Фолловеров: {account.followerCount}</div>
                                </AccountInfo>
                                <AccountActions>
                                    <IconButton onClick={handlerOpenSettings}>
                                        <FiSettings />
                                        Настройки
                                    </IconButton>
                                    <LogoutButton onClick={handleLogout}>
                                        <FiLogOut />
                                        Выйти
                                    </LogoutButton>
                                </AccountActions>
                            </AccountRow>
                        ) : (
                            <p>Загрузка информации...</p>
                        )}
                    </Section>

                    <Section>
                        <SectionTitle>Оверлей</SectionTitle>
                        <ButtonsRow>
                            <button onClick={handleOpenOverlay}>
                                <FiExternalLink />
                                Открыть чат
                            </button>
                            <LinkGroup>
                                <LinkButton onClick={handleCopyChatLink}>
                                    <FiCopy />
                                    Скопировать ссылку
                                </LinkButton>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <ThemeLabel>тема:</ThemeLabel>
                                    <ThemeSelector
                                        value={selectedTheme}
                                        onChange={(e) => setSelectedTheme(e.target.value)}
                                    >
                                        <option value="">По умолчанию</option>
                                        {themes && Object.keys(themes).map((themeName) => (
                                            <option key={themeName} value={themeName}>
                                                {themeName}
                                            </option>
                                        ))}
                                    </ThemeSelector>
                                </div>
                            </LinkGroup>
                        </ButtonsRow>
                    </Section>
                    <Section>
                        <SectionTitle>Плееры</SectionTitle>
                        <ButtonsRow>
                            <button onClick={openPlayer1}>
                                <FiExternalLink/>
                                Открыть Плеер-карточку
                            </button>
                            <button onClick={openPlayer2}>
                                <FiExternalLink/>
                                Открыть плеер-пластинку
                            </button>
                        </ButtonsRow>
                    </Section>
                </Content>

                <LogPanel>
                    <LogHeader>Логи</LogHeader>
                    <LogContent ref={logPanelRef}>
                    {logs.map((log, index) => (
                            <LogLine key={index}>
                                [{new Date(log.timestamp).toLocaleTimeString()}]{' '}
                                {log.userName && (
                                    <span
                                        className="username"
                                        onClick={() => openUserInfoPopup(log.userId, log.userName)}
                                    >
                                        {log.userName}
                                    </span>
                                )}
                                {log.userName ? ': ' : ''}
                                {log.message}
                            </LogLine>
                        ))}
                    </LogContent>
                </LogPanel>
            </MainArea>

            <StatusBlock>
                <span style={{ color: '#b0b0b0' }}>Аптайм: {formatDuration(uptime)}</span>
                <span style={{ color: eventSubColor }}>EventSub: {formatDuration(sinceEventSub)}</span>
                <span style={{ color: ircColor }}>IRC: {formatDuration(sinceIRC)}</span>
                <button onClick={handleReconnect}>Reconnect</button>
            </StatusBlock>

            <Footer>
                <Marquee style={{ fontSize: '14px' }}>
                    Бета-тест:&nbsp;
                    {streamers.map((name, index) => (
                        <React.Fragment key={name}>
                            <span
                                onClick={() => openExternalLink(`https://twitch.tv/${name}`)}
                                style={{
                                    cursor: 'pointer',
                                    textDecoration: 'underline',
                                    marginRight: '0.5em',
                                    color: '#9147ff'
                                }}
                            >
                                {name}
                            </span>
                            {index < streamers.length - 1 && ','}&nbsp;
                        </React.Fragment>
                    ))}
                </Marquee>
                <Version>v0.4.2-beta</Version>
            </Footer>
        </Wrapper>
    );
}