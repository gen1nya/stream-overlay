import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import Popup from '../../../../utils/PopupComponent';
import {
    FiX,
    FiSearch,
    FiUsers,
    FiEdit3,
    FiTrash2,
    FiChevronLeft,
    FiChevronRight,
    FiSave,
    FiCheck
} from 'react-icons/fi';
import { getGachaUsers, searchGachaUsers, deleteGachaUser, updateGachaUser } from '../../../../../services/api';
import {
    ActionButton,
    ClearButton,
    CloseButton,
    EmptyContainer, GuaranteedBadge,
    Header,
    LoadingContainer, PaginationButton, PaginationContainer, PaginationControls, PaginationInfo,
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
} from "../../../../utils/tablePopupSharedStyles";

// Edit Modal Styles
const EditModalOverlay = styled.div`
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

const EditModalContent = styled.div`
    background: #2a2a2a;
    border-radius: 12px;
    border: 1px solid #444;
    padding: 24px;
    min-width: 500px;
    max-width: 600px;
`;

const EditModalHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
`;

const EditModalTitle = styled.h3`
    font-size: 1.4rem;
    font-weight: 600;
    color: #fff;
    margin: 0;
`;

const FormGroup = styled.div`
    margin-bottom: 20px;
`;

const Label = styled.label`
    display: block;
    color: #d6d6d6;
    font-size: 0.9rem;
    font-weight: 500;
    margin-bottom: 8px;
`;

const Input = styled.input`
    width: 100%;
    box-sizing: border-box;
    padding: 12px;
    border: 1px solid #555;
    border-radius: 8px;
    background: #1e1e1e;
    color: #fff;
    font-size: 1rem;
    transition: all 0.2s ease;

    &:focus {
        outline: none;
        border-color: #646cff;
        background: #252525;
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const CheckboxWrapper = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px;
    background: #1e1e1e;
    border: 1px solid #555;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        border-color: #646cff;
    }
`;

const Checkbox = styled.input`
    width: 20px;
    height: 20px;
    cursor: pointer;
    accent-color: #646cff;
`;

const CheckboxLabel = styled.span`
    color: #d6d6d6;
    font-size: 0.95rem;
    cursor: pointer;
`;

const EditModalButtons = styled.div`
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 24px;
`;

const Button = styled.button`
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s ease;

    svg {
        width: 16px;
        height: 16px;
    }
`;

const CancelButton = styled(Button)`
    background: #444;
    color: #d6d6d6;

    &:hover {
        background: #555;
    }
`;

