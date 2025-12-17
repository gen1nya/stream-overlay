import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { FiClock, FiPlus, FiTrash2, FiMessageSquare, FiHash, FiInfo } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import Switch from "../../../../utils/Switch";
import NumericEditorComponent from "../../../../utils/NumericEditorComponent";
import DebouncedTextarea from "../../../../utils/DebouncedTextarea";
import {
    Section,
    SectionHeader,
    SectionTitle
} from "../../SharedSettingsStyles";
import {
    AddButton,
    AddCommandForm,
    HelpInfoPopup,
    ErrorText,
    FormRow,
    NameInput,
    EnabledToggle
} from "../SharedBotStyles";

// Timer card styling
const TimerCard = styled.div`
    background: rgba(40, 40, 40, 0.5);
    border: 1px solid ${props => props.$enabled ? '#646cff' : '#333'};
    border-radius: 12px;
    overflow: hidden;
    transition: all 0.2s ease;
    margin-bottom: 12px;

    &:hover {
        border-color: ${props => props.$enabled ? '#646cff' : '#444'};
    }
`;

const TimerHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 20px;
    background: ${props => props.$enabled
        ? 'rgba(100, 108, 255, 0.1)'
        : 'rgba(40, 40, 40, 0.3)'};
    border-bottom: 1px solid #333;

    .timer-name {
        flex: 1;
        font-size: 1rem;
        font-weight: 600;
        color: ${props => props.$enabled ? '#e0e0e0' : '#888'};
    }
`;

const TimerContent = styled.div`
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const ParameterRow = styled.div`
    display: flex;
    align-items: center;
    gap: 24px;
    flex-wrap: wrap;
`;

const ParameterGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const ParameterLabel = styled.label`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
    color: #ccc;

    svg {
        width: 16px;
        height: 16px;
        color: #888;
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

    &:hover {
        background: rgba(220, 38, 38, 0.2);
        border-color: #dc2626;
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;

const EmptyState = styled.div`
    text-align: center;
    padding: 40px 20px;
    color: #888;

    svg {
        width: 48px;
        height: 48px;
        margin-bottom: 16px;
        opacity: 0.5;
    }

    p {
        margin: 0;
        font-size: 0.95rem;
    }
`;

const InfoCard = styled.div`
    background: rgba(100, 108, 255, 0.1);
    border: 1px solid rgba(100, 108, 255, 0.3);
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;

    p {
        margin: 0;
        color: #ccc;
        font-size: 0.9rem;
        line-height: 1.6;
    }
