import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { tokens } from "../../../designSystem/tokens";
import {FiVolume2, FiSettings, FiRefreshCw, FiMic, FiActivity, FiExternalLink, FiEye} from 'react-icons/fi';
import {
    getAudioDeviceList,
    setAudioDevice,
    setAudioDeviceAuto,
    enableFFT,
    getFFTconfig, setFFTGain, setFFTdbFloor, setFFTTilt
} from '../../../services/api';
import {
    SettingsCard,
    CardHeader,
    CardTitle,
    CardContent,
    CollapsibleCard,
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
import { Trans, useTranslation } from "react-i18next";

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
    border-radius: ${tokens.radius.lg};
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
    background: ${tokens.color.bg.surface};
    color: ${tokens.color.text.primary};
    border: 1px solid ${tokens.color.border.default};
    border-radius: ${tokens.radius.lg};
    padding: 10px 12px;
    font-size: 0.9rem;
    cursor: pointer;
    transition: ${tokens.transition.base};

    &:hover {
        background: #252525;
        border-color: ${tokens.color.border.strong};
    }

    &:focus {
        outline: none;
        border-color: ${tokens.color.accent.primary};
        background: #252525;
        box-shadow: 0 0 0 3px rgba(100, 108, 255, 0.1);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    option {
        background: ${tokens.color.bg.surface};
        color: ${tokens.color.text.primary};
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
    background: ${tokens.color.feature.players.softBorder};
    border-color: ${tokens.color.feature.players.base};

    &:hover {
        background: ${tokens.color.feature.players.base};
        border-color: ${tokens.color.feature.players.base};
    }
`;

const FFTWrapper = styled.div`
    width: 360px;
    height: calc(74px);
    margin-top: -20px;
    margin-right: 20px;
    margin-bottom: -17px;
    background: transparent;
`;

const LoadingHeader = styled(CardHeader)`
    /* Для состояния загрузки используем обычный заголовок */
`;

export default function FFTControlComponent() {
    const { t } = useTranslation();
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


    const openDemoFFTColumns = () => {
        openExternalLink('http://localhost:5173/audio-fft-linear-demo');
    }

    const openDemoFFTRing = () => {
        openExternalLink('http://localhost:5173/audio-fft-round-demo');
    }

    const openDemoWaveform = () => {
        openExternalLink('http://localhost:5173/audio-waveform-demo');
    }

    // Загрузка конфигурации FFT
    const loadFFTConfig = async () => {
        try {
            const config = await getFFTconfig();
            setFftConfig(config);
            setSelectedDevice(config.device);
        } catch (err) {
            console.error('Ошибка загрузки конфигурации FFT:', err);
            setError(t('settings.fft.errors.loadConfig'));
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
            setError(t('settings.fft.errors.loadDevices'));
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
            setError(err.message || t('settings.fft.errors.toggle'));
        }
    };

    // Выбор устройства
    const handleDeviceChange = async (event) => {
        const deviceId = event.target.value;

        try {
            if (deviceId === '') {
                // "Auto" — follow the system default device.
                await setAudioDeviceAuto();
                setSelectedDevice(null);
                setError('');
                if (fftConfig.enabled) await loadFFTConfig();
                return;
            }

            const device = devices.find(d => d.id === deviceId);
            if (!device) return;

            await setAudioDevice(device.id, device.name, device.flow);
            setSelectedDevice(device);
            setError('');

            // Если FFT был включен, перезагружаем конфигурацию
            if (fftConfig.enabled) {
                await loadFFTConfig();
            }
        } catch (err) {
            console.error('Ошибка установки устройства:', err);
            setError(t('settings.fft.errors.setDevice'));
        }
    };

    const handleSetFFTGain = async (gain) => {
        setFftConfig(prev => ({ ...prev, masterGain: gain }));
        try {
            await setFFTGain(gain);
            setError('');
        } catch (err) {
            console.error('Ошибка установки усиления FFT:', err);
            setError(t('settings.fft.errors.setGain'));
        }
    }

    const handleSetFFTDbFloor = async (dbFloor) => {
        setFftConfig(prev => ({ ...prev, dbFloor: dbFloor }));
        try {
            await setFFTdbFloor(dbFloor);
            setError('');
        } catch (err) {
            console.error('Ошибка установки нижнего порога FFT:', err);
            setError(t('settings.fft.errors.setDbFloor'));
        }
    }

    const handleSetFFTTilt = async (tilt) => {
        setFftConfig(prev => ({ ...prev, tilt: tilt }));
        try {
            await setFFTTilt(tilt);
            setError('');
        } catch (err) {
            console.error('Ошибка установки наклона FFT:', err);
            setError(t('settings.fft.errors.setTilt'));
        }
    }

    // Определение статуса.
    // Нет выбранного устройства (selectedDevice === null) — это не ошибка, а режим
    // "Авто": анализатор следует за системным устройством по умолчанию.
    const getStatus = () => {
        if (error) return 'error';
        if (fftConfig.enabled) return 'active';
        return 'inactive';
    };

    const getStatusText = () => {
        if (error) return t('settings.fft.status.error');
        if (fftConfig.enabled && selectedDevice) return t('settings.fft.status.active');
        if (fftConfig.enabled && !selectedDevice) return t('settings.fft.status.auto');
        return t('settings.fft.status.disabled');
    };

    const deviceName = selectedDevice ? selectedDevice.name : t('settings.fft.device.auto');

    if (isLoading) {
        return (
            <SettingsCard>
                <LoadingHeader>
                    <CardTitle>
                        <FiActivity />
                        {t('settings.fft.title')}
                    </CardTitle>
                    <InfoBadge>{t('common.loading')}</InfoBadge>
                </LoadingHeader>
            </SettingsCard>
        );
    }

    return (
        <CollapsibleCard
            icon={<FiActivity />}
            title={t('settings.fft.title')}
            headerControlInteractive={false}
            headerControl={
                <>
                    <StatusIndicator status={getStatus()}>
                        <FiActivity className="status-icon" />
                        <span className="status-text">{getStatusText()}</span>
                    </StatusIndicator>
                    <FFTWrapper>
                        <FFTBars
                            bars={60}
                            peakThickness={1}
                            peakColor={tokens.color.feature.players.base}
                            barColor={tokens.color.feature.players.softBorder}
                            backgroundColor="transparent"
                        />
                    </FFTWrapper>
                </>
            }
            preview={
                <Trans
                    i18nKey="settings.fft.preview.description"
                    components={{
                        br: <br />,
                        highlight: <span className="highlight" />
                    }}
                    values={{ device: deviceName }}
                />
            }
        >
            <CardContent>
                    {/* Основные настройки */}
                    <Section>
                        <SectionHeader>
                            <SectionTitle>
                                <FiSettings />
                                {t('settings.fft.sections.general')}
                            </SectionTitle>
                        </SectionHeader>

                        <Row gap="16px">
                            <ControlGroup>
                                <label style={{ fontSize: '0.9rem', fontWeight: '500', color: '#e0e0e0', marginBottom: '8px' }}>
                                    {t('settings.fft.controls.enable')}
                                </label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Switch
                                        checked={fftConfig.enabled}
                                        onChange={(e) => handleFFTToggle(e.target.checked)}
                                    />
                                    <span style={{ fontSize: '0.85rem', color: '#999' }}>
                                        {fftConfig.enabled ? t('settings.fft.controls.enabled') : t('settings.fft.controls.disabled')}
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
                                {t('settings.fft.sections.device')}
                            </SectionTitle>
                        </SectionHeader>

                        <Row gap="12px">
                            <DeviceSelector
                                value={selectedDevice?.id || ''}
                                onChange={handleDeviceChange}
                                disabled={devices.length === 0}
                            >
                                <option value="">{t('settings.fft.device.auto')}</option>
                                {devices.map((device) => (
                                    <option key={device.id} value={device.id}>
                                        {device.name} ({device.flow})
                                    </option>
                                ))}
                            </DeviceSelector>

                            <RefreshButton
                                onClick={loadDevices}
                                disabled={isRefreshing}
                                title={t('settings.fft.device.refresh')}
                            >
                                <FiRefreshCw style={{
                                    animation: isRefreshing ? 'spin 1s linear infinite' : 'none'
                                }} />
                            </RefreshButton>
                        </Row>

                        {selectedDevice && (
                            <InfoBadge style={{ marginTop: '8px' }}>
                                {t('settings.fft.device.selected', { name: selectedDevice.name })}
                            </InfoBadge>
                        )}
                    </Section>

                    {/* Параметры FFT */}
                    {fftConfig.enabled && (
                        <Section>
                            <SectionHeader>
                                <SectionTitle>
                                    <FiVolume2 />
                                    {t('settings.fft.sections.parameters')}
                                </SectionTitle>
                            </SectionHeader>

                            <ParameterGrid>
                                <SeekbarComponent
                                    title={t('settings.fft.sliders.dbFloor')}
                                    min={-100}
                                    max={-20}
                                    value={fftConfig.dbFloor}
                                    step={1}
                                    onChange={handleSetFFTDbFloor}
                                    formatValue={(val) => `${val} dB`}
                                />

                                <SeekbarComponent
                                    title={t('settings.fft.sliders.masterGain')}
                                    min={0.1}
                                    max={100}
                                    value={fftConfig.masterGain}
                                    step={0.1}
                                    onChange={handleSetFFTGain}
                                    logarithmic={true}
                                    roundTo={2}
                                    formatValue={(val) => `×${val.toFixed(1)}`}
                                />

                                <SeekbarComponent
                                    title={t('settings.fft.sliders.tilt')}
                                    min={-2}
                                    max={2}
                                    value={fftConfig.tilt}
                                    step={0.01}
                                    onChange={handleSetFFTTilt}
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
                                {t('settings.fft.sections.demo')}
                            </SectionTitle>
                        </SectionHeader>

                        <Row gap="12px">
                            <DemoButton onClick={openDemoFFTColumns}>
                                <FiExternalLink />
                                {t('settings.fft.demo.columns')}
                            </DemoButton>

                            <DemoButton onClick={openDemoFFTRing}>
                                <FiExternalLink />
                                {t('settings.fft.demo.ring')}
                            </DemoButton>

                            <DemoButton onClick={openDemoWaveform}>
                                <FiExternalLink />
                                {t('settings.fft.demo.waveform')}
                            </DemoButton>
                        </Row>

                        <InfoBadge style={{ marginTop: '8px' }}>
                            {t('settings.fft.demo.hint')}
                        </InfoBadge>
                    </Section>
                    <style jsx>{`
                        @keyframes spin {
                            from { transform: rotate(0deg); }
                            to { transform: rotate(360deg); }
                        }
                    `}</style>
                </CardContent>
        </CollapsibleCard>
    );
}