const SaveButton = styled(Button)`
    background: linear-gradient(135deg, #646cff, #7c3aed);
    color: #fff;

    &:hover {
        background: linear-gradient(135deg, #5a5acf, #6b2fb5);
        transform: translateY(-1px);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const ITEMS_PER_PAGE = 50;

export default function GachaUsersPopup({ onClose }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [editingUser, setEditingUser] = useState(null);
    const [editForm, setEditForm] = useState(null);
    const [saving, setSaving] = useState(false);

    const searchTimeoutRef = useRef(null);

    const loadUsers = async (offset = 0, query = '', reset = false) => {
        try {
            setLoading(true);

            let result;
            if (query.trim()) {
                result = await searchGachaUsers(query.trim(), offset, ITEMS_PER_PAGE);
            } else {
                result = await getGachaUsers(offset, ITEMS_PER_PAGE);
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

    useEffect(() => {
        loadUsers(0, '', true);
    }, []);

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

    const handleEditUser = (user) => {
        setEditingUser(user);
        setEditForm({
            userName: user.userName || '',
            pullsSince5Star: user.pity.pullsSince5Star,
            pullsSince4Star: user.pity.pullsSince4Star,
            pity4StarFailedRateUp: user.pity.pity4StarFailedRateUp,
            isGuaranteed5Star: user.pity.isGuaranteed5Star
        });
    };

    const handleCloseEdit = () => {
        setEditingUser(null);
        setEditForm(null);
    };

    const handleSaveEdit = async () => {
        if (!editingUser || !editForm) return;

        try {
            setSaving(true);
            await updateGachaUser(editingUser.userId, editForm.userName, {
                pullsSince5Star: parseInt(editForm.pullsSince5Star),
                pullsSince4Star: parseInt(editForm.pullsSince4Star),
                pity4StarFailedRateUp: parseInt(editForm.pity4StarFailedRateUp),
                isGuaranteed5Star: editForm.isGuaranteed5Star
            });

            // Обновляем локальное состояние
            setUsers(prev => prev.map(u =>
                u.userId === editingUser.userId
                    ? {
                        ...u,
                        userName: editForm.userName,
                        pity: {
                            pullsSince5Star: parseInt(editForm.pullsSince5Star),
                            pullsSince4Star: parseInt(editForm.pullsSince4Star),
                            pity4StarFailedRateUp: parseInt(editForm.pity4StarFailedRateUp),
                            isGuaranteed5Star: editForm.isGuaranteed5Star
                        }
                    }
                    : u
            ));

            handleCloseEdit();
        } catch (error) {
            console.error('Failed to update user:', error);
            alert('Ошибка при сохранении изменений');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!confirm('Вы уверены, что хотите удалить данные этого пользователя?')) {
            return;
        }

        try {
            await deleteGachaUser(userId);
            setUsers(prev => prev.filter(u => u.userId !== userId));
            setTotalCount(prev => prev - 1);
        } catch (error) {
            console.error('Failed to delete user:', error);
            alert('Ошибка при удалении пользователя');
        }
    };

    const handleFormChange = (field, value) => {
        setEditForm(prev => ({ ...prev, [field]: value }));
    };

    return (
        <Popup onClose={onClose}>
            <PopupContent>
                <Header>
                    <Title>Управление пользователями Gacha</Title>
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
                            placeholder="Поиск по имени пользователя..."
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

                <TableContainer>
                    <TableScrollContainer>
                        <Table>
                            <TableHeader>
                                <tr>
                                    <TableHeaderCell>Пользователь</TableHeaderCell>
                                    <TableHeaderCell>5★ Pity</TableHeaderCell>
                                    <TableHeaderCell>4★ Pity</TableHeaderCell>
                                    <TableHeaderCell>4★ Failed</TableHeaderCell>
                                    <TableHeaderCell>Гарантия 5★</TableHeaderCell>
                                    <TableHeaderCell>Действия</TableHeaderCell>
                                </tr>
                            </TableHeader>
                            <TableBody>
                                {loading && users.length === 0 ? (
                                    <tr>
                                        <td colSpan="6">
                                            <LoadingContainer>
                                                Загрузка...
                                            </LoadingContainer>
                                        </td>
                                    </tr>
                                ) : users.length === 0 ? (
                                    <tr>
                                        <td colSpan="6">
                                            <EmptyContainer>
                                                <FiUsers />
                                                <h3>Пользователи не найдены</h3>
                                                <p>Попробуйте изменить критерии поиска</p>
                                            </EmptyContainer>
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((user) => (
                                        <TableRow key={user.userId}>
                                            <TableCell>
                                                <strong>{user.userName || user.userId}</strong>
                                            </TableCell>
                                            <TableCell>{user.pity.pullsSince5Star}</TableCell>
                                            <TableCell>{user.pity.pullsSince4Star}</TableCell>
                                            <TableCell>{user.pity.pity4StarFailedRateUp}</TableCell>
                                            <TableCell>
                                                <GuaranteedBadge active={user.pity.isGuaranteed5Star}>
                                                    {user.pity.isGuaranteed5Star ? (
                                                        <>
                                                            <FiCheck />
                                                            Да
                                                        </>
                                                    ) : (
                                                        'Нет'
                                                    )}
                                                </GuaranteedBadge>
                                            </TableCell>
                                            <TableCell>
                                                <ActionButton
                                                    onClick={() => handleEditUser(user)}
                                                    title="Редактировать"
                                                >
                                                    <FiEdit3 />
                                                </ActionButton>
                                                <ActionButton
                                                    danger
                                                    onClick={() => handleDeleteUser(user.userId)}
                                                    title="Удалить"
                                                >
                                                    <FiTrash2 />
                                                </ActionButton>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableScrollContainer>

                    <PaginationContainer>
                        <PaginationInfo>
                            Показано {users.length} из {totalCount} пользователей
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
                                <FiChevronRight />
                            </PaginationButton>
                        </PaginationControls>
                    </PaginationContainer>
                </TableContainer>

                {/* Edit Modal */}
                {editingUser && editForm && (
                    <EditModalOverlay onClick={handleCloseEdit}>
                        <EditModalContent onClick={(e) => e.stopPropagation()}>
                            <EditModalHeader>
                                <EditModalTitle>Редактировать пользователя</EditModalTitle>
                                <CloseButton onClick={handleCloseEdit}>
                                    <FiX />
                                </CloseButton>
                            </EditModalHeader>

                            <FormGroup>
                                <Label>Имя пользователя</Label>
                                <Input
                                    type="text"
                                    value={editForm.userName}
                                    onChange={(e) => handleFormChange('userName', e.target.value)}
                                />
                            </FormGroup>

                            <FormGroup>
                                <Label>Попытки с последней 5★</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={editForm.pullsSince5Star}
                                    onChange={(e) => handleFormChange('pullsSince5Star', e.target.value)}
                                />
                            </FormGroup>

                            <FormGroup>
                                <Label>Попытки с последней 4★</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={editForm.pullsSince4Star}
                                    onChange={(e) => handleFormChange('pullsSince4Star', e.target.value)}
                                />
                            </FormGroup>

                            <FormGroup>
                                <Label>Количество неудачных 4★ rate-up</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={editForm.pity4StarFailedRateUp}
                                    onChange={(e) => handleFormChange('pity4StarFailedRateUp', e.target.value)}
                                />
                            </FormGroup>

                            <FormGroup>
                                <CheckboxWrapper onClick={() => handleFormChange('isGuaranteed5Star', !editForm.isGuaranteed5Star)}>
                                    <Checkbox
                                        type="checkbox"
                                        checked={editForm.isGuaranteed5Star}
                                        onChange={(e) => handleFormChange('isGuaranteed5Star', e.target.checked)}
                                    />
                                    <CheckboxLabel>Гарантированная 5★ на следующей попытке</CheckboxLabel>
                                </CheckboxWrapper>
                            </FormGroup>

                            <EditModalButtons>
                                <CancelButton onClick={handleCloseEdit}>
                                    <FiX />
                                    Отмена
                                </CancelButton>
                                <SaveButton onClick={handleSaveEdit} disabled={saving}>
                                    <FiSave />
                                    {saving ? 'Сохранение...' : 'Сохранить'}
                                </SaveButton>
                            </EditModalButtons>
                        </EditModalContent>
                    </EditModalOverlay>
                )}
            </PopupContent>
        </Popup>
    );
}