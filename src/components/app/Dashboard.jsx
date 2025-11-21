import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import {
    logout,
    openOverlay,
    getAccountInfo,
    getStats,
    reconnect,
    openExternalLink,
    openTerminal, onLogout
} from '../../services/api';
import { useNavigate } from 'react-router-dom';
import Marquee from 'react-fast-marquee';
import UserInfoPopup from './UserInfoPopup';
import {
    FiSettings,
    FiLogOut,
    FiExternalLink,
    FiCopy,
    FiLayers,
} from 'react-icons/fi';
import {Row} from "./SettingsComponent";
import {Spacer} from "../utils/Separator";
import TwitchUsersPopup from "./TwitchUsersPopup";
import {OnlineIndicator} from "../utils/OnlineIndicator";
import {Header, HeaderActions, HeaderLeft, HeaderTitle, ThemeIndicator} from "./SharedStyles";
import {AiFillRobot} from "react-icons/ai";
import {ActionButton, CardContent, CardHeader, CardTitle, SettingsCard} from "./settings/SharedSettingsStyles";
import BotConfigPopup from "./settings/BotConfigPopup";
import ThemePopup from "./settings/ThemePopup";
import {useWebSocket} from "../../context/WebSocketContext";
import {useThemeManager} from "../../hooks/useThemeManager";
import {useBotConfig} from "../../hooks/useBotConfig";
import { useTranslation } from 'react-i18next';

const Wrapper = styled.div`
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    background: #1a1a1a;
`;

const MainArea = styled.div`
    flex: 1;
    display: flex;
    overflow: hidden;
`;

const Content = styled.div`
    flex: 1;
    padding: 0 0 36px 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow-y: auto;
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

const DashboardCard = styled(SettingsCard)`
    width: calc(100% - 42px);
    margin-right: 20px;
    margin-left: 20px;
`;

const DashboardCardHeader = styled(CardHeader)`
    padding: 12px 20px;
`

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

const AccountName = styled.div`
    font-size: 18px;
    font-weight: bold;
    color: #fff;
`;

const FollowersCounter = styled.div`
    color: #a580ff;
    cursor: pointer;
    font-size: 14px;
    transition: color 0.2s;

    &:hover {
        color: #8553f2;
    }
