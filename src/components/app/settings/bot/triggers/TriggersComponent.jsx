import React, { useState, useEffect } from "react";
import styled from "styled-components";
import Switch from "../../../../utils/Switch";
import { useTranslation } from 'react-i18next';
import {
    FiZap, FiPlus, FiTrash2, FiEdit2, FiCopy,
    FiMessageSquare, FiGift, FiUserPlus, FiCommand,
    FiChevronRight, FiClock, FiStar, FiShield, FiUsers, FiExternalLink
} from 'react-icons/fi';
import { HelpInfoPopup, EnabledToggle, AddButton } from "../SharedBotStyles";
import TriggerEditorPopup from "./TriggerEditorPopup";
import { v4 as uuidv4 } from 'uuid';

const RulesList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const RuleCard = styled.div`
    background: rgba(40, 40, 40, 0.5);
    border: 1px solid #333;
    border-radius: 12px;
    overflow: hidden;
    transition: all 0.2s ease;
    opacity: ${props => props.$enabled ? 1 : 0.7};

    &:hover {
        border-color: ${props => props.$enabled ? '#646cff' : '#555'};
        background: rgba(45, 45, 45, 0.5);
    }
`;

const RuleHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 20px;
    cursor: pointer;

    .rule-icon {
        width: 36px;
        height: 36px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: ${props => props.$color || 'rgba(100, 108, 255, 0.2)'};
        color: ${props => props.$iconColor || '#646cff'};

        svg {
            width: 18px;
            height: 18px;
        }
    }

    .rule-info {
        flex: 1;
        min-width: 0;

        h4 {
            margin: 0 0 4px 0;
            font-size: 1rem;
            font-weight: 600;
            color: #e0e0e0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .rule-summary {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.85rem;
            color: #888;
        }
    }
`;

const RuleActions = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 20px 0 0;
`;

const IconButton = styled.button`
    padding: 8px;
    border: 1px solid #444;
    border-radius: 8px;
    background: rgba(40, 40, 40, 0.5);
    color: #888;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;

    &:hover {
        background: rgba(100, 108, 255, 0.1);
        border-color: #646cff;
        color: #646cff;
    }

    &.delete:hover {
        background: rgba(220, 38, 38, 0.1);
        border-color: #dc2626;
        color: #dc2626;
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;

const ActionsBadges = styled.div`
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    padding: 0 20px 16px;
`;

const ActionBadge = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 0.75rem;
    background: ${props => props.$color || 'rgba(100, 108, 255, 0.1)'};
    color: ${props => props.$textColor || '#646cff'};
    border: 1px solid ${props => props.$borderColor || 'rgba(100, 108, 255, 0.3)'};

    svg {
        width: 12px;
        height: 12px;
    }
`;

const EmptyState = styled.div`
    text-align: center;
    padding: 40px 20px;
    color: #888;
    background: rgba(30, 30, 30, 0.5);
    border: 1px dashed #444;
    border-radius: 12px;

    svg {
        width: 48px;
        height: 48px;
        margin-bottom: 16px;
        color: #555;
    }

    h4 {
        margin: 0 0 8px 0;
        font-size: 1.1rem;
        color: #ccc;
    }

    p {
        margin: 0;
        font-size: 0.9rem;
    }
`;

const EVENT_TYPE_CONFIG = {
    message: { icon: FiMessageSquare, color: 'rgba(59, 130, 246, 0.2)', iconColor: '#3b82f6' },
    command: { icon: FiCommand, color: 'rgba(100, 108, 255, 0.2)', iconColor: '#646cff' },
    redemption: { icon: FiGift, color: 'rgba(139, 92, 246, 0.2)', iconColor: '#8b5cf6' },
    follow: { icon: FiUserPlus, color: 'rgba(34, 197, 94, 0.2)', iconColor: '#22c55e' },
    raid: { icon: FiUsers, color: 'rgba(249, 115, 22, 0.2)', iconColor: '#f97316' },
};

