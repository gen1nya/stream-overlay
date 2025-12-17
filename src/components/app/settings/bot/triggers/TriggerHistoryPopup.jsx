import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import Popup from '../../../../utils/PopupComponent';
import {
    FiX,
    FiClock,
    FiDownload,
    FiTrash2,
    FiChevronLeft,
    FiChevronRight,
    FiCheck,
    FiXCircle,
    FiZap,
    FiAlertTriangle,
    FiStar,
    FiShield,
    FiMessageSquare,
    FiRefreshCw
} from 'react-icons/fi';
import {
    getTriggerExecutions,
    getScheduledActions,
    cancelScheduledAction
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
    border-radius: 8px;
    background: ${({ $active }) => $active ? 'rgba(100, 108, 255, 0.15)' : 'transparent'};
    color: ${({ $active }) => $active ? '#fff' : '#888'};
    font-size: 0.95rem;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        background: rgba(100, 108, 255, 0.1);
        border-color: #646cff;
        color: #ccc;
    }

    svg {
        width: 16px;
        height: 16px;
    }

    .count {
        padding: 2px 8px;
        border-radius: 10px;
        background: ${({ $active }) => $active ? '#646cff' : '#444'};
        color: #fff;
        font-size: 0.8rem;
    }
`;

const ToolbarButton = styled.button`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border: 1px solid ${({ $danger }) => $danger ? '#ff5555' : '#555'};
    border-radius: 8px;
    background: ${({ $danger }) => $danger ? '#ff555515' : '#1e1e1e'};
    color: ${({ $danger }) => $danger ? '#ff5555' : '#d6d6d6'};
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        background: ${({ $danger }) => $danger ? '#ff555530' : '#2a2a2a'};
        border-color: ${({ $danger }) => $danger ? '#ff5555' : '#646cff'};
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
    font-size: 0.8rem;
    font-weight: 600;
    background: ${({ $status }) => {
        switch ($status) {
            case 'completed': return '#3a960520';
            case 'pending': return '#fbbf2420';
            case 'cancelled': return '#ff555520';
            case 'failed': return '#ff555520';
            default: return '#44444420';
        }
    }};
    color: ${({ $status }) => {
        switch ($status) {
            case 'completed': return '#3a9605';
            case 'pending': return '#fbbf24';
            case 'cancelled': return '#ff5555';
            case 'failed': return '#ff5555';
            default: return '#888';
        }
    }};
    border: 1px solid currentColor;

    svg {
        width: 12px;
        height: 12px;
    }
`;

const ActionTypeBadge = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 0.8rem;
    background: ${({ $type }) => {
        switch ($type) {
            case 'add_vip': return 'rgba(139, 92, 246, 0.15)';
            case 'remove_vip': return 'rgba(220, 38, 38, 0.15)';
            case 'add_mod': return 'rgba(34, 197, 94, 0.15)';
            case 'remove_mod': return 'rgba(220, 38, 38, 0.15)';
            case 'send_message': return 'rgba(59, 130, 246, 0.15)';
            default: return 'rgba(100, 100, 100, 0.15)';
        }
    }};
    color: ${({ $type }) => {
        switch ($type) {
            case 'add_vip': return '#8b5cf6';
            case 'remove_vip': return '#dc2626';
            case 'add_mod': return '#22c55e';
            case 'remove_mod': return '#dc2626';
            case 'send_message': return '#3b82f6';
            default: return '#888';
        }
    }};
    border: 1px solid currentColor;

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

const CancelButton = styled.button`
    padding: 4px 8px;
    border: 1px solid #555;
    border-radius: 4px;
    background: transparent;
    color: #888;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        background: rgba(220, 38, 38, 0.1);
        border-color: #dc2626;
        color: #dc2626;
    }
