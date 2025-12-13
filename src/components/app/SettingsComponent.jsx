// Settings.js
import React, {useEffect, useMemo, useState} from 'react';
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
    FiAlertCircle,
    FiTarget,
    FiLayout,
    FiGift
} from "react-icons/fi";
import {MediumSecondaryButton, SettingsBlockFull, SettingsBlockHalf, SettingsBlockTitle} from "./settings/SettingBloks";
import ThemePopup from "./settings/ThemePopup";
import ColorPickerPopup from "./settings/ColorPickerPopup";
import AddNewStyleButton from "../utils/AddNewStyleButton";
import {AiFillRobot} from "react-icons/ai";
import Roulette from "./settings/bot/roulette/Roulette";
import PingPongComponent from "./settings/bot/pingpong/PingPongComponent";
import UnifiedSettingsComponent from "./settings/UnifiedSettingsComponent";
import FFTControlComponent from "./settings/FFTControlComponent";
import YouTubeScraperComponent from "./settings/YouTubeScraperComponent";
import Socks5ProxyComponent from "./settings/Socks5ProxyComponent";
import BotConfigPopup from "./settings/BotConfigPopup";
import ModernPlayerSettingsComponent from "./settings/ModernPlayerSettingsComponent";
import FollowersGoalSettingsComponent from "./settings/FollowersGoalSettingsComponent";
import {ActionButton, HeaderActions, HeaderLeft, HeaderTitle, ThemeIndicator} from "./SharedStyles";
import HolidayHeader from "../seasonal/HolidayHeader";
import {useThemeManager} from "../../hooks/useThemeManager";
import {useBotConfig} from "../../hooks/useBotConfig";
import GachaComponent from "./settings/bot/gacha/GachaComponent";
import LotteryComponent from "./settings/bot/lottery/LotteryComponent";
import AboutCard from "./settings/About";
import { useTranslation } from 'react-i18next';
import AppearanceSettingsCard from "./settings/AppearanceSettingsCard";
import Switch from "../utils/Switch";
import { EnabledToggle, StatusBadge, HelpButton, HelpInfoPopup } from "./settings/bot/SharedBotStyles";
import { Spacer } from "../utils/Separator";

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

// Wrapper for bot page content (replaces CardContent styles)
const BotPageContent = styled.div`
    width: 100%;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    box-sizing: border-box;
`;

