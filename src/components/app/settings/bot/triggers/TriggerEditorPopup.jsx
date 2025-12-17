import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import styled from "styled-components";
import { useTranslation } from 'react-i18next';
import {
    FiX, FiSave, FiZap, FiMessageSquare, FiGift, FiUserPlus, FiCommand,
    FiClock, FiPlus, FiTrash2, FiChevronDown, FiStar, FiShield, FiAlertCircle
} from 'react-icons/fi';
import Switch from "../../../../utils/Switch";
import NumericEditorComponent from "../../../../utils/NumericEditorComponent";
import { getTwitchRewards } from "../../../../../services/api";
import { v4 as uuidv4 } from 'uuid';

const PopupOverlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 20px;
`;

const PopupContainer = styled.div`
    background: linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%);
    border: 1px solid #444;
    border-radius: 16px;
    max-width: 800px;
    width: 100%;
    max-height: 85vh;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
`;

const PopupHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid #333;
    background: linear-gradient(135deg, #2a2a2a 0%, #333 100%);

    h3 {
        margin: 0;
        font-size: 1.2rem;
        font-weight: 600;
        color: #fff;
        display: flex;
        align-items: center;
        gap: 10px;

        svg {
            color: #646cff;
        }
    }
`;

const HeaderActions = styled.div`
    display: flex;
    gap: 8px;
`;

const HeaderButton = styled.button`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border: 1px solid ${props => props.$primary ? '#646cff' : '#444'};
    border-radius: 8px;
    background: ${props => props.$primary ? '#646cff' : 'rgba(107, 114, 128, 0.1)'};
    color: ${props => props.$primary ? '#fff' : '#888'};
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s ease;

    &:hover {
        background: ${props => props.$primary ? '#5a5acf' : 'rgba(107, 114, 128, 0.2)'};
        border-color: ${props => props.$primary ? '#5a5acf' : '#555'};
        color: ${props => props.$primary ? '#fff' : '#ccc'};
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;

const PopupContent = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 24px;
`;

const Section = styled.div`
    margin-bottom: 24px;

    &:last-child {
        margin-bottom: 0;
    }
`;

const SectionTitle = styled.h4`
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 16px 0;
    font-size: 1rem;
    font-weight: 600;
    color: #e0e0e0;

    svg {
        width: 18px;
        height: 18px;
        color: #646cff;
    }
`;

const FormRow = styled.div`
    display: flex;
    gap: 16px;
    margin-bottom: 16px;
    flex-wrap: wrap;

    &:last-child {
        margin-bottom: 0;
    }
`;

const FormGroup = styled.div`
    flex: ${props => props.$flex || 1};
    min-width: ${props => props.$minWidth || '200px'};
`;

const Label = styled.label`
    display: block;
    margin-bottom: 8px;
    font-size: 0.9rem;
    color: #ccc;
`;

const Input = styled.input`
    width: 100%;
    padding: 12px 16px;
    border: 1px solid #555;
    border-radius: 8px;
    background: #1e1e1e;
    color: #fff;
    font-size: 14px;
    transition: all 0.2s ease;
    box-sizing: border-box;

    &::placeholder {
        color: #888;
    }

    &:focus {
        outline: none;
        border-color: #646cff;
        background: #252525;
    }
`;

const TextArea = styled.textarea`
    width: 100%;
    min-height: 80px;
    padding: 12px 16px;
    border: 1px solid #555;
    border-radius: 8px;
    background: #1e1e1e;
    color: #fff;
    font-size: 14px;
    font-family: inherit;
    resize: vertical;
    transition: all 0.2s ease;
    box-sizing: border-box;

    &::placeholder {
        color: #888;
    }

    &:focus {
        outline: none;
        border-color: #646cff;
        background: #252525;
    }
`;

const Select = styled.select`
    width: 100%;
    height: 42px;
    padding: 0 12px;
    border: 1px solid #555;
    border-radius: 8px;
    background: #1e1e1e;
    color: #fff;
    font-size: 14px;
    cursor: pointer;
    box-sizing: border-box;

    &:focus {
        outline: none;
        border-color: #646cff;
    }

    option {
        background: #1e1e1e;
        color: #fff;
    }
`;

const EventTypeSelector = styled.div`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
`;

const EventTypeButton = styled.button`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    border: 1px solid ${props => props.$selected ? '#646cff' : '#444'};
    border-radius: 8px;
    background: ${props => props.$selected ? 'rgba(100, 108, 255, 0.2)' : 'rgba(40, 40, 40, 0.5)'};
    color: ${props => props.$selected ? '#fff' : '#ccc'};
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s ease;

    &:hover {
        border-color: #646cff;
        background: rgba(100, 108, 255, 0.1);
    }

    svg {
        width: 18px;
        height: 18px;
    }
`;

