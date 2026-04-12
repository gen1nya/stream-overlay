import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { QRCodeSVG } from 'qrcode.react';
import { FiCopy, FiRefreshCw, FiCheck, FiAlertCircle, FiSmartphone, FiEye, FiEyeOff } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import Switch from '../../utils/Switch';
import { getRemoteGatewayStatus, toggleRemoteGateway, regenerateGatewayToken } from '../../../services/api';

const Container = styled.div`
    width: 100%;
    max-width: 820px;
`;

const Card = styled.div`
    background: #1e1e1e;
    border: 1px solid #2a2a2f;
    border-radius: 12px;
    padding: 20px 24px;
    margin-bottom: 16px;
`;

const CardTitle = styled.h3`
    margin: 0 0 4px 0;
    font-size: 1rem;
    color: #fff;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 10px;

    svg { color: #7c3aed; width: 18px; height: 18px; }
`;

const CardHint = styled.p`
    margin: 0 0 16px 0;
    color: #888;
    font-size: 0.85rem;
    line-height: 1.5;
`;

const ToggleRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 0;
    margin-bottom: 8px;
`;

const ToggleLabel = styled.span`
    color: #e0e0e0;
    font-size: 0.9rem;
    font-weight: 500;
`;

const StatusRow = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 0;
    border-top: 1px solid #2a2a2f;
`;

const StatusLabel = styled.span`
    color: #a1a1aa;
    font-size: 0.85rem;
    min-width: 140px;
`;

const StatusValue = styled.span`
    color: #e0e0e0;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    gap: 6px;

    svg { width: 14px; height: 14px; }
`;

const Dot = styled.span`
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${({ $color }) => $color};
    flex-shrink: 0;
`;


const QrList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const QrCard = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 20px;
    background: #141418;
    border: 1px solid #2a2a2f;
    border-radius: 10px;
`;

const QrBox = styled.div`
    background: #fff;
    padding: 12px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
`;

const QrHint = styled.div`
    color: #a1a1aa;
    font-size: 0.8rem;
    text-align: center;
`;

const UrlSpoiler = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    width: 100%;
`;

const UrlText = styled.div`
    color: #666;
    font-family: 'JetBrains Mono', 'Consolas', monospace;
    font-size: 0.72rem;
    word-break: break-all;
    text-align: center;
    line-height: 1.4;
    max-width: 100%;
`;

const SmallButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    border-radius: 4px;
    background: transparent;
    border: 1px solid #2a2a2f;
    color: #888;
    cursor: pointer;
    font-size: 0.7rem;
    transition: all 0.15s ease;

    &:hover { background: rgba(255, 255, 255, 0.05); color: #e0e0e0; }

    svg { width: 10px; height: 10px; }
`;

const Placeholder = styled.div`
    padding: 12px 16px;
    background: rgba(245, 158, 11, 0.08);
    border: 1px solid rgba(245, 158, 11, 0.3);
    border-radius: 8px;
    color: #fbbf24;
    font-size: 0.85rem;
    line-height: 1.5;
`;

export default function RemoteGatewayManager() {
    const { t } = useTranslation();
    const [status, setStatus] = useState(null);
    const [busy, setBusy] = useState(false);
    const [copiedUrl, setCopiedUrl] = useState(null);
    const [showUrl, setShowUrl] = useState({});

    const refresh = useCallback(async () => {
        const data = await getRemoteGatewayStatus();
        setStatus(data);
    }, []);

    useEffect(() => { refresh(); }, [refresh]);

    const handleToggle = async (enabled) => {
        setBusy(true);
        try {
            const data = await toggleRemoteGateway(enabled);
            setStatus(data);
        } finally { setBusy(false); }
    };

    const handleRegenerate = async () => {
        if (!window.confirm(t('settings.pages.remoteGateway.regenerateConfirm',
            'Перегенерировать токен? Все подключённые устройства потеряют доступ.'))) return;
        setBusy(true);
        try {
            const data = await regenerateGatewayToken();
            setStatus(data);
        } finally { setBusy(false); }
    };

    const handleCopy = async (url) => {
        try {
            await navigator.clipboard.writeText(url);
            setCopiedUrl(url);
            setTimeout(() => setCopiedUrl((cur) => (cur === url ? null : cur)), 1500);
        } catch (err) { console.error('Failed to copy:', err); }
    };

    if (!status) {
        return (
            <Container>
                <Card>
                    <CardTitle>{t('settings.pages.remoteGateway.title', 'Удалённое подключение')}</CardTitle>
                    <CardHint>{t('common.loading', 'Загрузка...')}</CardHint>
                </Card>
            </Container>
        );
    }

    const runningColor = status.running ? '#10b981' : '#6b7280';

    return (
        <Container>
            <Card>
                <CardTitle>
                    <FiSmartphone/>
                    {t('settings.pages.remoteGateway.title', 'Мобильный чат')}
                </CardTitle>
                <CardHint>
                    {t('settings.pages.remoteGateway.hint',
                        'Чтение чата и модерация со смартфона по локальной сети.')}
                </CardHint>

                <ToggleRow>
                    <ToggleLabel>
                        {status.enabled
                            ? t('settings.pages.remoteGateway.enabled', 'Включено')
                            : t('settings.pages.remoteGateway.disabled', 'Выключено')}
                    </ToggleLabel>
                    <Switch
                        checked={!!status.enabled}
                        onChange={(e) => handleToggle(e.target.checked)}
                        disabled={busy}
                    />
                </ToggleRow>

                <StatusRow>
                    <StatusLabel>{t('settings.pages.remoteGateway.status', 'Статус')}</StatusLabel>
                    <StatusValue>
                        <Dot $color={runningColor}/>
                        {status.running
                            ? t('settings.pages.remoteGateway.running', 'Запущен, порт :') + status.port
                            : t('settings.pages.remoteGateway.stopped', 'Остановлен')}
                    </StatusValue>
                </StatusRow>

                <StatusRow>
                    <StatusLabel>{t('settings.pages.remoteGateway.token', 'Код доступа')}</StatusLabel>
                    <StatusValue style={{ gap: 10, flex: 1 }}>
                        <span style={{ fontFamily: "'JetBrains Mono', 'Consolas', monospace", fontSize: '1.1rem', letterSpacing: '0.15em' }}>
                            {status.authToken || '—'}
                        </span>
                        <SmallButton onClick={handleRegenerate} disabled={busy}
                            style={{ marginLeft: 4 }}>
                            <FiRefreshCw/>
                            {t('settings.pages.remoteGateway.regenerateToken', 'Сменить')}
                        </SmallButton>
                    </StatusValue>
                </StatusRow>

                {!status.staticDirPresent && (
                    <StatusRow>
                        <StatusLabel>{t('settings.pages.remoteGateway.bundle', 'PWA-сборка')}</StatusLabel>
                        <StatusValue>
                            <Dot $color="#f59e0b"/>
                            {t('settings.pages.remoteGateway.bundleMissing', 'Нет dist-pwa/ — выполните npm run pwa:build')}
                        </StatusValue>
                    </StatusRow>
                )}
            </Card>

            {status.running && (
                <Card>
                    <CardTitle>
                        <FiSmartphone/>
                        {t('settings.pages.remoteGateway.lanUrlsTitle', 'Подключение')}
                    </CardTitle>
                    <CardHint>
                        {t('settings.pages.remoteGateway.lanUrlsHint',
                            'Отсканируйте QR с телефона — приложение откроется с авторизацией. Телефон должен быть в той же Wi-Fi сети.')}
                    </CardHint>

                    {status.lanUrls.length > 0 ? (
                        <QrList>
                            {status.lanUrls.map((url) => (
                                <QrCard key={url}>
                                    <QrBox>
                                        <QRCodeSVG value={url} size={180} level="M" marginSize={0}/>
                                    </QrBox>
                                    <QrHint>
                                        {t('settings.pages.remoteGateway.scanHint', 'Наведите камеру телефона')}
                                    </QrHint>
                                    <UrlSpoiler>
                                        <SmallButton onClick={() => setShowUrl((s) => ({ ...s, [url]: !s[url] }))}>
                                            {showUrl[url] ? <FiEyeOff/> : <FiEye/>}
                                            {showUrl[url]
                                                ? t('settings.pages.remoteGateway.hideLink', 'Скрыть ссылку')
                                                : t('settings.pages.remoteGateway.showLink', 'Показать ссылку')}
                                        </SmallButton>
                                        {showUrl[url] && (
                                            <>
                                                <UrlText>{url}</UrlText>
                                                <SmallButton onClick={() => handleCopy(url)}>
                                                    {copiedUrl === url ? <FiCheck/> : <FiCopy/>}
                                                    {copiedUrl === url
                                                        ? t('common.copied', 'Скопировано')
                                                        : t('common.copyLink', 'Копировать')}
                                                </SmallButton>
                                            </>
                                        )}
                                    </UrlSpoiler>
                                </QrCard>
                            ))}
                        </QrList>
                    ) : (
                        <Placeholder>
                            <FiAlertCircle style={{ marginRight: 6, verticalAlign: 'middle' }}/>
                            {t('settings.pages.remoteGateway.noInterfaces', 'Внешние сетевые интерфейсы не найдены')}
                        </Placeholder>
                    )}
                </Card>
            )}
        </Container>
    );
}