export default function Settings() {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const pageInfoConfig = useMemo(() => ({
        general: {title: t('settings.pages.general.title'), icon: <FiSettings/>},
        chat_appearance: {title: t('settings.pages.chatAppearance.title'), icon: <FiLayout/>},
        chat: {title: t('settings.pages.chat.title'), icon: <FiMessageCircle/>},
        follow: {title: t('settings.pages.follow.title'), icon: <FiHeart/>},
        channel_points: {title: t('settings.pages.channelPoints.title'), icon: <FiAward/>},
        bot_pingpong: {title: t('settings.pages.botPingpong.title'), icon: <FiMessageCircle/>},
        bot_roulette: {title: t('settings.pages.botRoulette.title'), icon: <FiTarget/>},
        bot_gacha: {title: t('settings.pages.botGacha.title'), icon: <FiAward/>},
        bot_lottery: {title: t('settings.pages.botLottery.title'), icon: <FiHeart/>},
        players: {title: t('settings.pages.players.title'), icon: <FiMusic/>},
        youtube: {title: t('settings.pages.youtube.title'), icon: <FiYoutube/>},
        followers_goal: {title: t('settings.pages.followersGoal.title'), icon: <FiTarget/>},
        about: {title: t('settings.pages.about.title'), icon: <FiAlertCircle/>},
    }), [t]);

    const {
        themes,
        selectedTheme,
        selectedThemeName,
        setSelectedThemeName,
        setSelectedTheme,
        isThemeSelectorOpen,
        openThemeSelector,
        closeThemeSelector,
        handleExportTheme,
        handleDeleteTheme,
        handleThemeChange,
        handleImportTheme,
        handleCreateTheme,
    } = useThemeManager();

    const {
        isBotConfigOpen,
        botName,
        botConfig,
        openBotConfig,
        closeBotConfig,
        handleBotChange,
        applyBotConfig,
    } = useBotConfig();

    const [drawerOpen, setDrawerOpen] = useState(true);
    const [activePage, setActivePage] = useState("general");
    const [showBotHelp, setShowBotHelp] = useState(false);

    // Helper to check if current page is a bot page
    const isBotPage = activePage.startsWith('bot_');

    // Get bot enabled state based on active page
    const getBotEnabled = () => {
        if (!botConfig) return false;
        switch (activePage) {
            case 'bot_pingpong': return botConfig.pingpong?.enabled ?? false;
            case 'bot_roulette': return botConfig.roulette?.enabled ?? false;
            case 'bot_gacha': return botConfig.gacha?.enabled ?? false;
            case 'bot_lottery': return botConfig.lottery?.enabled ?? false;
            default: return false;
        }
    };

    // Toggle bot enabled state
    const toggleBotEnabled = (newState) => {
        switch (activePage) {
            case 'bot_pingpong':
                applyBotConfig(prev => ({ ...prev, pingpong: { ...prev.pingpong, enabled: newState } }));
                break;
            case 'bot_roulette':
                applyBotConfig(prev => ({ ...prev, roulette: { ...prev.roulette, enabled: newState } }));
                break;
            case 'bot_gacha':
                applyBotConfig(prev => ({ ...prev, gacha: { ...prev.gacha, enabled: newState } }));
                break;
            case 'bot_lottery':
                applyBotConfig(prev => ({ ...prev, lottery: { ...prev.lottery, enabled: newState } }));
                break;
        }
    };

    const botEnabled = getBotEnabled();

    const [colorPopup, setColorPopup] = useState({
        open: false,
        initialColor: '#ffffff',
        initialAlpha: 1,
        onChange: () => {
        },
        title: t('settings.colorPicker.title'),
    });

    const openColorPopup = ({initialColor = '#ffffff', onChange, title = t('settings.colorPicker.title'), initialAlpha}) => {
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

    const currentPageInfo = pageInfoConfig[activePage] || pageInfoConfig.general;

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

            <HolidayHeader>
                <HeaderLeft>
                    <BackButton onClick={handleBackButton}>
                        <FiArrowLeft/>
                        {t('common.back')}
                    </BackButton>
                    <HeaderTitle>{t('settings.header.title')}</HeaderTitle>
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

                    <ActionButton className="secondary" onClick={handlePreviewButton}>
                        <FiEye/>
                        {t('common.preview')}
                    </ActionButton>

                </HeaderActions>
            </HolidayHeader>

            <ContentWrapper>
                <Sidebar
                    open={drawerOpen}
                    active={activePage}
                    onSelect={setActivePage}
                    items={[
                        {key: "general", icon: <FiSettings/>, label: t('settings.pages.general.label')},
                        {
                            key: "chat_group",
                            icon: <FiMessageCircle/>,
                            label: t('settings.pages.chatGroup.label'),
                            children: [
                                {key: "chat_appearance", icon: <FiLayout/>, label: t('settings.pages.chatAppearance.label')},
                                {key: "chat", icon: <FiMessageCircle/>, label: t('settings.pages.chat.label')},
                                {key: "follow", icon: <FiHeart/>, label: t('settings.pages.follow.label')},
                                {key: "channel_points", icon: <FiAward/>, label: t('settings.pages.channelPoints.label')},
                            ]
                        },
                        {
                            key: "bot_group",
                            icon: <AiFillRobot/>,
                            label: t('settings.pages.botGroup.label'),
                            children: [
                                {key: "bot_pingpong", icon: <FiMessageCircle/>, label: t('settings.pages.botPingpong.label')},
                                {key: "bot_roulette", icon: <FiTarget/>, label: t('settings.pages.botRoulette.label')},
                                {key: "bot_gacha", icon: <FiAward/>, label: t('settings.pages.botGacha.label')},
                                {key: "bot_lottery", icon: <FiHeart/>, label: t('settings.pages.botLottery.label')},
                            ]
                        },
                        {key: "players", icon: <FiMusic/>, label: t('settings.pages.players.label')},
                        {key: "youtube", icon: <FiYoutube/>, label: t('settings.pages.youtube.label')},
                        {key: "followers_goal", icon: <FiTarget/>, label: t('settings.pages.followersGoal.label')},
                        {key : "about", icon: <FiAlertCircle/>, label: t('settings.pages.about.label')},
                    ]}
                />

                <MainContainer>
                    <ContentHeader>
                        {isBotPage && botConfig ? (
                            <Row gap="12px" style={{ flex: 1 }}>
                                <EnabledToggle enabled={botEnabled}>
                                    <Switch
                                        checked={botEnabled}
                                        onChange={(e) => toggleBotEnabled(e.target.checked)}
                                    />
                                    <StatusBadge enabled={botEnabled}>
                                        {botEnabled
                                            ? t('settings.bot.shared.status.enabled')
                                            : t('settings.bot.shared.status.disabled')}
                                    </StatusBadge>
                                </EnabledToggle>

                                <PageTitle style={{ margin: 0 }}>
                                    {currentPageInfo.icon}
                                    {currentPageInfo.title}
                                </PageTitle>

                                <Spacer />

                                <HelpButton onClick={() => setShowBotHelp(true)} />
                            </Row>
                        ) : (
                            <PageTitle>
                                {currentPageInfo.icon}
                                {currentPageInfo.title}
                            </PageTitle>
                        )}
                    </ContentHeader>

                    <MainContent
                        page={activePage}
                        apply={updaterOrTheme => apply(updaterOrTheme)}
                        selectedTheme={selectedTheme}
                        botConfig={botConfig}
                        botName={botName}
                        openColorPopup={openColorPopup}
                        applyBotConfig={applyBotConfig}
                        showBotHelp={showBotHelp}
                        setShowBotHelp={setShowBotHelp}
                    />
                </MainContainer>
            </ContentWrapper>
        </Panel>
    );
}

