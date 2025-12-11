import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { FiRefreshCw } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';

const Wrapper = styled.div`
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 0 12px;
    background: #151515;
    border-left: 1px solid #333;
    height: 100%;
`;

const StatusItem = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-family: 'Consolas', 'Monaco', monospace;
    color: #888;
    letter-spacing: 0.5px;
`;

const StatusLabel = styled.span`
    font-weight: 600;
    color: #666;
`;

const StatusLED = styled.div`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${props => {
        if (props.$status === 'error') return '#ff4444';
        if (props.$status === 'warning') return '#ffaa00';
        return '#44ff44';
    }};
    box-shadow:
        0 0 4px ${props => {
            if (props.$status === 'error') return '#ff4444';
            if (props.$status === 'warning') return '#ffaa00';
            return '#44ff44';
        }},
        inset 0 1px 2px rgba(255,255,255,0.3);
    border: 1px solid ${props => {
        if (props.$status === 'error') return '#cc3333';
        if (props.$status === 'warning') return '#cc8800';
        return '#33cc33';
    }};
    transition: all 0.3s ease;

    ${props => props.$blinking && `
        animation: ledBlink 0.3s ease-in-out 3;
    `}

    @keyframes ledBlink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
    }
`;

const UptimeValue = styled.span`
    color: #aaa;
    font-size: 10px;
    min-width: 28px;
`;

const StatusDivider = styled.div`
    width: 1px;
    height: 14px;
    background: #444;
    margin: 0 2px;
`;

const ReconnectButton = styled.button`
    background: transparent;
    border: none;
    color: #666;
    padding: 2px 6px;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;

    &:hover {
        background: #333;
        color: #aaa;
    }

    &:active {
        transform: rotate(180deg);
    }

    svg {
        width: 12px;
        height: 12px;
    }
`;

const formatUptimeShort = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    return `${minutes}m`;
};

export default function ConnectionStatus({ stats, onReconnect }) {
    const { t } = useTranslation();

    const [chBlinking, setChBlinking] = useState(false);
    const [esBlinking, setEsBlinking] = useState(false);
    const prevIRCRef = useRef(stats.lastIRC);
    const prevESRef = useRef(stats.lastEventSub);

    const now = Date.now();
    const uptime = now - stats.startTime;
    const sinceEventSub = now - stats.lastEventSub;
    const sinceIRC = now - stats.lastIRC;

    // Detect timer resets and trigger blinking
    useEffect(() => {
        if (stats.lastIRC < prevIRCRef.current || (prevIRCRef.current > 0 && stats.lastIRC - prevIRCRef.current > 5000)) {
            setChBlinking(true);
            setTimeout(() => setChBlinking(false), 900);
        }
        prevIRCRef.current = stats.lastIRC;
    }, [stats.lastIRC]);

    useEffect(() => {
        if (stats.lastEventSub < prevESRef.current || (prevESRef.current > 0 && stats.lastEventSub - prevESRef.current > 5000)) {
            setEsBlinking(true);
            setTimeout(() => setEsBlinking(false), 900);
        }
        prevESRef.current = stats.lastEventSub;
    }, [stats.lastEventSub]);

    const getESStatus = () => {
        if (sinceEventSub > 120000) return 'error';   // > 2 min
        if (sinceEventSub > 30000) return 'warning';  // > 30 sec
        return 'ok';
    };

    const getCHStatus = () => {
        if (sinceIRC > 360000) return 'error';        // > 6 min
        if (sinceIRC > 300000) return 'warning';      // > 5 min
        return 'ok';
    };

    return (
        <Wrapper>
            <StatusItem>
                <StatusLabel>CH</StatusLabel>
                <StatusLED $status={getCHStatus()} $blinking={chBlinking} />
            </StatusItem>
            <StatusItem>
                <StatusLabel>ES</StatusLabel>
                <StatusLED $status={getESStatus()} $blinking={esBlinking} />
            </StatusItem>
            <StatusDivider />
            <StatusItem>
                <StatusLabel>UP</StatusLabel>
                <UptimeValue>{formatUptimeShort(uptime)}</UptimeValue>
            </StatusItem>
            <ReconnectButton onClick={onReconnect} title={t('dashboard.status.reconnect')}>
                <FiRefreshCw />
            </ReconnectButton>
        </Wrapper>
    );
}
