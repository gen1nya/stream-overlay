import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import {
    logout,
    openOverlay,
    getAccountInfo,
    getStats,
    reconnect,
    openExternalLink,
    openTerminal,
    onLogout,
    onAccountUpdated,
    openBackendLogs,
    setChatGameMode,
    getChatGameMode
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
    FiMonitor,
    FiUsers,
    FiUser,
    FiLayout,
    FiMessageCircle,
    FiGrid,
} from 'react-icons/fi';
import ConnectionStatus from './ConnectionStatus';
import {Row} from "./SettingsComponent";
import {Spacer} from "../utils/Separator";
import TwitchUsersPopup from "./TwitchUsersPopup";
import {OnlineIndicator} from "../utils/OnlineIndicator";
import {HeaderActions, HeaderLeft, HeaderTitle, ThemeIndicator} from "./SharedStyles";
import { APP_VERSION } from "../../config/version";
import HolidayHeader from "../seasonal/HolidayHeader";
import {AiFillRobot} from "react-icons/ai";
import {ActionButton, CardContent, CardHeader, CardTitle, SettingsCard} from "./settings/SharedSettingsStyles";
import { tokens } from "../../designSystem/tokens";
import Button from "../../designSystem/components/Button";
import { FeatureContext } from "../../designSystem/FeatureContext";
import Switch from "../utils/Switch";
import BotConfigPopup from "./settings/BotConfigPopup";
import ThemePopup from "./settings/ThemePopup";
import ChatStatsPopup from "./ChatStatsPopup";
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
    background: ${tokens.color.bg.base};
`;

const MainArea = styled.div`
    flex: 1;
    display: flex;
    overflow: hidden;
`;

const Content = styled.div`
    flex: 1;
    padding: 0 0 ${tokens.space.xxxl} 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow-y: auto;
`;

const ButtonsRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 10px;
`;

const ThemeSelector = styled.select`
    background: ${tokens.color.bg.raised};
    color: ${tokens.color.text.primary};
    border: 1px solid ${tokens.color.border.strong};
    border-radius: ${tokens.radius.sm};
    padding: 6px ${tokens.space.sm};
    font-size: 12px;
    cursor: pointer;
    min-width: 120px;

    &:hover {
        background: ${tokens.color.bg.raisedAlt};
        border-color: #666;
    }

    &:focus {
        outline: none;
        border-color: #777;
        background: ${tokens.color.bg.raisedAlt};
    }

    option {
        background: ${tokens.color.bg.raised};
        color: ${tokens.color.text.primary};
    }
`;

const ThemeLabel = styled.span`
    font-size: 11px;
    color: ${tokens.color.text.muted};
    white-space: nowrap;
`;

const GameModeToggle = styled.div`
    display: flex;
    align-items: center;
    gap: ${tokens.space.sm};
    padding: 6px ${tokens.space.md};
    background: ${({ $isActive }) => $isActive ? tokens.color.success.soft : tokens.color.bg.raised};
    border-radius: ${tokens.radius.lg};
    border: 1px solid ${({ $isActive }) => $isActive ? tokens.color.success.softBorder : tokens.color.border.strong};
    transition: ${tokens.transition.base};

    svg {
        width: 16px;
        height: 16px;
        color: ${({ $isActive }) => $isActive ? tokens.color.success.base : tokens.color.text.muted};
    }
`;

const GameModeLabel = styled.span`
    font-size: 13px;
    color: ${({ $isActive }) => $isActive ? tokens.color.success.base : tokens.color.text.tertiary};
    white-space: nowrap;
`;

const AccountRow = styled.div`
    display: flex;
    align-items: center;
    gap: ${tokens.space.lg};
`;

const AccountInfo = styled.div`
    flex: 1;
`;

const AccountActions = styled.div`
    display: flex;
    gap: ${tokens.space.sm};
`;

// Кнопка выхода — danger-вариант DS Button (muted raised glow).
const LogoutButton = styled(Button).attrs({ $variant: 'danger' })``;

const Avatar = styled.img`
    width: 56px;
    height: 56px;
    border-radius: ${tokens.radius.circle};
`;

const DashboardCard = styled(SettingsCard)`
    width: calc(100% - 42px);
    margin-right: ${tokens.space.xl};
    margin-left: ${tokens.space.xl};
`;

const CardsRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    margin: 0 21px;
    gap: ${tokens.space.lg};
    width: calc(100% - 42px);
