import React, {useState, useCallback, useEffect, useMemo} from 'react';
import styled from 'styled-components';
import {
    FiGift, FiSettings, FiInfo, FiStar, FiPackage, FiZap
} from 'react-icons/fi';
import {
    Section,
    SectionHeader,
    SectionTitle
} from "../../SharedSettingsStyles";
import {
    HelpInfoPopup
} from "../SharedBotStyles";
import BannerSettingsEditor from './BannerSettingsEditor';
import ItemsManager from './ItemsManager';
import TriggersManager from './TriggersManager';
import AdvancedSettings from './AdvancedSettings';
import {useTranslation} from 'react-i18next';

const InfoCard = styled.div`
    background: linear-gradient(135deg, rgba(100, 108, 255, 0.1) 0%, rgba(136, 83, 242, 0.1) 100%);
    border: 1px solid rgba(136, 83, 242, 0.3);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 16px;
`;

const InfoTitle = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    color: #e0e0e0;
    margin-bottom: 12px;

    svg {
        color: #8853f2;
    }
`;

const InfoText = styled.p`
    margin: 0;
    color: #ccc;
    line-height: 1.6;
    font-size: 0.9rem;
`;

const StatsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
    margin-top: 12px;
`;

const StatCard = styled.div`
    background: rgba(30, 30, 30, 0.5);
    border: 1px solid #333;
    border-radius: 8px;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    gap: 12px;

    svg {
        width: 24px;
        height: 24px;
        color: ${props => props.$color || '#8853f2'};
    }
`;

const StatContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const StatLabel = styled.span`
    font-size: 0.75rem;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const StatValue = styled.span`
    font-size: 1.25rem;
    font-weight: 600;
    color: #e0e0e0;
`;

const createDefaultConfig = (defaultBannerName) => ({
    enabled: false,
    banner: {
        id: 0,
        name: defaultBannerName,
        featured5StarId: null,
        featured4StarIds: [],
        hardPity5Star: 90,
        hardPity4Star: 10,
        softPityStart: 74,
        baseRate5Star: 0.006,
        baseRate4Star: 0.051,
        featuredRate4Star: 0.5,
        hasCapturingRadiance: true
    },
    items: [],
    triggers: []
});

export default function GachaComponent({gachaConfig, apply, showHelp, setShowHelp}) {

    const {t} = useTranslation();

    const getDefaultConfig = useCallback(() => (
        createDefaultConfig(t('settings.bot.gacha.component.defaults.bannerName'))
    ), [t]);

    const [config, setConfig] = useState(() => {
        if (!gachaConfig || !gachaConfig.items || !Array.isArray(gachaConfig.items) || !gachaConfig.banner || !gachaConfig.triggers) {
            const newConfig = getDefaultConfig();
            apply((prev) => {
                return {
                    ...prev,
                    gacha: newConfig,
                };
            });
            return newConfig;
        } else {
            return gachaConfig
        }
    });

    useEffect(() => {
        if (gachaConfig) {
            setConfig(gachaConfig || getDefaultConfig());
        }
    }, [gachaConfig, getDefaultConfig]);

    const updateGachaConfig = useCallback((updater) => {
        apply((prev) => {
            const newConfig = typeof updater === 'function'
                ? updater(prev.gacha)
                : {...prev.gacha, ...updater};
            return {
                ...prev,
                gacha: newConfig,
            };
        });
    }, [apply]);

    const stats = useMemo(() => ({
        totalItems: config.items?.length || 0,
        fiveStarCount: config.items?.filter(item => item.rarity === 5).length || 0,
        fourStarCount: config.items?.filter(item => item.rarity === 4).length || 0,
        triggersCount: config.triggers?.length || 0,
    }), [config.items, config.triggers]);

    const infoDetails = useMemo(() => (
        t('settings.bot.gacha.component.info.details', {returnObjects: true})
    ), [t]);

    return (
        <>
            <HelpInfoPopup
                isOpen={showHelp}
                onClose={() => setShowHelp(false)}
                title={t('settings.bot.gacha.component.title')}
                icon={<FiGift />}
            >
                <p>{t('settings.bot.gacha.component.collapsedDescription')}</p>
                <StatsGrid>
                    <StatCard $color="#fbbf24">
                        <FiStar/>
                        <StatContent>
                            <StatLabel>{t('settings.bot.gacha.component.stats.totalItems')}</StatLabel>
                            <StatValue>{stats.totalItems}</StatValue>
                        </StatContent>
                    </StatCard>
                    <StatCard $color="#8853f2">
                        <FiZap/>
                        <StatContent>
                            <StatLabel>{t('settings.bot.gacha.component.stats.fiveStar')}</StatLabel>
                            <StatValue>{stats.fiveStarCount}</StatValue>
                        </StatContent>
                    </StatCard>
                    <StatCard $color="#646cff">
                        <FiPackage/>
                        <StatContent>
                            <StatLabel>{t('settings.bot.gacha.component.stats.fourStar')}</StatLabel>
                            <StatValue>{stats.fourStarCount}</StatValue>
                        </StatContent>
                    </StatCard>
                    <StatCard $color="#22c55e">
                        <FiGift/>
                        <StatContent>
                            <StatLabel>{t('settings.bot.gacha.component.stats.triggers')}</StatLabel>
                            <StatValue>{stats.triggersCount}</StatValue>
                        </StatContent>
                    </StatCard>
                </StatsGrid>
            </HelpInfoPopup>

            {/* Информация о системе */}
            <Section>
                <InfoCard>
                    <InfoTitle>
                        <FiInfo/>
                        {t('settings.bot.gacha.component.info.title')}
                    </InfoTitle>
                    <InfoText>
                        {t('settings.bot.gacha.component.info.description')}
                        {Array.isArray(infoDetails) && infoDetails.map((detail, index) => (
                            <React.Fragment key={detail.title || index}>
                                <br/>• <strong>{detail.title}</strong>: {detail.text}
                            </React.Fragment>
                        ))}
                    </InfoText>
                </InfoCard>
            </Section>

            {/* Настройки баннера */}
            <Section>
                <SectionHeader>
                    <SectionTitle>
                        <FiStar/>
                        {t('settings.bot.gacha.component.sections.banner')}
                    </SectionTitle>
                </SectionHeader>
                <BannerSettingsEditor
                    banner={config.banner}
                    items={config.items}
                    updateConfig={updateGachaConfig}
                />
            </Section>

            {/* Управление предметами */}
            <Section>
                <SectionHeader>
                    <SectionTitle>
                        <FiPackage/>
                        {t('settings.bot.gacha.component.sections.items')}
                    </SectionTitle>
                </SectionHeader>
                <ItemsManager
                    items={config.items}
                    updateConfig={updateGachaConfig}
                />
            </Section>

            {/* Триггеры (Twitch награды) */}
            <Section>
                <SectionHeader>
                    <SectionTitle>
                        <FiGift/>
                        {t('settings.bot.gacha.component.sections.triggers')}
                    </SectionTitle>
                </SectionHeader>
                <TriggersManager
                    triggers={config.triggers}
                    updateConfig={updateGachaConfig}
                />
            </Section>

            {/* Продвинутые настройки */}
            <Section>
                <SectionHeader>
                    <SectionTitle>
                        <FiSettings/>
                        {t('settings.bot.gacha.component.sections.advanced')}
                    </SectionTitle>
                </SectionHeader>
                <AdvancedSettings
                    banner={config.banner}
                    updateConfig={updateGachaConfig}
                />
            </Section>
        </>
    );
}
