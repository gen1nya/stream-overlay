// components/popups/TwitchUsersPopup.jsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import Popup from '../utils/PopupComponent';
import {
    FiX,
    FiSearch,
    FiUsers,
    FiStar,
    FiUserCheck,
    FiEdit3,
    FiShield,
    FiChevronLeft,
    FiChevronRight,
    FiClock
} from 'react-icons/fi';
import {
    ClearButton,
    CloseButton,
    EmptyContainer,
    Header,
    LoadingContainer,
    PaginationButton,
    PaginationContainer,
    PaginationControls,
    PaginationInfo,
    PopupContent,
    SearchIcon,
    SearchInput,
    SearchInputWrapper,
    SearchSection,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHeader,
    TableHeaderCell,
    TableRow,
    TableScrollContainer,
    Title
} from "../utils/tablePopupSharedStyles";
import {getTwitchUsers, searchTwitchUsers, updateRoles} from '../../services/api';
import { useTranslation } from 'react-i18next';

const FilterSection = styled.div`
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 12px 20px;
    background: #2a2a2a;
    border-radius: 12px;
    border: 1px solid #444;
    flex-wrap: wrap;
`;

const FilterLabel = styled.span`
    color: #d6d6d6;
    font-size: 0.95rem;
    font-weight: 500;
    margin-right: 8px;
`;

const FilterButton = styled.button`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: ${({ active }) => (active ? 'linear-gradient(135deg, #646cff, #7c3aed)' : '#444')};
    color: ${({ active }) => (active ? '#fff' : '#d6d6d6')};
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    transition: all 0.2s ease;

    &:hover {
        background: ${({ active }) => (active ? 'linear-gradient(135deg, #5a5acf, #6b2fb5)' : '#555')};
        color: #fff;
        transform: translateY(-1px);
    }

    svg {
        width: 14px;
        height: 14px;
    }
`;



const StatusIcon = styled.div`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 4px;
    background: ${({ active }) => (active ? '#3a9605' : '#555')};
    color: ${({ active }) => (active ? '#fff' : '#999')};
    margin-right: 8px;

    svg {
        width: 12px;
        height: 12px;
    }
`;

const VipIcon = styled(StatusIcon)`
    background: ${({ active }) => (active ? '#960591' : '#555')};
`;

const EditorIcon = styled(StatusIcon)`
    background: ${({ active }) => (active ? '#966805' : '#555')};
`;

const FollowerIcon = styled(StatusIcon)`
    background: ${({ active }) => (active ? '#05967b' : '#555')};
`;

const InteractiveIcon = styled(StatusIcon)`
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    
    &:hover {
        transform: scale(1.1);
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    
    ${({ $loading }) => $loading && `
        opacity: 0.6;
        cursor: wait;
        
        &::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 12px;
            height: 12px;
            border: 2px solid #fff;
            border-top: 2px solid transparent;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        svg {
            opacity: 0;
        }
    `}
    
    @keyframes spin; {
        0% { transform: translate(-50%, -50%) rotate(0deg); }
        100% { transform: translate(-50%, -50%) rotate(360deg); }
    }
`;

const VipInteractiveIcon = styled(InteractiveIcon)`
    background: ${({ active }) => (active ? '#960591' : '#555')};
    
    &:hover {
        background: ${({ active }) => (active ? '#b8069f' : '#666')};
    }
`;

const ModInteractiveIcon = styled(InteractiveIcon)`
    background: ${({ active }) => (active ? '#3a9605' : '#555')};
    
    &:hover {
        background: ${({ active }) => (active ? '#45b006' : '#666')};
    }
`;

const StatusIconsContainer = styled.div`
    display: flex;
    gap: 4px;
    align-items: center;
`;

const LastSeenTime = styled.span`
    display: flex;
    align-items: center;
    gap: 8px;
    color: #999;
    font-size: 0.9rem;

    svg {
        width: 14px;
        height: 14px;
    }
`;

const ITEMS_PER_PAGE = 500;

