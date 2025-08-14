import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FiShield, FiSettings, FiGlobe, FiLock, FiUnlock, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
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
import NumericEditorComponent from '../../utils/NumericEditorComponent';
import {Row} from "../SettingsComponent";

// Специфичные стили для прокси компонента
const StatusIndicator = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: ${props => {
    if (props.status === 'connected') return 'rgba(34, 197, 94, 0.1)';
    if (props.status === 'error') return 'rgba(220, 38, 38, 0.1)';
    if (props.status === 'testing') return 'rgba(59, 130, 246, 0.1)';
    return 'rgba(107, 114, 128, 0.1)';
}};
    border: 1px solid ${props => {
    if (props.status === 'connected') return 'rgba(34, 197, 94, 0.3)';
    if (props.status === 'error') return 'rgba(220, 38, 38, 0.3)';
    if (props.status === 'testing') return 'rgba(59, 130, 246, 0.3)';
    return 'rgba(107, 114, 128, 0.3)';
}};
    border-radius: 8px;
    font-size: 0.85rem;
    
    .status-icon {
        width: 16px;
        height: 16px;
        color: ${props => {
    if (props.status === 'connected') return '#22c55e';
    if (props.status === 'error') return '#dc2626';
    if (props.status === 'testing') return '#3b82f6';
    return '#6b7280';
}};
    }
    
    .status-text {
        font-weight: 500;
        color: ${props => {
    if (props.status === 'connected') return '#22c55e';
    if (props.status === 'error') return '#dc2626';
    if (props.status === 'testing') return '#3b82f6';
    return '#6b7280';
}};
    }
`;

const ProxyInput = styled.input`
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

const ProxyField = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 120px;
`;

const FieldLabel = styled.label`
    font-size: 0.8rem;
    font-weight: 500;
    color: #ccc;
`;

const ProxyGrid = styled.div`
    display: grid;
    grid-template-columns: 2fr 1fr 120px 120px;
    gap: 12px;
    align-items: end;
    
    @media (max-width: 768px) {
        grid-template-columns: 1fr;
        gap: 16px;
    }
`;

const TestButton = styled(ActionButton)`
    background: #3b82f6;
    border-color: #3b82f6;
    
    &:hover:not(:disabled) {
        background: #2563eb;
        border-color: #2563eb;
    }
    
    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

