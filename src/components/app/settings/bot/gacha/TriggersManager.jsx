import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FiPlus, FiTrash2, FiGift, FiRefreshCw } from 'react-icons/fi';
import { AddButton, ErrorText, FormRow, NameInput } from '../SharedBotStyles';
import { getTwitchRewards } from '../../../../../services/api';

const TriggersList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const TriggerCard = styled.div`
    background: rgba(40, 40, 40, 0.5);
    border: 1px solid #333;
    border-radius: 12px;
    padding: 16px;
    display: flex;
    align-items: center;
    gap: 16px;
    transition: all 0.2s ease;
    
    &:hover {
        background: rgba(40, 40, 40, 0.7);
        border-color: #444;
    }
`;

const TriggerIcon = styled.div`
    width: 48px;
    height: 48px;
    border-radius: 10px;
    background: linear-gradient(135deg, #646cff 0%, #8853f2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    
    svg {
        width: 24px;
        height: 24px;
        color: white;
    }
`;

const TriggerContent = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const TriggerTitle = styled.h4`
    margin: 0;
    color: #e0e0e0;
    font-size: 1rem;
    font-weight: 600;
`;

const TriggerSubtitle = styled.span`
    color: #888;
    font-size: 0.85rem;
`;

const PullsBadge = styled.span`
    padding: 6px 12px;
    border-radius: 8px;
    background: rgba(136, 83, 242, 0.2);
    border: 1px solid rgba(136, 83, 242, 0.4);
    color: #c4b5fd;
    font-weight: 600;
    font-size: 0.9rem;
    white-space: nowrap;
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
        width: 18px;
        height: 18px;
    }
`;

const AddTriggerForm = styled.div`
    background: rgba(40, 40, 40, 0.5);
    border: 1px solid #333;
    border-radius: 12px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const Select = styled.select`
    padding: 10px 12px;
    border: 1px solid ${props => props.$error ? '#dc2626' : '#555'};
    border-radius: 8px;
    background: #1e1e1e;
    color: #fff;
    font-size: 14px;
    transition: all 0.2s ease;
    cursor: pointer;
    
    &:focus {
        outline: none;
        border-color: ${props => props.$error ? '#dc2626' : '#646cff'};
        background: #252525;
    }
    
    option {
        background: #1e1e1e;
        color: #fff;
    }
`;

const NumberInput = styled(NameInput)`
    width: 150px;
`;

const InfoBox = styled.div`
    background: rgba(100, 108, 255, 0.1);
    border: 1px solid rgba(100, 108, 255, 0.3);
    border-radius: 8px;
    padding: 12px 16px;
    color: #c4b5fd;
    font-size: 0.9rem;
    line-height: 1.5;
