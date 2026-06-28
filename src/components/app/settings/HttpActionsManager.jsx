import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { tokens } from "../../../designSystem/tokens";
import Button from '../../../designSystem/components/Button';
import { ConfirmDialog } from '../../../designSystem';
import { Portal } from '../../../context/PortalContext';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiPlay, FiGlobe } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { getAllHttpActions, deleteHttpAction, testHttpAction } from '../../../services/api';
import HttpActionEditorPopup from './bot/triggers/HttpActionEditorPopup';
import {
    SettingsCard,
    CardHeader,
    CardTitle,
    CardContent,
} from './SharedSettingsStyles';

const Container = styled.div`
    width: 100%;
`;

const HeaderRight = styled.div`
    margin-left: auto;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: ${tokens.space.md};
    flex-wrap: wrap;

    @media (max-width: 720px) {
        width: 100%;
        margin-left: 0;
    }
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
    border: 1px solid ${tokens.color.border.default};
    border-radius: ${tokens.radius.lg};
    background: ${tokens.color.bg.surface};
    color: ${tokens.color.text.primary};
    font-size: ${tokens.font.size.base};
    transition: ${tokens.transition.base};
    box-sizing: border-box;

    &::placeholder { color: ${tokens.color.text.disabled}; }

    &:focus {
        outline: none;
        border-color: ${tokens.color.feature.integrations.base};
        background: ${tokens.color.bg.raised};
    }
`;

const SearchIcon = styled(FiSearch)`
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: ${tokens.color.text.disabled};
    width: 18px;
    height: 18px;
`;

const TableHeadCell = styled.th`
    padding: 10px 14px;
    border-bottom: 1px solid ${tokens.color.border.subtle};
    font-size: 0.72rem;
    font-weight: ${tokens.font.weight.semibold};
    text-align: left;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${tokens.color.text.disabled};
    white-space: nowrap;

    &:last-child {
        text-align: right;
    }
`;

const TableCell = styled.td`
    padding: 10px 14px;
    border-bottom: 1px solid ${tokens.color.border.subtle};
    vertical-align: middle;
    min-width: 0;

    &:last-child {
        text-align: right;
    }
`;

const ActionsTable = styled.table`
    width: 100%;
    table-layout: fixed;
    border-collapse: separate;
    border-spacing: 0;
    border: 1px solid ${tokens.color.border.subtle};
    border-radius: 10px;
    overflow: hidden;
    background: ${tokens.color.bg.base};

    ${TableHeadCell}:nth-child(1),
    ${TableCell}:nth-child(1) {
        width: 30%;
    }

    ${TableHeadCell}:nth-child(2),
    ${TableCell}:nth-child(2) {
        width: 16%;
    }

    ${TableHeadCell}:nth-child(4),
    ${TableCell}:nth-child(4) {
        width: 108px;
    }
`;

const TableHeaderRow = styled.tr`
    background: ${tokens.color.scrim.panel};
`;

const TableRow = styled.tr`
    transition: ${tokens.transition.fast};

    &:last-child ${TableCell} {
        border-bottom: none;
    }

    &:hover {
        background: ${tokens.color.scrim.panel};
    }
`;

const RowName = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    font-size: 0.9rem;
    color: ${tokens.color.text.primary};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    svg { color: ${tokens.color.feature.integrations.base}; flex-shrink: 0; }
`;

const MethodBadge = styled.div`
    padding: 4px 10px;
    border-radius: ${tokens.radius.pill};
    font-size: 0.7rem;
    font-weight: 600;
    background: ${p => methodColor(p.$method).bg};
    color: ${p => methodColor(p.$method).fg};
    white-space: nowrap;
    display: inline-flex;
`;

const RowUrl = styled.div`
    font-size: 0.78rem;
    color: ${tokens.color.text.faint};
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const RowActions = styled.div`
    display: flex;
    gap: 4px;
    justify-content: flex-end;
`;

const ActionIconButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    padding: 0;
    border: 1px solid transparent;
    border-radius: ${tokens.radius.md};
    background: transparent;
    color: ${p => p.$color || tokens.color.text.faint};
    cursor: pointer;
    transition: ${tokens.transition.fast};

    svg { width: 14px; height: 14px; }

    &:hover:not(:disabled) {
        border-color: ${p => p.$borderColor || tokens.color.border.strong};
        background: ${p => p.$hoverBackground || tokens.color.scrim.panel};
    }

    &:disabled { opacity: 0.35; cursor: not-allowed; }
