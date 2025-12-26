import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FiInfo } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { VariablesList, VariableItem } from '../SharedBotStyles';
import DebouncedTextarea from '../../../../utils/DebouncedTextarea';

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

const InfoText = styled.p`
    margin: 0;
    font-size: 0.85rem;
    color: #888;
    font-style: italic;
`;

const VariablesHint = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 4px;
`;

const VariableTag = styled.span`
    display: inline-flex;
    align-items: center;
    padding: 4px 8px;
    background: rgba(100, 108, 255, 0.15);
    border: 1px solid rgba(100, 108, 255, 0.3);
    border-radius: 4px;
    font-size: 0.75rem;
    font-family: 'Consolas', 'Monaco', monospace;
    color: #a0a8ff;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        background: rgba(100, 108, 255, 0.25);
        border-color: rgba(100, 108, 255, 0.5);
    }
`;

const PreviewBox = styled.div`
    background: rgba(30, 30, 30, 0.8);
    border: 1px solid #444;
    border-radius: 6px;
    padding: 10px 12px;
    font-size: 0.9rem;
    color: #ddd;
    font-family: inherit;
    word-break: break-word;
`;

const PreviewLabel = styled.span`
    font-size: 0.75rem;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
    display: block;
`;

const InfoBox = styled.div`
    background: rgba(100, 108, 255, 0.1);
    border: 1px solid rgba(100, 108, 255, 0.3);
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
        color: #646cff;
        margin-top: 2px;
    }
`;

const InfoBoxText = styled.p`
    margin: 0;
    color: #a0a8ff;
    font-size: 0.9rem;
    line-height: 1.5;
