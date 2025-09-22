// components/popups/TwitchUsersPopup.jsx
import React, { useState, useEffect, useRef } from 'react';
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
    FiClock, FiArrowRight
} from 'react-icons/fi';
import {getTwitchUsers, searchTwitchUsers, updateRoles} from '../../services/api';

const PopupContent = styled.div`
    display: flex;
    padding: 24px;
    flex-direction: column;
    gap: 16px;
    min-width: 800px;
    max-width: 1000px;
    max-height: 85vh;
    height: 85vh;
`;

const Header = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
`;

const Title = styled.h2`
    font-size: 1.8rem;
    font-weight: 600;
    color: #fff;
    margin: 0;
    background: linear-gradient(135deg, #646cff, #7c3aed);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
`;

const CloseButton = styled.button`
    background: none;
    border: none;
    color: #999;
    cursor: pointer;
    padding: 8px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;

    &:hover {
        background: #444;
        color: #fff;
    }

    svg {
        width: 20px;
        height: 20px;
    }
`;

const SearchSection = styled.div`
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 0;
    background: #2a2a2a;
    border-radius: 12px;
    border: 1px solid #444;
`;

const SearchInputWrapper = styled.div`
    position: relative;
    flex: 1;
`;

const SearchInput = styled.input`
    box-sizing: border-box;
    width: 100%;
    padding: 12px 44px 12px 44px;
    border: 1px solid #555;
    border-radius: 8px;
    background: #1e1e1e;
    color: #fff;
    font-size: 1rem;
    transition: all 0.2s ease;

    &::placeholder {
        color: #888;
    }

    &:focus {
        outline: none;
        border-color: #646cff;
        background: #252525;
    }
`;

const SearchIcon = styled.div`
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: #888;
    pointer-events: none;

    svg {
        width: 16px;
        height: 16px;
    }
`;

const ClearButton = styled.button`
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: #888;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: ${({ visible }) => (visible ? 1 : 0)};
    pointer-events: ${({ visible }) => (visible ? 'auto' : 'none')};
    transition: all 0.2s ease;

    &:hover {
        background: #444;
        color: #fff;
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;

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

const TableContainer = styled.div`
    flex: 1;
    background: #2a2a2a;
    border-radius: 12px;
    border: 1px solid #444;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-height: 0;
`;

const TableScrollContainer = styled.div`
    flex: 1;
    overflow-y: auto;

    /* Custom scrollbar */
    &::-webkit-scrollbar {
        width: 8px;
    }

    &::-webkit-scrollbar-track {
        background: #2a2a2a;
    }

    &::-webkit-scrollbar-thumb {
        background: #555;
        border-radius: 4px;
    }

    &::-webkit-scrollbar-thumb:hover {
        background: #666;
    }
`;

const Table = styled.table`
    width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
`;

const TableHeader = styled.thead`
    background: #333;
    border-bottom: 1px solid #444;
`;

const TableHeaderCell = styled.th`
    padding: 16px 20px;
    text-align: left;
    font-size: 0.9rem;
    font-weight: 600;
    color: #d6d6d6;
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const TableBody = styled.tbody`
    flex: 1;
`;

const TableRow = styled.tr`
    border-bottom: 1px solid #333;
    transition: all 0.2s ease;

    &:hover {
        background: #333;
    }

    &:last-child {
        border-bottom: none;
    }
`;

const TableCell = styled.td`
    padding: 16px 20px;
    color: #d6d6d6;
    font-size: 0.95rem;
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

const LoadingContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 40px;
    color: #999;
    font-size: 1rem;
`;

const EmptyContainer = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 60px;
    color: #999;
    text-align: center;

    svg {
        width: 48px;
        height: 48px;
        margin-bottom: 16px;
        opacity: 0.5;
    }

    h3 {
        margin: 0 0 8px 0;
        color: #d6d6d6;
        font-size: 1.1rem;
    }

    p {
        margin: 0;
        font-size: 0.95rem;
    }
`;

const PaginationContainer = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-top: 1px solid #444;
    background: #333;
`;

const PaginationInfo = styled.span`
    color: #999;
    font-size: 0.9rem;
`;

const PaginationControls = styled.div`
    display: flex;
    gap: 8px;
    align-items: center;
`;

const PaginationButton = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: ${({ disabled }) => (disabled ? '#2a2a2a' : '#444')};
    color: ${({ disabled }) => (disabled ? '#555' : '#d6d6d6')};
    border: none;
    border-radius: 6px;
    cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
    transition: all 0.2s ease;

    &:hover:not(:disabled) {
        background: #555;
        color: #fff;
    }

    svg {
        width: 16px;
        height: 16px;
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

    const formatLastSeen = (timestamp) => {
        if (!timestamp) return 'Никогда';

        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (minutes < 1) return 'Только что';
        if (minutes < 60) return `${minutes} мин. назад`;
        if (hours < 24) return `${hours} ч. назад`;
        if (days < 7) return `${days} дн. назад`;

        return date.toLocaleDateString('ru-RU');
    };

    return (
        <Popup onClose={onClose}>
            <PopupContent>
                <Header>
                    <Title>Пользователи Twitch</Title>
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
                            placeholder="Поиск пользователей..."
                            value={searchQuery}
                            onChange={handleSearchChange}
                            onKeyDown={handleSearchKeyDown}
                        />
                        <ClearButton
                            visible={searchQuery.length > 0}
                            onClick={handleClearSearch}
                            title="Очистить поиск (ESC)"
                        >
                            <FiX />
                        </ClearButton>
                    </SearchInputWrapper>
                </SearchSection>

                <FilterSection>
                    <FilterLabel>Фильтры:</FilterLabel>
                    <FilterButton
                        active={activeFilters.vips}
                        onClick={() => handleFilterToggle('vips')}
                    >
                        <FiStar />
                        VIP
                    </FilterButton>
                    <FilterButton
                        active={activeFilters.followers}
                        onClick={() => handleFilterToggle('followers')}
                    >
                        <FiUserCheck />
                        Фолловеры
                    </FilterButton>
                    <FilterButton
                        active={activeFilters.moderators}
                        onClick={() => handleFilterToggle('moderators')}
                    >
                        <FiShield />
                        Модеры
                    </FilterButton>
                    <FilterButton
                        active={activeFilters.editors}
                        onClick={() => handleFilterToggle('editors')}
                    >
                        <FiEdit3 />
                        Редакторы
                    </FilterButton>
                </FilterSection>

                <TableContainer>
                    <Table>
                        <TableHeader>
                            <tr>
                                <TableHeaderCell>Имя</TableHeaderCell>
                                <TableHeaderCell>Статус</TableHeaderCell>
                                <TableHeaderCell>Последний визит</TableHeaderCell>
                                <TableHeaderCell>Фолловер с</TableHeaderCell>
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
                                                Загрузка...
                                            </LoadingContainer>
                                        </td>
                                    </tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan="3">
                                            <EmptyContainer>
                                                <FiUsers />
                                                <h3>Пользователи не найдены</h3>
                                                <p>Попробуйте изменить критерии поиска или фильтры</p>
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
                                                        title={`${user.isVip ? 'Убрать' : 'Добавить'} VIP (клик для изменения)`}
                                                        onClick={() => !loadingUsers.has(user.id) && handleRoleToggle(user.id, user.isVip, user.isMod, 'vip', !user.isVip)}
                                                    >
                                                        <FiStar />
                                                    </VipInteractiveIcon>

                                                    <FollowerIcon active={user.isFollower} title="Фоловер">
                                                        <FiUserCheck />
                                                    </FollowerIcon>

                                                    <ModInteractiveIcon
                                                        active={user.isMod}
                                                        $loading={loadingUsers.has(user.id)}
                                                        title={`${user.isMod ? 'Убрать' : 'Добавить'} модератора (клик для изменения)`}
                                                        onClick={() => !loadingUsers.has(user.id) && handleRoleToggle(user.id, user.isVip, user.isMod, 'mod', !user.isMod)}
                                                    >
                                                        <FiShield />
                                                    </ModInteractiveIcon>

                                                    <EditorIcon active={user.isEditor} title="Редактор">
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
                            Показано {filteredUsers.length} из {totalCount} пользователей
                        </PaginationInfo>

                        <PaginationControls>
                            <PaginationButton
                                onClick={handlePrevPage}
                                disabled={currentPage === 0}
                            >
                                <FiChevronLeft />
                            </PaginationButton>

                            <span style={{ color: '#d6d6d6', fontSize: '0.9rem', margin: '0 12px' }}>
                                Страница {currentPage + 1}
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