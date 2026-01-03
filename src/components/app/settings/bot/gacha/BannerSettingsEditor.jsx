import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Row } from '../../../SettingsComponent';
import { AddCommandForm, FormRow, NameInput, ErrorText } from '../SharedBotStyles';
import { useTranslation } from 'react-i18next';

const SettingsGrid = styled.div`
    display: grid;
    gap: 16px;
`;

const SettingRow = styled.div`
    background: rgba(40, 40, 40, 0.5);
    border: 1px solid #333;
    border-radius: 8px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const Label = styled.label`
    font-size: 0.9rem;
    color: #ccc;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 8px;
`;

const Select = styled.select`
    padding: 10px 12px;
    border: 1px solid #555;
    border-radius: 8px;
    background: #1e1e1e;
    color: #fff;
    font-size: 14px;
    transition: all 0.2s ease;
    cursor: pointer;
    
    &:focus {
        outline: none;
        border-color: #646cff;
        background: #252525;
    }
    
    option {
        background: #1e1e1e;
        color: #fff;
    }
`;

const MultiSelect = styled.div`
    display: flex;
    flex-direction: row;
    // wrap
    flex-wrap: wrap;
    gap: 8px;
`;

const CheckboxLabel = styled.label`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: rgba(30, 30, 30, 0.5);
    border: 1px solid ${props => props.$checked ? 'rgba(100, 108, 255, 0.5)' : '#333'};
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover {
        background: rgba(30, 30, 30, 0.8);
        border-color: ${props => props.$checked ? 'rgba(100, 108, 255, 0.7)' : '#444'};
    }
    
    input {
        cursor: pointer;
    }
    
    span {
        color: ${props => props.$checked ? '#e0e0e0' : '#aaa'};
        font-size: 0.9rem;
    }
`;

const RarityBadge = styled.span`
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
    background: ${props => {
    if (props.$rarity === 5) return 'rgba(251, 191, 36, 0.2)';
    if (props.$rarity === 4) return 'rgba(139, 92, 246, 0.2)';
    return 'rgba(107, 114, 128, 0.2)';
}};
    color: ${props => {
    if (props.$rarity === 5) return '#fbbf24';
    if (props.$rarity === 4) return '#a78bfa';
    return '#9ca3af';
}};
`;

const InfoText = styled.p`
    margin: 0;
    font-size: 0.85rem;
    color: #888;
    font-style: italic;
`;

export default function BannerSettingsEditor({ banner, items, updateConfig }) {
    const { t } = useTranslation();
    const [bannerName, setBannerName] = useState(banner.name);

    // Синхронизируем локальное состояние при смене баннера
    useEffect(() => {
        setBannerName(banner.name || '');
    }, [banner.id, banner.name]);

    const fiveStarItems = items.filter(item => item.rarity === 5) || [];
    const fourStarItems = items.filter(item => item.rarity === 4) || [];

    const handleNameChange = (e) => {
        const newName = e.target.value;
        setBannerName(newName);
    };

    const handleNameBlur = () => {
        if (bannerName.trim() && bannerName !== banner.name) {
            updateConfig({ name: bannerName.trim() });
        }
    };

    const handleFeatured5StarChange = (e) => {
        const value = e.target.value || null;
        updateConfig({ featured5StarId: value });
    };

    const handleFeatured4StarToggle = (itemId) => {
        const current = banner.featured4StarIds || [];
        const isSelected = current.includes(itemId);

        let newFeatured;
        if (isSelected) {
            newFeatured = current.filter(id => id !== itemId);
        } else {
            // Ограничиваем до 3 персонажей
            if (current.length >= 3) {
                newFeatured = [...current.slice(1), itemId];
            } else {
                newFeatured = [...current, itemId];
            }
        }

        updateConfig({ featured4StarIds: newFeatured });
    };

    return (
        <SettingsGrid>
            {/* Название баннера */}
            <Row style={{ gap: '16px', flexWrap: 'nowrap' }}>
            <SettingRow style={{ width: '100%', height: 'fit-content' }}>
                <Label>{t('settings.bot.gacha.banner.fields.name.label')}</Label>
                <InfoText>
                    {t('settings.bot.gacha.banner.fields.name.hint')}
                </InfoText>
                <NameInput
                    value={bannerName}
                    onChange={handleNameChange}
                    onBlur={handleNameBlur}
                    placeholder={t('settings.bot.gacha.banner.fields.name.placeholder')}
                />
            </SettingRow>

            {/* Featured 5★ персонаж */}
            <SettingRow style={{ width: '100%' }}>
                <Label>{t('settings.bot.gacha.banner.fields.featured5Star.label')}</Label>
                <InfoText>
                    {t('settings.bot.gacha.banner.fields.featured5Star.hint')}
                </InfoText>
                <Select
                    value={banner.featured5StarId || ''}
                    onChange={handleFeatured5StarChange}
                >
                    <option value="">{t('settings.bot.gacha.banner.fields.featured5Star.none')}</option>
                    {fiveStarItems
                        .filter(item => item.isLimited)
                        .map(item => (
                            <option key={item.id} value={item.id}>
                                {item.name} ⭐⭐⭐⭐⭐
                            </option>
                        ))}
                </Select>
            </SettingRow>
            </Row>

            {/* Featured 4★ персонажи */}
            <SettingRow>
                <Label>{t('settings.bot.gacha.banner.fields.featured4Star.label')}</Label>
                <InfoText>
                    {t('settings.bot.gacha.banner.fields.featured4Star.hint')}
                </InfoText>
                <MultiSelect>
                    {fourStarItems.length === 0 ? (
                        <InfoText>{t('settings.bot.gacha.banner.fields.featured4Star.empty')}</InfoText>
                    ) : (
                        fourStarItems.map(item => {
                            const isSelected = (banner.featured4StarIds || []).includes(item.id);
                            return (
                                <CheckboxLabel key={item.id} $checked={isSelected}>
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => handleFeatured4StarToggle(item.id)}
                                    />
                                    <span>{item.name}</span>
                                    <RarityBadge $rarity={item.rarity}>
                                        ⭐⭐⭐⭐
                                    </RarityBadge>
                                </CheckboxLabel>
                            );
                        })
                    )}
                </MultiSelect>
                {(banner.featured4StarIds || []).length >= 3 && (
                    <InfoText style={{ color: '#fbbf24' }}>
                        {t('settings.bot.gacha.banner.fields.featured4Star.limitWarning')}
                    </InfoText>
                )}
            </SettingRow>
        </SettingsGrid>
    );
}