`;

const HalfCard = styled(SettingsCard)`
    flex: 1;
    min-width: 400px;
    margin: ${tokens.space.md} 0 0 0;
`;

const DashboardCardHeader = styled(CardHeader)`
    padding: ${tokens.space.md} ${tokens.space.xl};
`

const LogPanel = styled.div`
    width: 280px;
    background: ${tokens.color.bg.base};
    border-left: 1px solid ${tokens.color.border.subtle};
    display: flex;
    flex-direction: column;
    font-size: 12px;
    color: ${tokens.color.text.tertiary};
`;

const LogHeader = styled.div`
    background: #222;
    padding: 6px 10px;
    font-weight: bold;
    border-bottom: 1px solid ${tokens.color.border.subtle};
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

// Компактная утилитарная кнопка логов на DS-примитиве (ghost, мелкий шрифт).
const BackendLogsButton = styled(Button).attrs({ $variant: 'ghost', $size: 'sm' })`
    padding: ${tokens.space.xs} ${tokens.space.sm};
    font-size: 11px;
    font-weight: ${tokens.font.weight.regular};
`;

const LogContent = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: ${tokens.space.sm};
    display: flex;
    flex-direction: column;
    gap: ${tokens.space.xs};
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

const Footer = styled.div`
    height: 28px;
    background: ${tokens.color.bg.surface};
    color: white;
    font-size: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    overflow: hidden;
`;

const Version = styled.span`
    width: 60px;
    text-align: start;
    padding: 0 6px;
    font-size: 12px;
    color: #b0b0b0;
    white-space: nowrap;
    overflow: hidden;
`;

const AccountName = styled.div`
    font-size: 18px;
    font-weight: bold;
    color: ${tokens.color.text.primary};
`;

const FollowersCounter = styled.div`
    color: #a580ff;
    cursor: pointer;
    font-size: ${tokens.font.size.base};
    transition: color 0.2s;

    &:hover {
        color: #8553f2;
    }
`;