`;

const getActionIcon = (type) => {
    switch (type) {
        case 'add_vip':
        case 'remove_vip':
            return FiStar;
        case 'add_mod':
        case 'remove_mod':
            return FiShield;
        case 'send_message':
            return FiMessageSquare;
        default:
            return FiZap;
    }
};

export default function TriggerHistoryPopup({ onClose }) {
    const { t, i18n } = useTranslation();
    const [activeTab, setActiveTab] = useState('executions');
    const [executions, setExecutions] = useState([]);
    const [scheduledActions, setScheduledActions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const [confirmCancel, setConfirmCancel] = useState(null);

    const ITEMS_PER_PAGE = 50;

    // Load both datasets on mount
    useEffect(() => {
        loadAllData();
    }, []);

    // Reset page when switching tabs
    useEffect(() => {
        setCurrentPage(0);
    }, [activeTab]);

    const loadAllData = async () => {
        setLoading(true);
        try {
            const [execData, schedData] = await Promise.all([
                getTriggerExecutions({ limit: 500 }),
                getScheduledActions()
            ]);
            setExecutions(execData || []);
            setScheduledActions(schedData || []);
            setCurrentPage(0);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadData = loadAllData;

    const handleCancelAction = async () => {
        if (!confirmCancel) return;
        try {
            await cancelScheduledAction(confirmCancel.id, 'Cancelled by user');
            setConfirmCancel(null);
            loadData();
        } catch (error) {
            console.error('Failed to cancel action:', error);
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

    const formatRelativeTime = (timestamp) => {
        if (!timestamp) return '-';
        const now = Date.now();
        const diff = timestamp - now;

        if (diff < 0) return t('settings.bot.triggers.history.expired');

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);

        if (days > 0) {
            return t('settings.bot.triggers.history.inDays', { count: days });
        } else if (hours > 0) {
            return t('settings.bot.triggers.history.inHours', { count: hours });
        } else {
            const minutes = Math.floor(diff / (1000 * 60));
            return t('settings.bot.triggers.history.inMinutes', { count: minutes });
        }
    };

    const currentData = activeTab === 'executions' ? executions : scheduledActions;
    const paginatedData = currentData.slice(
        currentPage * ITEMS_PER_PAGE,
        (currentPage + 1) * ITEMS_PER_PAGE
    );
    const totalPages = Math.ceil(currentData.length / ITEMS_PER_PAGE);

    const pendingCount = scheduledActions.filter(a => a.status === 'pending').length;

    return (
        <Popup onClose={onClose}>
            <PopupContent>
                <Header>
                    <Title>{t('settings.bot.triggers.history.title')}</Title>
                    <CloseButton onClick={onClose}>
                        <FiX />
                    </CloseButton>
                </Header>

                <TabsContainer>
                    <Tab
                        $active={activeTab === 'executions'}
                        onClick={() => setActiveTab('executions')}
                    >
                        <FiZap />
                        {t('settings.bot.triggers.history.tabExecutions')}
                        <span className="count">{executions.length}</span>
                    </Tab>
                    <Tab
                        $active={activeTab === 'scheduled'}
                        onClick={() => setActiveTab('scheduled')}
                    >
                        <FiClock />
                        {t('settings.bot.triggers.history.tabScheduled')}
                        <span className="count">{pendingCount}</span>
                    </Tab>
                    <div style={{ flex: 1 }} />
                    <ToolbarButton onClick={loadData}>
                        <FiRefreshCw />
                        {t('settings.bot.triggers.history.refresh')}
                    </ToolbarButton>
                </TabsContainer>

                <TableContainer>
                    <TableScrollContainer>
                        {activeTab === 'executions' ? (
                            <Table>
                                <TableHeader>
                                    <tr>
                                        <TableHeaderCell>{t('settings.bot.triggers.history.table.date')}</TableHeaderCell>
                                        <TableHeaderCell>{t('settings.bot.triggers.history.table.trigger')}</TableHeaderCell>
                                        <TableHeaderCell>{t('settings.bot.triggers.history.table.user')}</TableHeaderCell>
                                        <TableHeaderCell>{t('settings.bot.triggers.history.table.target')}</TableHeaderCell>
                                        <TableHeaderCell>{t('settings.bot.triggers.history.table.status')}</TableHeaderCell>
                                    </tr>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan="5">
                                                <LoadingContainer>
                                                    {t('common.loading')}
                                                </LoadingContainer>
                                            </td>
                                        </tr>
                                    ) : executions.length === 0 ? (
                                        <tr>
                                            <td colSpan="5">
                                                <EmptyContainer>
                                                    <FiZap />
                                                    <h3>{t('settings.bot.triggers.history.emptyExecutions')}</h3>
                                                    <p>{t('settings.bot.triggers.history.emptyExecutionsHint')}</p>
                                                </EmptyContainer>
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedData.map((exec) => (
                                            <TableRow key={exec.id}>
                                                <TableCell>{formatDate(exec.createdAt)}</TableCell>
                                                <TableCell><strong>{exec.triggerName}</strong></TableCell>
                                                <TableCell>{exec.sourceUserName}</TableCell>
                                                <TableCell>{exec.targetUserName || '-'}</TableCell>
                                                <TableCell>
                                                    <StatusBadge $status={exec.status}>
                                                        {exec.status === 'completed' ? <FiCheck /> :
                                                         exec.status === 'cancelled' ? <FiXCircle /> :
                                                         <FiClock />}
                                                        {t(`settings.bot.triggers.history.status.${exec.status}`)}
                                                    </StatusBadge>
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
                                        <TableHeaderCell>{t('settings.bot.triggers.history.table.executeAt')}</TableHeaderCell>
                                        <TableHeaderCell>{t('settings.bot.triggers.history.table.action')}</TableHeaderCell>
                                        <TableHeaderCell>{t('settings.bot.triggers.history.table.target')}</TableHeaderCell>
                                        <TableHeaderCell>{t('settings.bot.triggers.history.table.remaining')}</TableHeaderCell>
                                        <TableHeaderCell>{t('settings.bot.triggers.history.table.status')}</TableHeaderCell>
                                        <TableHeaderCell></TableHeaderCell>
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
                                    ) : scheduledActions.length === 0 ? (
                                        <tr>
                                            <td colSpan="6">
                                                <EmptyContainer>
                                                    <FiClock />
                                                    <h3>{t('settings.bot.triggers.history.emptyScheduled')}</h3>
                                                    <p>{t('settings.bot.triggers.history.emptyScheduledHint')}</p>
                                                </EmptyContainer>
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedData.map((action) => {
                                            const ActionIcon = getActionIcon(action.actionType);
                                            return (
                                                <TableRow key={action.id}>
                                                    <TableCell>{formatDate(action.executeAt)}</TableCell>
                                                    <TableCell>
                                                        <ActionTypeBadge $type={action.actionType}>
                                                            <ActionIcon />
                                                            {t(`settings.bot.triggers.actionTypes.${action.actionType}`)}
                                                        </ActionTypeBadge>
                                                    </TableCell>
                                                    <TableCell><strong>{action.targetUserName}</strong></TableCell>
                                                    <TableCell>{formatRelativeTime(action.executeAt)}</TableCell>
                                                    <TableCell>
                                                        <StatusBadge $status={action.status}>
                                                            {action.status === 'executed' ? <FiCheck /> :
                                                             action.status === 'cancelled' ? <FiXCircle /> :
                                                             action.status === 'failed' ? <FiXCircle /> :
                                                             <FiClock />}
                                                            {t(`settings.bot.triggers.history.status.${action.status}`)}
                                                        </StatusBadge>
                                                    </TableCell>
                                                    <TableCell>
                                                        {action.status === 'pending' && (
                                                            <CancelButton onClick={() => setConfirmCancel(action)}>
                                                                {t('common.cancel')}
                                                            </CancelButton>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </TableScrollContainer>

                    {currentData.length > ITEMS_PER_PAGE && (
                        <PaginationContainer>
                            <PaginationInfo>
                                {t('settings.bot.triggers.history.pagination', {
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

                {/* Confirm Cancel Modal */}
                {confirmCancel && (
                    <ConfirmModal onClick={() => setConfirmCancel(null)}>
                        <ConfirmContent onClick={(e) => e.stopPropagation()}>
                            <ConfirmIcon>
                                <FiAlertTriangle />
                            </ConfirmIcon>
                            <ConfirmTitle>
                                {t('settings.bot.triggers.history.cancelConfirmTitle')}
                            </ConfirmTitle>
                            <ConfirmText>
                                {t('settings.bot.triggers.history.cancelConfirmText', {
                                    action: t(`settings.bot.triggers.actionTypes.${confirmCancel.actionType}`),
                                    user: confirmCancel.targetUserName
                                })}
                            </ConfirmText>
                            <ConfirmButtons>
                                <ConfirmButton className="cancel" onClick={() => setConfirmCancel(null)}>
                                    {t('settings.bot.triggers.history.cancelNo')}
                                </ConfirmButton>
                                <ConfirmButton className="danger" onClick={handleCancelAction}>
                                    {t('settings.bot.triggers.history.cancelYes')}
                                </ConfirmButton>
                            </ConfirmButtons>
                        </ConfirmContent>
                    </ConfirmModal>
                )}
            </PopupContent>
        </Popup>
    );
}
