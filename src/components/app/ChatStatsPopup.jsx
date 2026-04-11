import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { FiX, FiMessageSquare, FiUsers, FiTrendingUp, FiClock, FiBarChart2 } from 'react-icons/fi';
import Popup from '../utils/PopupComponent';
import {
    Header, Title, CloseButton, PopupContent,
    TableContainer, TableScrollContainer, Table, TableHeader, TableHeaderCell,
    TableBody, TableRow, TableCell, EmptyContainer,
} from '../utils/tablePopupSharedStyles';
import { useTranslation } from 'react-i18next';
import { getChatStatsSessions, getChatStatsSessionDetails, getChatStatsChatters } from '../../services/api';
import UserInfoPopup from './UserInfoPopup';

const StatsPopupContent = styled(PopupContent)`
    min-width: 600px;
    max-width: 800px;
    height: auto;
    max-height: 80vh;
`;

const TabContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    overflow-y: auto;
    flex: 1;
    min-height: 0;

    &::-webkit-scrollbar { width: 6px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb { background: #555; border-radius: 3px; }

    ${TableContainer} {
        flex: none;
        min-height: 150px;
    }
`;

const TabBar = styled.div`
    display: flex;
    gap: 4px;
    background: #2a2a2a;
    border-radius: 10px;
    padding: 4px;
    border: 1px solid #444;
`;

const Tab = styled.button`
    flex: 1;
    padding: 8px 16px;
    border: none;
    border-radius: 8px;
    background: ${({ $active }) => ($active ? '#646cff' : 'transparent')};
    color: ${({ $active }) => ($active ? '#fff' : '#999')};
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        color: #fff;
        background: ${({ $active }) => ($active ? '#646cff' : '#333')};
    }
`;

const StatsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
`;

const StatCard = styled.div`
    background: #2a2a2a;
    border-radius: 10px;
    padding: 16px;
    border: 1px solid #444;
    text-align: center;
`;

const StatValue = styled.div`
    font-size: 1.6rem;
    font-weight: 700;
    color: #fff;
    margin-bottom: 4px;
`;

const StatLabel = styled.div`
    font-size: 0.8rem;
    color: #999;
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const ClickableRow = styled(TableRow)`
    cursor: pointer;
`;

const SectionTitle = styled.h3`
    font-size: 1rem;
    font-weight: 600;
    color: #d6d6d6;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
`;

const RankCell = styled(TableCell)`
    width: 40px;
    color: ${({ $rank }) => {
        if ($rank === 1) return '#ffd700';
        if ($rank === 2) return '#c0c0c0';
        if ($rank === 3) return '#cd7f32';
        return '#999';
    }};
    font-weight: ${({ $rank }) => ($rank <= 3 ? '700' : '400')};
`;

const SessionRow = styled.div`
    background: #2a2a2a;
    border-radius: 10px;
    padding: 14px 18px;
    border: 1px solid #444;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        border-color: #646cff;
        background: #333;
    }
`;

const SessionInfo = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const SessionDate = styled.div`
    color: #fff;
    font-weight: 500;
    font-size: 0.95rem;
`;

const SessionMeta = styled.div`
    color: #999;
    font-size: 0.85rem;
    display: flex;
    gap: 16px;