const MainContent = ({page, selectedTheme, apply, openColorPopup, botConfig, botName, applyBotConfig, showBotHelp, setShowBotHelp}) => {
    const { t } = useTranslation();
    switch (page) {
        case "general":
            return (
                <Content>
                    <AppearanceSettingsCard />
                    <Socks5ProxyComponent/>
                </Content>
            );

        case "chat_appearance":
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

        case "bot_pingpong":
            return (
                <Content>
                    {botConfig ? (
                        <BotPageContent>
                            <PingPongComponent
                                apply={applyBotConfig}
                                botConfig={botConfig}
                                showHelp={showBotHelp}
                                setShowHelp={setShowBotHelp}
                            />
                        </BotPageContent>
                    ) : (
                        <NoConfigCard>
                            <FiAlertCircle/>
                            <h3>{t('settings.botConfigMissing.title')}</h3>
                            <p>
                                {t('settings.botConfigMissing.line1')}
                                <br/>
                                {t('settings.botConfigMissing.line2')}
                            </p>
                        </NoConfigCard>
                    )}
                </Content>
            );

        case "bot_roulette":
            return (
                <Content>
                    {botConfig ? (
                        <BotPageContent>
                            <Roulette
                                botConfig={botConfig}
                                apply={applyBotConfig}
                                showHelp={showBotHelp}
                                setShowHelp={setShowBotHelp}
                            />
                        </BotPageContent>
                    ) : (
                        <NoConfigCard>
                            <FiAlertCircle/>
                            <h3>{t('settings.botConfigMissing.title')}</h3>
                            <p>
                                {t('settings.botConfigMissing.line1')}
                                <br/>
                                {t('settings.botConfigMissing.line2')}
                            </p>
                        </NoConfigCard>
                    )}
                </Content>
            );

        case "bot_gacha":
            return (
                <Content>
                    {botConfig ? (
                        <BotPageContent>
                            <GachaComponent
                                apply={applyBotConfig}
                                gachaConfig={botConfig.gacha}
                                showHelp={showBotHelp}
                                setShowHelp={setShowBotHelp}
                            />
                        </BotPageContent>
                    ) : (
                        <NoConfigCard>
                            <FiAlertCircle/>
                            <h3>{t('settings.botConfigMissing.title')}</h3>
                            <p>
                                {t('settings.botConfigMissing.line1')}
                                <br/>
                                {t('settings.botConfigMissing.line2')}
                            </p>
                        </NoConfigCard>
                    )}
                </Content>
            );

        case "bot_lottery":
            return (
                <Content>
                    {botConfig ? (
                        <BotPageContent>
                            <LotteryComponent
                                apply={applyBotConfig}
                                botConfig={botConfig}
                                showHelp={showBotHelp}
                                setShowHelp={setShowBotHelp}
                            />
                        </BotPageContent>
                    ) : (
                        <NoConfigCard>
                            <FiAlertCircle/>
                            <h3>{t('settings.botConfigMissing.title')}</h3>
                            <p>
                                {t('settings.botConfigMissing.line1')}
                                <br/>
                                {t('settings.botConfigMissing.line2')}
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
        case "about":
            return (
                <Content>
                    <AboutCard/>
                </Content>
            );
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
            return <div>{t('settings.unknownPage')}</div>;
    }
};