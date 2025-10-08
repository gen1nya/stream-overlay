import React, { useState, useCallback, useEffect } from 'react';
import styled from 'styled-components';
import Switch from '../../../../utils/Switch';
import {
    FiGift, FiSettings, FiChevronDown, FiChevronUp, FiInfo, FiPlus, FiStar, FiPackage, FiZap
} from 'react-icons/fi';
import {
    CardContent,
    CardTitle,
    Section,
    SectionHeader,
    SectionTitle,
    SettingsCard,
} from "../../SharedSettingsStyles";
import { Row } from "../../../SettingsComponent";
import { Spacer } from "../../../../utils/Separator";
import {
    CollapsibleHeader,
    CollapsedPreview,
    EnabledToggle,
    StatusBadge,
    VariableItem,
    VariablesList,
} from "../SharedBotStyles";
import BannerSettingsEditor from './BannerSettingsEditor';
import ItemsManager from './ItemsManager';
import TriggersManager from './TriggersManager';
import AdvancedSettings from './AdvancedSettings';

const CollapseToggle = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    color: #999;
    font-size: 0.9rem;
    transition: color 0.2s ease;
    
    svg {
        width: 18px;
        height: 18px;
        transition: transform 0.2s ease;
    }
    
    ${CollapsibleHeader}:hover & {
        color: #ccc;
    }
`;

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

const createDefaultConfig = () => ({
    enabled: false,
    banner: {
        id: 0,
        name: 'Новый баннер',
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

export default function GachaComponent({ gachaConfig, apply }) {


    const [config, setConfig] = useState(() => {
        if (!gachaConfig || !gachaConfig.items || !Array.isArray(gachaConfig.items) || !gachaConfig.banner || !gachaConfig.triggers) {
            const newConfig = createDefaultConfig();
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
    const [isOpen, setIsOpen] = useState(false);
    const [enabled, setEnabled] = useState(config.enabled);

    const toggleOpen = () => setIsOpen((prev) => !prev);

    useEffect(() => {
        setEnabled(config.enabled ?? false);
    }, [config.enabled]);

    useEffect(() => {
        if (gachaConfig) {
            setConfig(gachaConfig || createDefaultConfig());
        }
    }, [gachaConfig || createDefaultConfig()]);

    const updateGachaConfig = useCallback((updater) => {
        apply((prev) => {
            const newConfig = typeof updater === 'function'
                ? updater(prev.gacha)
                : { ...prev.gacha, ...updater };
            return {
                ...prev,
                gacha: newConfig,
            };
        });
    }, [apply]);



    // Статистика для отображения
    const stats = {
        totalItems: config.items?.length || 0,
        fiveStarCount: config.items?.filter(item => item.rarity === 5).length || 0,
        fourStarCount: config.items?.filter(item => item.rarity === 4).length || 0,
        triggersCount: config.triggers?.length || 0,
    };

    console.log('GachaComponent render with config:', JSON.stringify(config, null, 2));

    return (
        <SettingsCard>
            <CollapsibleHeader onClick={toggleOpen}>
                <Row gap="12px">
                    <EnabledToggle enabled={enabled}>
                        <Switch
                            checked={enabled}
                            onChange={(e) => {
                                const newState = e.target.checked;
                                setEnabled(newState);
                                updateGachaConfig({ enabled: newState });
                            }}
                        />
                        <StatusBadge enabled={enabled}>
                            {enabled ? 'Включено' : 'Выключено'}
                        </StatusBadge>
                    </EnabledToggle>

                    <CardTitle>
                        <FiGift />
                        Гача-система
                    </CardTitle>

                    <Spacer />

                    <CollapseToggle>
                        {isOpen ? 'Свернуть' : 'Развернуть'}
                        {isOpen ? <FiChevronUp /> : <FiChevronDown />}
                    </CollapseToggle>
                </Row>
            </CollapsibleHeader>

            {/* Свернутое описание */}
            {!isOpen && (
                <CollapsedPreview onClick={toggleOpen}>
                    Система гача-механики по типу Hoyoverse (Genshin Impact, Honkai, ZZZ)
                    <br /><br />
                    <StatsGrid>
                        <StatCard $color="#fbbf24">
                            <FiStar />
                            <StatContent>
                                <StatLabel>Всего предметов</StatLabel>
                                <StatValue>{stats.totalItems}</StatValue>
                            </StatContent>
                        </StatCard>
                        <StatCard $color="#8853f2">
                            <FiZap />
                            <StatContent>
                                <StatLabel>5★ предметов</StatLabel>
                                <StatValue>{stats.fiveStarCount}</StatValue>
                            </StatContent>
                        </StatCard>
                        <StatCard $color="#646cff">
                            <FiPackage />
                            <StatContent>
                                <StatLabel>4★ предметов</StatLabel>
                                <StatValue>{stats.fourStarCount}</StatValue>
                            </StatContent>
                        </StatCard>
                        <StatCard $color="#22c55e">
                            <FiGift />
                            <StatContent>
                                <StatLabel>Триггеров</StatLabel>
                                <StatValue>{stats.triggersCount}</StatValue>
                            </StatContent>
                        </StatCard>
                    </StatsGrid>
                </CollapsedPreview>
            )}

            {isOpen && (
                <CardContent>
                    {/* Информация о системе */}
                    <Section>
                        <InfoCard>
                            <InfoTitle>
                                <FiInfo />
                                О гача-системе
                            </InfoTitle>
                            <InfoText>
                                Гача-система работает по принципу игр Hoyoverse с механикой "pity":
                                <br />• <strong>Hard Pity</strong>: гарантированный 5★ каждые 90 pulls
                                <br />• <strong>Soft Pity</strong>: повышенные шансы после 74 pulls
                                <br />• <strong>50/50 система</strong>: при получении 5★ есть 50% шанс получить featured персонажа
                                <br />• <strong>Capturing Radiance</strong>: 5% шанс получить featured даже при проигрыше 50/50
                            </InfoText>
                        </InfoCard>
                    </Section>

                    {/* Настройки баннера */}
                    <Section>
                        <SectionHeader>
                            <SectionTitle>
                                <FiStar />
                                Настройки баннера
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
                                <FiPackage />
                                Управление предметами
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
                                <FiGift />
                                Триггеры (Twitch награды)
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
                                <FiSettings />
                                Продвинутые настройки механики
                            </SectionTitle>
                        </SectionHeader>
                        <AdvancedSettings
                            banner={config.banner}
                            updateConfig={updateGachaConfig}
                        />
                    </Section>
                </CardContent>
            )}
        </SettingsCard>
    );
}