export default function Socks5ProxyComponent() {
    const [proxyEnabled, setProxyEnabled] = useState(false);
    const [proxyConfig, setProxyConfig] = useState({
        host: '',
        port: 1080,
        username: '',
        password: ''
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isTesting, setIsTesting] = useState(false);
    const [error, setError] = useState('');
    const [connectionStatus, setConnectionStatus] = useState('disconnected'); // disconnected, connected, error, testing

    // Загрузка конфигурации прокси (заглушка - нужно добавить API методы)
    const loadProxyConfig = async () => {
        try {
            // TODO: Добавить API метод getProxyConfig()
            // const config = await getProxyConfig();
            // setProxyEnabled(config.enabled);
            // setProxyConfig(config);
            setError('');
        } catch (err) {
            console.error('Ошибка загрузки конфигурации прокси:', err);
            setError('Не удалось загрузить конфигурацию прокси');
        }
    };

    // Сохранение конфигурации прокси
    const saveProxyConfig = async () => {
        try {
            // TODO: Добавить API метод setProxyConfig()
            // await setProxyConfig(proxyConfig);
            setError('');
            console.log('Proxy config saved:', proxyConfig);
        } catch (err) {
            console.error('Ошибка сохранения конфигурации прокси:', err);
            setError('Не удалось сохранить конфигурацию прокси');
        }
    };

    // Тестирование подключения
    const testConnection = async () => {
        if (!proxyConfig.host || !proxyConfig.port) {
            setError('Укажите хост и порт прокси-сервера');
            return;
        }

        setIsTesting(true);
        setConnectionStatus('testing');
        setError('');

        try {
            // TODO: Добавить API метод testProxyConnection()
            // const result = await testProxyConnection(proxyConfig);

            // Заглушка для демонстрации
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Случайный результат для демонстрации
            const success = Math.random() > 0.3;

            if (success) {
                setConnectionStatus('connected');
            } else {
                setConnectionStatus('error');
                setError('Не удалось подключиться к прокси-серверу');
            }
        } catch (err) {
            setConnectionStatus('error');
            setError('Ошибка при тестировании подключения');
        } finally {
            setIsTesting(false);
        }
    };

    // Переключение прокси
    const handleProxyToggle = async (enabled) => {
        try {
            // TODO: Добавить API метод enableProxy()
            // await enableProxy(enabled);
            setProxyEnabled(enabled);
            setError('');

            if (!enabled) {
                setConnectionStatus('disconnected');
            }
        } catch (err) {
            console.error('Ошибка переключения прокси:', err);
            setError('Не удалось переключить прокси');
        }
    };

    // Обновление полей конфигурации
    const updateConfig = (field, value) => {
        setProxyConfig(prev => ({ ...prev, [field]: value }));
        if (connectionStatus === 'connected') {
            setConnectionStatus('disconnected'); // Сбрасываем статус при изменении настроек
        }
    };

    // Инициализация
    useEffect(() => {
        const initialize = async () => {
            setIsLoading(true);
            await loadProxyConfig();
            setIsLoading(false);
        };
        initialize();
    }, []);

    const getStatus = () => {
        if (isTesting) return 'testing';
        if (error) return 'error';
        if (proxyEnabled && connectionStatus === 'connected') return 'connected';
        return 'disconnected';
    };

    const getStatusText = () => {
        if (isTesting) return 'Тестирование...';
        if (error) return 'Ошибка';
        if (proxyEnabled && connectionStatus === 'connected') return 'Подключен';
        if (proxyEnabled) return 'Включен';
        return 'Отключен';
    };

    const getStatusIcon = () => {
        if (isTesting) return FiGlobe;
        if (error) return FiAlertCircle;
        if (proxyEnabled && connectionStatus === 'connected') return FiCheckCircle;
        if (proxyEnabled) return FiLock;
        return FiUnlock;
    };

    const StatusIcon = getStatusIcon();

    const isConfigValid = proxyConfig.host && proxyConfig.port;

    if (isLoading) {
        return (
            <SettingsCard>
                <CardHeader>
                    <CardTitle>
                        <FiShield />
                        SOCKS5 Прокси
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
                    <FiShield />
                    SOCKS5 Прокси
                </CardTitle>
                <StatusIndicator status={getStatus()}>
                    <StatusIcon className="status-icon" />
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
                                Использовать SOCKS5 прокси
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Switch
                                    checked={proxyEnabled}
                                    onChange={(e) => handleProxyToggle(e.target.checked)}
                                />
                                <span style={{ fontSize: '0.85rem', color: '#999' }}>
                                    {proxyEnabled ? 'Включен' : 'Выключен'}
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

                {/* Настройки прокси-сервера */}
                <Section>
                    <SectionHeader>
                        <SectionTitle>
                            <FiGlobe />
                            Настройки прокси-сервера
                        </SectionTitle>
                    </SectionHeader>

                    <ProxyGrid>
                        <ProxyField>
                            <FieldLabel>Хост / IP адрес</FieldLabel>
                            <ProxyInput
                                type="text"
                                value={proxyConfig.host}
                                onChange={(e) => updateConfig('host', e.target.value)}
                                placeholder="example.com или 192.168.1.1"
                                disabled={!proxyEnabled}
                            />
                        </ProxyField>

                        <ProxyField>
                            <FieldLabel>Порт</FieldLabel>
                            <NumericEditorComponent
                                value={proxyConfig.port}
                                min={1}
                                max={65535}
                                width="100%"
                                disabled={!proxyEnabled}
                                onChange={(value) => updateConfig('port', value)}
                            />
                        </ProxyField>

                        <ProxyField>
                            <FieldLabel>Логин (опционально)</FieldLabel>
                            <ProxyInput
                                type="text"
                                value={proxyConfig.username}
                                onChange={(e) => updateConfig('username', e.target.value)}
                                placeholder="username"
                                disabled={!proxyEnabled}
                            />
                        </ProxyField>

                        <ProxyField>
                            <FieldLabel>Пароль (опционально)</FieldLabel>
                            <ProxyInput
                                type="password"
                                value={proxyConfig.password}
                                onChange={(e) => updateConfig('password', e.target.value)}
                                placeholder="password"
                                disabled={!proxyEnabled}
                            />
                        </ProxyField>
                    </ProxyGrid>

                    <Row gap="12px" style={{ marginTop: '16px' }}>
                        <TestButton
                            onClick={testConnection}
                            disabled={!proxyEnabled || !isConfigValid || isTesting}
                        >
                            <FiGlobe />
                            {isTesting ? 'Тестирование...' : 'Тест подключения'}
                        </TestButton>

                        <ActionButton
                            onClick={saveProxyConfig}
                            disabled={!proxyEnabled || !isConfigValid}
                        >
                            <FiSettings />
                            Сохранить настройки
                        </ActionButton>
                    </Row>

                    {connectionStatus === 'connected' && (
                        <SuccessBadge style={{ marginTop: '8px' }}>
                            ✓ Подключение к прокси-серверу успешно установлено
                        </SuccessBadge>
                    )}

                    {!proxyEnabled && (
                        <InfoBadge style={{ marginTop: '8px' }}>
                            SOCKS5 прокси используется для обхода блокировок YouTube в некоторых регионах
                        </InfoBadge>
                    )}
                </Section>
            </CardContent>
        </SettingsCard>
    );
}