`;

export default function Dashboard() {
    const navigate = useNavigate();
    const called = useRef(false);
    const [account, setAccount] = useState(null);
    const [stats, setStats] = useState({ startTime: Date.now(), lastEventSub: Date.now(), lastIRC: Date.now() });
    const [logs, setLogs] = useState([]);
    const logPanelRef = useRef(null);
    const [isOnline, setIsOnline] = useState(false);
    const { t, i18n } = useTranslation();
    const [headerMessage, setHeaderMessage] = useState(null);

    const [userInfoPopup, setUserInfoPopup] = useState({ id: '', open: false });
    const [showUsersPopup, setShowUsersPopup] = useState(false);

    // Используем WebSocket из контекста
    const { send, subscribe, isConnected } = useWebSocket();

    // Используем менеджер тем
    const {
        themes,
        selectedThemeName,
        setSelectedThemeName,
        isThemeSelectorOpen,
        openThemeSelector,
        closeThemeSelector,
        handleExportTheme,
        handleDeleteTheme,
        handleThemeChange,
        handleImportTheme,
        handleCreateTheme,
    } = useThemeManager();

    // Используем менеджер конфигурации бота
    const {
        isBotConfigOpen,
        botName,
        openBotConfig,
        closeBotConfig,
        handleBotChange,
    } = useBotConfig();

    const openUserInfoPopup = (userId, userName) => {
        setUserInfoPopup({ id: userId, userName: userName, open: true });
    };

    const handleOpenUsersPopup = () => {
        setShowUsersPopup(true);
    };

    const handleCloseUsersPopup = () => {
        setShowUsersPopup(false);
    };

    const streamers = useMemo(() => {
        const testers = t('dashboard.betaTesters', { returnObjects: true });
        return Array.isArray(testers) ? testers : [];
    }, [t, i18n.language]);

    const ExternalLink = ({ href, children }) => (
        <span
            onClick={() => openExternalLink(href)}
            style={{
                color: '#9147ff',
                textDecoration: 'underline',
                cursor: 'pointer'
            }}
        >
            {children}
        </span>
    );

    useEffect(() => {
        const messages = t('dashboard.headerMessages', { returnObjects: true });
        if (Array.isArray(messages) && messages.length > 0) {
            setHeaderMessage(messages[Math.floor(Math.random() * messages.length)]);
        } else {
            setHeaderMessage(null);
        }
    }, [t, i18n.language]);

    const renderHeaderContent = useCallback(() => {
        if (!headerMessage) {
            return null;
        }

        if (headerMessage.type === 'text') {
            return headerMessage.text;
        }

        if (headerMessage.type === 'link' && headerMessage.href) {
            return (
                <ExternalLink href={headerMessage.href}>
                    {headerMessage.text}
                </ExternalLink>
            );
        }

        if (headerMessage.type === 'inlineLink' && headerMessage.href) {
            return (
                <span>
                    {headerMessage.text}
                    {' '}
                    <ExternalLink href={headerMessage.href}>
                        {headerMessage.linkText}
                    </ExternalLink>
                    {headerMessage.suffix ? ` ${headerMessage.suffix}` : ''}
                </span>
            );
        }

        if (headerMessage.type === 'action') {
            if (headerMessage.action === 'openTerminal') {
                return (
                    <span
                        onClick={openTerminal}
                        style={{ cursor: 'pointer', textDecoration: 'underline' }}
                    >
                        {headerMessage.text}
                    </span>
                );
            }

            if (headerMessage.action === 'openLink' && headerMessage.href) {
                return (
                    <ExternalLink href={headerMessage.href}>
                        {headerMessage.text}
                    </ExternalLink>
                );
            }
        }

        return headerMessage.text ?? '';
    }, [headerMessage, openTerminal]);

    useEffect(() => {
        if (logPanelRef.current) {
            logPanelRef.current.scrollTop = logPanelRef.current.scrollHeight;
        }
    }, [logs]);

    const handleLogout = async () => {
        await logout();
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

    const openFollowersCounter = () => {
        openExternalLink('http://localhost:5173/new-followers-overlay');
    };

    const handlerOpenSettings = () => {
        navigate('/settings', { replace: false });
    };

    const handleCopyChatLink = () => {
        let chatUrl = 'http://localhost:5173/chat-overlay';

        if (selectedThemeName) {
            const encodedTheme = encodeURIComponent(selectedThemeName);
            chatUrl += `?theme=${encodedTheme}`;
        }

        navigator.clipboard.writeText(chatUrl).catch(console.error);
    };

    useEffect(() => {
        console.log("is ipcRenderer available:", !!window.ipcRenderer);
        onLogout(() => {
            console.log('Logout successful:');
            navigate('/auth', { replace: true });
        });

        if (!called.current) {
            called.current = true;
            getAccountInfo().then(info => {
                const { accountInfo } = info;
                setAccount(accountInfo);
            });
        }
        const update = async () => {
            const s = await getStats();
            if (s) setStats(s);
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [navigate]);

    useEffect(() => {
        if (account) {
            const name = account.displayName || account.login || '';
            document.title = t('dashboard.windowTitle', { name });
        }
    }, [account, t, i18n.language]);

    // Подключаемся к WebSocket и подписываемся на каналы (кроме тем - они в useThemeManager)
    useEffect(() => {
        if (isConnected) {
            send({channel: 'log:get'});
            send({channel: 'status:get_broadcasting'});
        }

        // Подписка на статус трансляции
        const unsubscribeBroadcasting = subscribe('status:broadcasting', (payload) => {
            const { isOnline } = payload;
            console.log('Broadcasting status:', isOnline);
            setIsOnline(isOnline);
        });

        // Подписка на логи
        const unsubscribeLogs = subscribe('log:updated', (payload) => {
            setLogs(payload.logs);
        });

        return () => {
            unsubscribeBroadcasting();
            unsubscribeLogs();
        };
    }, [isConnected, send, subscribe]);

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
            {showUsersPopup && (
                <TwitchUsersPopup
                    onClose={handleCloseUsersPopup}
                />
            )}
            {isBotConfigOpen && (
                <BotConfigPopup
                    onClose={closeBotConfig}
                    onBotChange={handleBotChange}
                />
            )}
            {isThemeSelectorOpen && (
                <ThemePopup
                    onClose={closeThemeSelector}
                    themeList={themes}
                    selectedThemeName={selectedThemeName}
                    onChangeTheme={handleThemeChange}
                    onDeleteTheme={handleDeleteTheme}
                    onExportTheme={handleExportTheme}
                    onImportTheme={handleImportTheme}
                    onCreateTheme={handleCreateTheme}
                />
            )}
            <MainArea>
                <Content>
                    <Header>
                        <HeaderLeft>
                            <HeaderTitle>{renderHeaderContent()}</HeaderTitle>
                        </HeaderLeft>

                        <HeaderActions>
                            <ThemeIndicator onClick={openThemeSelector}>
                                <FiLayers/>
                                {t('common.theme')}: <span className="theme-name">{selectedThemeName}</span>
                            </ThemeIndicator>

                            <ThemeIndicator onClick={openBotConfig}>
                                <AiFillRobot/>
                                {t('common.bot')}: <span className="theme-name">{botName}</span>
                            </ThemeIndicator>

                            <ActionButton onClick={handlerOpenSettings}>
                                <FiSettings/>
                                {t('common.settings')}
                            </ActionButton>

                        </HeaderActions>
                    </Header>
                    <DashboardCard>
                        <DashboardCardHeader>
                            <CardTitle>
                                {t('dashboard.cards.account.title')}
                                <OnlineIndicator
                                    $isOnline={isOnline}
                                    title={isOnline ? t('dashboard.cards.account.status.online') : t('dashboard.cards.account.status.offline')}
                                >
                                    <span className="live-name">LIVE</span>
                                </OnlineIndicator>
                            </CardTitle>
                        </DashboardCardHeader>
                        <CardContent>
                            <Row>
                                {account ? (
                                        <AccountRow>
                                            <Avatar src={account.avatar} alt="avatar" />
                                            <AccountInfo>
                                                <AccountName>{account.displayName || account.login}</AccountName>
                                            <FollowersCounter onClick={handleOpenUsersPopup}>
                                                {t('dashboard.cards.account.followers', { count: account.followerCount })}
                                            </FollowersCounter>
                                            </AccountInfo>
                                        </AccountRow>
                                    ) : (
                                    <p>{t('dashboard.cards.account.loading')}</p>
                                    )}
                                    <Spacer />
                                    <AccountActions>
                                        <LogoutButton onClick={handleLogout}>
                                            <FiLogOut />
                                            {t('common.logout')}
                                        </LogoutButton>
                                    </AccountActions>

                            </Row>
                        </CardContent>
                    </DashboardCard>

                    <DashboardCard>
                        <DashboardCardHeader>
                            <CardTitle>
                                {t('dashboard.cards.chat.title')}
                            </CardTitle>
                        </DashboardCardHeader>
                        <CardContent>
                            <ButtonsRow>
                                <button onClick={handleOpenOverlay}>
                                    <FiExternalLink />
                                    {t('dashboard.cards.chat.open')}
                                </button>
                                <LinkGroup>
                                    <LinkButton onClick={handleCopyChatLink}>
                                        <FiCopy />
                                        {t('dashboard.cards.chat.copyLink')}
                                    </LinkButton>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <ThemeLabel>{t('dashboard.cards.chat.themeLabel')}:</ThemeLabel>
                                        <ThemeSelector
                                            value={selectedThemeName}
                                            onChange={(e) => setSelectedThemeName(e.target.value)}
                                        >
                                            <option value="">{t('dashboard.cards.chat.defaultThemeOption')}</option>
                                            {themes && Object.keys(themes).map((themeName) => (
                                                <option key={themeName} value={themeName}>
                                                    {themeName}
                                                </option>
                                            ))}
                                        </ThemeSelector>
                                    </div>
                                </LinkGroup>
                            </ButtonsRow>
                        </CardContent>
                    </DashboardCard>
                    <DashboardCard>
                        <DashboardCardHeader>
                            <CardTitle>
                            {t('dashboard.cards.widgets.title')}
                            </CardTitle>
                        </DashboardCardHeader>
                        <CardContent>
                            <ButtonsRow>
                                <button onClick={openPlayer1}>
                                    <FiExternalLink/>
                                    {t('dashboard.cards.widgets.playerCard')}
                                </button>
                                <button onClick={openPlayer2}>
                                    <FiExternalLink/>
                                    {t('dashboard.cards.widgets.playerVinyl')}
                                </button>
                                <button onClick={openFollowersCounter}>
                                    <FiExternalLink/>
                                    {t('dashboard.cards.widgets.followersGoal')}
                                </button>
                            </ButtonsRow>
                        </CardContent>
                    </DashboardCard>
                </Content>

                <LogPanel>
                    <LogHeader>{t('dashboard.logs.title')}</LogHeader>
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
                <span style={{ color: '#b0b0b0' }}>{t('dashboard.status.uptime', { duration: formatDuration(uptime) })}</span>
                <span style={{ color: eventSubColor }}>{t('dashboard.status.eventSub', { duration: formatDuration(sinceEventSub) })}</span>
                <span style={{ color: ircColor }}>{t('dashboard.status.irc', { duration: formatDuration(sinceIRC) })}</span>
                <button onClick={handleReconnect}>{t('dashboard.status.reconnect')}</button>
            </StatusBlock>

            <Footer>
                <Marquee style={{ fontSize: '14px' }}>
                    {t('dashboard.footer.betaTest')} &nbsp;
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
                            {index < streamers.length - 1 && '•'}&nbsp;
                        </React.Fragment>
                    ))}
                </Marquee>
                <Version>v0.6.7-beta</Version>
            </Footer>
        </Wrapper>
    );
}