const ActionCard = styled.div`
    background: rgba(40, 40, 40, 0.5);
    border: 1px solid #333;
    border-radius: 12px;
    margin-bottom: 12px;
    overflow: hidden;

    &:last-child {
        margin-bottom: 0;
    }
`;

const ActionHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: rgba(30, 30, 30, 0.5);
    border-bottom: 1px solid #333;

    .action-type-icon {
        width: 32px;
        height: 32px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: ${props => props.$color || 'rgba(100, 108, 255, 0.2)'};
        color: ${props => props.$iconColor || '#646cff'};

        svg {
            width: 16px;
            height: 16px;
        }
    }

    .action-title {
        flex: 1;
        font-weight: 500;
        color: #e0e0e0;
    }
`;

const ActionContent = styled.div`
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const DeleteActionButton = styled.button`
    padding: 6px;
    border: 1px solid #555;
    border-radius: 6px;
    background: transparent;
    color: #888;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;

    &:hover {
        background: rgba(220, 38, 38, 0.1);
        border-color: #dc2626;
        color: #dc2626;
    }

    svg {
        width: 14px;
        height: 14px;
    }
`;

const AddActionButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 12px;
    border: 1px dashed #444;
    border-radius: 8px;
    background: transparent;
    color: #888;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s ease;

    &:hover {
        border-color: #646cff;
        color: #646cff;
        background: rgba(100, 108, 255, 0.05);
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;

const DelayRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: rgba(251, 191, 36, 0.1);
    border: 1px solid rgba(251, 191, 36, 0.3);
    border-radius: 6px;
    font-size: 0.85rem;
    color: #fbbf24;

    svg {
        width: 14px;
        height: 14px;
    }
`;

const VariablesHint = styled.div`
    padding: 12px;
    background: rgba(30, 30, 30, 0.5);
    border: 1px solid #333;
    border-radius: 8px;
    font-size: 0.85rem;
    color: #888;

    .var {
        color: #00ffdd;
        font-weight: 500;
    }
`;

const EVENT_TYPES = ['command', 'message', 'redemption', 'follow'];

const ACTION_TYPES = [
    { value: 'send_message', icon: FiMessageSquare, color: 'rgba(59, 130, 246, 0.2)', iconColor: '#3b82f6' },
    { value: 'add_vip', icon: FiStar, color: 'rgba(139, 92, 246, 0.2)', iconColor: '#8b5cf6' },
    { value: 'remove_vip', icon: FiStar, color: 'rgba(220, 38, 38, 0.2)', iconColor: '#dc2626' },
    { value: 'add_mod', icon: FiShield, color: 'rgba(34, 197, 94, 0.2)', iconColor: '#22c55e' },
    { value: 'remove_mod', icon: FiShield, color: 'rgba(220, 38, 38, 0.2)', iconColor: '#dc2626' },
    { value: 'timeout', icon: FiClock, color: 'rgba(251, 191, 36, 0.2)', iconColor: '#fbbf24' },
    { value: 'delete_message', icon: FiTrash2, color: 'rgba(107, 114, 128, 0.2)', iconColor: '#6b7280' },
];

const DELAY_UNITS = ['seconds', 'minutes', 'hours', 'days'];

export default function TriggerEditorPopup({ rule, onSave, onClose }) {
    const { t } = useTranslation();
    const [editedRule, setEditedRule] = useState(rule);
    const [rewards, setRewards] = useState([]);
    const [loadingRewards, setLoadingRewards] = useState(false);

    useEffect(() => {
        if (editedRule.condition.eventType === 'redemption') {
            loadRewards();
        }
    }, [editedRule.condition.eventType]);

    const loadRewards = async () => {
        setLoadingRewards(true);
        try {
            const response = await getTwitchRewards();
            setRewards(response || []);
        } catch (error) {
            console.error('Failed to load rewards:', error);
        } finally {
            setLoadingRewards(false);
        }
    };

    const updateRule = (updates) => {
        setEditedRule(prev => ({ ...prev, ...updates }));
    };

    const updateCondition = (updates) => {
        setEditedRule(prev => {
            const newCondition = { ...prev.condition, ...updates };

            // When changing event type, clear irrelevant fields
            if (updates.eventType) {
                if (updates.eventType === 'redemption' || updates.eventType === 'follow') {
                    // Redemption and follow don't use textMatch
                    delete newCondition.textMatch;
                } else {
                    // Command and message don't use rewardId
                    delete newCondition.rewardId;
                    // Initialize textMatch if not present
                    if (!newCondition.textMatch) {
                        newCondition.textMatch = {
                            type: 'starts',
                            value: '',
                            caseSensitive: false
                        };
                    }
                }
            }

            return {
                ...prev,
                condition: newCondition
            };
        });
    };

    const updateTextMatch = (updates) => {
        setEditedRule(prev => ({
            ...prev,
            condition: {
                ...prev.condition,
                textMatch: { ...prev.condition.textMatch, ...updates }
            }
        }));
    };

    const addAction = (actionType) => {
        const newAction = {
            id: uuidv4(),
            type: actionType,
            target: 'sender',
            params: {}
        };

        if (actionType === 'send_message') {
            newAction.params.message = '';
        } else if (actionType === 'timeout') {
            newAction.params.duration = 60;
            newAction.params.reason = '';
        }

        setEditedRule(prev => ({
            ...prev,
            actions: [...prev.actions, newAction]
        }));
    };

    const updateAction = (actionId, updates) => {
        setEditedRule(prev => ({
            ...prev,
            actions: prev.actions.map(a =>
                a.id === actionId ? { ...a, ...updates } : a
            )
        }));
    };

    const updateActionParams = (actionId, paramUpdates) => {
        setEditedRule(prev => ({
            ...prev,
            actions: prev.actions.map(a =>
                a.id === actionId ? { ...a, params: { ...a.params, ...paramUpdates } } : a
            )
        }));
    };

    const toggleActionDelay = (actionId, hasDelay) => {
        setEditedRule(prev => ({
            ...prev,
            actions: prev.actions.map(a => {
                if (a.id !== actionId) return a;
                if (hasDelay) {
                    return { ...a, delay: { value: 1, unit: 'hours' } };
                } else {
                    const { delay, ...rest } = a;
                    return rest;
                }
            })
        }));
    };

    const updateActionDelay = (actionId, delayUpdates) => {
        setEditedRule(prev => ({
            ...prev,
            actions: prev.actions.map(a =>
                a.id === actionId ? { ...a, delay: { ...a.delay, ...delayUpdates } } : a
            )
        }));
    };

    const deleteAction = (actionId) => {
        setEditedRule(prev => ({
            ...prev,
            actions: prev.actions.filter(a => a.id !== actionId)
        }));
    };

    const handleSave = () => {
        onSave(editedRule);
    };

    const isValid = () => {
        if (!editedRule.name.trim()) return false;
        if (editedRule.condition.eventType === 'redemption' && !editedRule.condition.rewardId) return false;
        if (['command', 'message'].includes(editedRule.condition.eventType) && !editedRule.condition.textMatch?.value) return false;
        return true;
    };

    const getEventIcon = (eventType) => {
        switch (eventType) {
            case 'command': return FiCommand;
            case 'message': return FiMessageSquare;
            case 'redemption': return FiGift;
            case 'follow': return FiUserPlus;
            default: return FiMessageSquare;
        }
    };

    const getActionConfig = (actionType) => {
        return ACTION_TYPES.find(a => a.value === actionType) || ACTION_TYPES[0];
    };

    const portalRoot = document.getElementById('popup-root') || document.body;

    return ReactDOM.createPortal(
        <PopupOverlay onClick={onClose}>
            <PopupContainer onClick={(e) => e.stopPropagation()}>
                <PopupHeader>
                    <h3>
                        <FiZap />
                        {editedRule.id ? t('settings.bot.triggers.editRule') : t('settings.bot.triggers.newRule')}
                    </h3>
                    <HeaderActions>
                        <HeaderButton onClick={onClose}>
                            <FiX />
                            {t('common.cancel')}
                        </HeaderButton>
                        <HeaderButton $primary onClick={handleSave} disabled={!isValid()}>
                            <FiSave />
                            {t('common.save')}
                        </HeaderButton>
                    </HeaderActions>
                </PopupHeader>

                <PopupContent>
                    {/* General Settings */}
                    <Section>
                        <SectionTitle>
                            <FiZap />
                            {t('settings.bot.triggers.generalSettings')}
                        </SectionTitle>
                        <FormRow>
                            <FormGroup $flex={2}>
                                <Label>{t('settings.bot.triggers.ruleName')}</Label>
                                <Input
                                    value={editedRule.name}
                                    onChange={(e) => updateRule({ name: e.target.value })}
                                    placeholder={t('settings.bot.triggers.ruleNamePlaceholder')}
                                />
                            </FormGroup>
                            <FormGroup $flex={1} $minWidth="150px">
                                <Label>{t('settings.bot.triggers.cooldown')}</Label>
                                <NumericEditorComponent
                                    width="100%"
                                    value={editedRule.cooldown || 0}
                                    onChange={(value) => updateRule({ cooldown: value })}
                                    min={0}
                                    max={3600}
                                />
                            </FormGroup>
                            <FormGroup $flex={1} $minWidth="150px">
                                <Label>{t('settings.bot.triggers.cooldownScope')}</Label>
                                <Select
                                    value={editedRule.cooldownScope || 'global'}
                                    onChange={(e) => updateRule({ cooldownScope: e.target.value })}
                                >
                                    <option value="global">{t('settings.bot.triggers.cooldownGlobal')}</option>
                                    <option value="per_user">{t('settings.bot.triggers.cooldownPerUser')}</option>
                                </Select>
                            </FormGroup>
                        </FormRow>
                    </Section>

                    {/* Condition */}
                    <Section>
                        <SectionTitle>
                            <FiAlertCircle />
                            {t('settings.bot.triggers.condition')}
                        </SectionTitle>

                        <Label>{t('settings.bot.triggers.eventType')}</Label>
                        <EventTypeSelector style={{ marginBottom: '16px' }}>
                            {EVENT_TYPES.map((type) => {
                                const Icon = getEventIcon(type);
                                return (
                                    <EventTypeButton
                                        key={type}
                                        $selected={editedRule.condition.eventType === type}
                                        onClick={() => updateCondition({ eventType: type })}
                                    >
                                        <Icon />
                                        {t(`settings.bot.triggers.eventTypes.${type}`)}
                                    </EventTypeButton>
                                );
                            })}
                        </EventTypeSelector>

                        {/* Text match for command/message */}
                        {['command', 'message'].includes(editedRule.condition.eventType) && (
                            <FormRow>
                                <FormGroup $flex={1} $minWidth="150px">
                                    <Label>{t('settings.bot.triggers.matchType')}</Label>
                                    <Select
                                        value={editedRule.condition.textMatch?.type || 'starts'}
                                        onChange={(e) => updateTextMatch({ type: e.target.value })}
                                    >
                                        <option value="exact">{t('settings.bot.triggers.matchExact')}</option>
                                        <option value="starts">{t('settings.bot.triggers.matchStarts')}</option>
                                        <option value="contains">{t('settings.bot.triggers.matchContains')}</option>
                                        <option value="regex">{t('settings.bot.triggers.matchRegex')}</option>
                                    </Select>
                                </FormGroup>
                                <FormGroup $flex={2}>
                                    <Label>{t('settings.bot.triggers.matchValue')}</Label>
                                    <Input
                                        value={editedRule.condition.textMatch?.value || ''}
                                        onChange={(e) => updateTextMatch({ value: e.target.value })}
                                        placeholder={t('settings.bot.triggers.matchValuePlaceholder')}
                                    />
                                </FormGroup>
                            </FormRow>
                        )}

                        {/* Reward selector for redemption */}
                        {editedRule.condition.eventType === 'redemption' && (
                            <FormGroup>
                                <Label>{t('settings.bot.triggers.selectReward')}</Label>
                                {loadingRewards ? (
                                    <span style={{ color: '#888' }}>{t('common.loading')}</span>
                                ) : (
                                    <Select
                                        value={editedRule.condition.rewardId || ''}
                                        onChange={(e) => {
                                            const selectedReward = rewards.find(r => r.id === e.target.value);
                                            updateCondition({
                                                rewardId: e.target.value,
                                                rewardTitle: selectedReward?.title || ''
                                            });
                                        }}
                                    >
                                        <option value="">{t('settings.bot.triggers.selectRewardPlaceholder')}</option>
                                        {rewards.map(reward => (
                                            <option key={reward.id} value={reward.id}>
                                                {reward.title} ({reward.cost} pts)
                                            </option>
                                        ))}
                                    </Select>
                                )}
                            </FormGroup>
                        )}
                    </Section>

                    {/* Actions */}
                    <Section>
                        <SectionTitle>
                            <FiChevronDown />
                            {t('settings.bot.triggers.actions')}
                        </SectionTitle>

                        {editedRule.actions.map((action) => {
                            const actionConfig = getActionConfig(action.type);
                            const ActionIcon = actionConfig.icon;

                            return (
                                <ActionCard key={action.id}>
                                    <ActionHeader $color={actionConfig.color} $iconColor={actionConfig.iconColor}>
                                        <div className="action-type-icon">
                                            <ActionIcon />
                                        </div>
                                        <span className="action-title">
                                            {t(`settings.bot.triggers.actionTypes.${action.type}`)}
                                        </span>
                                        <Select
                                            value={action.target}
                                            onChange={(e) => updateAction(action.id, { target: e.target.value })}
                                            style={{ width: '140px' }}
                                        >
                                            <option value="sender">{t('settings.bot.triggers.targetSender')}</option>
                                            <option value="arg_user">{t('settings.bot.triggers.targetArgUser')}</option>
                                        </Select>
                                        <DeleteActionButton onClick={() => deleteAction(action.id)}>
                                            <FiTrash2 />
                                        </DeleteActionButton>
                                    </ActionHeader>
                                    <ActionContent>
                                        {/* Message input for send_message */}
                                        {action.type === 'send_message' && (
                                            <>
                                                <TextArea
                                                    value={action.params.message || ''}
                                                    onChange={(e) => updateActionParams(action.id, { message: e.target.value })}
                                                    placeholder={t('settings.bot.triggers.messagePlaceholder')}
                                                />
                                                <VariablesHint>
                                                    {t('settings.bot.triggers.availableVariables')}: <span className="var">${'{user}'}</span>, <span className="var">${'{target}'}</span>, <span className="var">${'{args[0]}'}</span>
                                                </VariablesHint>
                                            </>
                                        )}

                                        {/* Duration for timeout */}
                                        {action.type === 'timeout' && (
                                            <FormRow>
                                                <FormGroup $minWidth="120px">
                                                    <Label>{t('settings.bot.triggers.timeoutDuration')}</Label>
                                                    <NumericEditorComponent
                                                        width="100%"
                                                        value={action.params.duration || 60}
                                                        onChange={(value) => updateActionParams(action.id, { duration: value })}
                                                        min={1}
                                                        max={1209600}
                                                    />
                                                </FormGroup>
                                                <FormGroup $flex={2}>
                                                    <Label>{t('settings.bot.triggers.timeoutReason')}</Label>
                                                    <Input
                                                        value={action.params.reason || ''}
                                                        onChange={(e) => updateActionParams(action.id, { reason: e.target.value })}
                                                        placeholder={t('settings.bot.triggers.timeoutReasonPlaceholder')}
                                                    />
                                                </FormGroup>
                                            </FormRow>
                                        )}

                                        {/* Delay toggle */}
                                        <FormRow style={{ alignItems: 'center' }}>
                                            <Switch
                                                checked={!!action.delay}
                                                onChange={(e) => toggleActionDelay(action.id, e.target.checked)}
                                            />
                                            <span style={{ color: '#ccc', fontSize: '0.9rem' }}>
                                                {t('settings.bot.triggers.enableDelay')}
                                            </span>
                                        </FormRow>

                                        {/* Delay settings */}
                                        {action.delay && (
                                            <DelayRow>
                                                <FiClock />
                                                <span>{t('settings.bot.triggers.executeAfter')}</span>
                                                <NumericEditorComponent
                                                    width="80px"
                                                    value={action.delay.value}
                                                    onChange={(value) => updateActionDelay(action.id, { value })}
                                                    min={1}
                                                    max={365}
                                                />
                                                <Select
                                                    value={action.delay.unit}
                                                    onChange={(e) => updateActionDelay(action.id, { unit: e.target.value })}
                                                    style={{ width: '120px', height: '32px' }}
                                                >
                                                    {DELAY_UNITS.map(unit => (
                                                        <option key={unit} value={unit}>
                                                            {t(`settings.bot.triggers.delayUnits.${unit}`)}
                                                        </option>
                                                    ))}
                                                </Select>
                                            </DelayRow>
                                        )}
                                    </ActionContent>
                                </ActionCard>
                            );
                        })}

                        {/* Add action dropdown */}
                        <AddActionButton onClick={() => addAction('send_message')}>
                            <FiPlus />
                            {t('settings.bot.triggers.addAction')}
                        </AddActionButton>

                        {/* Quick action buttons */}
                        <EventTypeSelector style={{ marginTop: '12px' }}>
                            {ACTION_TYPES.map((actionType) => {
                                const Icon = actionType.icon;
                                return (
                                    <EventTypeButton
                                        key={actionType.value}
                                        onClick={() => addAction(actionType.value)}
                                        style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                                    >
                                        <Icon style={{ width: 14, height: 14 }} />
                                        {t(`settings.bot.triggers.actionTypes.${actionType.value}`)}
                                    </EventTypeButton>
                                );
                            })}
                        </EventTypeSelector>
                    </Section>
                </PopupContent>
            </PopupContainer>
        </PopupOverlay>,
        portalRoot
    );
}