const ChatStatsBadge = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: ${tokens.space.xs};
    height: 20px;
    padding: ${tokens.space.xs} 10px;
    background: ${tokens.color.bg.raised};
    border: 1px solid ${tokens.color.border.default};
    border-radius: ${tokens.radius.lg};
    font-size: ${tokens.font.size.xs};
    color: ${tokens.color.text.tertiary};
    cursor: pointer;
    transition: ${tokens.transition.base};
    white-space: nowrap;

    &:hover {
        border-color: ${tokens.color.accent.primary};
        color: ${tokens.color.text.primary};
        background: ${tokens.color.bg.raisedAlt};
    }

    svg {
        width: 12px;
        height: 12px;
        color: ${tokens.color.accent.primary};
    }

    .separator {
        color: ${tokens.color.border.strong};
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
    const [isGameMode, setIsGameMode] = useState(false);
    const [chatStats, setChatStats] = useState(null);
    const [showChatStatsPopup, setShowChatStatsPopup] = useState(false);

    // Load initial game mode state
    useEffect(() => {
        getChatGameMode().then(state => {
            setIsGameMode(state ?? false);
        });
    }, []);

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

    const handleGameModeToggle = async (e) => {
        const newState = e.target.checked;
        const success = await setChatGameMode(newState);
        if (success) {
            setIsGameMode(newState);
        }
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

        // Подписываемся на обновления аккаунта через IPC callback
        onAccountUpdated((data) => {
            console.log('Account updated via IPC:', data);
            if (data.accountInfo) {
                setAccount(data.accountInfo);
            }
        });

        // Также пытаемся загрузить сразу (fallback если данные уже готовы)
        if (!called.current) {
            called.current = true;
            getAccountInfo().then(info => {
                const { accountInfo } = info;
                if (accountInfo) {
                    setAccount(accountInfo);
                }
            }).catch(err => {
                console.warn('Failed to get account info immediately:', err);
                // Не критично, данные придут через callback
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
            send({channel: 'chat-stats:get'});
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

        // Подписка на статистику чата
        const unsubscribeChatStats = subscribe('chat-stats:update', (payload) => {
            setChatStats(payload);
        });

        return () => {
            unsubscribeBroadcasting();
            unsubscribeLogs();
            unsubscribeChatStats();
        };
    }, [isConnected, send, subscribe]);

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
            {showChatStatsPopup && (
                <ChatStatsPopup
                    onClose={() => setShowChatStatsPopup(false)}
                    chatStats={chatStats}
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
                    <HolidayHeader>
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
                    </HolidayHeader>
                    {/* Единый «general»-тинт карточек дашборда (как страница general
                        в настройках) — тем же путём через FeatureContext. */}
                    <FeatureContext.Provider value="general">
                    <DashboardCard>
                        <DashboardCardHeader>
                            <CardTitle>
                                <FiUser />
                                {t('dashboard.cards.account.title')}
                                <OnlineIndicator
                                    $isOnline={isOnline}
                                    title={isOnline ? t('dashboard.cards.account.status.online') : t('dashboard.cards.account.status.offline')}
                                >
                                    <span className="live-name">LIVE</span>
                                </OnlineIndicator>
                                <ChatStatsBadge onClick={() => setShowChatStatsPopup(true)}>
                                    <FiUsers size={12} />
                                    {chatStats?.currentChatters ?? 0}
                                </ChatStatsBadge>
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

                    <CardsRow>
                        <HalfCard>
                            <DashboardCardHeader>
                                <CardTitle>
                                    <FiLayout />
                                    {t('dashboard.cards.overlay.title')}
                                </CardTitle>
                            </DashboardCardHeader>
                            <CardContent>
                                <ButtonsRow>
                                    <Button $variant="neutral" onClick={handleCopyChatLink}>
                                        <FiCopy />
                                        {t('dashboard.cards.overlay.copyLink')}
                                    </Button>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <ThemeLabel>{t('dashboard.cards.overlay.themeLabel')}:</ThemeLabel>
                                        <ThemeSelector
                                            value={selectedThemeName}
                                            onChange={(e) => setSelectedThemeName(e.target.value)}
                                        >
                                            <option value="">{t('dashboard.cards.overlay.defaultThemeOption')}</option>
                                            {themes && Object.keys(themes).map((themeName) => (
                                                <option key={themeName} value={themeName}>
                                                    {themeName}
                                                </option>
                                            ))}
                                        </ThemeSelector>
                                    </div>
                                </ButtonsRow>
                            </CardContent>
                        </HalfCard>

                        <HalfCard>
                            <DashboardCardHeader>
                                <CardTitle>
                                    <FiMessageCircle />
                                    {t('dashboard.cards.chatWindow.title')}
                                </CardTitle>
                            </DashboardCardHeader>
                            <CardContent>
                                <ButtonsRow>
                                    <Button $variant="neutral" onClick={handleOpenOverlay}>
                                        <FiExternalLink />
                                        {t('dashboard.cards.chatWindow.open')}
                                    </Button>
                                    <GameModeToggle $isActive={isGameMode}>
                                        <FiMonitor />
                                        <GameModeLabel $isActive={isGameMode}>
                                            {t('dashboard.cards.chatWindow.gameMode')}
                                        </GameModeLabel>
                                        <Switch
                                            checked={isGameMode}
                                            onChange={handleGameModeToggle}
                                        />
                                    </GameModeToggle>
                                </ButtonsRow>
                            </CardContent>
                        </HalfCard>
                    </CardsRow>
                    <DashboardCard>
                        <DashboardCardHeader>
                            <CardTitle>
                                <FiGrid />
                                {t('dashboard.cards.widgets.title')}
                            </CardTitle>
                        </DashboardCardHeader>
                        <CardContent>
                            <ButtonsRow>
                                <Button $variant="neutral" onClick={openPlayer1}>
                                    <FiExternalLink/>
                                    {t('dashboard.cards.widgets.playerCard')}
                                </Button>
                                <Button $variant="neutral" onClick={openPlayer2}>
                                    <FiExternalLink/>
                                    {t('dashboard.cards.widgets.playerVinyl')}
                                </Button>
                                <Button $variant="neutral" onClick={openFollowersCounter}>
                                    <FiExternalLink/>
                                    {t('dashboard.cards.widgets.followersGoal')}
                                </Button>
                            </ButtonsRow>
                        </CardContent>
                    </DashboardCard>
                    </FeatureContext.Provider>
                </Content>

                <LogPanel>
                    <LogHeader>
                        <span>{t('dashboard.logs.title')}</span>
                        <BackendLogsButton onClick={openBackendLogs}>
                            Backend
                        </BackendLogsButton>
                    </LogHeader>
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

            <Footer>
                <Marquee style={{ fontSize: '14px', flex: 1 }}>
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
                <Version>v{APP_VERSION}</Version>
                <ConnectionStatus stats={stats} onReconnect={reconnect} />
            </Footer>
        </Wrapper>
    );
}
