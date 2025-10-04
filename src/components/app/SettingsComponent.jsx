// Settings.js
import React, {useEffect, useState} from 'react';
import styled from 'styled-components';
import {useNavigate} from 'react-router-dom';
import {
    openPreview,
    setRemoteTheme,
    createNewTheme,
    setTheme,
    importTheme,
    deleteTheme,
    openExternalLink,
} from '../../services/api';
import MessageSettingsBlock from "./settings/MessageSettingsBlock";
import FollowSettingsBlock from "./settings/FollowSettingsBlock";
import PlayerSettingsComponent from "./settings/PlayerSettingsComponent";
import {defaultTheme} from '../../theme';
import RedeemPointsBlock from "./settings/RedeemPointsBlock";
import {Sidebar} from "../utils/Sidebar";
import {
    FiAward,
    FiHeart,
    FiMessageCircle,
    FiMusic,
    FiSettings,
    FiArrowLeft,
    FiEye,
    FiLayers,
    FiYoutube,
    FiAlertCircle, FiTarget
} from "react-icons/fi";
import {MediumSecondaryButton, SettingsBlockFull, SettingsBlockHalf, SettingsBlockTitle} from "./settings/SettingBloks";
import ThemePopup from "./settings/ThemePopup";
import ColorPickerPopup from "./settings/ColorPickerPopup";
import AddNewStyleButton from "../utils/AddNewStyleButton";
import {AiFillRobot} from "react-icons/ai";
import Roulette from "./settings/bot/roulette/Roulette";
import PingPongComponent from "./settings/bot/pingpong/PingPongComponent";
import {useTheme} from "../../hooks/useTheme";
import UnifiedSettingsComponent from "./settings/UnifiedSettingsComponent";
import FFTControlComponent from "./settings/FFTControlComponent";
import YouTubeScraperComponent from "./settings/YouTubeScraperComponent";
import Socks5ProxyComponent from "./settings/Socks5ProxyComponent";
import {Spacer} from "../utils/Separator";
import {getCurrentBot, updateBot} from "../../services/botsApi";
import BotConfigPopup from "./settings/BotConfigPopup";
import ModernPlayerSettingsComponent from "./settings/ModernPlayerSettingsComponent";
import FollowersGoalSettingsComponent from "./settings/FollowersGoalSettingsComponent";
import {LuFileStack} from "react-icons/lu";
import {ActionButton, Header, HeaderActions, HeaderLeft, HeaderTitle, ThemeIndicator} from "./SharedStyles";
import {useWebSocket} from "../../context/WebSocketContext";

const Panel = styled.div`
    position: fixed;
    top: 0;
    right: 0;
    width: 100%;
    height: 100vh;
    padding: 0;
    margin: 0;
    background: linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%);
    color: #f6f6f6;
    display: flex;
    flex-direction: column;
    gap: 0;
`;

const BackButton = styled(ActionButton)`
    background: #444;
    border-color: #555;

    &:hover {
        background: #555;
        border-color: #666;
    }
`;

const ContentWrapper = styled.div`
    display: flex;
    flex-direction: row;
    flex: 1;
    min-height: 0;
    box-sizing: border-box;
`;

const MainContainer = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: #171717;
    overflow: hidden;
`;

const ContentHeader = styled.div`
    padding: 10px 24px 10px 24px;
    background: linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%);
    border-bottom: 1px solid #333;
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

const PageTitle = styled.h2`
    font-size: 1.3rem;
    font-weight: 600;
    margin: 10px 0 10px 0;
    color: #fff;
    display: flex;
    align-items: center;
    gap: 12px;

    svg {
        width: 20px;
        height: 20px;
        color: #646cff;
    }
`;

const Content = styled.div`
    display: flex;
    flex: 1;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: space-between;
    align-content: flex-start;
    overflow-y: auto;
    min-height: 0;
    padding: 12px;
    gap: 20px;

    /* Custom scrollbar */

    &::-webkit-scrollbar {
        width: 8px;
    }

    &::-webkit-scrollbar-track {
        background: #1a1a1a;
        border-radius: 4px;
    }

    &::-webkit-scrollbar-thumb {
        background: #444;
        border-radius: 4px;
    }

    &::-webkit-scrollbar-thumb:hover {
        background: #555;
    }
`;