export default function TwitchUsersPopup({ onClose }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilters, setActiveFilters] = useState({
        vips: false,
        followers: false,
        moderators: false,
        editors: false
    });
    const [loadingUsers, setLoadingUsers] = useState(new Set());
    const [currentPage, setCurrentPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const { t, i18n } = useTranslation();
    const locale = useMemo(() => (i18n.language === 'ru' ? 'ru-RU' : 'en-US'), [i18n.language]);

    const handleRoleToggle = async (userId, isVip, isMod, role, set) => {
        setLoadingUsers(prev => new Set([...prev, userId]));
        let update = {};
        if (role === "mod") {
            update = {isMod: set}
        } else if (role === "vip") {
            update = {isVip: set}
        }

        try {
            const result = await updateRoles(
                userId,
                {
                    current: {
                        isMod: isMod,
                        isVip: isVip
                    },
                    update: update
                }
            );

            setUsers(prev => prev.map(u => {
                if (u.id === userId) {
                    return {...u, ...result};
                }
                return u;
            }));
        } catch (error) {
            console.error("Error updating user roles:", error);
        } finally {
            setLoadingUsers(prev => {
                const newSet = new Set(prev);
                newSet.delete(userId);
                return newSet;
            });
        }
    }

    const searchTimeoutRef = useRef(null);

    // Загрузка пользователей
    const loadUsers = async (offset = 0, query = '', reset = false) => {
        try {
            setLoading(true);

            let result;
            if (query.trim()) {
                result = await searchTwitchUsers(query.trim(), offset, ITEMS_PER_PAGE);
            } else {
                result = await getTwitchUsers(offset, ITEMS_PER_PAGE);
            }

            const newUsers = result.users || [];
            const total = result.total || 0;

            if (reset) {
                setUsers(newUsers);
            } else {
                setUsers(prev => [...prev, ...newUsers]);
            }

            setTotalCount(total);
            setHasMore(newUsers.length === ITEMS_PER_PAGE);
        } catch (error) {
            console.error('Failed to load users:', error);
            setUsers([]);
            setTotalCount(0);
            setHasMore(false);
        } finally {
            setLoading(false);
        }
    };

    // Инициальная загрузка
    useEffect(() => {
        loadUsers(0, '', true);
    }, []);

    // Поиск с задержкой
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(() => {
            setCurrentPage(0);
            loadUsers(0, searchQuery, true);
        }, 300);

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchQuery]);

    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
    };

    const handleSearchKeyDown = (e) => {
        if (e.key === 'Escape') {
            handleClearSearch();
        }
    };

    const handleClearSearch = () => {
        setSearchQuery('');
    };

    const handleFilterToggle = (filterType) => {
        setActiveFilters(prev => ({
            ...prev,
            [filterType]: !prev[filterType]
        }));
    };

    const handleLoadMore = () => {
        if (!loading && hasMore) {
            const nextPage = currentPage + 1;
            setCurrentPage(nextPage);
            loadUsers(nextPage * ITEMS_PER_PAGE, searchQuery, false);
        }
    };

    const handlePrevPage = () => {
        if (currentPage > 0) {
            const prevPage = currentPage - 1;
            setCurrentPage(prevPage);
            loadUsers(prevPage * ITEMS_PER_PAGE, searchQuery, true);
        }
    };

    // Старый код (принцип "И"):
    /*const filteredUsers = users.filter(user => {
        if (activeFilters.vips && !user.isVip) return false;
        if (activeFilters.followers && !user.isFollower) return false;
        if (activeFilters.moderators && !user.isMod) return false;
        if (activeFilters.editors && !user.isEditor) return false;
        return true;
    });*/

    const filteredUsers = users.filter(user => {
        const hasActiveFilters = Object.values(activeFilters).some(filter => filter);
        if (!hasActiveFilters) return true;

        if (activeFilters.vips && user.isVip) return true;
        if (activeFilters.followers && user.isFollower) return true;
        if (activeFilters.moderators && user.isMod) return true;
        if (activeFilters.editors && user.isEditor) return true;

        return false;
    });

    const formatLastSeen = useCallback((timestamp) => {
        if (!timestamp) return t('twitchUsers.lastSeen.never');

        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (minutes < 1) return t('twitchUsers.lastSeen.justNow');
        if (minutes < 60) return t('twitchUsers.lastSeen.minutes', { count: minutes });
        if (hours < 24) return t('twitchUsers.lastSeen.hours', { count: hours });
        if (days < 7) return t('twitchUsers.lastSeen.days', { count: days });

        return date.toLocaleDateString(locale);
    }, [locale, t]);

    return (
        <Popup onClose={onClose}>
            <PopupContent>
                <Header>
                    <Title>{t('twitchUsers.title')}</Title>
                    <CloseButton onClick={onClose}>
                        <FiX />
                    </CloseButton>
                </Header>

                <SearchSection>
                    <SearchInputWrapper>
                        <SearchIcon>
                            <FiSearch />
                        </SearchIcon>
                        <SearchInput
                            type="text"
                            placeholder={t('twitchUsers.search.placeholder')}
                            value={searchQuery}
                            onChange={handleSearchChange}
                            onKeyDown={handleSearchKeyDown}
                        />
                        <ClearButton
                            visible={searchQuery.length > 0}
                            onClick={handleClearSearch}
                            title={t('twitchUsers.search.clear')}
                        >
                            <FiX />
                        </ClearButton>
                    </SearchInputWrapper>
                </SearchSection>

                <FilterSection>
                    <FilterLabel>{t('twitchUsers.filtersLabel')}</FilterLabel>
                    <FilterButton
                        active={activeFilters.vips}
                        onClick={() => handleFilterToggle('vips')}
                    >
                        <FiStar />
                        {t('twitchUsers.filters.vips')}
                    </FilterButton>
                    <FilterButton
                        active={activeFilters.followers}
                        onClick={() => handleFilterToggle('followers')}
                    >
                        <FiUserCheck />
                        {t('twitchUsers.filters.followers')}
                    </FilterButton>
                    <FilterButton
                        active={activeFilters.moderators}
                        onClick={() => handleFilterToggle('moderators')}
                    >
                        <FiShield />
                        {t('twitchUsers.filters.moderators')}
                    </FilterButton>
                    <FilterButton
                        active={activeFilters.editors}
                        onClick={() => handleFilterToggle('editors')}
                    >
                        <FiEdit3 />
                        {t('twitchUsers.filters.editors')}
                    </FilterButton>
                </FilterSection>

                <TableContainer>
                    <Table>
                        <TableHeader>
                            <tr>
                                <TableHeaderCell>{t('twitchUsers.table.name')}</TableHeaderCell>
                                <TableHeaderCell>{t('twitchUsers.table.status')}</TableHeaderCell>
                                <TableHeaderCell>{t('twitchUsers.table.lastSeen')}</TableHeaderCell>
                                <TableHeaderCell>{t('twitchUsers.table.followedSince')}</TableHeaderCell>
                            </tr>
                        </TableHeader>
                    </Table>

                    <TableScrollContainer>
                        <Table>
                            <TableBody>
                                {loading && users.length === 0 ? (
                                    <tr>
                                        <td colSpan="3">
                                            <LoadingContainer>
                                                {t('twitchUsers.states.loading')}
                                            </LoadingContainer>
                                        </td>
                                    </tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan="3">
                                            <EmptyContainer>
                                                <FiUsers />
                                                <h3>{t('twitchUsers.states.emptyTitle')}</h3>
                                                <p>{t('twitchUsers.states.emptyDescription')}</p>
                                            </EmptyContainer>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell>
                                                <strong>{user.displayName || user.name}</strong>
                                            </TableCell>
                                            <TableCell>
                                                <StatusIconsContainer>
                                                    <VipInteractiveIcon
                                                        active={user.isVip}
                                                        $loading={loadingUsers.has(user.id)}
                                                        title={t(user.isVip ? 'twitchUsers.statusIcons.vipRemove' : 'twitchUsers.statusIcons.vipAdd')}
                                                        onClick={() => !loadingUsers.has(user.id) && handleRoleToggle(user.id, user.isVip, user.isMod, 'vip', !user.isVip)}
                                                    >
                                                        <FiStar />
                                                    </VipInteractiveIcon>

                                                    <FollowerIcon active={user.isFollower} title={t('twitchUsers.statusIcons.follower')}>
                                                        <FiUserCheck />
                                                    </FollowerIcon>

                                                    <ModInteractiveIcon
                                                        active={user.isMod}
                                                        $loading={loadingUsers.has(user.id)}
                                                        title={t(user.isMod ? 'twitchUsers.statusIcons.modRemove' : 'twitchUsers.statusIcons.modAdd')}
                                                        onClick={() => !loadingUsers.has(user.id) && handleRoleToggle(user.id, user.isVip, user.isMod, 'mod', !user.isMod)}
                                                    >
                                                        <FiShield />
                                                    </ModInteractiveIcon>

                                                    <EditorIcon active={user.isEditor} title={t('twitchUsers.statusIcons.editor')}>
                                                        <FiEdit3 />
                                                    </EditorIcon>
                                                </StatusIconsContainer>
                                            </TableCell>
                                            <TableCell>
                                                <LastSeenTime>
                                                    <FiClock />
                                                    {formatLastSeen(user.lastSeen)}
                                                </LastSeenTime>
                                            </TableCell>
                                            <TableCell>
                                                <LastSeenTime>
                                                    <FiClock />
                                                    {formatLastSeen(user.followedAt)}
                                                </LastSeenTime>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableScrollContainer>

                    <PaginationContainer>
                        <PaginationInfo>
                            {t('twitchUsers.pagination.info', { current: filteredUsers.length, total: totalCount })}
                        </PaginationInfo>

                        <PaginationControls>
                            <PaginationButton
                                onClick={handlePrevPage}
                                disabled={currentPage === 0}
                            >
                                <FiChevronLeft />
                            </PaginationButton>

                            <span style={{ color: '#d6d6d6', fontSize: '0.9rem', margin: '0 12px' }}>
                                {t('twitchUsers.pagination.page', { page: currentPage + 1 })}
                            </span>

                            <PaginationButton
                                onClick={handleLoadMore}
                                disabled={loading || !hasMore}
                            >
                                <FiChevronRight/>
                            </PaginationButton>
                        </PaginationControls>
                    </PaginationContainer>
                </TableContainer>
            </PopupContent>
        </Popup>
    );
}