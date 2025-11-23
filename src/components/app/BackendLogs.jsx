import React, { useEffect, useState, useRef } from 'react';
import styled from 'styled-components';
import { useWebSocket } from '../../context/WebSocketContext';
import { FiTrash2, FiPause, FiPlay, FiSettings, FiDownload } from 'react-icons/fi';
import { getBackendLogsBuffer, clearBackendLogs } from '../../services/api';

const Wrapper = styled.div`
    width: 100%;
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: #1a1a1a;
    color: #fff;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
`;

const Header = styled.div`
    padding: 12px 16px;
    background: #252525;
    border-bottom: 1px solid #444;
    display: flex;
    justify-content: space-between;
    align-items: center;
`;

const Title = styled.h2`
    margin: 0;
    font-size: 16px;
    font-weight: 600;
`;

const Controls = styled.div`
    display: flex;
    gap: 8px;
`;

const Button = styled.button`
    background: #444;
    border: none;
    color: #fff;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    transition: background 0.2s;

    svg {
        width: 14px;
        height: 14px;
    }

    &:hover {
        background: #555;
    }

    &.danger:hover {
        background: #c74440;
    }

    &.active {
        background: #4a9eff;
    }
`;

const FilterBar = styled.div`
    padding: 8px 16px;
    background: #202020;
    border-bottom: 1px solid #444;
    display: flex;
    gap: 8px;
    align-items: center;
`;

const FilterButton = styled.button`
    background: ${props => props.$active ? '#4a9eff' : '#333'};
    border: none;
    color: #fff;
    padding: 4px 10px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 11px;
    text-transform: uppercase;
    font-weight: 600;
    transition: background 0.2s;

    &:hover {
        background: ${props => props.$active ? '#3a8eef' : '#444'};
    }
`;

const LogsContainer = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 8px 16px;
    background: #1a1a1a;

    /* Custom scrollbar */
    &::-webkit-scrollbar {
        width: 8px;
    }

    &::-webkit-scrollbar-track {
        background: #1a1a1a;
    }

    &::-webkit-scrollbar-thumb {
        background: #444;
        border-radius: 4px;
    }

    &::-webkit-scrollbar-thumb:hover {
        background: #555;
    }
`;

const LogEntry = styled.div`
    padding: 4px 8px;
    margin-bottom: 2px;
    border-radius: 3px;
    font-size: 12px;
    line-height: 1.5;
    border-left: 3px solid ${props => {
        switch (props.$level) {
            case 'error': return '#ff4444';
            case 'warn': return '#ffaa00';
            case 'info': return '#4a9eff';
            case 'debug': return '#888';
            default: return '#666';
        }
    }};
    background: ${props => {
        switch (props.$level) {
            case 'error': return 'rgba(255, 68, 68, 0.1)';
            case 'warn': return 'rgba(255, 170, 0, 0.1)';
            case 'info': return 'rgba(74, 158, 255, 0.05)';
            default: return 'transparent';
        }
    }};

    &:hover {
        background: rgba(255, 255, 255, 0.05);
    }
`;

const Timestamp = styled.span`
    color: #888;
    margin-right: 8px;
    font-size: 11px;
`;

const Level = styled.span`
    color: ${props => {
        switch (props.$level) {
            case 'error': return '#ff4444';
            case 'warn': return '#ffaa00';
            case 'info': return '#4a9eff';
            case 'debug': return '#888';
            default: return '#aaa';
        }
    }};
    margin-right: 8px;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 10px;
    min-width: 50px;
    display: inline-block;
`;

const Message = styled.span`
    color: #ddd;
    word-break: break-word;
    white-space: pre-wrap;
`;

const Stats = styled.div`
    padding: 6px 16px;
    background: #252525;
    border-top: 1px solid #444;
    font-size: 11px;
    color: #888;
    display: flex;
    justify-content: space-between;