`;

const LoadingSpinner = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 20px;
    color: #888;
    
    svg {
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;

export default function TriggersManager({ triggers = [], updateConfig }) {
    const [isAdding, setIsAdding] = useState(false);
    const [rewards, setRewards] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newTrigger, setNewTrigger] = useState({
        rewardId: '',
        amount: 1
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        loadRewards();
    }, []);

    const loadRewards = async () => {
        setLoading(true);
        try {
            // Запрос к API для получения списка наград
            const response = await getTwitchRewards();
            setRewards(response || []);
        } catch (error) {
            console.error('Failed to load Twitch rewards:', error);
            setRewards([]);
        } finally {
            setLoading(false);
        }
    };

    const getRewardById = (rewardId) => {
        return rewards.find(r => r.id === rewardId);
    };

    const validateNewTrigger = () => {
        const errs = {};

        if (!newTrigger.rewardId) {
            errs.rewardId = 'Выберите награду';
        } else if (triggers.some(t => t.rewardId === newTrigger.rewardId)) {
            errs.rewardId = 'Триггер для этой награды уже существует';
        }

        if (newTrigger.amount < 1 || newTrigger.amount > 10) {
            errs.amount = 'Количество должно быть от 1 до 10';
        }

        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleAddTrigger = () => {
        if (!validateNewTrigger()) return;

        updateConfig(prev => ({
            ...prev,
            triggers: [
                ...prev.triggers,
                {
                    rewardId: newTrigger.rewardId,
                    amount: parseInt(newTrigger.amount)
                }
            ]
        }));

        setNewTrigger({ rewardId: '', amount: 1 });
        setErrors({});
        setIsAdding(false);
    };

    const handleDeleteTrigger = (rewardId) => {
        updateConfig(prev => ({
            ...prev,
            triggers: prev.triggers.filter(t => t.rewardId !== rewardId)
        }));
    };

    return (
        <div>
            <InfoBox style={{ marginBottom: '16px' }}>
                💡 Триггеры позволяют связать награды канала Twitch с гача-системой.
                Когда зритель активирует награду, он автоматически получит указанное количество pulls.
            </InfoBox>

            {/* Кнопка добавления */}
            {!isAdding && (
                <FormRow style={{ marginBottom: '16px' }}>
                    <AddButton onClick={() => setIsAdding(true)}>
                        <FiPlus />
                        Добавить триггер
                    </AddButton>
                    <AddButton
                        onClick={loadRewards}
                        style={{
                            background: 'rgba(136, 83, 242, 0.2)',
                            borderColor: 'rgba(136, 83, 242, 0.4)'
                        }}
                    >
                        <FiRefreshCw />
                        Обновить награды
                    </AddButton>
                </FormRow>
            )}

            {/* Форма добавления */}
            {isAdding && (
                <AddTriggerForm style={{ marginBottom: '16px' }}>
                    <div>
                        <label style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: '8px', display: 'block' }}>
                            Награда Twitch
                        </label>
                        {loading ? (
                            <LoadingSpinner>
                                <FiRefreshCw />
                                Загрузка наград...
                            </LoadingSpinner>
                        ) : (
                            <>
                                <Select
                                    value={newTrigger.rewardId}
                                    $error={!!errors.rewardId}
                                    onChange={(e) => {
                                        setNewTrigger({ ...newTrigger, rewardId: e.target.value });
                                        setErrors({ ...errors, rewardId: null });
                                    }}
                                >
                                    <option value="">Выберите награду</option>
                                    {rewards
                                        .filter(reward => !triggers.some(t => t.rewardId === reward.id))
                                        .map(reward => (
                                            <option key={reward.id} value={reward.id}>
                                                {reward.title} ({reward.cost} points)
                                            </option>
                                        ))}
                                </Select>
                                {errors.rewardId && <ErrorText>{errors.rewardId}</ErrorText>}
                            </>
                        )}
                    </div>

                    <div>
                        <label style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: '8px', display: 'block' }}>
                            Количество pulls
                        </label>
                        <NumberInput
                            type="number"
                            min="1"
                            max="10"
                            value={newTrigger.amount}
                            $error={!!errors.amount}
                            onChange={(e) => {
                                setNewTrigger({ ...newTrigger, amount: e.target.value });
                                setErrors({ ...errors, amount: null });
                            }}
                        />
                        {errors.amount && <ErrorText>{errors.amount}</ErrorText>}
                    </div>

                    <FormRow>
                        <AddButton onClick={handleAddTrigger}>
                            <FiPlus />
                            Добавить
                        </AddButton>
                        <AddButton
                            onClick={() => {
                                setIsAdding(false);
                                setErrors({});
                            }}
                            style={{
                                background: 'rgba(107, 114, 128, 0.2)',
                                borderColor: 'rgba(107, 114, 128, 0.4)'
                            }}
                        >
                            Отмена
                        </AddButton>
                    </FormRow>
                </AddTriggerForm>
            )}

            {/* Список триггеров */}
            <TriggersList>
                {triggers.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                        Нет настроенных триггеров. Добавьте первый триггер, чтобы связать награды с гача-системой.
                    </div>
                ) : (
                    triggers.map(trigger => {
                        const reward = getRewardById(trigger.rewardId);
                        return (
                            <TriggerCard key={trigger.rewardId}>
                                <TriggerIcon>
                                    <FiGift />
                                </TriggerIcon>
                                <TriggerContent>
                                    <TriggerTitle>
                                        {reward ? reward.title : `Награда ${trigger.rewardId}`}
                                    </TriggerTitle>
                                    <TriggerSubtitle>
                                        {reward ? `${reward.cost} баллов` : 'Награда не найдена'}
                                    </TriggerSubtitle>
                                </TriggerContent>
                                <PullsBadge>
                                    {trigger.amount} {trigger.amount === 1 ? 'pull' : 'pulls'}
                                </PullsBadge>
                                <DeleteButton onClick={() => handleDeleteTrigger(trigger.rewardId)}>
                                    <FiTrash2 />
                                </DeleteButton>
                            </TriggerCard>
                        );
                    })
                )}
            </TriggersList>
        </div>
    );
}