`;

const BackButton = styled.button`
    background: none;
    border: none;
    color: #646cff;
    cursor: pointer;
    font-size: 0.9rem;
    padding: 0;
    display: flex;
    align-items: center;
    gap: 4px;

    &:hover { color: #7c3aed; }
`;

function formatDuration(ms) {
    if (!ms || ms < 0) return '0m';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

function formatDate(timestamp) {
    return new Date(timestamp).toLocaleDateString(undefined, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

// ============================================
// Chatters Table (reused in current view)
// ============================================

function ChattersTable({ chatters, t, onUserClick }) {
    if (!chatters || chatters.length === 0) {
        return (
            <EmptyContainer>
                <FiUsers />
                <p>{t('dashboard.chatStats.current.noChatters')}</p>
            </EmptyContainer>
        );
    }

    return (
        <TableContainer>
            <TableScrollContainer>
                <Table>
                    <TableHeader>
                        <tr>
                            <TableHeaderCell>{t('dashboard.chatStats.table.user')}</TableHeaderCell>
                        </tr>
                    </TableHeader>
                    <TableBody>
                        {chatters.map(chatter => (
                            <ClickableRow
                                key={chatter.login}
                                onClick={() => onUserClick?.(chatter.userId, chatter.displayName || chatter.login)}
                            >
                                <TableCell>{chatter.displayName || chatter.login}</TableCell>
                            </ClickableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableScrollContainer>
        </TableContainer>
    );
}

// ============================================
// Current / Chat Tab
// ============================================

function CurrentView({ chatStats, t, onUserClick }) {
    const [chatters, setChatters] = useState([]);

    useEffect(() => {
        getChatStatsChatters().then(data => setChatters(data || []));
        const interval = setInterval(() => {
            getChatStatsChatters().then(data => setChatters(data || []));
        }, 10_000);
        return () => clearInterval(interval);
    }, []);

    const isLive = chatStats?.isStreamActive;

    const streamDuration = isLive && chatStats.streamStartedAt
        ? Date.now() - chatStats.streamStartedAt
        : 0;

    return (
        <TabContent>
            <StatsGrid>
                <StatCard>
                    <StatValue>{chatStats?.messagesPerMinute ?? 0}</StatValue>
                    <StatLabel>{t('dashboard.chatStats.current.messagesPerMinute')}</StatLabel>
                </StatCard>
                <StatCard>
                    <StatValue>{chatStats?.currentChatters ?? 0}</StatValue>
                    <StatLabel>{t('dashboard.chatStats.current.currentChatters')}</StatLabel>
                </StatCard>
                {isLive && (
                    <>
                        <StatCard>
                            <StatValue>{formatDuration(streamDuration)}</StatValue>
                            <StatLabel>{t('dashboard.chatStats.current.duration')}</StatLabel>
                        </StatCard>
                        <StatCard>
                            <StatValue>{chatStats.totalMessages}</StatValue>
                            <StatLabel>{t('dashboard.chatStats.current.totalMessages')}</StatLabel>
                        </StatCard>
                        <StatCard>
                            <StatValue>{Math.round(chatStats.peakMessagesPerMinute)}</StatValue>
                            <StatLabel>{t('dashboard.chatStats.current.peakMpm')}</StatLabel>
                        </StatCard>
                        <StatCard>
                            <StatValue>{chatStats.uniqueParticipants}</StatValue>
                            <StatLabel>{t('dashboard.chatStats.current.uniqueParticipants')}</StatLabel>
                        </StatCard>
                    </>
                )}
            </StatsGrid>

            {isLive && chatStats.topChatters?.length > 0 && (
                <>
                    <SectionTitle>
                        <FiMessageSquare size={16} />
                        {t('dashboard.chatStats.current.topChatters')}
                    </SectionTitle>
                    <TableContainer>
                        <TableScrollContainer>
                            <Table>
                                <TableHeader>
                                    <tr>
                                        <TableHeaderCell>{t('dashboard.chatStats.table.rank')}</TableHeaderCell>
                                        <TableHeaderCell>{t('dashboard.chatStats.table.user')}</TableHeaderCell>
                                        <TableHeaderCell>{t('dashboard.chatStats.table.messages')}</TableHeaderCell>
                                    </tr>
                                </TableHeader>
                                <TableBody>
                                    {chatStats.topChatters.map((chatter, index) => (
                                        <ClickableRow
                                            key={chatter.userId}
                                            onClick={() => onUserClick?.(chatter.userId, chatter.userName)}
                                        >
                                            <RankCell $rank={index + 1}>{index + 1}</RankCell>
                                            <TableCell>{chatter.userName}</TableCell>
                                            <TableCell>{chatter.messageCount}</TableCell>
                                        </ClickableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableScrollContainer>
                    </TableContainer>
                </>
            )}

            <SectionTitle>
                <FiUsers size={16} />
                {t('dashboard.chatStats.current.inRoom')} ({chatters.length})
            </SectionTitle>
            <ChattersTable chatters={chatters} t={t} onUserClick={onUserClick} />
        </TabContent>
    );
}

// ============================================
// History Tab
// ============================================

function HistoryView({ t, onUserClick }) {
    const [sessions, setSessions] = useState([]);
    const [selectedSession, setSelectedSession] = useState(null);
    const [sessionDetails, setSessionDetails] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getChatStatsSessions({ limit: 50 }).then(data => {
            setSessions(data || []);
            setLoading(false);
        });
    }, []);

    const handleSelectSession = async (session) => {
        setSelectedSession(session);
        const details = await getChatStatsSessionDetails(session.id);
        setSessionDetails(details);
    };

    if (loading) {
        return <EmptyContainer><p>Loading...</p></EmptyContainer>;
    }

    if (selectedSession && sessionDetails) {
        const duration = selectedSession.endedAt
            ? selectedSession.endedAt - selectedSession.startedAt
            : Date.now() - selectedSession.startedAt;

        return (
            <TabContent>
                <BackButton onClick={() => { setSelectedSession(null); setSessionDetails(null); }}>
                    ← {t('dashboard.chatStats.tabs.history')}
                </BackButton>

                <StatsGrid>
                    <StatCard>
                        <StatValue>{sessionDetails.session?.totalMessages ?? 0}</StatValue>
                        <StatLabel>{t('dashboard.chatStats.current.totalMessages')}</StatLabel>
                    </StatCard>
                    <StatCard>
                        <StatValue>{Math.round(sessionDetails.session?.peakMessagesPerMinute ?? 0)}</StatValue>
                        <StatLabel>{t('dashboard.chatStats.current.peakMpm')}</StatLabel>
                    </StatCard>
                    <StatCard>
                        <StatValue>{sessionDetails.session?.uniqueChatters ?? 0}</StatValue>
                        <StatLabel>{t('dashboard.chatStats.current.uniqueParticipants')}</StatLabel>
                    </StatCard>
                </StatsGrid>

                <div style={{ color: '#999', fontSize: '0.85rem' }}>
                    {formatDate(selectedSession.startedAt)} · {formatDuration(duration)}
                </div>

                {sessionDetails.topChatters?.length > 0 && (
                    <>
                        <SectionTitle>
                            <FiMessageSquare size={16} />
                            {t('dashboard.chatStats.current.topChatters')}
                        </SectionTitle>
                        <TableContainer>
                            <TableScrollContainer>
                                <Table>
                                    <TableHeader>
                                        <tr>
                                            <TableHeaderCell>{t('dashboard.chatStats.table.rank')}</TableHeaderCell>
                                            <TableHeaderCell>{t('dashboard.chatStats.table.user')}</TableHeaderCell>
                                            <TableHeaderCell>{t('dashboard.chatStats.table.messages')}</TableHeaderCell>
                                        </tr>
                                    </TableHeader>
                                    <TableBody>
                                        {sessionDetails.topChatters.map((chatter, index) => (
                                            <ClickableRow
                                                key={chatter.userId}
                                                onClick={() => onUserClick?.(chatter.userId, chatter.userName)}
                                            >
                                                <RankCell $rank={index + 1}>{index + 1}</RankCell>
                                                <TableCell>{chatter.userName}</TableCell>
                                                <TableCell>{chatter.messageCount}</TableCell>
                                            </ClickableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableScrollContainer>
                        </TableContainer>
                    </>
                )}
            </TabContent>
        );
    }

    if (sessions.length === 0) {
        return (
            <EmptyContainer>
                <FiBarChart2 />
                <h3>{t('dashboard.chatStats.history.noSessions')}</h3>
            </EmptyContainer>
        );
    }

    return (
        <TabContent>
            {sessions.map(session => {
                const duration = session.endedAt
                    ? session.endedAt - session.startedAt
                    : Date.now() - session.startedAt;

                return (
                    <SessionRow key={session.id} onClick={() => handleSelectSession(session)}>
                        <SessionInfo>
                            <SessionDate>{formatDate(session.startedAt)}</SessionDate>
                            <SessionMeta>
                                <span><FiClock size={12} /> {formatDuration(duration)}</span>
                                <span><FiMessageSquare size={12} /> {session.totalMessages}</span>
                                <span><FiUsers size={12} /> {session.uniqueChatters}</span>
                                <span><FiTrendingUp size={12} /> {Math.round(session.peakMessagesPerMinute)} {t('dashboard.chatStats.history.peakMpm')}</span>
                            </SessionMeta>
                        </SessionInfo>
                    </SessionRow>
                );
            })}
        </TabContent>
    );
}

// ============================================
// Main Component
// ============================================

export default function ChatStatsPopup({ onClose, chatStats }) {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('current');
    const [userInfoPopup, setUserInfoPopup] = useState({ id: '', userName: '', open: false });

    const handleUserClick = (userId, userName) => {
        setUserInfoPopup({ id: userId || '', userName, open: true });
    };

    const currentTabLabel = chatStats?.isStreamActive
        ? t('dashboard.chatStats.tabs.current')
        : t('dashboard.chatStats.tabs.chat');

    return (
        <Popup onClose={onClose}>
            <StatsPopupContent>
                    <Header>
                        <Title>{t('dashboard.chatStats.title')}</Title>
                        <CloseButton onClick={onClose}>
                            <FiX />
                        </CloseButton>
                    </Header>

                    <TabBar>
                        <Tab $active={activeTab === 'current'} onClick={() => setActiveTab('current')}>
                            {currentTabLabel}
                        </Tab>
                        <Tab $active={activeTab === 'history'} onClick={() => setActiveTab('history')}>
                            {t('dashboard.chatStats.tabs.history')}
                        </Tab>
                    </TabBar>

                    {activeTab === 'current' && <CurrentView chatStats={chatStats} t={t} onUserClick={handleUserClick} />}
                    {activeTab === 'history' && <HistoryView t={t} onUserClick={handleUserClick} />}
                </StatsPopupContent>
                {userInfoPopup.open && (
                    <UserInfoPopup
                        userId={userInfoPopup.id}
                        userName={userInfoPopup.userName}
                        onClose={() => setUserInfoPopup({ id: '', userName: '', open: false })}
                    />
                )}
            </Popup>
    );
}