`;

const EmptyState = styled.div`
    text-align: center;
    padding: 60px 20px;
    color: ${tokens.color.text.disabled};

    svg { width: 48px; height: 48px; color: ${tokens.color.border.subtle}; margin-bottom: 12px; }
    h3 { margin: 0 0 6px; color: ${tokens.color.text.faint}; font-weight: 500; }
    p { margin: 0; font-size: 0.85rem; }
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
            <SettingsCard>
                <CardHeader>
                    <CardTitle>
                        <FiGlobe />
                        {t('settings.httpActions.listTitle')}
                    </CardTitle>
                    <HeaderRight>
                        <SearchWrapper>
                            <SearchIcon />
                            <SearchInput
                                type="text"
                                placeholder={t('settings.httpActions.searchPlaceholder')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </SearchWrapper>
                        <Button $variant="primary" $size="sm" type="button" onClick={handleAdd}>
                            <FiPlus />
                            {t('settings.httpActions.addAction')}
                        </Button>
                    </HeaderRight>
                </CardHeader>
                <CardContent>
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
                            <thead>
                                <TableHeaderRow>
                                    <TableHeadCell>{t('settings.httpActions.editor.nameLabel')}</TableHeadCell>
                                    <TableHeadCell>{t('settings.httpActions.editor.methodLabel')}</TableHeadCell>
                                    <TableHeadCell>{t('settings.httpActions.editor.urlLabel')}</TableHeadCell>
                                    <TableHeadCell />
                                </TableHeaderRow>
                            </thead>
                            <tbody>
                                {filteredActions.map(action => (
                                    <TableRow key={action.id}>
                                        <TableCell>
                                            <RowName title={action.name}>
                                                <FiGlobe size={14} />
                                                {action.name}
                                            </RowName>
                                        </TableCell>
                                        <TableCell>
                                            <MethodBadge $method={action.method}>{action.method}</MethodBadge>
                                        </TableCell>
                                        <TableCell>
                                            <RowUrl title={action.url}>{action.url}</RowUrl>
                                        </TableCell>
                                        <TableCell>
                                            <RowActions>
                                                <ActionIconButton
                                                    $color={tokens.color.accent.primary}
                                                    $borderColor={tokens.color.accent.softBorder}
                                                    $hoverBackground={tokens.color.accent.soft}
                                                    onClick={() => handleTest(action)}
                                                    title={t('settings.httpActions.actions.test')}
                                                >
                                                    <FiPlay />
                                                </ActionIconButton>
                                                <ActionIconButton
                                                    $color={tokens.color.accent.primary}
                                                    $borderColor={tokens.color.accent.softBorder}
                                                    $hoverBackground={tokens.color.accent.soft}
                                                    onClick={() => handleEdit(action)}
                                                    title={t('settings.httpActions.actions.edit')}
                                                >
                                                    <FiEdit2 />
                                                </ActionIconButton>
                                                <ActionIconButton
                                                    $color={tokens.color.danger.text}
                                                    $borderColor={tokens.color.danger.softBorder}
                                                    $hoverBackground={tokens.color.danger.soft}
                                                    onClick={() => setDeleteTarget(action)}
                                                    title={t('settings.httpActions.actions.delete')}
                                                >
                                                    <FiTrash2 />
                                                </ActionIconButton>
                                            </RowActions>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </tbody>
                        </ActionsTable>
                    )}
                </CardContent>
            </SettingsCard>

            {editorOpen && (
                <HttpActionEditorPopup
                    action={editTarget}
                    onSave={handleEditorSave}
                    onClose={handleEditorClose}
                />
            )}

            {deleteTarget && (
                <Portal id="http-action-delete" onClose={() => setDeleteTarget(null)}>
                    <ConfirmDialog
                        variant="danger"
                        title={t('settings.httpActions.confirmDelete.title')}
                        text={<>
                            {t('settings.httpActions.confirmDelete.message', { name: deleteTarget.name })}
                            <br />
                            {t('settings.httpActions.confirmDelete.warning')}
                        </>}
                        confirmLabel={t('settings.httpActions.actions.delete')}
                        cancelLabel={t('common.cancel')}
                        onCancel={() => setDeleteTarget(null)}
                        onConfirm={handleConfirmDelete}
                    />
                </Portal>
            )}
        </Container>
    );
}