const ACTION_TYPE_CONFIG = {
    send_message: { icon: FiMessageSquare, color: 'rgba(59, 130, 246, 0.1)', textColor: '#3b82f6', borderColor: 'rgba(59, 130, 246, 0.3)' },
    shoutout: { icon: FiExternalLink, color: 'rgba(249, 115, 22, 0.1)', textColor: '#f97316', borderColor: 'rgba(249, 115, 22, 0.3)' },
    add_vip: { icon: FiStar, color: 'rgba(139, 92, 246, 0.1)', textColor: '#8b5cf6', borderColor: 'rgba(139, 92, 246, 0.3)' },
    remove_vip: { icon: FiStar, color: 'rgba(220, 38, 38, 0.1)', textColor: '#dc2626', borderColor: 'rgba(220, 38, 38, 0.3)' },
    add_mod: { icon: FiShield, color: 'rgba(34, 197, 94, 0.1)', textColor: '#22c55e', borderColor: 'rgba(34, 197, 94, 0.3)' },
    remove_mod: { icon: FiShield, color: 'rgba(220, 38, 38, 0.1)', textColor: '#dc2626', borderColor: 'rgba(220, 38, 38, 0.3)' },
    timeout: { icon: FiClock, color: 'rgba(251, 191, 36, 0.1)', textColor: '#fbbf24', borderColor: 'rgba(251, 191, 36, 0.3)' },
    delete_message: { icon: FiTrash2, color: 'rgba(107, 114, 128, 0.1)', textColor: '#6b7280', borderColor: 'rgba(107, 114, 128, 0.3)' },
};

const DEFAULT_TRIGGERS_CONFIG = {
    enabled: false,
    rules: []
};

const createEmptyRule = () => ({
    id: uuidv4(),
    name: '',
    enabled: true,
    condition: {
        eventType: 'command',
        textMatch: {
            type: 'starts',
            value: '!',
            caseSensitive: false
        }
    },
    actions: [],
    cooldown: 0,
    cooldownScope: 'global',
    stopPropagation: false
});