`;

const DEFAULT_TIMERS_CONFIG = {
    enabled: false,
    timers: []
};

export default function TimersComponent({ botConfig, apply, showHelp, setShowHelp }) {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [nameError, setNameError] = useState('');

    // Merge with defaults
    const config = {
        ...DEFAULT_TIMERS_CONFIG,
        ...botConfig?.timers
    };

    const updateTimersConfig = (updater) => {
        apply((prev) => ({
            ...prev,
            timers: {
                ...DEFAULT_TIMERS_CONFIG,
                ...prev.timers,
                ...updater({
                    ...DEFAULT_TIMERS_CONFIG,
                    ...prev.timers
                })
            }
        }));
    };

    const addTimer = useCallback(() => {
        const trimmed = name.trim();

        if (!trimmed) {
            setNameError(t('settings.bot.timers.errors.required'));
            return;
        }

        if (config.timers.some((timer) => timer.name === trimmed)) {
            setNameError(t('settings.bot.timers.errors.duplicate'));
            return;
        }

        setNameError('');
        setName('');

        updateTimersConfig((prev) => ({
            timers: [
                ...prev.timers,
                {
                    id: Date.now().toString(),
                    enabled: true,
                    name: trimmed,
                    message: '',
                    minMessages: 20,
                    minIntervalSec: 300
                }
            ]
        }));
    }, [name, config.timers, t]);

    const updateTimer = (id, updates) => {
        updateTimersConfig((prev) => ({
            timers: prev.timers.map(timer =>
                timer.id === id ? { ...timer, ...updates } : timer
            )
        }));
    };

    const deleteTimer = (id) => {
        updateTimersConfig((prev) => ({
            timers: prev.timers.filter(timer => timer.id !== id)
        }));
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            addTimer();
        }
    };

    return (
        <>
            <HelpInfoPopup
                isOpen={showHelp}
                onClose={() => setShowHelp(false)}
                title={t('settings.bot.timers.title')}
                icon={<FiClock />}
            >
                <p>{t('settings.bot.timers.helpText')}</p>
            </HelpInfoPopup>

            {/* Info about stream requirement */}
            <InfoCard>
                <p>
                    <FiInfo style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                    {t('settings.bot.timers.streamOnlyInfo')}
                </p>
            </InfoCard>

            {/* Add new timer */}
            <Section>
                <SectionHeader>
                    <SectionTitle>
                        <FiPlus />
                        {t('settings.bot.timers.addTimer')}
                    </SectionTitle>
                </SectionHeader>

                <AddCommandForm>
                    <FormRow>
                        <NameInput
                            placeholder={t('settings.bot.timers.namePlaceholder')}
                            value={name}
                            $error={!!nameError}
                            onChange={(e) => {
                                setNameError('');
                                setName(e.target.value);
                            }}
                            onKeyPress={handleKeyPress}
                        />
                        <AddButton onClick={addTimer}>
                            <FiPlus />
                            {t('settings.bot.timers.add')}
                        </AddButton>
                    </FormRow>
                    {nameError && <ErrorText>{nameError}</ErrorText>}
                </AddCommandForm>
            </Section>

            {/* Timers list */}
            <Section>
                <SectionHeader>
                    <SectionTitle>
                        <FiClock />
                        {t('settings.bot.timers.timersList')}
                    </SectionTitle>
                </SectionHeader>

                {config.timers.length === 0 ? (
                    <EmptyState>
                        <FiClock />
                        <p>{t('settings.bot.timers.empty')}</p>
                    </EmptyState>
                ) : (
                    config.timers.map((timer) => (
                        <TimerCard key={timer.id} $enabled={timer.enabled}>
                            <TimerHeader $enabled={timer.enabled}>
                                <Switch
                                    checked={timer.enabled}
                                    onChange={(e) => updateTimer(timer.id, { enabled: e.target.checked })}
                                />
                                <span className="timer-name">{timer.name}</span>
                                <DeleteButton onClick={() => deleteTimer(timer.id)}>
                                    <FiTrash2 />
                                </DeleteButton>
                            </TimerHeader>
                            <TimerContent>
                                <div>
                                    <ParameterLabel>
                                        <FiMessageSquare />
                                        {t('settings.bot.timers.message')}
                                    </ParameterLabel>
                                    <DebouncedTextarea
                                        value={timer.message}
                                        onChange={(value) => updateTimer(timer.id, { message: value })}
                                        placeholder={t('settings.bot.timers.messagePlaceholder')}
                                        maxLength={500}
                                    />
                                </div>

                                <ParameterRow>
                                    <ParameterGroup>
                                        <ParameterLabel>
                                            <FiHash />
                                            {t('settings.bot.timers.minMessages')}
                                        </ParameterLabel>
                                        <NumericEditorComponent
                                            width="120px"
                                            value={timer.minMessages}
                                            onChange={(value) => updateTimer(timer.id, { minMessages: value })}
                                            min={0}
                                            max={1000}
                                        />
                                    </ParameterGroup>

                                    <ParameterGroup>
                                        <ParameterLabel>
                                            <FiClock />
                                            {t('settings.bot.timers.minInterval')}
                                        </ParameterLabel>
                                        <NumericEditorComponent
                                            width="120px"
                                            value={timer.minIntervalSec}
                                            onChange={(value) => updateTimer(timer.id, { minIntervalSec: value })}
                                            min={30}
                                            max={3600}
                                        />
                                    </ParameterGroup>
                                </ParameterRow>
                            </TimerContent>
                        </TimerCard>
                    ))
                )}
            </Section>
        </>
    );
}
