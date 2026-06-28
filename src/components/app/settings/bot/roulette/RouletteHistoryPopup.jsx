import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { tokens } from "../../../../../designSystem/tokens";
import { Button, ConfirmDialog } from "../../../../../designSystem";
import { Portal } from "../../../../../context/PortalContext";
import Popup from '../../../../utils/PopupComponent';
import {
    FiX,
    FiClock,
    FiTrash2,
    FiChevronLeft,
    FiChevronRight,
    FiCheck,
    FiXCircle,
    FiTarget,
    FiAward,
    FiTrendingUp,
    FiUsers,
    FiRefreshCw
} from 'react-icons/fi';
import {
    getRoulettePlays,
    getRouletteGlobalStats,
    getRouletteLeaderboard,
    clearAllRouletteData
} from '../../../../../services/api';
import {
    CloseButton,
    EmptyContainer,
    Header,
    LoadingContainer,
    PaginationButton,
    PaginationContainer,
    PaginationControls,
    PaginationInfo,
    PopupContent,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHeader,
    TableHeaderCell,
    TableRow,
    TableScrollContainer,
    Title
} from "../../../../utils/tablePopupSharedStyles";
import { useTranslation } from 'react-i18next';

const TabsContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 20px;
`;

const Tab = styled.button`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    border: 1px solid ${({ $active }) => $active ? '#646cff' : '#444'};
    border-radius: ${tokens.radius.lg};
    background: ${({ $active }) => $active ? 'rgba(100, 108, 255, 0.15)' : 'transparent'};
    color: ${({ $active }) => $active ? '#fff' : '#888'};
    font-size: 0.95rem;
    cursor: pointer;
    transition: ${tokens.transition.base};

    &:hover {
        background: rgba(100, 108, 255, 0.1);
        border-color: ${tokens.color.accent.primary};
        color: ${tokens.color.text.tertiary};
    }

    svg {
        width: 16px;
        height: 16px;
    }

    .count {
        padding: 2px 8px;
        border-radius: 10px;
        background: ${({ $active }) => $active ? '#646cff' : '#444'};
        color: ${tokens.color.text.primary};
        font-size: 0.8rem;
    }
`;

const StatsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 12px;
    margin-bottom: 20px;
`;

const StatCard = styled.div`
    background: rgba(30, 30, 30, 0.5);
    border: 1px solid ${tokens.color.border.subtle};
    border-radius: ${tokens.radius.lg};
    padding: 12px 16px;
    display: flex;
    align-items: center;
    gap: 12px;

    svg {
        width: 24px;
        height: 24px;
        color: ${props => props.$color || '#646cff'};
    }
`;

const StatContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const StatLabel = styled.span`
    font-size: 0.75rem;
    color: ${tokens.color.text.faint};
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const StatValue = styled.span`
    font-size: 1.25rem;
    font-weight: 600;
    color: ${tokens.color.text.secondary};
`;

const ResultBadge = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: ${tokens.radius.md};
    font-size: 0.8rem;
    font-weight: 600;
    background: ${({ $result }) => $result === 'survival' ? '#3a960520' : '#ff555520'};
    color: ${({ $result }) => $result === 'survival' ? '#3a9605' : '#ff5555'};
    border: 1px solid currentColor;

    svg {
        width: 12px;
        height: 12px;
    }
`;

const StreakBadge = styled.span`
    padding: 2px 8px;
    border-radius: ${tokens.radius.sm};
    font-size: 0.8rem;
    font-weight: 600;
    background: ${({ $positive }) => $positive ? 'rgba(34, 197, 94, 0.15)' : 'rgba(220, 38, 38, 0.15)'};
    color: ${({ $positive }) => $positive ? '#22c55e' : '#dc2626'};
`;

const RankBadge = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    font-size: 0.85rem;
    font-weight: 700;
    background: ${({ $rank }) => {
        if ($rank === 1) return 'linear-gradient(135deg, #ffd700, #ffb700)';
        if ($rank === 2) return 'linear-gradient(135deg, #c0c0c0, #a0a0a0)';
        if ($rank === 3) return 'linear-gradient(135deg, #cd7f32, #b87333)';
        return '#444';
    }};
    color: ${({ $rank }) => $rank <= 3 ? '#000' : '#fff'};
