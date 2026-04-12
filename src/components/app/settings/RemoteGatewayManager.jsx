import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { QRCodeSVG } from 'qrcode.react';
import { FiCopy, FiRefreshCw, FiCheck, FiAlertCircle, FiSmartphone } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { Section, SectionHeader, SectionTitle, ActionButton } from './SharedSettingsStyles';
import { getRemoteGatewayStatus, regenerateGatewayToken } from '../../../services/api';

// ─── Local styles ────────────────────────────────────────────────

const Wrapper = styled.div`
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 12px;
    box-sizing: border-box;
`;

const StatusRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const StatusLED = styled.span`
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${({ $on }) => $on ? '#10b981' : '#555'};
    flex-shrink: 0;
`;

const StatusText = styled.span`
    font-size: 0.85rem;
    color: ${({ $on }) => $on ? '#10b981' : '#888'};
`;

const InfoGrid = styled.div`
    display: grid;
    grid-template-columns: 120px 1fr;
    gap: 6px 12px;
    font-size: 0.85rem;
    align-items: center;
`;

const InfoLabel = styled.span`
    color: #888;
`;

const InfoValue = styled.span`
    color: #e0e0e0;
    display: flex;
    align-items: center;
    gap: 8px;
`;

const CodeValue = styled.span`
    font-family: 'JetBrains Mono', 'Consolas', monospace;
    font-size: 1.05rem;
    letter-spacing: 0.15em;
    color: #fff;
`;

const SmallBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid #333;
    color: #888;
    cursor: pointer;
    font-size: 0.72rem;
    transition: all 0.15s ease;
    white-space: nowrap;

    &:hover:not(:disabled) { background: rgba(255, 255, 255, 0.1); color: #e0e0e0; }
    &:disabled { opacity: 0.4; cursor: not-allowed; }

    svg { width: 11px; height: 11px; }
`;

const QrGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
`;

const QrItem = styled.div`
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px;
    background: rgba(30, 30, 30, 0.5);
    border: 1px solid #333;
    border-radius: 10px;
`;

const QrBox = styled.div`
    flex-shrink: 0;
    background: #fff;
    padding: 6px;
    border-radius: 6px;
    display: flex;
`;

const QrInfo = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
`;

const QrAddress = styled.div`
    font-family: 'JetBrains Mono', 'Consolas', monospace;
    font-size: 0.82rem;
    color: #e0e0e0;
    word-break: break-all;
    line-height: 1.3;
`;

const Hint = styled.div`
    font-size: 0.82rem;
    color: #888;
`;

const Placeholder = styled.div`
    padding: 14px 0;
    color: #666;
    font-size: 0.85rem;
    display: flex;
    align-items: center;
    gap: 8px;

    svg { width: 16px; height: 16px; color: #f59e0b; }
`;

// ─── Component ───────────────────────────────────────────────────

export default function RemoteGatewayManager({ externalStatus }) {
    const { t } = useTranslation();
    const [status, setStatus] = useState(null);
    const [busy, setBusy] = useState(false);
    const [copiedUrl, setCopiedUrl] = useState(null);

    const refresh = useCallback(async () => {
        setStatus(await getRemoteGatewayStatus());
    }, []);

    useEffect(() => { refresh(); }, [refresh]);
    useEffect(() => { if (externalStatus) setStatus(externalStatus); }, [externalStatus]);

    const handleRegenerate = async () => {
        if (!window.confirm('Сменить код доступа? Все подключённые устройства потеряют доступ.')) return;
        setBusy(true);
        try { setStatus(await regenerateGatewayToken()); }
        finally { setBusy(false); }
    };

    const handleCopy = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedUrl(text);
            setTimeout(() => setCopiedUrl((c) => (c === text ? null : c)), 1500);
        } catch {}
    };

    if (!status) return null;

    return (
        <Wrapper>
            {/* ── Section: Status ── */}
            <Section>
                <SectionHeader>
                    <SectionTitle><FiSmartphone /> Статус</SectionTitle>
                </SectionHeader>

                <StatusRow>
                    <StatusLED $on={status.running} />
                    <StatusText $on={status.running}>
                        {status.running ? `Запущен, порт ${status.port}` : 'Остановлен'}
                    </StatusText>
                </StatusRow>

                <InfoGrid>
                    <InfoLabel>Код доступа</InfoLabel>
                    <InfoValue>
                        <CodeValue>{status.authToken || '—'}</CodeValue>
                        <SmallBtn onClick={handleRegenerate} disabled={busy}>
                            <FiRefreshCw /> Сменить
                        </SmallBtn>
                    </InfoValue>
                </InfoGrid>

                {!status.staticDirPresent && (
                    <Placeholder>
                        <FiAlertCircle />
                        Выполните <code>npm run pwa:build</code> для сборки мобильного приложения
                    </Placeholder>
                )}
            </Section>

            {/* ── Section: Connection ── */}
            <Section>
                <SectionHeader>
                    <SectionTitle><FiSmartphone /> Подключение</SectionTitle>
                </SectionHeader>

                {status.running && status.lanUrls.length > 0 ? (
                    <>
                        <Hint>Отсканируйте QR камерой телефона. Телефон должен быть в той же Wi-Fi сети.</Hint>
                        <QrGrid>
                            {status.lanUrls.map((url) => {
                                let host = '';
                                try { host = new URL(url).hostname; } catch {}
                                return (
                                    <QrItem key={url}>
                                        <QrBox>
                                            <QRCodeSVG value={url} size={110} level="M" marginSize={0} />
                                        </QrBox>
                                        <QrInfo>
                                            <QrAddress>{host}:{status.port}</QrAddress>
                                            <SmallBtn onClick={() => handleCopy(url)}>
                                                {copiedUrl === url ? <FiCheck /> : <FiCopy />}
                                                {copiedUrl === url ? 'Скопировано' : 'Копировать ссылку'}
                                            </SmallBtn>
                                        </QrInfo>
                                    </QrItem>
                                );
                            })}
                        </QrGrid>
                    </>
                ) : (
                    <Placeholder>
                        <FiAlertCircle />
                        {status.running
                            ? 'Внешние сетевые интерфейсы не найдены'
                            : 'Включите мобильный чат переключателем в шапке'}
                    </Placeholder>
                )}
            </Section>
        </Wrapper>
    );
}
