import React, { useState } from 'react';
import styled from 'styled-components';
import { FiAlertCircle } from 'react-icons/fi';
import Switch from '../../../../utils/Switch';
import { ParameterCard, ParameterTitle } from '../SharedBotStyles';

const SettingsGrid = styled.div`
    display: grid;
    gap: 16px;
`;

const NumberInput = styled.input`
    width: 120px;
    padding: 8px 12px;
    border: 1px solid #555;
    border-radius: 6px;
    background: #1e1e1e;
    color: #fff;
    font-size: 14px;
    transition: all 0.2s ease;
    
    &:focus {
        outline: none;
        border-color: #646cff;
        background: #252525;
    }
    
    &::-webkit-inner-spin-button,
    &::-webkit-outer-spin-button {
        opacity: 1;
    }
`;

const ParameterRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
`;

const ParameterInfo = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const ParameterDescription = styled.p`
    margin: 0;
    font-size: 0.85rem;
    color: #888;
    line-height: 1.4;
`;

const WarningBox = styled.div`
    background: rgba(251, 191, 36, 0.1);
    border: 1px solid rgba(251, 191, 36, 0.3);
    border-radius: 8px;
    padding: 12px 16px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 16px;
    
    svg {
        flex-shrink: 0;
        width: 20px;
        height: 20px;
        color: #fbbf24;
        margin-top: 2px;
    }
`;

const WarningText = styled.p`
    margin: 0;
    color: #fbbf24;
    font-size: 0.9rem;
    line-height: 1.5;
`;

const RateLabel = styled.span`
    font-size: 0.85rem;
    color: #888;
    min-width: 100px;
    text-align: right;