`;

export default function RouletteHistoryPopup({ onClose }) {
    const { t, i18n } = useTranslation();
    const [activeTab, setActiveTab] = useState('history');
    const [plays, setPlays] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [globalStats, setGlobalStats] = useState({
        totalPlays: 0,
        totalSurvivals: 0,
        totalDeaths: 0,
        uniquePlayers: 0
    });
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const [confirmClear, setConfirmClear] = useState(false);

    const ITEMS_PER_PAGE = 50;

    useEffect(() => {
        loadAllData();
    }, []);

    useEffect(() => {
        setCurrentPage(0);
    }, [activeTab]);

    const loadAllData = async () => {
        setLoading(true);
        try {
            const [playsData, statsData, leaderData] = await Promise.all([
                getRoulettePlays({ limit: 500 }),
                getRouletteGlobalStats(),
                getRouletteLeaderboard('plays', 50)
            ]);
            setPlays(playsData || []);
            setGlobalStats(statsData || { totalPlays: 0, totalSurvivals: 0, totalDeaths: 0, uniquePlayers: 0 });
            setLeaderboard(leaderData || []);
            setCurrentPage(0);
        } catch (error) {
            console.error('Failed to load roulette data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClearAll = async () => {
        try {
            await clearAllRouletteData();
            setConfirmClear(false);
            loadAllData();
        } catch (error) {
            console.error('Failed to clear roulette data:', error);
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return '-';
        return new Date(timestamp).toLocaleString(i18n.language === 'ru' ? 'ru-RU' : 'en-US', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatStreak = (streak) => {
        if (streak === 0) return '0';
        if (streak > 0) return `+${streak}`;
        return `${streak}`;
    };

    const calculateSurvivalRate = (survivals, total) => {
        if (total === 0) return '0';
        return ((survivals / total) * 100).toFixed(1);
    };

    const currentData = activeTab === 'history' ? plays : leaderboard;
    const paginatedData = currentData.slice(
        currentPage * ITEMS_PER_PAGE,
        (currentPage + 1) * ITEMS_PER_PAGE
    );
    const totalPages = Math.ceil(currentData.length / ITEMS_PER_PAGE);

    const survivalRate = globalStats.totalPlays > 0
        ? ((globalStats.totalSurvivals / globalStats.totalPlays) * 100).toFixed(1)
        : '0';

    return (
        <Popup onClose={onClose}>
            <PopupContent>
                <Header>
                    <Title>{t('settings.bot.roulette.history.title')}</Title>
                    <CloseButton onClick={onClose}>
                        <FiX />
                    </CloseButton>
                </Header>

                <StatsGrid>
                    <StatCard $color="#646cff">
                        <FiTarget />
                        <StatContent>
                            <StatLabel>{t('settings.bot.roulette.history.stats.totalPlays')}</StatLabel>
                            <StatValue>{globalStats.totalPlays}</StatValue>
                        </StatContent>
                    </StatCard>
                    <StatCard $color="#22c55e">
                        <FiCheck />
                        <StatContent>
                            <StatLabel>{t('settings.bot.roulette.history.stats.survivals')}</StatLabel>
                            <StatValue>{globalStats.totalSurvivals}</StatValue>
                        </StatContent>
                    </StatCard>
                    <StatCard $color="#ff5555">
                        <FiXCircle />
                        <StatContent>
                            <StatLabel>{t('settings.bot.roulette.history.stats.deaths')}</StatLabel>
                            <StatValue>{globalStats.totalDeaths}</StatValue>
                        </StatContent>
                    </StatCard>
                    <StatCard $color="#fbbf24">
                        <FiTrendingUp />
                        <StatContent>
                            <StatLabel>{t('settings.bot.roulette.history.stats.survivalRate')}</StatLabel>
                            <StatValue>{survivalRate}%</StatValue>
                        </StatContent>
                    </StatCard>
                    <StatCard $color="#8b5cf6">
                        <FiUsers />
                        <StatContent>
                            <StatLabel>{t('settings.bot.roulette.history.stats.uniquePlayers')}</StatLabel>
                            <StatValue>{globalStats.uniquePlayers}</StatValue>
                        </StatContent>
                    </StatCard>
                </StatsGrid>

                <TabsContainer>
                    <Tab
                        $active={activeTab === 'history'}
                        onClick={() => setActiveTab('history')}
                    >
                        <FiClock />
                        {t('settings.bot.roulette.history.tabHistory')}
                        <span className="count">{plays.length}</span>
                    </Tab>
                    <Tab
                        $active={activeTab === 'leaderboard'}
                        onClick={() => setActiveTab('leaderboard')}
                    >
                        <FiAward />
                        {t('settings.bot.roulette.history.tabLeaderboard')}
                        <span className="count">{leaderboard.length}</span>
                    </Tab>
                    <div style={{ flex: 1 }} />
                    <Button $variant="neutral" $size="md" onClick={loadAllData}>
                        <FiRefreshCw />
                        {t('settings.bot.roulette.history.refresh')}
                    </Button>
                    <Button $variant="danger" $size="md" onClick={() => setConfirmClear(true)}>
                        <FiTrash2 />
                        {t('settings.bot.roulette.history.clearAll')}
                    </Button>
                </TabsContainer>

                <TableContainer>
                    <TableScrollContainer>
                        {activeTab === 'history' ? (
                            <Table>
                                <TableHeader>
                                    <tr>
                                        <TableHeaderCell>{t('settings.bot.roulette.history.table.date')}</TableHeaderCell>
                                        <TableHeaderCell>{t('settings.bot.roulette.history.table.player')}</TableHeaderCell>
                                        <TableHeaderCell>{t('settings.bot.roulette.history.table.result')}</TableHeaderCell>
                                    </tr>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan="3">
                                                <LoadingContainer>
                                                    {t('common.loading')}
                                                </LoadingContainer>
                                            </td>
                                        </tr>
                                    ) : plays.length === 0 ? (
                                        <tr>
                                            <td colSpan="3">
                                                <EmptyContainer>
                                                    <FiTarget />
                                                    <h3>{t('settings.bot.roulette.history.emptyHistory')}</h3>
                                                    <p>{t('settings.bot.roulette.history.emptyHistoryHint')}</p>
                                                </EmptyContainer>
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedData.map((play) => (
                                            <TableRow key={play.id}>
                                                <TableCell>{formatDate(play.createdAt)}</TableCell>
                                                <TableCell><strong>{play.userName}</strong></TableCell>
                                                <TableCell>
                                                    <ResultBadge $result={play.result}>
                                                        {play.result === 'survival' ? <FiCheck /> : <FiXCircle />}
                                                        {t(`settings.bot.roulette.history.result.${play.result}`)}
                                                    </ResultBadge>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <tr>
                                        <TableHeaderCell>#</TableHeaderCell>
                                        <TableHeaderCell>{t('settings.bot.roulette.history.table.player')}</TableHeaderCell>
                                        <TableHeaderCell>{t('settings.bot.roulette.history.table.plays')}</TableHeaderCell>
                                        <TableHeaderCell>{t('settings.bot.roulette.history.table.survivals')}</TableHeaderCell>
                                        <TableHeaderCell>{t('settings.bot.roulette.history.table.deaths')}</TableHeaderCell>
                                        <TableHeaderCell>{t('settings.bot.roulette.history.table.rate')}</TableHeaderCell>
                                        <TableHeaderCell>{t('settings.bot.roulette.history.table.streak')}</TableHeaderCell>
                                    </tr>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan="7">
                                                <LoadingContainer>
                                                    {t('common.loading')}
                                                </LoadingContainer>
                                            </td>
                                        </tr>
                                    ) : leaderboard.length === 0 ? (
                                        <tr>
                                            <td colSpan="7">
                                                <EmptyContainer>
                                                    <FiAward />
                                                    <h3>{t('settings.bot.roulette.history.emptyLeaderboard')}</h3>
                                                    <p>{t('settings.bot.roulette.history.emptyLeaderboardHint')}</p>
                                                </EmptyContainer>
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedData.map((stat, index) => (
                                            <TableRow key={stat.userId}>
                                                <TableCell>
                                                    <RankBadge $rank={currentPage * ITEMS_PER_PAGE + index + 1}>
                                                        {currentPage * ITEMS_PER_PAGE + index + 1}
                                                    </RankBadge>
                                                </TableCell>
                                                <TableCell><strong>{stat.userName}</strong></TableCell>
                                                <TableCell>{stat.totalPlays}</TableCell>
                                                <TableCell style={{ color: '#22c55e' }}>{stat.survivals}</TableCell>
                                                <TableCell style={{ color: '#ff5555' }}>{stat.deaths}</TableCell>
                                                <TableCell>{calculateSurvivalRate(stat.survivals, stat.totalPlays)}%</TableCell>
                                                <TableCell>
                                                    <StreakBadge $positive={stat.currentStreak >= 0}>
                                                        {formatStreak(stat.currentStreak)}
                                                    </StreakBadge>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </TableScrollContainer>

                    {currentData.length > ITEMS_PER_PAGE && (
                        <PaginationContainer>
                            <PaginationInfo>
                                {t('settings.bot.roulette.history.pagination', {
                                    shown: paginatedData.length,
                                    total: currentData.length
                                })}
                            </PaginationInfo>

                            <PaginationControls>
                                <PaginationButton
                                    onClick={() => setCurrentPage(p => p - 1)}
                                    disabled={currentPage === 0}
                                >
                                    <FiChevronLeft />
                                </PaginationButton>

                                <span style={{ color: '#d6d6d6', fontSize: '0.9rem', margin: '0 12px' }}>
                                    {currentPage + 1} / {totalPages}
                                </span>

                                <PaginationButton
                                    onClick={() => setCurrentPage(p => p + 1)}
                                    disabled={currentPage >= totalPages - 1}
                                >
                                    <FiChevronRight />
                                </PaginationButton>
                            </PaginationControls>
                        </PaginationContainer>
                    )}
                </TableContainer>

            </PopupContent>

            {/* Confirm clear dialog */}
            {confirmClear && (
                <Portal id="roulette-history-confirm" onClose={() => setConfirmClear(false)}>
                    <ConfirmDialog
                        variant="danger"
                        title={t('settings.bot.roulette.history.clearConfirmTitle')}
                        text={t('settings.bot.roulette.history.clearConfirmText')}
                        confirmLabel={t('settings.bot.roulette.history.clearYes')}
                        cancelLabel={t('settings.bot.roulette.history.clearNo')}
                        onCancel={() => setConfirmClear(false)}
                        onConfirm={handleClearAll}
                    />
                </Portal>
            )}
        </Popup>
    );
}
