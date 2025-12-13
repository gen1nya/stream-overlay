import React, { useEffect, useState } from "react";
import styled from "styled-components";
import Switch from "../../../../utils/Switch";
import NumericEditorComponent from "../../../../utils/NumericEditorComponent";
import { useTranslation } from 'react-i18next';
import {
    FiGift, FiPlay, FiUsers, FiClock, FiMessageSquare,
    FiChevronDown, FiChevronUp, FiPlus, FiTrash2, FiSettings,
    FiAward, FiSlash, FiRefreshCw
} from 'react-icons/fi';
import {
    CardContent,
    CardTitle,
    ControlGroup,
    Section,
    SectionHeader,
    SectionTitle,
    SettingsCard,
    InfoBadge
} from "../../SharedSettingsStyles";
import { Spacer } from "../../../../utils/Separator";
import { Row } from "../../../SettingsComponent";
import {
    AddButton,
    CollapsedPreview,
    CollapsibleHeader,
    EnabledToggle,
    ParameterCard,
    ParameterTitle,
    StatusBadge,
    VariableItem,
    VariablesList,
    NameInput,
    FormRow,
    ErrorText
} from "../SharedBotStyles";
import { TagInput } from "../roulette/TagInput";
import { getTwitchRewards } from "../../../../../services/api";

