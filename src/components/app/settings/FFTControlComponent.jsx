import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import {FiVolume2, FiSettings, FiRefreshCw, FiMic, FiActivity, FiExternalLink, FiEye, FiChevronDown, FiChevronUp} from 'react-icons/fi';
import {
    getAudioDeviceList,
    setAudioDevice,
    getAudioDevice,
    enableFFT,
    getFFTconfig
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
    WarningBadge
} from './SharedSettingsStyles';
import Switch from '../../utils/Switch';
import SeekbarComponent from '../../utils/SeekbarComponent';
import {openExternalLink} from "../../../services/api";
import {Row} from "../SettingsComponent";
import FFTBars from "../../player/FFTBars";
import {Spacer} from "../../utils/Separator";

// Специфичные стили для FFT компонента
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

const DeviceSelector = styled.select`
    flex: 1;
    background: #1e1e1e;
    color: #fff;
    border: 1px solid #444;
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 0.9rem;
    cursor: pointer;
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

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    option {
        background: #1e1e1e;
        color: #fff;
    }
`;

const ParameterGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-top: 12px;
`;

const RefreshButton = styled(ActionButton)`
    background: #374151;
    border-color: #4b5563;
    min-width: auto;
    padding: 10px;

    &:hover {
        background: #4b5563;
        border-color: #6b7280;
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;

const DemoButton = styled(ActionButton)`
    background: rgba(30, 64, 175, 0.35);
    border-color: #1e40af;

    &:hover {
        background: rgba(29, 78, 216, 0.62);
        border-color: #1d4ed8;
    }
`;

const FFTWrapper = styled.div`
    width: 400px;
    height: calc(74px);
    margin-top: -20px;
    margin-right: 20px;
    margin-bottom: -17px;
    background: transparent;
`;

const CollapsibleHeader = styled.div`
    padding: 16px 20px;
    border-bottom: 1px solid #333;
    cursor: pointer;
    transition: background-color 0.2s ease;
    
    &:hover {
        background-color: rgba(255, 255, 255, 0.02);
    }
`;

const CollapsedPreview = styled.div`
    padding: 16px 20px;
    color: #999;
    font-size: 0.9rem;
    line-height: 1.5;
    cursor: pointer;
    transition: background-color 0.2s ease;
    
    &:hover {
        background-color: rgba(255, 255, 255, 0.02);
    }
    
    .highlight {
        color: #4a9eff;
        font-weight: 500;
    }
`;

const CollapseToggle = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    color: #FFF;
    font-size: 1rem;
    transition: color 0.2s ease;
    
    svg {
        width: 18px;
        height: 18px;
        transition: transform 0.2s ease;
    }
    
    ${CollapsibleHeader}:hover & {
        color: #ccc;
    }
`;

const LoadingHeader = styled(CardHeader)`
    /* Для состояния загрузки используем обычный заголовок */
`;

export default function FFTControlComponent() {
    const [isOpen, setIsOpen] = useState(false);
    const [fftConfig, setFftConfig] = useState({
        dbFloor: -60,
        masterGain: 1,
        tilt: 0,
        enabled: false,
        device: null
    });

    const [devices, setDevices] = useState([]);
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);

    const toggleOpen = () => setIsOpen((prev) => !prev);

    const openDemoFFTColumns = () => {
        openExternalLink('http://localhost:5173/audio-fft-linear-demo');
    }

    const openDemoFFTRing = () => {
        openExternalLink('http://localhost:5173/audio-fft-round-demo');
    }

    // Загрузка конфигурации FFT
    const loadFFTConfig = async () => {
        try {
            const config = await getFFTconfig();
            setFftConfig(config);
            setSelectedDevice(config.device);
        } catch (err) {
            console.error('Ошибка загрузки конфигурации FFT:', err);
            setError('Не удалось загрузить конфигурацию FFT');
        }
    };

    // Загрузка списка устройств
    const loadDevices = async () => {
        try {
            setIsRefreshing(true);
            const deviceList = await getAudioDeviceList();
            setDevices(deviceList || []);
            setError('');
        } catch (err) {
            console.error('Ошибка загрузки устройств:', err);
            setError('Не удалось загрузить список аудиоустройств');
        } finally {
            setIsRefreshing(false);
        }
    };

    // Инициализация
    useEffect(() => {
        const initialize = async () => {
            setIsLoading(true);
            await Promise.all([loadFFTConfig(), loadDevices()]);
            setIsLoading(false);
        };
        initialize();
    }, []);

    // Включение/отключение FFT
    const handleFFTToggle = async (enabled) => {
        try {
            await enableFFT({ enabled });
            setFftConfig(prev => ({ ...prev, enabled }));
            setError('');
        } catch (err) {
            console.error('Ошибка переключения FFT:', err);
            setError(err.message || 'Не удалось переключить FFT');
        }
    };

    // Выбор устройства
    const handleDeviceChange = async (event) => {
        const deviceId = event.target.value;
        const device = devices.find(d => d.id === deviceId);

        if (!device) return;

        try {
            await setAudioDevice(device.id, device.name, device.flow);
            setSelectedDevice(device);
            setError('');

            // Если FFT был включен, перезагружаем конфигурацию
            if (fftConfig.enabled) {
                await loadFFTConfig();
            }
        } catch (err) {
            console.error('Ошибка установки устройства:', err);
            setError('Не удалось установить аудиоустройство');
        }
    };

    // Определение статуса
    const getStatus = () => {
        if (error) return 'error';
        if (fftConfig.enabled && selectedDevice) return 'active';
        return 'inactive';
    };

    const getStatusText = () => {
        if (error) return 'Ошибка';
        if (fftConfig.enabled && selectedDevice) return 'Активен';
        if (fftConfig.enabled && !selectedDevice) return 'Нет устройства';
        return 'Отключен';
    };

    if (isLoading) {
        return (
            <SettingsCard>
                <LoadingHeader>
                    <CardTitle>
                        <FiActivity />
                        FFT Анализатор
                    </CardTitle>
                    <InfoBadge>Загрузка...</InfoBadge>
                </LoadingHeader>
            </SettingsCard>
        );
    }

    return (
        <SettingsCard>
            <CollapsibleHeader onClick={toggleOpen}>
                <Row gap="12px">
                    <CardTitle>
                        <FiActivity />
                        FFT Анализатор
                    </CardTitle>

                    <StatusIndicator status={getStatus()}>
                        <FiActivity className="status-icon" />
                        <span className="status-text">{getStatusText()}</span>
                    </StatusIndicator>

                    <Spacer/>

                    {/* FFT визуализация показывается всегда в заголовке */}
                    <FFTWrapper>
                        <FFTBars
                            bars={64}
                            barWidth={4}
                            peakThickness={1}
                            peakColor={'rgba(100,108,255,0.8)'}
                            barColor={'rgba(128,100,255,0.4)'}
                            backgroundColor="transparent"
                        />
                    </FFTWrapper>

                    <CollapseToggle>
                        {isOpen ? 'Свернуть' : 'Настроить'}
                        {isOpen ? <FiChevronUp /> : <FiSettings />}
                    </CollapseToggle>
                </Row>
            </CollapsibleHeader>

            {/* Свернутое описание */}
            {!isOpen && (
                <CollapsedPreview onClick={toggleOpen}>
                    Анализатор аудиочастот в реальном времени для создания визуальных эффектов. Захватывает звук с выбранного устройства и предоставляет данные FFT для визуализаций.
                    <br /><br />
                    <span className="highlight">Устройство:</span> {selectedDevice ? selectedDevice.name : 'Не выбрано'}<br />
                </CollapsedPreview>
            )}

            {isOpen && (
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
                                    Включить FFT анализ
                                </label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Switch
                                        checked={fftConfig.enabled}
                                        onChange={(e) => handleFFTToggle(e.target.checked)}
                                    />
                                    <span style={{ fontSize: '0.85rem', color: '#999' }}>
                                        {fftConfig.enabled ? 'Включен' : 'Выключен'}
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

                    {/* Выбор устройства */}
                    <Section>
                        <SectionHeader>
                            <SectionTitle>
                                <FiMic />
                                Аудиоустройство
                            </SectionTitle>
                        </SectionHeader>

                        <Row gap="12px">
                            <DeviceSelector
                                value={selectedDevice?.id || ''}
                                onChange={handleDeviceChange}
                                disabled={devices.length === 0}
                            >
                                <option value="">Выберите устройство</option>
                                {devices.map((device) => (
                                    <option key={device.id} value={device.id}>
                                        {device.name} ({device.flow})
                                    </option>
                                ))}
                            </DeviceSelector>

                            <RefreshButton
                                onClick={loadDevices}
                                disabled={isRefreshing}
                                title="Обновить список устройств"
                            >
                                <FiRefreshCw style={{
                                    animation: isRefreshing ? 'spin 1s linear infinite' : 'none'
                                }} />
                            </RefreshButton>
                        </Row>

                        {selectedDevice && (
                            <InfoBadge style={{ marginTop: '8px' }}>
                                Выбрано: {selectedDevice.name}
                            </InfoBadge>
                        )}
                    </Section>

                    {/* Параметры FFT */}
                    {fftConfig.enabled && (
                        <Section>
                            <SectionHeader>
                                <SectionTitle>
                                    <FiVolume2 />
                                    Параметры анализатора
                                </SectionTitle>
                            </SectionHeader>

                            <ParameterGrid>
                                <SeekbarComponent
                                    title="Нижний порог (dB)"
                                    min={-100}
                                    max={-20}
                                    value={fftConfig.dbFloor}
                                    step={1}
                                    onChange={(value) => {
                                        setFftConfig(prev => ({ ...prev, dbFloor: value }));
                                        // TODO: отправить изменения на бекенд
                                    }}
                                    formatValue={(val) => `${val} dB`}
                                />

                                <SeekbarComponent
                                    title="Основное усиление"
                                    min={0.1}
                                    max={5}
                                    value={fftConfig.masterGain}
                                    step={0.1}
                                    onChange={(value) => {
                                        setFftConfig(prev => ({ ...prev, masterGain: value }));
                                        // TODO: отправить изменения на бекенд
                                    }}
                                    formatValue={(val) => `×${val.toFixed(1)}`}
                                />

                                <SeekbarComponent
                                    title="Наклон частот"
                                    min={-10}
                                    max={10}
                                    value={fftConfig.tilt}
                                    step={0.1}
                                    onChange={(value) => {
                                        setFftConfig(prev => ({ ...prev, tilt: value }));
                                        // TODO: отправить изменения на бекенд
                                    }}
                                    formatValue={(val) => `${val > 0 ? '+' : ''}${val.toFixed(1)}`}
                                />
                            </ParameterGrid>
                        </Section>
                    )}

                    {/* Демо-страницы */}
                    <Section>
                        <SectionHeader>
                            <SectionTitle>
                                <FiEye />
                                Демонстрация FFT
                            </SectionTitle>
                        </SectionHeader>

                        <Row gap="12px">
                            <DemoButton onClick={openDemoFFTColumns}>
                                <FiExternalLink />
                                Демо FFT (столбцы)
                            </DemoButton>

                            <DemoButton onClick={openDemoFFTRing}>
                                <FiExternalLink />
                                Демо FFT (кольцо)
                            </DemoButton>
                        </Row>

                        <InfoBadge style={{ marginTop: '8px' }}>
                            Откроются в новом окне для тестирования визуализации
                        </InfoBadge>
                    </Section>
                </CardContent>
            )}

            <style jsx>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </SettingsCard>
    );
}