`;

const DEFAULT_MESSAGES = {
    singlePull: '@${user}, you got: ${item} ${stars}',
    multiPullIntro: '@${user} pulls ${count}x and gets: ',
    won5050: ' ✅ (50/50 Won!)',
    lost5050: ' ❌ (50/50 Lost)',
    capturingRadiance: ' 💫 (Capturing Radiance!)',
    softPity: ' 🔥 (Pull #${pullNumber})',
    error: '@${user}, error during pull: ${error}'
};

const TEMPLATE_CONFIG = {
    singlePull: {
        variables: ['user', 'item', 'stars', 'rarity'],
        preview: { user: 'TestUser', item: 'Rare Item', stars: '⭐⭐⭐⭐⭐', rarity: 5 }
    },
    multiPullIntro: {
        variables: ['user', 'count'],
        preview: { user: 'TestUser', count: 10 }
    },
    won5050: {
        variables: [],
        preview: {}
    },
    lost5050: {
        variables: [],
        preview: {}
    },
    capturingRadiance: {
        variables: [],
        preview: {}
    },
    softPity: {
        variables: ['pullNumber'],
        preview: { pullNumber: 76 }
    },
    error: {
        variables: ['user', 'error'],
        preview: { user: 'TestUser', error: 'Something went wrong' }
    }
};

function formatPreview(template, variables) {
    return template.replace(/\$\{(\w+)\}/g, (match, key) => {
        return variables[key]?.toString() ?? match;
    });
}

function TemplateField({ templateKey, value, onChange, t }) {
    const config = TEMPLATE_CONFIG[templateKey];
    const previewText = formatPreview(value || DEFAULT_MESSAGES[templateKey], config.preview);

    const handleVariableClick = (variable) => {
        const newValue = (value || '') + '${' + variable + '}';
        onChange(newValue);
    };

    return (
        <SettingRow>
            <Label>{t(`settings.bot.gacha.messages.fields.${templateKey}.label`)}</Label>
            <InfoText>{t(`settings.bot.gacha.messages.fields.${templateKey}.hint`)}</InfoText>
            <DebouncedTextarea
                value={value || ''}
                onChange={onChange}
                placeholder={DEFAULT_MESSAGES[templateKey]}
                maxLength={500}
                minHeight="60px"
                debounceMs={300}
            />
            {config.variables.length > 0 && (
                <VariablesHint>
                    <span style={{ fontSize: '0.75rem', color: '#666' }}>
                        {t('settings.bot.gacha.messages.variablesLabel')}:
                    </span>
                    {config.variables.map(v => (
                        <VariableTag key={v} onClick={() => handleVariableClick(v)}>
                            {'${' + v + '}'}
                        </VariableTag>
                    ))}
                </VariablesHint>
            )}
            <div>
                <PreviewLabel>{t('settings.bot.gacha.messages.preview')}</PreviewLabel>
                <PreviewBox>{previewText}</PreviewBox>
            </div>
        </SettingRow>
    );
}

export default function MessageTemplatesEditor({ banner, updateConfig }) {
    const { t } = useTranslation();

    const [messages, setMessages] = useState(() => ({
        singlePull: banner.messages?.singlePull || '',
        multiPullIntro: banner.messages?.multiPullIntro || '',
        won5050: banner.messages?.won5050 || '',
        lost5050: banner.messages?.lost5050 || '',
        capturingRadiance: banner.messages?.capturingRadiance || '',
        softPity: banner.messages?.softPity || '',
        error: banner.messages?.error || ''
    }));

    // Sync state when banner changes
    useEffect(() => {
        setMessages({
            singlePull: banner.messages?.singlePull || '',
            multiPullIntro: banner.messages?.multiPullIntro || '',
            won5050: banner.messages?.won5050 || '',
            lost5050: banner.messages?.lost5050 || '',
            capturingRadiance: banner.messages?.capturingRadiance || '',
            softPity: banner.messages?.softPity || '',
            error: banner.messages?.error || ''
        });
    }, [banner.id]);

    const handleChange = (key, value) => {
        const newMessages = {
            ...messages,
            [key]: value
        };
        setMessages(newMessages);

        // Filter out empty strings to use defaults
        const filteredMessages = Object.fromEntries(
            Object.entries(newMessages).filter(([_, v]) => v.trim() !== '')
        );

        // Only update if there are custom messages
        const configMessages = Object.keys(filteredMessages).length > 0
            ? { ...DEFAULT_MESSAGES, ...filteredMessages }
            : undefined;

        updateConfig({ messages: configMessages });
    };

    return (
        <div>
            <InfoBox>
                <FiInfo />
                <InfoBoxText>
                    {t('settings.bot.gacha.messages.info')}
                </InfoBoxText>
            </InfoBox>

            {/* Список поддерживаемых переменных */}
            <VariablesList style={{ marginBottom: '16px' }}>
                <VariableItem>
                    <span className="var">${'{user}'}</span>
                    <span className="desc">{t('settings.bot.gacha.messages.variables.user')}</span>
                </VariableItem>
                <VariableItem>
                    <span className="var">${'{item}'}</span>
                    <span className="desc">{t('settings.bot.gacha.messages.variables.item')}</span>
                </VariableItem>
                <VariableItem>
                    <span className="var">${'{stars}'}</span>
                    <span className="desc">{t('settings.bot.gacha.messages.variables.stars')}</span>
                </VariableItem>
                <VariableItem>
                    <span className="var">${'{rarity}'}</span>
                    <span className="desc">{t('settings.bot.gacha.messages.variables.rarity')}</span>
                </VariableItem>
                <VariableItem>
                    <span className="var">${'{count}'}</span>
                    <span className="desc">{t('settings.bot.gacha.messages.variables.count')}</span>
                </VariableItem>
                <VariableItem>
                    <span className="var">${'{pullNumber}'}</span>
                    <span className="desc">{t('settings.bot.gacha.messages.variables.pullNumber')}</span>
                </VariableItem>
                <VariableItem>
                    <span className="var">${'{error}'}</span>
                    <span className="desc">{t('settings.bot.gacha.messages.variables.error')}</span>
                </VariableItem>
            </VariablesList>

            <SettingsGrid>
                <TemplateField
                    templateKey="singlePull"
                    value={messages.singlePull}
                    onChange={(v) => handleChange('singlePull', v)}
                    t={t}
                />

                <TemplateField
                    templateKey="multiPullIntro"
                    value={messages.multiPullIntro}
                    onChange={(v) => handleChange('multiPullIntro', v)}
                    t={t}
                />

                <TemplateField
                    templateKey="won5050"
                    value={messages.won5050}
                    onChange={(v) => handleChange('won5050', v)}
                    t={t}
                />

                <TemplateField
                    templateKey="lost5050"
                    value={messages.lost5050}
                    onChange={(v) => handleChange('lost5050', v)}
                    t={t}
                />

                <TemplateField
                    templateKey="capturingRadiance"
                    value={messages.capturingRadiance}
                    onChange={(v) => handleChange('capturingRadiance', v)}
                    t={t}
                />

                <TemplateField
                    templateKey="softPity"
                    value={messages.softPity}
                    onChange={(v) => handleChange('softPity', v)}
                    t={t}
                />

                <TemplateField
                    templateKey="error"
                    value={messages.error}
                    onChange={(v) => handleChange('error', v)}
                    t={t}
                />
            </SettingsGrid>
        </div>
    );
}
