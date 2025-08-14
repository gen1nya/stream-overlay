import React, { useEffect, useState, useRef } from 'react';
import styled from 'styled-components';
import { FiYoutube, FiSettings, FiRefreshCw, FiList, FiExternalLink, FiClock } from 'react-icons/fi';
import {
    enableYouTubeScraper,
    getYoutubeStreams,
    setChannelName,
    getYoutubeConfig
} from '../../../services/api';
import {
    SettingsCard,
    CardHeader,
    CardTitle,
    CardContent,
    Section,
    SectionHeader,
    SectionTitle,
    ControlGroup,
    ActionButton,
    InfoBadge,
    WarningBadge,
    SuccessBadge
} from './SharedSettingsStyles';
import Switch from '../../utils/Switch';
import {Row} from "../SettingsComponent";

// Специфичные стили для YouTube компонента
const StatusIndicator = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: ${props => {
        if (props.status === 'active') return 'rgba(34, 197, 94, 0.1)';
        if (props.status === 'error') return 'rgba(220, 38, 38, 0.1)';
        return 'rgba(107, 114, 128, 0.1)';
    }};
    border: 1px solid ${props => {
        if (props.status === 'active') return 'rgba(34, 197, 94, 0.3)';
        if (props.status === 'error') return 'rgba(220, 38, 38, 0.3)';
        return 'rgba(107, 114, 128, 0.3)';
    }};
    border-radius: 8px;
    font-size: 0.85rem;

    .status-icon {
        width: 16px;
        height: 16px;
        color: ${props => {
            if (props.status === 'active') return '#22c55e';
            if (props.status === 'error') return '#dc2626';
            return '#6b7280';
        }};
    }

    .status-text {
        font-weight: 500;
        color: ${props => {
            if (props.status === 'active') return '#22c55e';
            if (props.status === 'error') return '#dc2626';
            return '#6b7280';
        }};
    }