export default function TriggersComponent({ botConfig, apply, showHelp, setShowHelp }) {
    const { t } = useTranslation();
    const [editingRule, setEditingRule] = useState(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);

    const config = {
        ...DEFAULT_TRIGGERS_CONFIG,
        ...botConfig?.triggers
    };

    const updateConfig = (updater) => {
        apply((prev) => ({
            ...prev,
            triggers: {
                ...DEFAULT_TRIGGERS_CONFIG,
                ...prev.triggers,
                ...updater({
                    ...DEFAULT_TRIGGERS_CONFIG,
                    ...prev.triggers
                })
            }
        }));
    };

    const handleAddRule = () => {
        const newRule = createEmptyRule();
        newRule.name = t('settings.bot.triggers.newRuleName');
        setEditingRule(newRule);
        setIsEditorOpen(true);
    };

    const handleEditRule = (rule) => {
        setEditingRule({ ...rule });
        setIsEditorOpen(true);
    };

    const handleDuplicateRule = (rule) => {
        const duplicated = {
            ...rule,
            id: uuidv4(),
            name: `${rule.name} (${t('settings.bot.triggers.copy')})`
        };
        updateConfig((prev) => ({
            rules: [...prev.rules, duplicated]
        }));
    };

    const handleDeleteRule = (ruleId) => {
        updateConfig((prev) => ({
            rules: prev.rules.filter(r => r.id !== ruleId)
        }));
    };

    const handleToggleRule = (ruleId, enabled) => {
        updateConfig((prev) => ({
            rules: prev.rules.map(r =>
                r.id === ruleId ? { ...r, enabled } : r
            )
        }));
    };

    const handleSaveRule = (rule) => {
        updateConfig((prev) => {
            const existingIndex = prev.rules.findIndex(r => r.id === rule.id);
            if (existingIndex >= 0) {
                const newRules = [...prev.rules];
                newRules[existingIndex] = rule;
                return { rules: newRules };
            } else {
                return { rules: [...prev.rules, rule] };
            }
        });
        setIsEditorOpen(false);
        setEditingRule(null);
    };

    const handleCloseEditor = () => {
        setIsEditorOpen(false);
        setEditingRule(null);
    };

    const getEventTypeConfig = (eventType) => {
        return EVENT_TYPE_CONFIG[eventType] || EVENT_TYPE_CONFIG.message;
    };

    const getActionConfig = (actionType) => {
        return ACTION_TYPE_CONFIG[actionType] || ACTION_TYPE_CONFIG.send_message;
    };

    const formatConditionSummary = (rule) => {
        const eventType = t(`settings.bot.triggers.eventTypes.${rule.condition.eventType}`);

        // For command/message - show text match
        if ((rule.condition.eventType === 'command' || rule.condition.eventType === 'message')
            && rule.condition.textMatch?.value) {
            return `${eventType}: "${rule.condition.textMatch.value}"`;
        }

        // For redemption - show reward title or ID
        if (rule.condition.eventType === 'redemption' && rule.condition.rewardId) {
            const rewardName = rule.condition.rewardTitle || `ID ${rule.condition.rewardId.slice(0, 8)}...`;
            return `${eventType}: "${rewardName}"`;
        }

        // For follow or unconfigured - just show event type
        return eventType;
    };

    return (
        <>
            <HelpInfoPopup
                isOpen={showHelp}
                onClose={() => setShowHelp(false)}
                title={t('settings.bot.triggers.title')}
                icon={<FiZap />}
            >
                <p>{t('settings.bot.triggers.helpDescription')}</p>
                <ul>
                    <li><span className="highlight">{t('settings.bot.triggers.helpEvents')}</span> — {t('settings.bot.triggers.helpEventsDesc')}</li>
                    <li><span className="highlight">{t('settings.bot.triggers.helpActions')}</span> — {t('settings.bot.triggers.helpActionsDesc')}</li>
                    <li><span className="highlight">{t('settings.bot.triggers.helpDelay')}</span> — {t('settings.bot.triggers.helpDelayDesc')}</li>
                </ul>
            </HelpInfoPopup>

            {isEditorOpen && editingRule && (
                <TriggerEditorPopup
                    rule={editingRule}
                    onSave={handleSaveRule}
                    onClose={handleCloseEditor}
                />
            )}

            <AddButton onClick={handleAddRule} style={{ marginBottom: '16px' }}>
                <FiPlus />
                {t('settings.bot.triggers.addRule')}
            </AddButton>

            <RulesList>
                {config.rules.length === 0 ? (
                    <EmptyState>
                        <FiZap />
                        <h4>{t('settings.bot.triggers.emptyTitle')}</h4>
                        <p>{t('settings.bot.triggers.emptyDescription')}</p>
                    </EmptyState>
                ) : (
                    config.rules.map((rule) => {
                        const eventConfig = getEventTypeConfig(rule.condition.eventType);
                        const EventIcon = eventConfig.icon;

                        return (
                            <RuleCard key={rule.id} $enabled={rule.enabled}>
                                <RuleHeader
                                    $color={eventConfig.color}
                                    $iconColor={eventConfig.iconColor}
                                    onClick={() => handleEditRule(rule)}
                                >
                                    <div className="rule-icon">
                                        <EventIcon />
                                    </div>
                                    <div className="rule-info">
                                        <h4>{rule.name || t('settings.bot.triggers.unnamed')}</h4>
                                        <div className="rule-summary">
                                            <span>{formatConditionSummary(rule)}</span>
                                            <FiChevronRight style={{ width: 14, height: 14 }} />
                                            <span>{rule.actions.length} {t('settings.bot.triggers.actionsCount', { count: rule.actions.length })}</span>
                                        </div>
                                    </div>
                                    <RuleActions onClick={(e) => e.stopPropagation()}>
                                        <Switch
                                            checked={rule.enabled}
                                            onChange={(e) => handleToggleRule(rule.id, e.target.checked)}
                                        />
                                        <IconButton onClick={() => handleEditRule(rule)} title={t('settings.bot.triggers.edit')}>
                                            <FiEdit2 />
                                        </IconButton>
                                        <IconButton onClick={() => handleDuplicateRule(rule)} title={t('settings.bot.triggers.duplicate')}>
                                            <FiCopy />
                                        </IconButton>
                                        <IconButton className="delete" onClick={() => handleDeleteRule(rule.id)} title={t('settings.bot.triggers.delete')}>
                                            <FiTrash2 />
                                        </IconButton>
                                    </RuleActions>
                                </RuleHeader>
                                {rule.actions.length > 0 && (
                                    <ActionsBadges>
                                        {rule.actions.map((action, idx) => {
                                            const actionConfig = getActionConfig(action.type);
                                            const ActionIcon = actionConfig.icon;
                                            return (
                                                <ActionBadge
                                                    key={idx}
                                                    $color={actionConfig.color}
                                                    $textColor={actionConfig.textColor}
                                                    $borderColor={actionConfig.borderColor}
                                                >
                                                    <ActionIcon />
                                                    {t(`settings.bot.triggers.actionTypes.${action.type}`)}
                                                    {action.delay && (
                                                        <>
                                                            <FiClock style={{ marginLeft: 4 }} />
                                                            {action.delay.value}{action.delay.unit[0]}
                                                        </>
                                                    )}
                                                </ActionBadge>
                                            );
                                        })}
                                    </ActionsBadges>
                                )}
                            </RuleCard>
                        );
                    })
                )}
            </RulesList>
        </>
    );
}
