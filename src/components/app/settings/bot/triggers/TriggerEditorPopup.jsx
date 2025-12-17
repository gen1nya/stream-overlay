import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import styled from "styled-components";
import { useTranslation } from 'react-i18next';
import {
    FiX, FiSave, FiZap, FiMessageSquare, FiGift, FiUserPlus, FiCommand,
    FiClock, FiPlus, FiTrash2, FiChevronDown, FiStar, FiShield, FiSettings,
    FiArrowRight, FiUsers, FiExternalLink
} from 'react-icons/fi';
import Switch from "../../../../utils/Switch";
import NumericEditorComponent from "../../../../utils/NumericEditorComponent";
import DebouncedTextarea from "../../../../utils/DebouncedTextarea";
import { getTwitchRewards } from "../../../../../services/api";
import { v4 as uuidv4 } from 'uuid';
import {Spacer} from "../../../../utils/Separator";

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
    max-width: 900px;
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

// Flow components
const FlowConnector = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px 0;

    &::before {
        content: '';
        width: 2px;
        height: 16px;
        background: linear-gradient(180deg, #646cff 0%, #00ffdd 100%);
    }

    svg {
        color: #00ffdd;
        width: 20px;
        height: 20px;
    }

    &::after {
        content: '';
        width: 2px;
        height: 16px;
        background: linear-gradient(180deg, #00ffdd 0%, #646cff 100%);
    }
`;

const FlowStep = styled.div`
    background: rgba(40, 40, 40, 0.5);
    border: 1px solid #333;
    border-radius: 12px;
    overflow: hidden;
    transition: all 0.2s ease;

    &:hover {
        border-color: #444;
    }
`;

const FlowStepHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 20px;
    background: ${props => props.$color || 'rgba(100, 108, 255, 0.1)'};
    border-bottom: 1px solid #333;

    svg {
        width: 20px;
        height: 20px;
        color: ${props => props.$iconColor || '#646cff'};
    }

    h4 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        color: #e0e0e0;
    }

    .step-badge {
        margin-left: auto;
        padding: 4px 10px;
        border-radius: 6px;
        font-size: 0.8rem;
        font-weight: 500;
        background: rgba(0, 0, 0, 0.3);
        color: ${props => props.$iconColor || '#646cff'};
    }
`;

const FlowStepContent = styled.div`
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

// Form elements
const FormRow = styled.div`
    display: flex;
    gap: 12px;
    align-items: ${props => props.$align || 'flex-start'};
    flex-wrap: wrap;
`;

const FormGroup = styled.div`
    flex: ${props => props.$flex || 1};
    min-width: ${props => props.$minWidth || '150px'};
`;

const Label = styled.label`
    display: block;
    margin-bottom: 8px;
    font-size: 0.85rem;
    color: #aaa;
`;

const Input = styled.input`
    width: 100%;
    padding: 10px 14px;
    border: 1px solid #444;
    border-radius: 8px;
    background: #1e1e1e;
    color: #fff;
    font-size: 14px;
    transition: all 0.2s ease;
    box-sizing: border-box;

    &::placeholder {
        color: #666;
    }

    &:focus {
        outline: none;
        border-color: #646cff;
        background: #252525;
    }
`;

const Select = styled.select`
    width: 100%;
    height: 40px;
    padding: 0 12px;
    border: 1px solid #444;
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
    padding: 10px 14px;
    border: 1px solid ${props => props.$selected ? props.$borderColor || '#646cff' : '#333'};
    border-radius: 8px;
    background: ${props => props.$selected ? props.$bgColor || 'rgba(100, 108, 255, 0.15)' : 'rgba(30, 30, 30, 0.5)'};
    color: ${props => props.$selected ? '#fff' : '#888'};
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s ease;

    &:hover {
        border-color: ${props => props.$borderColor || '#646cff'};
        background: ${props => props.$bgColor || 'rgba(100, 108, 255, 0.1)'};
        color: #ccc;
    }

    svg {
        width: 16px;
        height: 16px;
        color: ${props => props.$selected ? props.$iconColor || '#646cff' : '#666'};
    }
`;

// Action components
const ActionsList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const ActionCard = styled.div`
    background: rgba(30, 30, 30, 0.5);
    border: 1px solid #333;
    border-radius: 10px;
    overflow: hidden;
`;

const ActionHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    background: rgba(20, 20, 20, 0.5);

    .action-icon {
        width: 28px;
        height: 28px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: ${props => props.$color || 'rgba(100, 108, 255, 0.2)'};
        color: ${props => props.$iconColor || '#646cff'};

        svg {
            width: 14px;
            height: 14px;
        }
    }

    .action-title {
        flex: 1;
        font-size: 0.9rem;
        font-weight: 500;
        color: #e0e0e0;
    }
`;

const ActionContent = styled.div`
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    border-top: 1px solid #333;
`;

const DeleteButton = styled.button`
    padding: 6px;
    border: 1px solid transparent;
    border-radius: 6px;
    background: transparent;
    color: #666;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;

    &:hover {
        background: rgba(220, 38, 38, 0.1);
        border-color: rgba(220, 38, 38, 0.3);
        color: #dc2626;
    }

    svg {
        width: 14px;
        height: 14px;
    }
`;

const AddActionButtons = styled.div`
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-top: 8px;
`;

const AddActionButton = styled.button`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border: 1px dashed #444;
    border-radius: 8px;
    background: transparent;
    color: #888;
    cursor: pointer;
    font-size: 0.8rem;
    transition: all 0.2s ease;

    &:hover {
        border-color: ${props => props.$hoverColor || '#646cff'};
        border-style: solid;
        color: ${props => props.$hoverColor || '#646cff'};
        background: ${props => props.$hoverBg || 'rgba(100, 108, 255, 0.05)'};
    }

    svg {
        width: 14px;
        height: 14px;
    }
`;

const DelayBadge = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    background: rgba(251, 191, 36, 0.1);
    border: 1px solid rgba(251, 191, 36, 0.3);
    border-radius: 6px;
    font-size: 0.8rem;
    color: #fbbf24;

    svg {
        width: 12px;
        height: 12px;
    }
`;

const VariablesHint = styled.div`
    padding: 8px 10px;
    background: rgba(0, 255, 221, 0.05);
    border: 1px solid rgba(0, 255, 221, 0.2);
    border-radius: 6px;
    font-size: 0.8rem;
    color: #888;

    .var {
        color: #00ffdd;
        font-weight: 500;
        font-family: monospace;
    }
`;

const SettingsRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    background: rgba(30, 30, 30, 0.3);
    border-radius: 8px;

    span {
        color: #aaa;
        font-size: 0.9rem;
    }
`;

const EVENT_TYPE_CONFIG = {
    command: { icon: FiCommand, color: 'rgba(100, 108, 255, 0.15)', borderColor: '#646cff', iconColor: '#646cff' },
    message: { icon: FiMessageSquare, color: 'rgba(59, 130, 246, 0.15)', borderColor: '#3b82f6', iconColor: '#3b82f6' },
    redemption: { icon: FiGift, color: 'rgba(139, 92, 246, 0.15)', borderColor: '#8b5cf6', iconColor: '#8b5cf6' },
    follow: { icon: FiUserPlus, color: 'rgba(34, 197, 94, 0.15)', borderColor: '#22c55e', iconColor: '#22c55e' },
    raid: { icon: FiUsers, color: 'rgba(249, 115, 22, 0.15)', borderColor: '#f97316', iconColor: '#f97316' },
};

const ACTION_TYPES = [
    { value: 'send_message', icon: FiMessageSquare, color: 'rgba(59, 130, 246, 0.2)', iconColor: '#3b82f6' },
    { value: 'shoutout', icon: FiExternalLink, color: 'rgba(249, 115, 22, 0.2)', iconColor: '#f97316' },
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

            if (updates.eventType) {
                if (updates.eventType === 'redemption' || updates.eventType === 'follow' || updates.eventType === 'raid') {
                    delete newCondition.textMatch;
                } else {
                    delete newCondition.rewardId;
                    delete newCondition.rewardTitle;
                    if (!newCondition.textMatch) {
                        newCondition.textMatch = { type: 'starts', value: '', caseSensitive: false };
                    }
                }
            }

            return { ...prev, condition: newCondition };
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
            actions: prev.actions.map(a => a.id === actionId ? { ...a, ...updates } : a)
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

    const getActionConfig = (actionType) => {
        return ACTION_TYPES.find(a => a.value === actionType) || ACTION_TYPES[0];
    };

    const eventConfig = EVENT_TYPE_CONFIG[editedRule.condition.eventType] || EVENT_TYPE_CONFIG.command;
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
                    {/* Rule Name */}
                    <FormGroup style={{ marginBottom: '20px' }}>
                        <Label>{t('settings.bot.triggers.ruleName')}</Label>
                        <Input
                            value={editedRule.name}
                            onChange={(e) => updateRule({ name: e.target.value })}
                            placeholder={t('settings.bot.triggers.ruleNamePlaceholder')}
                        />
                    </FormGroup>

                    {/* STEP 1: IF (Condition) */}
                    <FlowStep>
                        <FlowStepHeader $color={eventConfig.color} $iconColor={eventConfig.iconColor}>
                            <FiZap />
                            <h4>{t('settings.bot.triggers.conditionIf')}</h4>
                            <span className="step-badge">
                                {t(`settings.bot.triggers.eventTypes.${editedRule.condition.eventType}`)}
                            </span>
                        </FlowStepHeader>
                        <FlowStepContent>
                            <Label style={{ margin: 0 }}>{t('settings.bot.triggers.eventType')}</Label>
                            <EventTypeSelector>
                                {Object.entries(EVENT_TYPE_CONFIG).map(([type, config]) => {
                                    const Icon = config.icon;
                                    return (
                                        <EventTypeButton
                                            key={type}
                                            $selected={editedRule.condition.eventType === type}
                                            $bgColor={config.color}
                                            $borderColor={config.borderColor}
                                            $iconColor={config.iconColor}
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
                                    <FormGroup $flex={1} $minWidth="120px">
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
                                        <span style={{ color: '#888', fontSize: '0.9rem' }}>{t('common.loading')}</span>
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

                            {/* Follow has no additional config */}
                            {editedRule.condition.eventType === 'follow' && (
                                <div style={{ color: '#888', fontSize: '0.9rem', fontStyle: 'italic' }}>
                                    {t('settings.bot.triggers.followNoConfig')}
                                </div>
                            )}
                        </FlowStepContent>
                    </FlowStep>

                    <FlowConnector>
                        <FiChevronDown />
                    </FlowConnector>

                    {/* STEP 2: THEN (Actions) */}
                    <FlowStep>
                        <FlowStepHeader $color="rgba(34, 197, 94, 0.1)" $iconColor="#22c55e">
                            <FiArrowRight />
                            <h4>{t('settings.bot.triggers.actionsThen')}</h4>
                            <span className="step-badge">
                                {editedRule.actions.length} {t('settings.bot.triggers.actionsCount', { count: editedRule.actions.length })}
                            </span>
                        </FlowStepHeader>
                        <FlowStepContent>
                            <ActionsList>
                                {editedRule.actions.map((action) => {
                                    const actionConfig = getActionConfig(action.type);
                                    const ActionIcon = actionConfig.icon;

                                    return (
                                        <ActionCard key={action.id}>
                                            <ActionHeader $color={actionConfig.color} $iconColor={actionConfig.iconColor}>
                                                <div className="action-icon">
                                                    <ActionIcon />
                                                </div>
                                                <span className="action-title">
                                                    {t(`settings.bot.triggers.actionTypes.${action.type}`)}
                                                </span>
                                                <Select
                                                    value={action.target}
                                                    onChange={(e) => updateAction(action.id, { target: e.target.value })}
                                                    style={{ width: '130px', height: '32px', fontSize: '0.85rem' }}
                                                >
                                                    <option value="sender">{t('settings.bot.triggers.targetSender')}</option>
                                                    <option value="arg_user">{t('settings.bot.triggers.targetArgUser')}</option>
                                                </Select>
                                                <DeleteButton onClick={() => deleteAction(action.id)}>
                                                    <FiTrash2 />
                                                </DeleteButton>
                                            </ActionHeader>
                                            <ActionContent>
                                                {/* Message input */}
                                                {action.type === 'send_message' && (
                                                    <>
                                                        <DebouncedTextarea
                                                            value={action.params.message || ''}
                                                            onChange={(value) => updateActionParams(action.id, { message: value })}
                                                            placeholder={t('settings.bot.triggers.messagePlaceholder')}
                                                            maxLength={500}
                                                            minHeight="70px"
                                                        />
                                                        <VariablesHint>
                                                            {t('settings.bot.triggers.availableVariables')}:{' '}
                                                            <span className="var">${'{user}'}</span>
                                                            {editedRule.condition.eventType !== 'follow' && editedRule.condition.eventType !== 'raid' && (
                                                                <>, <span className="var">${'{target}'}</span>, <span className="var">${'{args[0]}'}</span></>
                                                            )}
                                                            {editedRule.condition.eventType === 'raid' && (
                                                                <>, <span className="var">${'{raider}'}</span>, <span className="var">${'{viewers}'}</span></>
                                                            )}
                                                            {editedRule.condition.eventType === 'redemption' && (
                                                                <>, <span className="var">${'{reward}'}</span>, <span className="var">${'{reward_cost}'}</span></>
                                                            )}
                                                        </VariablesHint>
                                                    </>
                                                )}

                                                {/* Timeout settings */}
                                                {action.type === 'timeout' && (
                                                    <FormRow>
                                                        <FormGroup $minWidth="100px" $flex={0}>
                                                            <Label>{t('settings.bot.triggers.timeoutDuration')}</Label>
                                                            <NumericEditorComponent
                                                                width="100px"
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
                                                <FormRow $align="center">
                                                    <Switch
                                                        checked={!!action.delay}
                                                        onChange={(e) => toggleActionDelay(action.id, e.target.checked)}
                                                    />
                                                    <span style={{ color: '#aaa', fontSize: '0.85rem' }}>
                                                        {t('settings.bot.triggers.enableDelay')}
                                                    </span>
                                                    {action.delay && (
                                                        <DelayBadge style={{ marginLeft: 'auto' }}>
                                                            <FiClock />
                                                            <NumericEditorComponent
                                                                width="60px"
                                                                value={action.delay.value}
                                                                onChange={(value) => updateActionDelay(action.id, { value })}
                                                                min={1}
                                                                max={365}
                                                            />
                                                            <Select
                                                                value={action.delay.unit}
                                                                onChange={(e) => updateActionDelay(action.id, { unit: e.target.value })}
                                                                style={{ width: '100px', height: '28px', fontSize: '0.8rem', background: 'transparent', border: 'none', color: '#fbbf24' }}
                                                            >
                                                                {DELAY_UNITS.map(unit => (
                                                                    <option key={unit} value={unit}>
                                                                        {t(`settings.bot.triggers.delayUnits.${unit}`)}
                                                                    </option>
                                                                ))}
                                                            </Select>
                                                        </DelayBadge>
                                                    )}
                                                </FormRow>
                                            </ActionContent>
                                        </ActionCard>
                                    );
                                })}
                            </ActionsList>

                            {editedRule.actions.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '20px', color: '#666', fontSize: '0.9rem' }}>
                                    {t('settings.bot.triggers.noActions')}
                                </div>
                            )}

                            <AddActionButtons>
                                {ACTION_TYPES.map((actionType) => {
                                    const Icon = actionType.icon;
                                    return (
                                        <AddActionButton
                                            key={actionType.value}
                                            onClick={() => addAction(actionType.value)}
                                            $hoverColor={actionType.iconColor}
                                            $hoverBg={actionType.color}
                                        >
                                            <Icon />
                                            {t(`settings.bot.triggers.actionTypes.${actionType.value}`)}
                                        </AddActionButton>
                                    );
                                })}
                            </AddActionButtons>
                        </FlowStepContent>
                    </FlowStep>

                    <FlowConnector>
                        <FiChevronDown />
                    </FlowConnector>

                    {/* STEP 3: Settings */}
                    <FlowStep>
                        <FlowStepHeader $color="rgba(107, 114, 128, 0.1)" $iconColor="#6b7280">
                            <FiSettings />
                            <h4>{t('settings.bot.triggers.additionalSettings')}</h4>
                        </FlowStepHeader>
                        <FlowStepContent>
                            <FormRow>
                                <FormGroup $flex={1} $minWidth="120px">
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

                            <div>
                                <SettingsRow>
                                    <Switch
                                        checked={editedRule.stopPropagation || false}
                                        onChange={(e) => updateRule({ stopPropagation: e.target.checked })}
                                    />
                                    <span>{t('settings.bot.triggers.stopPropagation')}</span>
                                </SettingsRow>
                                <div style={{ marginTop: '8px', marginLeft: '50px', fontSize: '0.8rem', color: '#666' }}>
                                    {t('settings.bot.triggers.stopPropagationHint')}
                                </div>
                            </div>
                        </FlowStepContent>
                    </FlowStep>
                </PopupContent>
            </PopupContainer>
        </PopupOverlay>,
        portalRoot
    );
}