`;

export default function BackendLogs() {
    const [logs, setLogs] = useState([]);
    const [isPaused, setIsPaused] = useState(false);
    const [autoScroll, setAutoScroll] = useState(true);
    const [levelFilter, setLevelFilter] = useState(new Set(['log', 'info', 'warn', 'error', 'debug']));
    const logsEndRef = useRef(null);
    const containerRef = useRef(null);
    const { subscribe, send } = useWebSocket();

    useEffect(() => {
        // Load initial buffer
        getBackendLogsBuffer()
            .then(buffer => {
                if (buffer && buffer.length > 0) {
                    setLogs(buffer);
                }
            });

        // Subscribe to new logs
        const unsubscribe = subscribe('backend-logs:update', (newLogs) => {
            if (!isPaused && Array.isArray(newLogs)) {
                setLogs(prev => {
                    const combined = [...prev, ...newLogs];
                    // Keep only last 1000 entries in memory
                    return combined.slice(-1000);
                });
            }
        });

        return () => unsubscribe();
    }, [subscribe, isPaused]);

    useEffect(() => {
        if (autoScroll && logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, autoScroll]);

    const handleClear = async () => {
        await clearBackendLogs();
        setLogs([]);
    };

    const handleTogglePause = () => {
        setIsPaused(!isPaused);
    };

    const handleExport = () => {
        const text = logs.map(log =>
            `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`
        ).join('\n');

        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backend-logs-${new Date().toISOString()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const toggleLevelFilter = (level) => {
        setLevelFilter(prev => {
            const newSet = new Set(prev);
            if (newSet.has(level)) {
                newSet.delete(level);
            } else {
                newSet.add(level);
            }
            return newSet;
        });
    };

    const filteredLogs = logs.filter(log => levelFilter.has(log.level));

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('ru-RU', { hour12: false }) + '.' + date.getMilliseconds().toString().padStart(3, '0');
    };

    return (
        <Wrapper>
            <Header>
                <Title>Backend Logs</Title>
                <Controls>
                    <Button onClick={handleTogglePause} className={isPaused ? 'active' : ''}>
                        {isPaused ? <FiPlay /> : <FiPause />}
                        {isPaused ? 'Resume' : 'Pause'}
                    </Button>
                    <Button onClick={handleExport}>
                        <FiDownload />
                        Export
                    </Button>
                    <Button onClick={handleClear} className="danger">
                        <FiTrash2 />
                        Clear
                    </Button>
                </Controls>
            </Header>

            <FilterBar>
                <span style={{ fontSize: '11px', color: '#888', marginRight: '8px' }}>Filter:</span>
                <FilterButton
                    $active={levelFilter.has('error')}
                    onClick={() => toggleLevelFilter('error')}
                >
                    Error
                </FilterButton>
                <FilterButton
                    $active={levelFilter.has('warn')}
                    onClick={() => toggleLevelFilter('warn')}
                >
                    Warn
                </FilterButton>
                <FilterButton
                    $active={levelFilter.has('info')}
                    onClick={() => toggleLevelFilter('info')}
                >
                    Info
                </FilterButton>
                <FilterButton
                    $active={levelFilter.has('log')}
                    onClick={() => toggleLevelFilter('log')}
                >
                    Log
                </FilterButton>
                <FilterButton
                    $active={levelFilter.has('debug')}
                    onClick={() => toggleLevelFilter('debug')}
                >
                    Debug
                </FilterButton>
            </FilterBar>

            <LogsContainer ref={containerRef}>
                {filteredLogs.map((log, index) => (
                    <LogEntry key={index} $level={log.level}>
                        <Timestamp>{formatTimestamp(log.timestamp)}</Timestamp>
                        <Level $level={log.level}>{log.level}</Level>
                        <Message>{log.message}</Message>
                    </LogEntry>
                ))}
                <div ref={logsEndRef} />
            </LogsContainer>

            <Stats>
                <span>Total: {logs.length} | Filtered: {filteredLogs.length}</span>
                <span>{isPaused ? '⏸ Paused' : '▶ Live'}</span>
            </Stats>
        </Wrapper>
    );
}