const NoConfigCard = styled.div`
    width: 100%;
    background: #2a2a2a;
    border: 1px solid #444;
    border-radius: 12px;
    padding: 32px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;

    svg {
        width: 48px;
        height: 48px;
        color: #666;
    }

    h3 {
        margin: 0;
        color: #fff;
        font-size: 1.2rem;
        font-weight: 600;
    }

    p {
        margin: 0;
        color: #aaa;
        font-size: 14px;
        line-height: 1.5;
    }
`;

export const Row = styled.div`
    display: flex;
    flex-direction: row;
    align-items: ${({align = "center"}) => align};
    justify-content: ${({justify = "flex-start"}) => justify};
    gap: ${({gap = "0.5rem"}) => gap};
`;

const PageInfoConfig = {
    general: {title: "Общие настройки", icon: <FiSettings/>},
    chat: {title: "Настройки сообщений", icon: <FiMessageCircle/>},
    follow: {title: "Настройки подписок", icon: <FiHeart/>},
    channel_points: {title: "Настройки баллов канала", icon: <FiAward/>},
    bot: {title: "Настройки бота", icon: <AiFillRobot/>},
    players: {title: "Настройки плееров", icon: <FiMusic/>},
    youtube: {title: "Чат ютуба", icon: <FiYoutube/>},
    followers_goal: {title: "Прогресс фоловеров", icon: <FiTarget/>},
};

