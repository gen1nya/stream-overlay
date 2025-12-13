import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import Popup from '../../../../utils/PopupComponent';
import {
    FiX,
    FiCalendar,
    FiDownload,
    FiTrash2,
    FiChevronLeft,
    FiChevronRight,
    FiCheck,
    FiXCircle,
    FiGift,
    FiAlertTriangle
} from 'react-icons/fi';
import {
    getLotteryMonths,
    getLotteryDrawsByMonth,
    exportLotteryData,
    clearAllLotteryData,
    clearLotteryMonth
} from '../../../../../services/api';
import {
    ActionButton,
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

const ToolbarSection = styled.div`
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
`;

const MonthSelect = styled.select`
    padding: 10px 16px;
    border: 1px solid #555;
    border-radius: 8px;
    background: #1e1e1e;
    color: #fff;
    font-size: 0.95rem;
    cursor: pointer;
    min-width: 180px;

    &:focus {
        outline: none;
        border-color: #646cff;
    }

    option {
        background: #1e1e1e;
        color: #fff;
    }
`;

const ToolbarButton = styled.button`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border: 1px solid ${({ danger }) => danger ? '#ff5555' : '#555'};
    border-radius: 8px;
    background: ${({ danger }) => danger ? '#ff555515' : '#1e1e1e'};
    color: ${({ danger }) => danger ? '#ff5555' : '#d6d6d6'};
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        background: ${({ danger }) => danger ? '#ff555530' : '#2a2a2a'};
        border-color: ${({ danger }) => danger ? '#ff5555' : '#646cff'};
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;

const StatusBadge = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 600;
    background: ${({ status }) => status === 'completed' ? '#3a960520' : '#ff555520'};
    color: ${({ status }) => status === 'completed' ? '#3a9605' : '#ff5555'};
    border: 1px solid ${({ status }) => status === 'completed' ? '#3a9605' : '#ff5555'};

    svg {
        width: 12px;
        height: 12px;
    }
`;

const ConfirmModal = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
`;

const ConfirmContent = styled.div`
    background: #2a2a2a;
    border-radius: 12px;
    border: 1px solid #444;
    padding: 24px;
    max-width: 400px;
    text-align: center;
`;

const ConfirmIcon = styled.div`
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: #ff555520;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;

    svg {
        width: 32px;
        height: 32px;
        color: #ff5555;
    }
`;

const ConfirmTitle = styled.h3`
    font-size: 1.3rem;
    font-weight: 600;
    color: #fff;
    margin: 0 0 12px;
`;

const ConfirmText = styled.p`
    color: #999;
    font-size: 0.95rem;
    margin: 0 0 24px;
    line-height: 1.5;
`;

const ConfirmButtons = styled.div`
    display: flex;
    gap: 12px;
    justify-content: center;
`;

const ConfirmButton = styled.button`
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;

    &.cancel {
        background: #444;
        color: #d6d6d6;

        &:hover {
            background: #555;
        }
    }

    &.danger {
        background: #ff5555;
        color: #fff;

        &:hover {
            background: #ff3333;
        }
    }
`;

const MONTHS_RU = [
    '', 'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const MONTHS_EN = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export default function LotteryHistoryPopup({ onClose }) {
    const { t, i18n } = useTranslation();
    const [months, setMonths] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState(null);
    const [draws, setDraws] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const [confirmAction, setConfirmAction] = useState(null); // 'clearAll' | 'clearMonth' | null

    const ITEMS_PER_PAGE = 50;
    const monthNames = i18n.language === 'ru' ? MONTHS_RU : MONTHS_EN;

    useEffect(() => {
        loadMonths();
    }, []);

    useEffect(() => {
        if (selectedMonth) {
            loadDraws(selectedMonth.year, selectedMonth.month);
        }
    }, [selectedMonth]);

    const loadMonths = async () => {
        try {
            setLoading(true);
            const data = await getLotteryMonths();
            setMonths(data || []);
            if (data && data.length > 0) {
                setSelectedMonth(data[0]);
            }
        } catch (error) {
            console.error('Failed to load months:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadDraws = async (year, month) => {
        try {
            setLoading(true);
            const data = await getLotteryDrawsByMonth(year, month);
            setDraws(data || []);
            setCurrentPage(0);
        } catch (error) {
            console.error('Failed to load draws:', error);
            setDraws([]);
        } finally {
            setLoading(false);
        }
    };

    const handleMonthChange = (e) => {
        const value = e.target.value;
        if (value === 'all') {
            setSelectedMonth(null);
            setDraws([]);
        } else {
            const [year, month] = value.split('-').map(Number);
            setSelectedMonth({ year, month });
        }
    };

    const handleExport = async () => {
        try {
            const data = await exportLotteryData();
            if (!data || data.length === 0) {
                alert(t('settings.bot.lottery.history.export.noData'));
                return;
            }

            // Convert to CSV
            const headers = ['ID', 'Subject', 'Initiator', 'Started', 'Ended', 'Winner', 'Participants', 'Status'];
            const rows = data.map(d => [
                d.id,
                `"${d.subject}"`,
                `"${d.initiatorName}"`,
                d.startedAt,
                d.endedAt,
                d.winnerName ? `"${d.winnerName}"` : '',
                d.participantCount,
                d.status
            ]);

            const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

            // Download
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `lottery_history_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export failed:', error);
            alert(t('settings.bot.lottery.history.export.error'));
        }
    };

    const handleClearAll = async () => {
        try {
            const result = await clearAllLotteryData();
            setConfirmAction(null);
            setDraws([]);
            setMonths([]);
            setSelectedMonth(null);
            alert(t('settings.bot.lottery.history.clear.success', {
                draws: result.draws,
                stats: result.stats
            }));
        } catch (error) {
            console.error('Clear failed:', error);
            alert(t('settings.bot.lottery.history.clear.error'));
        }
    };

    const handleClearMonth = async () => {
        if (!selectedMonth) return;
        try {
            const result = await clearLotteryMonth(selectedMonth.year, selectedMonth.month);
            setConfirmAction(null);
            await loadMonths();
            setDraws([]);
            alert(t('settings.bot.lottery.history.clearMonth.success', { count: result }));
        } catch (error) {
            console.error('Clear month failed:', error);
            alert(t('settings.bot.lottery.history.clearMonth.error'));
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

    const paginatedDraws = draws.slice(
        currentPage * ITEMS_PER_PAGE,
        (currentPage + 1) * ITEMS_PER_PAGE
    );

    const totalPages = Math.ceil(draws.length / ITEMS_PER_PAGE);

    return (
        <Popup onClose={onClose}>
            <PopupContent>
                <Header>
                    <Title>{t('settings.bot.lottery.history.title')}</Title>
                    <CloseButton onClick={onClose}>
                        <FiX />
                    </CloseButton>
                </Header>

                <ToolbarSection>
                    <FiCalendar style={{ color: '#888' }} />
                    <MonthSelect
                        value={selectedMonth ? `${selectedMonth.year}-${selectedMonth.month}` : 'all'}
                        onChange={handleMonthChange}
                    >
                        <option value="all">{t('settings.bot.lottery.history.selectMonth')}</option>
                        {months.map(m => (
                            <option key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>
                                {monthNames[m.month]} {m.year} ({m.count})
                            </option>
                        ))}
                    </MonthSelect>

                    <ToolbarButton onClick={handleExport} disabled={months.length === 0}>
                        <FiDownload />
                        {t('settings.bot.lottery.history.export.button')}
                    </ToolbarButton>

                    {selectedMonth && (
                        <ToolbarButton danger onClick={() => setConfirmAction('clearMonth')}>
                            <FiTrash2 />
                            {t('settings.bot.lottery.history.clearMonth.button')}
                        </ToolbarButton>
                    )}

                    <ToolbarButton danger onClick={() => setConfirmAction('clearAll')} disabled={months.length === 0}>
                        <FiTrash2 />
                        {t('settings.bot.lottery.history.clear.button')}
                    </ToolbarButton>
                </ToolbarSection>

                <TableContainer>
                    <TableScrollContainer>
                        <Table>
                            <TableHeader>
                                <tr>
                                    <TableHeaderCell>{t('settings.bot.lottery.history.table.date')}</TableHeaderCell>
                                    <TableHeaderCell>{t('settings.bot.lottery.history.table.subject')}</TableHeaderCell>
                                    <TableHeaderCell>{t('settings.bot.lottery.history.table.initiator')}</TableHeaderCell>
                                    <TableHeaderCell>{t('settings.bot.lottery.history.table.winner')}</TableHeaderCell>
                                    <TableHeaderCell>{t('settings.bot.lottery.history.table.participants')}</TableHeaderCell>
                                    <TableHeaderCell>{t('settings.bot.lottery.history.table.status')}</TableHeaderCell>
                                </tr>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="6">
                                            <LoadingContainer>
                                                {t('common.loading')}
                                            </LoadingContainer>
                                        </td>
                                    </tr>
                                ) : !selectedMonth ? (
                                    <tr>
                                        <td colSpan="6">
                                            <EmptyContainer>
                                                <FiCalendar />
                                                <h3>{t('settings.bot.lottery.history.empty.selectMonth')}</h3>
                                                <p>{t('settings.bot.lottery.history.empty.selectMonthHint')}</p>
                                            </EmptyContainer>
                                        </td>
                                    </tr>
                                ) : draws.length === 0 ? (
                                    <tr>
                                        <td colSpan="6">
                                            <EmptyContainer>
                                                <FiGift />
                                                <h3>{t('settings.bot.lottery.history.empty.title')}</h3>
                                                <p>{t('settings.bot.lottery.history.empty.subtitle')}</p>
                                            </EmptyContainer>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedDraws.map((draw) => (
                                        <TableRow key={draw.id}>
                                            <TableCell>{formatDate(draw.startedAt)}</TableCell>
                                            <TableCell><strong>{draw.subject}</strong></TableCell>
                                            <TableCell>{draw.initiatorName}</TableCell>
                                            <TableCell>{draw.winnerName || '-'}</TableCell>
                                            <TableCell>{draw.participantCount}</TableCell>
                                            <TableCell>
                                                <StatusBadge status={draw.status}>
                                                    {draw.status === 'completed' ? <FiCheck /> : <FiXCircle />}
                                                    {draw.status === 'completed'
                                                        ? t('settings.bot.lottery.history.status.completed')
                                                        : t('settings.bot.lottery.history.status.cancelled')
                                                    }
                                                </StatusBadge>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableScrollContainer>

                    {draws.length > 0 && (
                        <PaginationContainer>
                            <PaginationInfo>
                                {t('settings.bot.lottery.history.pagination.info', {
                                    shown: paginatedDraws.length,
                                    total: draws.length
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

                {/* Confirm Modal */}
                {confirmAction && (
                    <ConfirmModal onClick={() => setConfirmAction(null)}>
                        <ConfirmContent onClick={(e) => e.stopPropagation()}>
                            <ConfirmIcon>
                                <FiAlertTriangle />
                            </ConfirmIcon>
                            <ConfirmTitle>
                                {confirmAction === 'clearAll'
                                    ? t('settings.bot.lottery.history.clear.confirmTitle')
                                    : t('settings.bot.lottery.history.clearMonth.confirmTitle')
                                }
                            </ConfirmTitle>
                            <ConfirmText>
                                {confirmAction === 'clearAll'
                                    ? t('settings.bot.lottery.history.clear.confirmText')
                                    : t('settings.bot.lottery.history.clearMonth.confirmText', {
                                        month: monthNames[selectedMonth?.month],
                                        year: selectedMonth?.year
                                    })
                                }
                            </ConfirmText>
                            <ConfirmButtons>
                                <ConfirmButton className="cancel" onClick={() => setConfirmAction(null)}>
                                    {t('common.cancel')}
                                </ConfirmButton>
                                <ConfirmButton
                                    className="danger"
                                    onClick={confirmAction === 'clearAll' ? handleClearAll : handleClearMonth}
                                >
                                    {t('common.delete')}
                                </ConfirmButton>
                            </ConfirmButtons>
                        </ConfirmContent>
                    </ConfirmModal>
                )}
            </PopupContent>
        </Popup>
    );
}