// Flow step connector
const FlowConnector = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px 0;

    &::before {
        content: '';
        width: 2px;
        height: 20px;
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
        height: 20px;
        background: linear-gradient(180deg, #00ffdd 0%, #646cff 100%);
    }
`;

// Flow step card
const FlowStep = styled.div`
    background: rgba(40, 40, 40, 0.5);
    border: 1px solid ${props => props.$active ? '#646cff' : '#333'};
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
    padding: 16px 20px;
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
`;

const FlowStepContent = styled.div`
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const MessageInput = styled.textarea`
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

    &::placeholder {
        color: #888;
    }

    &:focus {
        outline: none;
        border-color: #646cff;
        background: #252525;
    }
`;

const WarmupTriggerCard = styled.div`
    background: rgba(30, 30, 30, 0.5);
    border: 1px solid #333;
    border-radius: 8px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const WarmupHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;

    .type-badge {
        padding: 4px 10px;
        border-radius: 6px;
        font-size: 0.8rem;
        font-weight: 600;
        background: ${props => props.$type === 'time'
            ? 'rgba(251, 191, 36, 0.2)'
            : 'rgba(34, 197, 94, 0.2)'};
        color: ${props => props.$type === 'time' ? '#fbbf24' : '#22c55e'};
        border: 1px solid ${props => props.$type === 'time'
            ? 'rgba(251, 191, 36, 0.3)'
            : 'rgba(34, 197, 94, 0.3)'};
    }
`;

const DeleteButton = styled.button`
    padding: 8px;
    border: 1px solid #555;
    border-radius: 8px;
    background: rgba(220, 38, 38, 0.1);
    color: #dc2626;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    margin-left: auto;

    &:hover {
        background: rgba(220, 38, 38, 0.2);
        border-color: #dc2626;
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;

const Select = styled.select`
    padding: 10px 12px;
    border: 1px solid #555;
    border-radius: 8px;
    background: #1e1e1e;
    color: #fff;
    font-size: 14px;
    cursor: pointer;

    &:focus {
        outline: none;
        border-color: #646cff;
    }

    option {
        background: #1e1e1e;
        color: #fff;
    }
`;

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
    }

    ${CollapsibleHeader}:hover & {
        color: #ccc;
    }
`;

const RewardSelector = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
`;

const RewardChip = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: ${props => props.$selected
        ? 'rgba(100, 108, 255, 0.2)'
        : 'rgba(40, 40, 40, 0.5)'};
    border: 1px solid ${props => props.$selected ? '#646cff' : '#333'};
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.9rem;
    color: ${props => props.$selected ? '#fff' : '#ccc'};

    &:hover {
        border-color: #646cff;
        background: rgba(100, 108, 255, 0.1);
    }

    .cost {
        font-size: 0.8rem;
        color: #888;
    }
`;

const DEFAULT_LOTTERY_CONFIG = {
    enabled: false,
    command: '!розыгрыш',
    cancelCommand: '!отмена',
    commandCooldownSec: 60,
    allowChatEntry: true,
    entryTrigger: '+',
    channelPointRewardIds: [],
    timerDurationSec: 60,
    requireSubjectInChat: true,
    enforceUniqueSubject: false,
    subjectBlacklist: [
        'streamelements',
        'nightbot',
        'fossabot',
        'streamlabs',
        'wizebot',
        'moobot',
        'coebot',
        'phantombot',
        'stayhydratedbot',
        'botisimo'
    ],
    messages: {
        start: 'Розыгрыш {{subject}} начат! Пиши {{trigger}} чтобы участвовать! Осталось {{timer}} сек.',
        warmup: [],
        winner: 'Победитель: {{winner}}! Поздравляем с {{subject}}!',
        noParticipants: 'Никто не захотел участвовать в розыгрыше {{subject}}',
        alreadyUsed: '{{subject}} уже разыгрывался ранее!',
        alreadyRunning: 'Розыгрыш уже идёт! Пиши {{trigger}} чтобы участвовать.',
        cooldown: 'Подожди ещё {{cooldown}} сек перед следующим розыгрышем.',
        cancelled: 'Розыгрыш {{subject}} отменён.',
        subjectRequired: 'Укажите предмет розыгрыша! Пример: {{command}} приз',
        subjectBlacklisted: '{{subject}} в чёрном списке и не может быть предметом розыгрыша'
    }
};

export default function LotteryComponent({ botConfig, apply }) {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [rewards, setRewards] = useState([]);
    const [loadingRewards, setLoadingRewards] = useState(false);

    // Merge with defaults
    const config = {
        ...DEFAULT_LOTTERY_CONFIG,
        ...botConfig?.lottery,
        messages: {
            ...DEFAULT_LOTTERY_CONFIG.messages,
            ...botConfig?.lottery?.messages
        }
    };

    const enabled = config.enabled;

    useEffect(() => {
        if (isOpen) {
            loadRewards();
        }
    }, [isOpen]);

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

    const updateConfig = (updater) => {
        apply((prev) => ({
            ...prev,
            lottery: {
                ...DEFAULT_LOTTERY_CONFIG,
                ...prev.lottery,
                ...updater({
                    ...DEFAULT_LOTTERY_CONFIG,
                    ...prev.lottery,
                    messages: {
                        ...DEFAULT_LOTTERY_CONFIG.messages,
                        ...prev.lottery?.messages
                    }
                })
            }
        }));
    };

    const updateMessage = (key, value) => {
        updateConfig((prev) => ({
            messages: {
                ...prev.messages,
                [key]: value
            }
        }));
    };

    const addWarmupTrigger = () => {
        updateConfig((prev) => ({
            messages: {
                ...prev.messages,
                warmup: [
                    ...prev.messages.warmup,
                    {
                        id: Date.now().toString(),
                        type: 'time',
                        value: 30,
                        message: t('settings.bot.lottery.warmup.defaultMessage')
                    }
                ]
            }
        }));
    };

    const updateWarmupTrigger = (id, updates) => {
        updateConfig((prev) => ({
            messages: {
                ...prev.messages,
                warmup: prev.messages.warmup.map(w =>
                    w.id === id ? { ...w, ...updates } : w
                )
            }
        }));
    };

    const deleteWarmupTrigger = (id) => {
        updateConfig((prev) => ({
            messages: {
                ...prev.messages,
                warmup: prev.messages.warmup.filter(w => w.id !== id)
            }
        }));
    };

    const toggleReward = (rewardId) => {
        updateConfig((prev) => {
            const current = prev.channelPointRewardIds || [];
            const newRewards = current.includes(rewardId)
                ? current.filter(id => id !== rewardId)
                : [...current, rewardId];

            // Автоматически управляем allowChatEntry:
            // - Если добавляем награды → отключаем вход через чат
            // - Если убираем все награды → включаем вход через чат
            const allowChatEntry = newRewards.length === 0;

            return { channelPointRewardIds: newRewards, allowChatEntry };
        });
    };

    return (
        <SettingsCard>
            <CollapsibleHeader onClick={() => setIsOpen(!isOpen)}>
                <Row gap="12px">
                    <EnabledToggle enabled={enabled}>
                        <Switch
                            checked={enabled}
                            onChange={(e) => {
                                e.stopPropagation();
                                updateConfig(() => ({ enabled: e.target.checked }));
                            }}
                        />
                        <StatusBadge enabled={enabled}>
                            {enabled
                                ? t('settings.bot.shared.status.enabled')
                                : t('settings.bot.shared.status.disabled')}
                        </StatusBadge>
                    </EnabledToggle>

                    <CardTitle>
                        <FiGift />
                        {t('settings.bot.lottery.title')}
                    </CardTitle>

                    <Spacer />

                    <CollapseToggle>
                        {isOpen
                            ? t('settings.bot.shared.collapse.close')
                            : t('settings.bot.shared.collapse.open')}
                        {isOpen ? <FiChevronUp /> : <FiChevronDown />}
                    </CollapseToggle>
                </Row>
            </CollapsibleHeader>

            {!isOpen && (
                <CollapsedPreview onClick={() => setIsOpen(true)}>
                    {t('settings.bot.lottery.preview')}
                </CollapsedPreview>
            )}

            {isOpen && (
                <CardContent>
                    {/* STEP 1: START */}
                    <FlowStep>
                        <FlowStepHeader $color="rgba(100, 108, 255, 0.1)" $iconColor="#646cff">
                            <FiPlay />
                            <h4>{t('settings.bot.lottery.flow.start.title')}</h4>
                        </FlowStepHeader>
                        <FlowStepContent>
                            <Row gap="20px">
                                <ParameterCard style={{ flex: 1 }}>
                                    <ParameterTitle>
                                        <FiMessageSquare />
                                        {t('settings.bot.lottery.flow.start.command')}
                                    </ParameterTitle>
                                    <NameInput
                                        value={config.command}
                                        onChange={(e) => updateConfig(() => ({ command: e.target.value }))}
                                        placeholder="!розыгрыш"
                                    />
                                </ParameterCard>

                                <ParameterCard style={{ flex: 1 }}>
                                    <ParameterTitle>
                                        <FiSlash />
                                        {t('settings.bot.lottery.flow.start.cancelCommand')}
                                    </ParameterTitle>
                                    <NameInput
                                        value={config.cancelCommand}
                                        onChange={(e) => updateConfig(() => ({ cancelCommand: e.target.value }))}
                                        placeholder="!отмена"
                                    />
                                    <span style={{ fontSize: '0.8rem', color: '#888' }}>
                                        {t('settings.bot.lottery.flow.start.cancelHint')}
                                    </span>
                                </ParameterCard>

                                <ParameterCard>
                                    <ParameterTitle>
                                        <FiClock />
                                        {t('settings.bot.lottery.flow.start.cooldown')}
                                    </ParameterTitle>
                                    <NumericEditorComponent
                                        width="120px"
                                        value={config.commandCooldownSec}
                                        onChange={(value) => updateConfig(() => ({ commandCooldownSec: value }))}
                                        min={0}
                                        max={3600}
                                    />
                                </ParameterCard>
                            </Row>

                            <div>
                                <label style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: '8px', display: 'block' }}>
                                    {t('settings.bot.lottery.flow.start.message')}
                                </label>
                                <MessageInput
                                    value={config.messages.start}
                                    onChange={(e) => updateMessage('start', e.target.value)}
                                    placeholder={t('settings.bot.lottery.flow.start.messagePlaceholder')}
                                />
                                <VariablesList style={{ marginTop: '8px' }}>
                                    <VariableItem><span className="var">{'{{subject}}'}</span><span className="desc">{t('settings.bot.lottery.variables.subject')}</span></VariableItem>
                                    <VariableItem><span className="var">{'{{initiator}}'}</span><span className="desc">{t('settings.bot.lottery.variables.initiator')}</span></VariableItem>
                                    <VariableItem><span className="var">{'{{timer}}'}</span><span className="desc">{t('settings.bot.lottery.variables.timer')}</span></VariableItem>
                                    <VariableItem><span className="var">{'{{trigger}}'}</span><span className="desc">{t('settings.bot.lottery.variables.trigger')}</span></VariableItem>
                                </VariablesList>
                            </div>
                        </FlowStepContent>
                    </FlowStep>

                    <FlowConnector>
                        <FiChevronDown />
                    </FlowConnector>

                    {/* STEP 2: ENTRY */}
                    <FlowStep>
                        <FlowStepHeader $color="rgba(34, 197, 94, 0.1)" $iconColor="#22c55e">
                            <FiUsers />
                            <h4>{t('settings.bot.lottery.flow.entry.title')}</h4>
                        </FlowStepHeader>
                        <FlowStepContent>
                            <Row gap="20px">
                                <ParameterCard>
                                    <ParameterTitle>
                                        <FiClock />
                                        {t('settings.bot.lottery.flow.entry.duration')}
                                    </ParameterTitle>
                                    <NumericEditorComponent
                                        width="120px"
                                        value={config.timerDurationSec}
                                        onChange={(value) => updateConfig(() => ({ timerDurationSec: value }))}
                                        min={10}
                                        max={600}
                                    />
                                </ParameterCard>

                                <ParameterCard style={{ flex: 1, opacity: config.allowChatEntry ? 1 : 0.5 }}>
                                    <ParameterTitle>
                                        <FiMessageSquare />
                                        {t('settings.bot.lottery.flow.entry.trigger')}
                                        {!config.allowChatEntry && (
                                            <span style={{ fontSize: '0.75rem', color: '#888', marginLeft: '8px' }}>
                                                ({t('settings.bot.lottery.flow.entry.disabledByRewards')})
                                            </span>
                                        )}
                                    </ParameterTitle>
                                    <NameInput
                                        value={config.entryTrigger}
                                        onChange={(e) => updateConfig(() => ({ entryTrigger: e.target.value }))}
                                        placeholder="+"
                                        style={{ width: '100px' }}
                                        disabled={!config.allowChatEntry}
                                    />
                                </ParameterCard>
                            </Row>

                            <div>
                                <Row gap="8px" style={{ marginBottom: '12px' }}>
                                    <label style={{ fontSize: '0.9rem', color: '#ccc' }}>
                                        {t('settings.bot.lottery.flow.entry.rewards')}
                                    </label>
                                    <AddButton
                                        onClick={loadRewards}
                                        style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                    >
                                        <FiRefreshCw style={{ width: 14, height: 14 }} />
                                    </AddButton>
                                </Row>

                                {loadingRewards ? (
                                    <span style={{ color: '#888' }}>{t('settings.bot.lottery.flow.entry.loadingRewards')}</span>
                                ) : rewards.length === 0 ? (
                                    <span style={{ color: '#888' }}>{t('settings.bot.lottery.flow.entry.noRewards')}</span>
                                ) : (
                                    <RewardSelector>
                                        {rewards.map(reward => (
                                            <RewardChip
                                                key={reward.id}
                                                $selected={config.channelPointRewardIds?.includes(reward.id)}
                                                onClick={() => toggleReward(reward.id)}
                                            >
                                                <FiGift style={{ width: 14, height: 14 }} />
                                                {reward.title}
                                                <span className="cost">{reward.cost}</span>
                                            </RewardChip>
                                        ))}
                                    </RewardSelector>
                                )}
                            </div>
                        </FlowStepContent>
                    </FlowStep>

                    <FlowConnector>
                        <FiChevronDown />
                    </FlowConnector>

                    {/* STEP 3: WARMUP */}
                    <FlowStep>
                        <FlowStepHeader $color="rgba(251, 191, 36, 0.1)" $iconColor="#fbbf24">
                            <FiMessageSquare />
                            <h4>{t('settings.bot.lottery.flow.warmup.title')}</h4>
                        </FlowStepHeader>
                        <FlowStepContent>
                            <AddButton onClick={addWarmupTrigger}>
                                <FiPlus />
                                {t('settings.bot.lottery.flow.warmup.add')}
                            </AddButton>

                            {config.messages.warmup.map((trigger) => (
                                <WarmupTriggerCard key={trigger.id}>
                                    <WarmupHeader $type={trigger.type}>
                                        <Select
                                            value={trigger.type}
                                            onChange={(e) => updateWarmupTrigger(trigger.id, { type: e.target.value })}
                                        >
                                            <option value="time">{t('settings.bot.lottery.flow.warmup.typeTime')}</option>
                                            <option value="count">{t('settings.bot.lottery.flow.warmup.typeCount')}</option>
                                        </Select>
                                        <span className="type-badge">
                                            {trigger.type === 'time'
                                                ? t('settings.bot.lottery.flow.warmup.afterSec', { value: trigger.value })
                                                : t('settings.bot.lottery.flow.warmup.afterCount', { value: trigger.value })}
                                        </span>
                                        <NumericEditorComponent
                                            width="80px"
                                            value={trigger.value}
                                            onChange={(value) => updateWarmupTrigger(trigger.id, { value })}
                                            min={1}
                                            max={trigger.type === 'time' ? 600 : 1000}
                                        />
                                        <DeleteButton onClick={() => deleteWarmupTrigger(trigger.id)}>
                                            <FiTrash2 />
                                        </DeleteButton>
                                    </WarmupHeader>
                                    <MessageInput
                                        value={trigger.message}
                                        onChange={(e) => updateWarmupTrigger(trigger.id, { message: e.target.value })}
                                        placeholder={t('settings.bot.lottery.flow.warmup.messagePlaceholder')}
                                        style={{ minHeight: '60px' }}
                                    />
                                </WarmupTriggerCard>
                            ))}

                            {config.messages.warmup.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
                                    {t('settings.bot.lottery.flow.warmup.empty')}
                                </div>
                            )}
                        </FlowStepContent>
                    </FlowStep>

                    <FlowConnector>
                        <FiChevronDown />
                    </FlowConnector>

                    {/* STEP 4: RESULT */}
                    <FlowStep>
                        <FlowStepHeader $color="rgba(139, 92, 246, 0.1)" $iconColor="#8b5cf6">
                            <FiAward />
                            <h4>{t('settings.bot.lottery.flow.result.title')}</h4>
                        </FlowStepHeader>
                        <FlowStepContent>
                            <div>
                                <label style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: '8px', display: 'block' }}>
                                    {t('settings.bot.lottery.flow.result.winner')}
                                </label>
                                <MessageInput
                                    value={config.messages.winner}
                                    onChange={(e) => updateMessage('winner', e.target.value)}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: '8px', display: 'block' }}>
                                    {t('settings.bot.lottery.flow.result.noParticipants')}
                                </label>
                                <MessageInput
                                    value={config.messages.noParticipants}
                                    onChange={(e) => updateMessage('noParticipants', e.target.value)}
                                />
                            </div>

                            <VariablesList>
                                <VariableItem><span className="var">{'{{winner}}'}</span><span className="desc">{t('settings.bot.lottery.variables.winner')}</span></VariableItem>
                                <VariableItem><span className="var">{'{{count}}'}</span><span className="desc">{t('settings.bot.lottery.variables.count')}</span></VariableItem>
                                <VariableItem><span className="var">{'{{subject}}'}</span><span className="desc">{t('settings.bot.lottery.variables.subject')}</span></VariableItem>
                                <VariableItem><span className="var">{'{{initiator}}'}</span><span className="desc">{t('settings.bot.lottery.variables.initiator')}</span></VariableItem>
                            </VariablesList>
                        </FlowStepContent>
                    </FlowStep>

                    <FlowConnector>
                        <FiChevronDown />
                    </FlowConnector>

                    {/* STEP 5: ADDITIONAL */}
                    <FlowStep>
                        <FlowStepHeader $color="rgba(107, 114, 128, 0.1)" $iconColor="#6b7280">
                            <FiSettings />
                            <h4>{t('settings.bot.lottery.flow.additional.title')}</h4>
                        </FlowStepHeader>
                        <FlowStepContent>
                            <EnabledToggle enabled={config.requireSubjectInChat}>
                                <Switch
                                    checked={config.requireSubjectInChat}
                                    onChange={(e) => updateConfig(() => ({ requireSubjectInChat: e.target.checked }))}
                                />
                                <span>{t('settings.bot.lottery.flow.additional.requireSubjectInChat')}</span>
                            </EnabledToggle>

                            <EnabledToggle enabled={config.enforceUniqueSubject}>
                                <Switch
                                    checked={config.enforceUniqueSubject}
                                    onChange={(e) => updateConfig(() => ({ enforceUniqueSubject: e.target.checked }))}
                                />
                                <span>{t('settings.bot.lottery.flow.additional.uniqueSubject')}</span>
                            </EnabledToggle>

                            <div>
                                <label style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: '8px', display: 'block' }}>
                                    {t('settings.bot.lottery.flow.additional.blacklist')}
                                </label>
                                <span style={{ fontSize: '0.8rem', color: '#888', display: 'block', marginBottom: '8px' }}>
                                    {t('settings.bot.lottery.flow.additional.blacklistHint')}
                                </span>
                                <TagInput
                                    value={(config.subjectBlacklist || []).join(', ')}
                                    onChange={(value) => {
                                        const newBlacklist = value
                                            .split(',')
                                            .map(s => s.trim().toLowerCase())
                                            .filter(s => s.length > 0);
                                        updateConfig(() => ({ subjectBlacklist: newBlacklist }));
                                    }}
                                    placeholder={t('settings.bot.lottery.flow.additional.blacklistPlaceholder')}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: '8px', display: 'block' }}>
                                    {t('settings.bot.lottery.flow.additional.subjectBlacklisted')}
                                </label>
                                <MessageInput
                                    value={config.messages.subjectBlacklisted}
                                    onChange={(e) => updateMessage('subjectBlacklisted', e.target.value)}
                                    style={{ minHeight: '60px' }}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: '8px', display: 'block' }}>
                                    {t('settings.bot.lottery.flow.additional.alreadyUsed')}
                                </label>
                                <MessageInput
                                    value={config.messages.alreadyUsed}
                                    onChange={(e) => updateMessage('alreadyUsed', e.target.value)}
                                    style={{ minHeight: '60px' }}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: '8px', display: 'block' }}>
                                    {t('settings.bot.lottery.flow.additional.alreadyRunning')}
                                </label>
                                <MessageInput
                                    value={config.messages.alreadyRunning}
                                    onChange={(e) => updateMessage('alreadyRunning', e.target.value)}
                                    style={{ minHeight: '60px' }}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: '8px', display: 'block' }}>
                                    {t('settings.bot.lottery.flow.additional.cooldown')}
                                </label>
                                <MessageInput
                                    value={config.messages.cooldown}
                                    onChange={(e) => updateMessage('cooldown', e.target.value)}
                                    style={{ minHeight: '60px' }}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: '8px', display: 'block' }}>
                                    {t('settings.bot.lottery.flow.additional.cancelled')}
                                </label>
                                <MessageInput
                                    value={config.messages.cancelled}
                                    onChange={(e) => updateMessage('cancelled', e.target.value)}
                                    style={{ minHeight: '60px' }}
                                />
                            </div>

                            {config.requireSubjectInChat && (
                                <div>
                                    <label style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: '8px', display: 'block' }}>
                                        {t('settings.bot.lottery.flow.additional.userNotInChat')}
                                    </label>
                                    <MessageInput
                                        value={config.messages.userNotInChat}
                                        onChange={(e) => updateMessage('userNotInChat', e.target.value)}
                                        style={{ minHeight: '60px' }}
                                    />
                                </div>
                            )}

                            {!config.requireSubjectInChat && (
                                <div>
                                    <label style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: '8px', display: 'block' }}>
                                        {t('settings.bot.lottery.flow.additional.subjectRequired')}
                                    </label>
                                    <MessageInput
                                        value={config.messages.subjectRequired}
                                        onChange={(e) => updateMessage('subjectRequired', e.target.value)}
                                        style={{ minHeight: '60px' }}
                                    />
                                </div>
                            )}
                        </FlowStepContent>
                    </FlowStep>
                </CardContent>
            )}
        </SettingsCard>
    );
}