export default function Settings() {
    const navigate = useNavigate();

    const [isThemeSelectorOpen, setIsThemeSelectorOpen] = React.useState(false);
    const [selectedTheme, setSelectedTheme] = useTheme(defaultTheme);
    const [selectedThemeName, setSelectedThemeName] = React.useState("default");
    const [themeList, setThemeList] = React.useState({});

    // Bot config state
    const [isBotConfigOpen, setIsBotConfigOpen] = useState(false);
    const [botName, setBotName] = useState('');
    const [botConfig, setBotConfig] = useState(null);

    const [drawerOpen, setDrawerOpen] = useState(true);
    const [activePage, setActivePage] = useState("general");

    // Используем WebSocket из контекста
    const { send, subscribe, isConnected } = useWebSocket();

    const [colorPopup, setColorPopup] = useState({
        open: false,
        initialColor: '#ffffff',
        initialAlpha: 1,
        onChange: () => {
        },
        title: 'Цвет',
    });

    const openColorPopup = ({initialColor = '#ffffff', onChange, title = 'Цвет', initialAlpha}) => {
        setColorPopup({
            open: true,
            initialColor,
            initialAlpha,
            onChange,
            title,
        });
    };

    const closeColorPopup = () => {
        setColorPopup(prev => ({...prev, open: false}));
    };

    const applyBotConfig = updateOrConfig => {
        setBotConfig((prev) => {
            const next =
                typeof updateOrConfig === 'function'
                    ? updateOrConfig(prev)
                    : updateOrConfig;
            console.log('Roulette config updated:', next);
            updateBot(botName, next)
            return next;
        })
    }

    const loadBotConfig = async () => {
        try {
            const botData = await getCurrentBot();
            setBotName(botData.name);
            setBotConfig(botData.config);
            console.log('Загружена конфигурация бота:', botData);
        } catch (error) {
            console.error('Ошибка загрузки конфигурации бота:', error);
            setBotName('');
            setBotConfig(null);
        }
    };

    useEffect(() => {
        loadBotConfig();
    }, []);

    // Подключаемся к WebSocket и подписываемся на каналы
    useEffect(() => {
        if (isConnected) {
            console.log('🟢 WebSocket подключен');
            send({channel: 'theme:get-all'});
        }

        const unsubscribe = subscribe('themes:get', (payload) => {
            const {themes, currentThemeName} = payload;
            console.log('Получены темы:', themes, 'Текущая тема:', currentThemeName);
            setThemeList(themes);
            setSelectedThemeName(currentThemeName);
            setSelectedTheme(themes[currentThemeName] || defaultTheme);
        });

        return () => {
            console.log('🔴 WebSocket отписка');
            unsubscribe();
        };
    }, [isConnected, send, subscribe, setSelectedTheme]);

    /** Единая «точка входа» для всех изменений темы */
    const apply = updaterOrTheme => {
        setSelectedTheme((prev) => {
            const next =
                typeof updaterOrTheme === 'function'
                    ? updaterOrTheme(prev)
                    : updaterOrTheme;
            setRemoteTheme(next, selectedThemeName);
            return next;
        });
    };

    const handleBackButton = () => navigate(-1);
    const handlePreviewButton = async () => {
        await openPreview()
    };
    const handleThemesButton = () => {
        setIsThemeSelectorOpen(true)
    };

    const handleBotConfigClick = () => {
        setIsBotConfigOpen(true);
    };

    const handleExportTheme = (name) => {
        let theme;
        if (name === selectedThemeName) {
            theme = selectedTheme;
        } else {
            theme = themeList[name];
        }
        if (!theme) return;
        const data = JSON.stringify({[name]: theme}, null, 2);
        const blob = new Blob([data], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${name}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleDeleteTheme = (name) => {
        if (window.confirm(`Delete theme "${name}"?`)) {
            deleteTheme(name);
        }
    };

    const handleThemeChange = (themeName) => {
        setTheme(themeName);
    }

    const currentPageInfo = PageInfoConfig[activePage] || PageInfoConfig.general;

    return (
        <Panel>
            {colorPopup.open && (
                <ColorPickerPopup
                    title={colorPopup.title}
                    initialColor={colorPopup.initialColor}
                    initialAlpha={colorPopup.initialAlpha}
                    onColorChange={colorPopup.onChange}
                    onClose={closeColorPopup}
                />
            )}
            {isBotConfigOpen && (
                <BotConfigPopup
                    onClose={() => setIsBotConfigOpen(false)}
                    onBotChange={(name) => {
                        setBotName(name);
                        loadBotConfig();
                    }}
                />
            )}
            {isThemeSelectorOpen && (
                <ThemePopup
                    onClose={() => setIsThemeSelectorOpen(false)}
                    themeList={themeList}
                    selectedThemeName={selectedThemeName}
                    onChangeTheme={handleThemeChange}
                    onDeleteTheme={handleDeleteTheme}
                    onExportTheme={handleExportTheme}
                    onImportTheme={importTheme}
                    onCreateTheme={(name) => {
                        createNewTheme(name);
                        console.log("Создание новой темы:", name);
                    }}
                />
            )}

            <Header>
                <HeaderLeft>
                    <BackButton onClick={handleBackButton}>
                        <FiArrowLeft/>
                        Назад
                    </BackButton>
                    <HeaderTitle>Настройки</HeaderTitle>
                </HeaderLeft>

                <HeaderActions>
                    <ThemeIndicator onClick={handleThemesButton}>
                        <FiLayers/>
                        Тема: <span className="theme-name">{selectedThemeName}</span>
                    </ThemeIndicator>

                    <ThemeIndicator onClick={handleBotConfigClick}>
                        <AiFillRobot/>
                        Бот: <span className="theme-name">{botName}</span>
                    </ThemeIndicator>

                    <ActionButton className="secondary" onClick={handlePreviewButton}>
                        <FiEye/>
                        Превью
                    </ActionButton>

                </HeaderActions>
            </Header>

            <ContentWrapper>
                <Sidebar
                    open={drawerOpen}
                    active={activePage}
                    onSelect={setActivePage}
                    items={[
                        {key: "general", icon: <FiSettings/>, label: "Общие"},
                        {key: "chat", icon: <FiMessageCircle/>, label: "Сообщения"},
                        {key: "follow", icon: <FiHeart/>, label: "Follow"},
                        {key: "channel_points", icon: <FiAward/>, label: "Баллы"},
                        {key: "bot", icon: <AiFillRobot/>, label: "Бот >_"},
                        {key: "players", icon: <FiMusic/>, label: "Плееры"},
                        {key: "youtube", icon: <FiYoutube/>, label: "YouTube Чат"},
                        {key: "followers_goal", icon: <FiTarget/>, label: "Прогресс"},
                    ]}
                />

                <MainContainer>
                    <ContentHeader>
                        <PageTitle>
                            {currentPageInfo.icon}
                            {currentPageInfo.title}
                        </PageTitle>
                    </ContentHeader>

                    <MainContent
                        page={activePage}
                        apply={updaterOrTheme => apply(updaterOrTheme)}
                        selectedTheme={selectedTheme}
                        botConfig={botConfig}
                        botName={botName}
                        openColorPopup={openColorPopup}
                        applyBotConfig={applyBotConfig}
                    />
                </MainContainer>
            </ContentWrapper>
        </Panel>
    );
}

const MainContent = ({page, selectedTheme, apply, openColorPopup, botConfig, botName, applyBotConfig}) => {
    switch (page) {
        case "general":
            return (
                <Content>
                    <UnifiedSettingsComponent
                        current={selectedTheme}
                        onChange={updaterOrTheme => apply(updaterOrTheme)}
                        openColorPopup={openColorPopup}
                    />

                </Content>
            );

        case "youtube":
            return (
                <Content>
                    <Socks5ProxyComponent/>
                    <YouTubeScraperComponent/>
                </Content>
            );

        case "chat":
            return (
                <Content>
                    <MessageSettingsBlock
                        current={selectedTheme}
                        onChange={updaterOrTheme => apply(updaterOrTheme)}
                        openColorPopup={openColorPopup}
                    />
                </Content>
            );

        case "follow":
            return (
                <Content>
                    {selectedTheme.followMessage?.map((_, index) => (
                        <FollowSettingsBlock
                            key={index}
                            current={selectedTheme}
                            index={index}
                            onChange={(updaterOrTheme) => apply(updaterOrTheme)}
                            openColorPopup={openColorPopup}
                            onRemove={(i) => {
                                apply((prev) => {
                                    const newFollow = [...prev.followMessage];
                                    newFollow.splice(i, 1);
                                    return {
                                        ...prev,
                                        followMessage: newFollow,
                                    };
                                });
                            }}
                            disableRemove={selectedTheme.followMessage.length <= 1}
                        />
                    ))}

                    <AddNewStyleButton onClick={
                        () => {
                            apply((prev) => {
                                const last = prev.followMessage[prev.followMessage.length - 1];
                                return {
                                    ...prev,
                                    followMessage: [...prev.followMessage, {...last}],
                                };
                            });
                        }
                    }/>
                </Content>
            );

        case "channel_points":
            return (
                <Content>
                    {selectedTheme.redeemMessage?.map((_, index) => (
                        <RedeemPointsBlock
                            key={index}
                            current={selectedTheme}
                            index={index}
                            onChange={(updaterOrTheme) => apply(updaterOrTheme)}
                            openColorPopup={openColorPopup}
                            onRemove={(i) => {
                                apply((prev) => {
                                    const newRedeem = [...prev.redeemMessage];
                                    newRedeem.splice(i, 1);
                                    return {
                                        ...prev,
                                        redeemMessage: newRedeem,
                                    };
                                });
                            }}
                            disableRemove={selectedTheme.redeemMessage.length <= 1}
                        />
                    ))}
                    <AddNewStyleButton onClick={
                        () => {
                            apply((prev) => {
                                const last = prev.redeemMessage[prev.redeemMessage.length - 1];
                                return {
                                    ...prev,
                                    redeemMessage: [...prev.redeemMessage, {...last}],
                                };
                            });
                        }
                    }/>
                </Content>
            );

        case "bot":
            return (
                <Content>
                    {botConfig ? (
                        <>
                            <PingPongComponent
                                apply={applyBotConfig}
                                botConfig={botConfig}
                            />

                            <Roulette
                                botConfig={botConfig}
                                apply={applyBotConfig}
                            />
                        </>
                    ) : (
                        <NoConfigCard>
                            <FiAlertCircle/>
                            <h3>Конфигурация бота не найдена</h3>
                            <p>
                                Для настройки бота необходимо загрузить или создать конфигурацию.
                                <br/>
                                Чтото сломалось. Стучите в личку
                            </p>
                        </NoConfigCard>
                    )}
                </Content>
            );
        case "players": {
            return (
                <Content>
                    <FFTControlComponent/>
                    <ModernPlayerSettingsComponent
                        current={selectedTheme}
                        onChange={updaterOrTheme => apply(updaterOrTheme)}
                        openColorPopup={openColorPopup}
                    />
                    <PlayerSettingsComponent
                        current={selectedTheme}
                        onChange={updaterOrTheme => apply(updaterOrTheme)}
                        openColorPopup={openColorPopup}
                    />
                </Content>
            );
        }
        case "followers_goal":
            return (
                <Content>
                    <FollowersGoalSettingsComponent
                        current={selectedTheme}
                        onChange={updaterOrTheme => apply(updaterOrTheme)}
                        openColorPopup={openColorPopup}
                    />
                </Content>
            );
        default:
            return <div>Неизвестная страница</div>;
    }
};