`;

export default function AdvancedSettings({ banner, updateConfig }) {
    const [settings, setSettings] = useState({
        hardPity5Star: banner.hardPity5Star || 90,
        hardPity4Star: banner.hardPity4Star || 10,
        softPityStart: banner.softPityStart || 74,
        baseRate5Star: banner.baseRate5Star || 0.006,
        baseRate4Star: banner.baseRate4Star || 0.051,
        featuredRate4Star: banner.featuredRate4Star || 0.5,
        hasCapturingRadiance: banner.hasCapturingRadiance !== false
    });

    const handleNumberChange = (key, value) => {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return;

        const newSettings = { ...settings, [key]: numValue };
        setSettings(newSettings);
    };

    const handleBlur = () => {
        // Применяем изменения при потере фокуса
        updateConfig(prev => ({
            ...prev,
            banner: {
                ...prev.banner,
                ...settings
            }
        }));
    };

    const handleCapturingRadianceToggle = (checked) => {
        const newSettings = { ...settings, hasCapturingRadiance: checked };
        setSettings(newSettings);
        updateConfig(prev => ({
            ...prev,
            banner: {
                ...prev.banner,
                hasCapturingRadiance: checked
            }
        }));
    };

    const formatPercent = (value) => {
        return (value * 100).toFixed(2) + '%';
    };

    return (
        <div>
            <WarningBox>
                <FiAlertCircle />
                <WarningText>
                    ⚠️ Внимание! Изменение этих параметров может нарушить баланс системы.
                    Рекомендуется использовать стандартные значения из игр Hoyoverse.
                </WarningText>
            </WarningBox>

            <SettingsGrid>
                {/* Capturing Radiance */}
                <ParameterCard>
                    <ParameterRow>
                        <ParameterInfo>
                            <ParameterTitle>
                                Capturing Radiance
                            </ParameterTitle>
                            <ParameterDescription>
                                Механика из версии 5.0 Genshin Impact. При проигрыше 50/50 есть 5% шанс
                                все равно получить featured персонажа.
                            </ParameterDescription>
                        </ParameterInfo>
                        <Switch
                            checked={settings.hasCapturingRadiance}
                            onChange={(e) => handleCapturingRadianceToggle(e.target.checked)}
                        />
                    </ParameterRow>
                </ParameterCard>

                {/* Hard Pity 5★ */}
                <ParameterCard>
                    <ParameterRow>
                        <ParameterInfo>
                            <ParameterTitle>
                                Hard Pity для 5★
                            </ParameterTitle>
                            <ParameterDescription>
                                Гарантированный 5★ предмет после указанного количества pulls.
                                Стандарт: 90 для персонажей, 80 для оружия.
                            </ParameterDescription>
                        </ParameterInfo>
                        <NumberInput
                            type="number"
                            min="1"
                            max="200"
                            value={settings.hardPity5Star}
                            onChange={(e) => handleNumberChange('hardPity5Star', e.target.value)}
                            onBlur={handleBlur}
                        />
                    </ParameterRow>
                </ParameterCard>

                {/* Soft Pity Start */}
                <ParameterCard>
                    <ParameterRow>
                        <ParameterInfo>
                            <ParameterTitle>
                                Начало Soft Pity
                            </ParameterTitle>
                            <ParameterDescription>
                                С какого pull начинает расти шанс получить 5★.
                                Стандарт: 74 для персонажей, 64 для оружия.
                            </ParameterDescription>
                        </ParameterInfo>
                        <NumberInput
                            type="number"
                            min="1"
                            max={settings.hardPity5Star - 1}
                            value={settings.softPityStart}
                            onChange={(e) => handleNumberChange('softPityStart', e.target.value)}
                            onBlur={handleBlur}
                        />
                    </ParameterRow>
                </ParameterCard>

                {/* Hard Pity 4★ */}
                <ParameterCard>
                    <ParameterRow>
                        <ParameterInfo>
                            <ParameterTitle>
                                Hard Pity для 4★
                            </ParameterTitle>
                            <ParameterDescription>
                                Гарантированный 4★ предмет после указанного количества pulls.
                                Стандарт: 10 pulls.
                            </ParameterDescription>
                        </ParameterInfo>
                        <NumberInput
                            type="number"
                            min="1"
                            max="50"
                            value={settings.hardPity4Star}
                            onChange={(e) => handleNumberChange('hardPity4Star', e.target.value)}
                            onBlur={handleBlur}
                        />
                    </ParameterRow>
                </ParameterCard>

                {/* Base Rate 5★ */}
                <ParameterCard>
                    <ParameterRow>
                        <ParameterInfo>
                            <ParameterTitle>
                                Базовый шанс 5★
                            </ParameterTitle>
                            <ParameterDescription>
                                Базовая вероятность получить 5★ до достижения soft pity.
                                Стандарт: 0.6% (0.006).
                            </ParameterDescription>
                        </ParameterInfo>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <NumberInput
                                type="number"
                                step="0.001"
                                min="0.001"
                                max="1"
                                value={settings.baseRate5Star}
                                onChange={(e) => handleNumberChange('baseRate5Star', e.target.value)}
                                onBlur={handleBlur}
                            />
                            <RateLabel>{formatPercent(settings.baseRate5Star)}</RateLabel>
                        </div>
                    </ParameterRow>
                </ParameterCard>

                {/* Base Rate 4★ */}
                <ParameterCard>
                    <ParameterRow>
                        <ParameterInfo>
                            <ParameterTitle>
                                Базовый шанс 4★
                            </ParameterTitle>
                            <ParameterDescription>
                                Базовая вероятность получить 4★ предмет.
                                Стандарт: 5.1% (0.051).
                            </ParameterDescription>
                        </ParameterInfo>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <NumberInput
                                type="number"
                                step="0.001"
                                min="0.001"
                                max="1"
                                value={settings.baseRate4Star}
                                onChange={(e) => handleNumberChange('baseRate4Star', e.target.value)}
                                onBlur={handleBlur}
                            />
                            <RateLabel>{formatPercent(settings.baseRate4Star)}</RateLabel>
                        </div>
                    </ParameterRow>
                </ParameterCard>

                {/* Featured Rate 4★ */}
                <ParameterCard>
                    <ParameterRow>
                        <ParameterInfo>
                            <ParameterTitle>
                                Шанс featured 4★
                            </ParameterTitle>
                            <ParameterDescription>
                                Вероятность получить featured 4★ при выпадении любого 4★.
                                Стандарт: 50% (0.5).
                            </ParameterDescription>
                        </ParameterInfo>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <NumberInput
                                type="number"
                                step="0.01"
                                min="0"
                                max="1"
                                value={settings.featuredRate4Star}
                                onChange={(e) => handleNumberChange('featuredRate4Star', e.target.value)}
                                onBlur={handleBlur}
                            />
                            <RateLabel>{formatPercent(settings.featuredRate4Star)}</RateLabel>
                        </div>
                    </ParameterRow>
                </ParameterCard>
            </SettingsGrid>
        </div>
    );
}