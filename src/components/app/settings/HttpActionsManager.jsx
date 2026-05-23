import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiPlay, FiGlobe } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { getAllHttpActions, deleteHttpAction, testHttpAction } from '../../../services/api';
import HttpActionEditorPopup from './bot/triggers/HttpActionEditorPopup';
import Popup from '../../utils/PopupComponent';

const Container = styled.div`
    width: 100%;
`;

const Header = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    gap: 16px;
    flex-wrap: wrap;
`;

const SearchWrapper = styled.div`
    position: relative;
    flex: 1;
    min-width: 200px;
    max-width: 400px;
`;

const SearchInput = styled.input`
    width: 100%;
    padding: 10px 12px 10px 40px;
    border: 1px solid #444;
    border-radius: 8px;
    background: #1e1e1e;
    color: #fff;
    font-size: 14px;
    transition: all 0.2s ease;
    box-sizing: border-box;

    &::placeholder { color: #666; }
    &:focus {
        outline: none;
        border-color: #22c55e;
        background: #252525;
    }
`;

const SearchIcon = styled(FiSearch)`
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #666;
    width: 18px;
    height: 18px;
`;

const AddButton = styled.button`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 18px;
    border: 1px solid #22c55e;
    border-radius: 8px;
    background: rgba(34, 197, 94, 0.15);
    color: #22c55e;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    transition: all 0.2s ease;
    white-space: nowrap;

    &:hover { background: rgba(34, 197, 94, 0.25); }
    svg { width: 18px; height: 18px; }
`;

const ActionsTable = styled.div`
    display: flex;
    flex-direction: column;
    border: 1px solid #2a2a2a;
    border-radius: 10px;
    overflow: hidden;
    background: #161616;
`;

const TableHeaderRow = styled.div`
    display: grid;
    grid-template-columns: minmax(160px, 1.2fr) 90px minmax(200px, 2fr) auto;
    gap: 14px;
    padding: 10px 14px;
    background: rgba(255, 255, 255, 0.02);
    border-bottom: 1px solid #2a2a2a;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #666;
`;

const TableRow = styled.div`
    display: grid;
    grid-template-columns: minmax(160px, 1.2fr) 90px minmax(200px, 2fr) auto;
    gap: 14px;
    padding: 10px 14px;
    align-items: center;
    border-bottom: 1px solid #2a2a2a;
    transition: background 0.15s;

    &:last-child { border-bottom: none; }
    &:hover { background: rgba(34, 197, 94, 0.05); }
`;

const RowName = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    font-size: 0.9rem;
    color: #fff;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    svg { color: #22c55e; flex-shrink: 0; }
`;

const MethodBadge = styled.div`
    justify-self: start;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 600;
    background: ${p => methodColor(p.$method).bg};
    color: ${p => methodColor(p.$method).fg};
    white-space: nowrap;
`;

const RowUrl = styled.div`
    font-size: 0.78rem;
    color: #888;
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const RowActions = styled.div`
    display: flex;
    gap: 4px;
    justify-self: end;
`;

const ActionIconButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    padding: 0;
    border: 1px solid transparent;
    border-radius: 6px;
    background: transparent;
    color: ${p => p.$color || '#888'};
    cursor: pointer;
    transition: all 0.15s;

    svg { width: 14px; height: 14px; }

    &:hover:not(:disabled) {
        border-color: ${p => p.$color || '#555'};
        background: ${p => p.$color ? `${p.$color}15` : 'rgba(255,255,255,0.04)'};
    }
    &:disabled { opacity: 0.35; cursor: not-allowed; }
`;

const EmptyState = styled.div`
    text-align: center;
    padding: 60px 20px;
    color: #666;
    svg { width: 48px; height: 48px; color: #333; margin-bottom: 12px; }
    h3 { margin: 0 0 6px; color: #888; font-weight: 500; }
    p { margin: 0; font-size: 0.85rem; }
`;

const ConfirmPopupContent = styled.div`
    display: flex;
    padding: 20px;
    flex-direction: column;
    gap: 16px;
    min-width: 360px;
`;

const ConfirmPopupTitle = styled.h2`
    font-size: 1.2rem;
    font-weight: 600;
    color: #d6d6d6;
    margin: 0;
`;

const ConfirmPopupText = styled.p`
    color: #ccc;
    font-size: 0.9rem;
    margin: 0;
    line-height: 1.5;
    .warning {
        display: block;
        color: #888;
        font-size: 0.8rem;
        margin-top: 8px;
    }
`;

const ConfirmPopupButtons = styled.div`
    display: flex;
    gap: 10px;
    justify-content: flex-end;
`;

const ConfirmPopupButton = styled.button`
    padding: 9px 18px;
    border: 1px solid ${p => p.$danger ? '#dc2626' : '#555'};
    border-radius: 8px;
    background: ${p => p.$danger ? 'rgba(220, 38, 38, 0.12)' : 'rgba(30, 30, 30, 0.8)'};
    color: ${p => p.$danger ? '#dc2626' : '#d6d6d6'};
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    transition: all 0.2s ease;
    &:hover {
        background: ${p => p.$danger ? 'rgba(220, 38, 38, 0.22)' : 'rgba(40, 40, 40, 0.9)'};
        border-color: ${p => p.$danger ? '#dc2626' : '#777'};
    }
`;

function methodColor(method) {
    switch (method) {
        case 'GET':    return { bg: 'rgba(34, 197, 94, 0.18)', fg: '#22c55e' };
        case 'POST':   return { bg: 'rgba(59, 130, 246, 0.18)', fg: '#3b82f6' };
        case 'PUT':    return { bg: 'rgba(234, 179, 8, 0.18)', fg: '#eab308' };
        case 'DELETE': return { bg: 'rgba(239, 68, 68, 0.18)', fg: '#ef4444' };
        case 'PATCH':  return { bg: 'rgba(139, 92, 246, 0.18)', fg: '#8b5cf6' };
        default:       return { bg: 'rgba(107, 114, 128, 0.18)', fg: '#888' };
    }
}

export default function HttpActionsManager() {
    const { t } = useTranslation();
    const [actions, setActions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [editorOpen, setEditorOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const loadActions = useCallback(async () => {
        try {
            const list = await getAllHttpActions();
            setActions(list ?? []);
        } catch (err) {
            console.error('Failed to load HTTP actions:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadActions(); }, [loadActions]);

    const filteredActions = useMemo(() => {
        if (!searchQuery) return actions;
        const q = searchQuery.toLowerCase();
        return actions.filter(a =>
            a.name?.toLowerCase().includes(q) || a.url?.toLowerCase().includes(q));
    }, [actions, searchQuery]);

    const handleAdd = () => {
        setEditTarget(null);
        setEditorOpen(true);
    };

    const handleEdit = (action) => {
        setEditTarget(action);
        setEditorOpen(true);
    };

    const handleEditorSave = (savedAction) => {
        setActions(prev => {
            const exists = prev.find(a => a.id === savedAction.id);
            if (exists) return prev.map(a => a.id === savedAction.id ? savedAction : a);
            return [...prev, savedAction];
        });
        setEditorOpen(false);
        setEditTarget(null);
    };

    const handleEditorClose = () => {
        setEditorOpen(false);
        setEditTarget(null);
    };

    const handleTest = async (action) => {
        try {
            await testHttpAction(action);
        } catch (err) {
            console.error('Failed to test HTTP action:', err);
        }
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteHttpAction(deleteTarget.id);
            setActions(prev => prev.filter(a => a.id !== deleteTarget.id));
        } catch (err) {
            console.error('Failed to delete HTTP action:', err);
        }
        setDeleteTarget(null);
    };

    if (loading) {
        return (
            <Container>
                <EmptyState>
                    <FiGlobe />
                    <p>{t('common.loading', 'Loading...')}</p>
                </EmptyState>
            </Container>
        );
    }

    return (
        <Container>
            <Header>
                <SearchWrapper>
                    <SearchIcon />
                    <SearchInput
                        type="text"
                        placeholder={t('settings.httpActions.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </SearchWrapper>
                <AddButton onClick={handleAdd}>
                    <FiPlus />
                    {t('settings.httpActions.addAction')}
                </AddButton>
            </Header>

            {filteredActions.length === 0 ? (
                <EmptyState>
                    <FiGlobe />
                    <h3>
                        {actions.length === 0
                            ? t('settings.httpActions.empty.title')
                            : t('settings.httpActions.empty.noResults')}
                    </h3>
                    <p>
                        {actions.length === 0
                            ? t('settings.httpActions.empty.description')
                            : t('settings.httpActions.empty.tryDifferent')}
                    </p>
                </EmptyState>
            ) : (
                <ActionsTable>
                    <TableHeaderRow>
                        <div>{t('settings.httpActions.editor.nameLabel')}</div>
                        <div>{t('settings.httpActions.editor.methodLabel')}</div>
                        <div>{t('settings.httpActions.editor.urlLabel')}</div>
                        <div />
                    </TableHeaderRow>
                    {filteredActions.map(action => (
                        <TableRow key={action.id}>
                            <RowName title={action.name}>
                                <FiGlobe size={14} />
                                {action.name}
                            </RowName>
                            <MethodBadge $method={action.method}>{action.method}</MethodBadge>
                            <RowUrl title={action.url}>{action.url}</RowUrl>
                            <RowActions>
                                <ActionIconButton
                                    $color="#3b82f6"
                                    onClick={() => handleTest(action)}
                                    title={t('settings.httpActions.actions.test')}
                                >
                                    <FiPlay />
                                </ActionIconButton>
                                <ActionIconButton
                                    $color="#22c55e"
                                    onClick={() => handleEdit(action)}
                                    title={t('settings.httpActions.actions.edit')}
                                >
                                    <FiEdit2 />
                                </ActionIconButton>
                                <ActionIconButton
                                    $color="#dc2626"
                                    onClick={() => setDeleteTarget(action)}
                                    title={t('settings.httpActions.actions.delete')}
                                >
                                    <FiTrash2 />
                                </ActionIconButton>
                            </RowActions>
                        </TableRow>
                    ))}
                </ActionsTable>
            )}

            {editorOpen && (
                <HttpActionEditorPopup
                    action={editTarget}
                    onSave={handleEditorSave}
                    onClose={handleEditorClose}
                />
            )}

            {deleteTarget && (
                <Popup onClose={() => setDeleteTarget(null)}>
                    <ConfirmPopupContent>
                        <ConfirmPopupTitle>
                            {t('settings.httpActions.confirmDelete.title')}
                        </ConfirmPopupTitle>
                        <ConfirmPopupText>
                            {t('settings.httpActions.confirmDelete.message', { name: deleteTarget.name })}
                            <span className="warning">
                                {t('settings.httpActions.confirmDelete.warning')}
                            </span>
                        </ConfirmPopupText>
                        <ConfirmPopupButtons>
                            <ConfirmPopupButton onClick={() => setDeleteTarget(null)}>
                                {t('common.cancel')}
                            </ConfirmPopupButton>
                            <ConfirmPopupButton $danger onClick={handleConfirmDelete}>
                                {t('settings.httpActions.actions.delete')}
                            </ConfirmPopupButton>
                        </ConfirmPopupButtons>
                    </ConfirmPopupContent>
                </Popup>
            )}
        </Container>
    );
}
