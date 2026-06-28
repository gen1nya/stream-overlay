import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { tokens } from "../../../designSystem/tokens";
import Button from '../../../designSystem/components/Button';
import { QRCodeSVG } from 'qrcode.react';
import { FiCopy, FiRefreshCw, FiCheck, FiAlertCircle, FiSmartphone } from 'react-icons/fi';
import {
    SettingsCard,
    CardHeader,
    CardTitle,
    CardContent,
    InfoBadge,
} from './SharedSettingsStyles';
import { getRemoteGatewayStatus, regenerateGatewayToken } from '../../../services/api';

// ─── Local styles ────────────────────────────────────────────────

const Wrapper = styled.div`
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0;
    box-sizing: border-box;
`;

const HeaderRight = styled.div`
    margin-left: auto;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: ${tokens.space.md};
    flex-wrap: wrap;

    @media (max-width: 720px) {
        width: 100%;
        margin-left: 0;
    }
`;

const StatusBadge = styled(InfoBadge)`
    background: ${p => p.$running ? tokens.color.success.soft : tokens.color.scrim.panel};
    border-color: ${p => p.$running ? tokens.color.success.softBorder : tokens.color.border.default};
    color: ${p => p.$running ? tokens.color.success.text : tokens.color.text.faint};
`;

const AccessCodeRow = styled.div`
    display: grid;
    grid-template-columns: 120px 1fr;
    gap: ${tokens.space.sm} ${tokens.space.md};
    align-items: center;

    @media (max-width: 560px) {
        grid-template-columns: 1fr;
    }
`;

const InfoLabel = styled.span`
    font-size: ${tokens.font.size.sm};
    color: ${tokens.color.text.faint};
`;

const InfoValue = styled.span`
    color: ${tokens.color.text.secondary};
    display: flex;
    align-items: center;
    gap: ${tokens.space.sm};
    flex-wrap: wrap;
`;

const CodeValue = styled.span`
    font-family: ${tokens.font.family.mono};
    font-size: 1.05rem;
    letter-spacing: 0.15em;
    color: ${tokens.color.text.primary};
`;

const SmallButton = styled(Button).attrs({
    $variant: 'ghost',
    $size: 'sm',
    type: 'button',
})`
    padding: ${tokens.space.xs} ${tokens.space.md};
    white-space: nowrap;

    svg {
        width: ${tokens.space.md};
        height: ${tokens.space.md};
    }
`;

const QrGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: ${tokens.space.lg};

    @media (max-width: 900px) {
        grid-template-columns: 1fr;
    }
`;

const QrItem = styled.div`
    display: flex;
    align-items: center;
    gap: ${tokens.space.lg};
    padding: ${tokens.space.lg};
    background: ${tokens.color.scrim.panel};
    border: 1px solid ${tokens.color.border.subtle};
    border-radius: ${tokens.radius.lg};
`;

const QrBox = styled.div`
    flex-shrink: 0;
    background: #fff;
    padding: 6px;
    border-radius: ${tokens.radius.md};
    display: flex;
`;

const QrInfo = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${tokens.space.sm};
    min-width: 0;
`;

const QrAddress = styled.div`
    font-family: ${tokens.font.family.mono};
    font-size: 0.82rem;
    color: ${tokens.color.text.secondary};
    word-break: break-all;
    line-height: 1.3;
`;

const Hint = styled.div`
    font-size: 0.82rem;
    color: ${tokens.color.text.faint};
`;

const Placeholder = styled.div`
    padding: ${tokens.space.lg} 0;
    color: ${tokens.color.text.disabled};
    font-size: 0.85rem;
    display: flex;
    align-items: center;
    gap: ${tokens.space.sm};

    svg { width: 16px; height: 16px; color: ${tokens.color.warning.base}; }
`;

// ─── Component ───────────────────────────────────────────────────

export default function RemoteGatewayManager({ externalStatus }) {
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
        } catch {
            /* ignore */
        }
    };

    if (!status) return null;

    return (
        <Wrapper>
            <SettingsCard>
                <CardHeader>
                    <CardTitle><FiSmartphone /> Статус</CardTitle>
                    <HeaderRight>
                        <StatusBadge $running={status.running}>
                            {status.running ? `Запущен, порт ${status.port}` : 'Остановлен'}
                        </StatusBadge>
                    </HeaderRight>
                </CardHeader>

                <CardContent>
                    <AccessCodeRow>
                        <InfoLabel>Код доступа</InfoLabel>
                        <InfoValue>
                            <CodeValue>{status.authToken || '—'}</CodeValue>
                            <SmallButton onClick={handleRegenerate} disabled={busy}>
                                <FiRefreshCw /> Сменить
                            </SmallButton>
                        </InfoValue>
                    </AccessCodeRow>

                    {!status.staticDirPresent && (
                        <Placeholder>
                            <FiAlertCircle />
                            Выполните <code>npm run pwa:build</code> для сборки мобильного приложения
                        </Placeholder>
                    )}
                </CardContent>
            </SettingsCard>

            <SettingsCard>
                <CardHeader>
                    <CardTitle><FiSmartphone /> Подключение</CardTitle>
                </CardHeader>

                <CardContent>
                    {status.running && status.lanUrls.length > 0 ? (
                        <>
                            <Hint>Отсканируйте QR камерой телефона. Телефон должен быть в той же Wi-Fi сети.</Hint>
                            <QrGrid>
                                {status.lanUrls.map((url) => {
                                    let host = '';
                                    try { host = new URL(url).hostname; } catch {
                                        /* ignore */
                                    }
                                    return (
                                        <QrItem key={url}>
                                            <QrBox>
                                                <QRCodeSVG value={url} size={110} level="M" marginSize={0} />
                                            </QrBox>
                                            <QrInfo>
                                                <QrAddress>{host}:{status.port}</QrAddress>
                                                <SmallButton onClick={() => handleCopy(url)}>
                                                    {copiedUrl === url ? <FiCheck /> : <FiCopy />}
                                                    {copiedUrl === url ? 'Скопировано' : 'Копировать ссылку'}
                                                </SmallButton>
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
                </CardContent>
            </SettingsCard>
        </Wrapper>
    );
}