`;

const ChannelInput = styled.input`
    flex: 1;
    background: #1e1e1e;
    color: #fff;
    border: 1px solid #444;
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 0.9rem;
    transition: all 0.2s ease;

    &:hover {
        background: #252525;
        border-color: #555;
    }

    &:focus {
        outline: none;
        border-color: #646cff;
        background: #252525;
        box-shadow: 0 0 0 3px rgba(100, 108, 255, 0.1);
    }

    &::placeholder {
        color: #666;
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const StreamsList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 300px;
    overflow-y: auto;

    /* Custom scrollbar */
    &::-webkit-scrollbar {
        width: 6px;
    }

    &::-webkit-scrollbar-track {
        background: #2a2a2a;
        border-radius: 3px;
    }

    &::-webkit-scrollbar-thumb {
        background: #555;
        border-radius: 3px;
    }

    &::-webkit-scrollbar-thumb:hover {
        background: #666;
    }
`;

const StreamItem = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: rgba(40, 40, 40, 0.5);
    border: 1px solid #333;
    border-radius: 8px;
    transition: all 0.2s ease;

    &:hover {
        background: rgba(40, 40, 40, 0.7);
        border-color: #444;
    }
`;

const StreamInfo = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
`;

const StreamTitle = styled.div`
    font-size: 0.9rem;
    font-weight: 500;
    color: #fff;
    line-height: 1.3;
`;

const StreamMeta = styled.div`
    font-size: 0.75rem;
    color: #999;
    display: flex;
    align-items: center;
    gap: 8px;
`;

const ViewerCount = styled.span`
    display: flex;
    align-items: center;
    gap: 4px;
    color: #ff0000;
    font-weight: 500;
`;

const RefreshButton = styled(ActionButton)`
    background: #374151;
    border-color: #4b5563;
    min-width: auto;
    padding: 8px;

    &:hover {
        background: #4b5563;
        border-color: #6b7280;
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

const UpdateTimer = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.75rem;
    color: #666;
`;

export default function YouTubeScraperComponent() {
    const [scraperEnabled, setScraperEnabled] = useState(false);
    const [channelInput, setChannelInput] = useState('');
    const [currentChannelId, setCurrentChannelId] = useState('');
    const [streams, setStreams] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [nextUpdate, setNextUpdate] = useState(60);

    const intervalRef = useRef(null);
    const timerRef = useRef(null);

    // Загрузка конфигурации YouTube
    const loadYouTubeConfig = async () => {
        try {
            const config = await getYoutubeConfig();
            setScraperEnabled(config.enabled);
            setCurrentChannelId(config.channelId || '');
            setChannelInput(config.channelId || '');
        } catch (err) {
            console.error('Ошибка загрузки конфигурации YouTube:', err);
            setError('Не удалось загрузить конфигурацию YouTube');
        }
    };

    // Загрузка списка трансляций
    const loadStreams = async () => {
        try {
            setIsRefreshing(true);
            const streamsData = await getYoutubeStreams();
            // Фильтруем только живые трансляции
            const liveStreams = (streamsData || []).filter(stream => stream.isLive === true);
            setStreams(liveStreams);
            setError('');
        } catch (err) {
            console.error('Ошибка загрузки трансляций:', err);
            setError('Не удалось загрузить список трансляций');
        } finally {
            setIsRefreshing(false);
        }
    };

    // Сохранение канала
    const handleChannelSave = async () => {
        if (!channelInput.trim()) return;

        try {
            await setChannelName(channelInput.trim());
            setCurrentChannelId(channelInput.trim());
            setError('');
            // Обновляем список после смены канала
            if (scraperEnabled) {
                await loadStreams();
            }
        } catch (err) {
            console.error('Ошибка установки канала:', err);
            setError('Не удалось установить канал');
        }
    };

    // Переключение скрапера
    const handleScraperToggle = async (enabled) => {
        try {
            await enableYouTubeScraper(enabled);
            setScraperEnabled(enabled);
            setError('');

            if (enabled) {
                await loadStreams();
            }
        } catch (err) {
            console.error('Ошибка переключения скрапера:', err);
            setError(err.message || 'Не удалось переключить скрапер');
        }
    };

    // Автообновление каждые 60 секунд
    useEffect(() => {
        if (scraperEnabled) {
            // Загружаем сразу
            loadStreams();

            // Устанавливаем интервал обновления
            intervalRef.current = setInterval(loadStreams, 60000);

            // Таймер обратного отсчета
            setNextUpdate(60);
            timerRef.current = setInterval(() => {
                setNextUpdate(prev => {
                    if (prev <= 1) {
                        return 60;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            // Очищаем интервалы при отключении
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [scraperEnabled]);

    // Инициализация
    useEffect(() => {
        const initialize = async () => {
            setIsLoading(true);
            await loadYouTubeConfig();
            setIsLoading(false);
        };
        initialize();
    }, []);

    const getStatus = () => {
        if (error) return 'error';
        if (scraperEnabled) return 'active';
        return 'inactive';
    };

    const getStatusText = () => {
        if (error) return 'Ошибка';
        if (scraperEnabled && streams.length > 0) return `Активен (${streams.length} в эфире)`;
        if (scraperEnabled) return 'Активен';
        return 'Отключен';
    };

    const formatViewers = (count) => {
        if (count >= 1000) {
            return `${(count / 1000).toFixed(1)}K`;
        }
        return count?.toString() || '0';
    };

    if (isLoading) {
        return (
            <SettingsCard>
                <CardHeader>
                    <CardTitle>
                        <FiYoutube />
                        YouTube Скрапер
                    </CardTitle>
                    <InfoBadge>Загрузка...</InfoBadge>
                </CardHeader>
            </SettingsCard>
        );
    }

    return (
        <SettingsCard>
            <CardHeader>
                <CardTitle>
                    <FiYoutube />
                    YouTube Скрапер
                </CardTitle>
                <StatusIndicator status={getStatus()}>
                    <FiYoutube className="status-icon" />
                    <span className="status-text">{getStatusText()}</span>
                </StatusIndicator>
            </CardHeader>

            <CardContent>
                {/* Основные настройки */}
                <Section>
                    <SectionHeader>
                        <SectionTitle>
                            <FiSettings />
                            Основные настройки
                        </SectionTitle>
                    </SectionHeader>

                    <Row gap="16px">
                        <ControlGroup>
                            <label style={{ fontSize: '0.9rem', fontWeight: '500', color: '#e0e0e0', marginBottom: '8px' }}>
                                Включить захват чата
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Switch
                                    checked={scraperEnabled}
                                    onChange={(e) => handleScraperToggle(e.target.checked)}
                                />
                                <span style={{ fontSize: '0.85rem', color: '#999' }}>
                                    {scraperEnabled ? 'Включен' : 'Выключен'}
                                </span>
                            </div>
                        </ControlGroup>
                    </Row>

                    {error && (
                        <WarningBadge style={{ marginTop: '8px' }}>
                            {error}
                        </WarningBadge>
                    )}
                </Section>

                {/* Настройка канала */}
                <Section>
                    <SectionHeader>
                        <SectionTitle>
                            <FiYoutube />
                            Канал для мониторинга
                        </SectionTitle>
                    </SectionHeader>

                    <Row gap="12px">
                        <ChannelInput
                            type="text"
                            value={channelInput}
                            onChange={(e) => setChannelInput(e.target.value)}
                            placeholder="Введите ID канала (например: UCxxx или @channelname)"
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    handleChannelSave();
                                }
                            }}
                        />

                        <ActionButton
                            onClick={handleChannelSave}
                            disabled={!channelInput.trim() || channelInput.trim() === currentChannelId}
                        >
                            {channelInput.trim() === currentChannelId ? 'Сохранено' : 'Сохранить'}
                        </ActionButton>
                    </Row>

                    {currentChannelId && (
                        <SuccessBadge style={{ marginTop: '8px' }}>
                            Текущий канал: {currentChannelId}
                        </SuccessBadge>
                    )}

                    {!currentChannelId && (
                        <InfoBadge style={{ marginTop: '8px' }}>
                            Поддерживаются URL вида youtube.com/c/channel, youtube.com/@channel или ID канала
                        </InfoBadge>
                    )}
                </Section>

                {/* Список трансляций */}
                {scraperEnabled && (
                    <Section>
                        <SectionHeader>
                            <SectionTitle>
                                <FiList />
                                Активные трансляции
                            </SectionTitle>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <UpdateTimer>
                                    <FiClock />
                                    Обновление через {nextUpdate}с
                                </UpdateTimer>
                                <RefreshButton
                                    onClick={loadStreams}
                                    disabled={isRefreshing}
                                    title="Обновить список"
                                >
                                    <FiRefreshCw style={{
                                        animation: isRefreshing ? 'spin 1s linear infinite' : 'none'
                                    }} />
                                </RefreshButton>
                            </div>
                        </SectionHeader>

                        {streams.length === 0 ? (
                            <InfoBadge>
                                {isRefreshing ? 'Загрузка трансляций...' :
                                    currentChannelId ? 'Активных трансляций не найдено' :
                                        'Сначала укажите канал для мониторинга'}
                            </InfoBadge>
                        ) : (
                            <StreamsList>
                                {streams.map((stream) => (
                                    <StreamItem key={stream.id}>
                                        <StreamInfo>
                                            <StreamTitle>{stream.title}</StreamTitle>
                                            <StreamMeta>
                                                <ViewerCount>
                                                    <FiYoutube />
                                                    {formatViewers(stream.viewerCount)} зрителей
                                                </ViewerCount>
                                                <span>•</span>
                                                <span>{stream.isLive ? 'В эфире' : (stream.duration || 'Завершена')}</span>
                                            </StreamMeta>
                                        </StreamInfo>

                                        <ActionButton
                                            onClick={() => window.open(stream.url, '_blank')}
                                            title="Открыть трансляцию"
                                        >
                                            <FiExternalLink />
                                        </ActionButton>
                                    </StreamItem>
                                ))}
                            </StreamsList>
                        )}

                        {streams.length > 0 && (
                            <SuccessBadge style={{ marginTop: '8px' }}>
                                Найдено {streams.length} активных трансляций в эфире
                            </SuccessBadge>
                        )}
                    </Section>
                )}
            </CardContent>

            <style jsx>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </SettingsCard>
    );
}