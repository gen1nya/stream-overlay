import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { tokens } from '../../../designSystem/tokens';
import Button from '../../../designSystem/components/Button';
import { ConfirmDialog } from '../../../designSystem';
import { Portal } from '../../../context/PortalContext';
import {
    FiPlus, FiEdit2, FiTrash2, FiSearch, FiPlay, FiSliders,
    FiZap, FiWifi, FiWifiOff, FiRefreshCw, FiSave, FiBookOpen, FiList,
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import {
    SettingsCard,
    CardHeader,
    CardTitle,
    CardContent,
    ControlGroup,
    InfoBadge,
    HelperText,
} from './SharedSettingsStyles';
import {
    getAllObsActions,
    deleteObsAction,
    testObsAction,
    getObsConnectionConfig,
    saveObsConnectionConfig,
    setObsPassword,
    hasObsPassword,
    connectObs,
    disconnectObs,
    refreshObsCache,
    openHelp,
} from '../../../services/api';
import { useObsStatus } from '../../../hooks/useObsStatus';
import ObsActionEditorPopup from './bot/triggers/ObsActionEditorPopup';
import Switch from '../../utils/Switch';

// ─── Styles ─────────────────────────────────────────────────────

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

const StatusBadge = styled(InfoBadge)`
    gap: ${tokens.space.sm};
    background: ${p => {
        if (p.$status === 'connected') return tokens.color.success.soft;
        if (p.$status === 'connecting') return tokens.color.warning.soft;
        if (p.$status === 'error') return tokens.color.danger.soft;
        return tokens.color.scrim.panel;
    }};
    border-color: ${p => {
        if (p.$status === 'connected') return tokens.color.success.softBorder;
        if (p.$status === 'connecting') return tokens.color.warning.softBorder;
        if (p.$status === 'error') return tokens.color.danger.softBorder;
        return tokens.color.border.default;
    }};
    color: ${p => {
        if (p.$status === 'connected') return tokens.color.success.text;
        if (p.$status === 'connecting') return tokens.color.warning.text;
        if (p.$status === 'error') return tokens.color.danger.text;
        return tokens.color.text.faint;
    }};

    svg {
        color: currentColor;
    }
`;

const ConnectionGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 120px 2fr;
    gap: 12px;
    align-items: end;

    @media (max-width: 720px) {
        grid-template-columns: 1fr;
    }
`;

const Field = styled(ControlGroup)`
    gap: 5px;
`;

const FieldLabel = styled.label`
    font-size: 0.75rem;
    color: ${tokens.color.text.faint};
`;

const FieldInput = styled.input`
    background: ${tokens.color.bg.app};
    border: 1px solid ${tokens.color.border.subtle};
    border-radius: ${tokens.radius.lg};
    padding: 9px 12px;
    color: ${tokens.color.text.secondary};
    font-size: 0.88rem;
    outline: none;
    transition: ${tokens.transition.fast};

    &:focus {
        border-color: ${tokens.color.accent.primary};
        background: ${tokens.color.bg.surface};
    }
`;

const SwitchRow = styled.div`
    display: flex;
    align-items: center;
    gap: ${tokens.space.md};
    font-size: ${tokens.font.size.sm};
    color: ${tokens.color.text.tertiary};
`;

const ConnectionButtons = styled.div`
    display: flex;
    gap: ${tokens.space.sm};
    flex-wrap: wrap;
`;

const InlineMessages = styled.div`
    display: flex;
    align-items: center;
    gap: ${tokens.space.md};
    flex-wrap: wrap;
`;

const InlineMessage = styled(HelperText).attrs({ as: 'span' })`
    font-size: ${tokens.font.size.xs};
`;

const ErrorInline = styled(InlineMessage)`
    color: ${tokens.color.danger.text};
`;

const RetryInline = styled(InlineMessage)`
    color: ${tokens.color.warning.text};
`;

const GuideLink = styled.button`
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: ${tokens.space.sm};
    padding: 6px ${tokens.space.md};
    margin: 0;
    border: 1px solid transparent;
    border-radius: ${tokens.radius.md};
    background: transparent;
    color: ${tokens.color.accent.primary};
    font-size: ${tokens.font.size.xs};
    cursor: pointer;
    transition: ${tokens.transition.fast};

    svg {
        width: 14px;
        height: 14px;
    }

    &:hover {
        border-color: ${tokens.color.accent.softBorder};
        background: ${tokens.color.accent.soft};
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
        border-color: ${tokens.color.accent.primary};
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
        width: 22%;
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

    svg { color: ${tokens.color.accent.primary}; flex-shrink: 0; }
`;

const OperationBadge = styled.div`
    padding: 4px 10px;
    border-radius: ${tokens.radius.pill};
    font-size: 0.7rem;
    background: ${tokens.color.accent.soft};
    color: ${tokens.color.accent.primary};
    white-space: nowrap;
    display: inline-flex;
`;

const RowDescription = styled.div`
    font-size: 0.8rem;
    color: ${tokens.color.text.faint};
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

    svg {
        width: 14px;
        height: 14px;
    }

    &:hover:not(:disabled) {
        border-color: ${p => p.$borderColor || tokens.color.border.strong};
        background: ${p => p.$hoverBackground || tokens.color.scrim.panel};
    }

    &:disabled {
        opacity: 0.35;
        cursor: not-allowed;
    }
`;

const EmptyState = styled.div`
    text-align: center;
    padding: 60px 20px;
    color: ${tokens.color.text.disabled};

    svg {
        width: 48px;
        height: 48px;
        color: ${tokens.color.border.subtle};
        margin-bottom: 12px;
    }

    h3 { margin: 0 0 6px; color: ${tokens.color.text.faint}; font-weight: 500; }
    p { margin: 0; font-size: 0.85rem; }
`;

// ─── Helpers ────────────────────────────────────────────────────

// Map the raw lastError string produced by ObsService.formatObsError
// (things like "code=1006" or "... (code=4009)") into a friendly
// translation key where we know the code; otherwise fall through.
function parseObsError(raw, t) {
    if (!raw) return null;
    const codeMatch = raw.match(/code=(\d+)/);
    const code = codeMatch ? codeMatch[1] : null;
    switch (code) {
        case '1006':
            return t('settings.obsActions.connection.errors.notReachable');
        case '4009':
        case '4008':
            return t('settings.obsActions.connection.errors.authFailed');
    }
    if (code) return t('settings.obsActions.connection.errors.unknownCode', { code });
    return raw;
}

function describeAction(action, t) {
    if (!action) return '';
    switch (action.operation) {
        case 'switch_scene':
            return action.sceneName || '—';
        case 'toggle_scene_item':
            return `${action.sceneName || '?'} / ${action.sourceName || '?'} · ${t(`settings.obsActions.modes.${action.mode}`)}`;
        case 'toggle_filter':
            return `${action.sourceName || '?'} / ${action.filterName || '?'} · ${t(`settings.obsActions.modes.${action.mode}`)}`;
        case 'trigger_hotkey':
            return action.hotkeyName || '—';
        case 'record_control':
        case 'stream_control':
        case 'virtualcam_control':
            return t(`settings.obsActions.modes.${action.mode}`);
        case 'media_control':
            return `${action.sourceName || '?'} · ${t(`settings.obsActions.modes.${action.mediaAction}`)}`;
        default:
            return '';
    }
}

// ─── Component ──────────────────────────────────────────────────

export default function ObsActionsManager() {
    const { t } = useTranslation();
    const obsStatus = useObsStatus();

    const [actions, setActions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [nowTick, setNowTick] = useState(() => Date.now());

    const [editorOpen, setEditorOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    // Connection form state — user edits host/port/autoConnect locally.
    // The master `enabled` flag lives on the Settings toolbar above, so
    // we deliberately don't mirror it here to avoid stale overwrites.
    const [connectionForm, setConnectionForm] = useState({
        host: 'localhost',
        port: 4455,
        autoConnect: false,
    });
    const [password, setPassword] = useState('');
    const [passwordStored, setPasswordStored] = useState(false);

    // Load actions and connection config
    const loadActions = useCallback(async () => {
        try {
            const list = await getAllObsActions();
            setActions(list ?? []);
        } catch (err) {
            console.error('Failed to load OBS actions:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadActions();
    }, [loadActions]);

    // Tick a local clock while a reconnect is pending so the countdown
    // next to the status badge updates live without depending on
    // backend re-broadcasts.
    useEffect(() => {
        if (obsStatus.status !== 'error' || !obsStatus.nextRetryAt) return;
        const id = setInterval(() => setNowTick(Date.now()), 500);
        return () => clearInterval(id);
    }, [obsStatus.status, obsStatus.nextRetryAt]);

    const retryInSec = useMemo(() => {
        if (obsStatus.status !== 'error' || !obsStatus.nextRetryAt) return null;
        return Math.max(0, Math.ceil((obsStatus.nextRetryAt - nowTick) / 1000));
    }, [obsStatus.status, obsStatus.nextRetryAt, nowTick]);

    const friendlyError = useMemo(
        () => (obsStatus.status === 'error' ? parseObsError(obsStatus.lastError, t) : null),
        [obsStatus.status, obsStatus.lastError, t]
    );

    useEffect(() => {
        (async () => {
            try {
                const cfg = await getObsConnectionConfig();
                if (cfg) {
                    setConnectionForm({
                        host: cfg.host,
                        port: cfg.port,
                        autoConnect: cfg.autoConnect,
                    });
                }
                const hasPw = await hasObsPassword();
                setPasswordStored(Boolean(hasPw));
            } catch (err) {
                console.error('Failed to load OBS connection config:', err);
            }
        })();
    }, []);

    const filteredActions = useMemo(() => {
        if (!searchQuery) return actions;
        const q = searchQuery.toLowerCase();
        return actions.filter(a => a.name?.toLowerCase().includes(q));
    }, [actions, searchQuery]);

    const handleConnectionFieldChange = (patch) => {
        setConnectionForm(prev => ({ ...prev, ...patch }));
    };

    // Read latest config from backend and overlay form fields, so a
    // toolbar-level `enabled` toggle is never accidentally clobbered.
    const mergedConfigFromForm = async () => {
        const latest = await getObsConnectionConfig();
        return {
            ...(latest || { enabled: false }),
            host: connectionForm.host,
            port: connectionForm.port,
            autoConnect: connectionForm.autoConnect,
        };
    };

    const handleSaveConnection = async () => {
        await saveObsConnectionConfig(await mergedConfigFromForm());
        if (password) {
            await setObsPassword(password);
            setPassword('');
            setPasswordStored(true);
        }
    };

    const handleConnect = async () => {
        // Save current form first so connect uses latest config
        await saveObsConnectionConfig(await mergedConfigFromForm());
        if (password) {
            await setObsPassword(password);
            setPassword('');
            setPasswordStored(true);
        }
        await connectObs();
    };

    const handleDisconnect = async () => {
        await disconnectObs();
    };

    const handleRefreshCache = async () => {
        await refreshObsCache();
    };

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
            await testObsAction(action);
        } catch (err) {
            console.error('Failed to test OBS action:', err);
        }
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteObsAction(deleteTarget.id);
            setActions(prev => prev.filter(a => a.id !== deleteTarget.id));
        } catch (err) {
            console.error('Failed to delete OBS action:', err);
        }
        setDeleteTarget(null);
    };

    if (loading) {
        return (
            <Container>
                <EmptyState>
                    <FiSliders />
                    <p>{t('common.loading', 'Loading...')}</p>
                </EmptyState>
            </Container>
        );
    }

    const isConnected = obsStatus.status === 'connected';
    const statusLabel = t(`settings.obsActions.connection.status.${obsStatus.status}`);

    return (
        <Container>
            <SettingsCard>
                <CardHeader>
                    <CardTitle>
                        <FiZap />
                        {t('settings.obsActions.connection.title')}
                    </CardTitle>
                    <HeaderRight>
                        <StatusBadge $status={obsStatus.status}>
                            {isConnected ? <FiWifi size={12} /> : <FiWifiOff size={12} />}
                            {statusLabel}
                        </StatusBadge>
                    </HeaderRight>
                </CardHeader>
                <CardContent>
                    <ConnectionGrid>
                        <Field>
                            <FieldLabel>{t('settings.obsActions.connection.host')}</FieldLabel>
                            <FieldInput
                                type="text"
                                value={connectionForm.host}
                                onChange={(e) => handleConnectionFieldChange({ host: e.target.value })}
                            />
                        </Field>
                        <Field>
                            <FieldLabel>{t('settings.obsActions.connection.port')}</FieldLabel>
                            <FieldInput
                                type="number"
                                value={connectionForm.port}
                                onChange={(e) => handleConnectionFieldChange({ port: parseInt(e.target.value, 10) || 4455 })}
                            />
                        </Field>
                        <Field>
                            <FieldLabel>
                                {t('settings.obsActions.connection.password')}
                                {passwordStored && ` · ${t('settings.obsActions.connection.passwordSaved')}`}
                            </FieldLabel>
                            <FieldInput
                                type="password"
                                placeholder={t('settings.obsActions.connection.passwordPlaceholder')}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </Field>
                    </ConnectionGrid>

                    <SwitchRow>
                        <Switch
                            checked={connectionForm.autoConnect}
                            onChange={(e) => handleConnectionFieldChange({ autoConnect: e.target.checked })}
                        />
                        <span>{t('settings.obsActions.connection.autoConnect')}</span>
                    </SwitchRow>

                    <ConnectionButtons>
                        {isConnected ? (
                            <Button $variant="danger" $size="sm" type="button" onClick={handleDisconnect}>
                                <FiWifiOff size={14} />
                                {t('settings.obsActions.connection.disconnect')}
                            </Button>
                        ) : (
                            <Button $variant="primary" $size="sm" type="button" onClick={handleConnect}>
                                <FiWifi size={14} />
                                {t('settings.obsActions.connection.connect')}
                            </Button>
                        )}
                        <Button $variant="neutral" $size="sm" type="button" onClick={handleSaveConnection}>
                            <FiSave size={14} />
                            {t('settings.obsActions.connection.save')}
                        </Button>
                        <Button $variant="ghost" $size="sm" type="button" onClick={handleRefreshCache} disabled={!isConnected}>
                            <FiRefreshCw size={14} />
                            {t('settings.obsActions.connection.refreshCache')}
                        </Button>
                    </ConnectionButtons>

                    {(friendlyError || retryInSec !== null) && (
                        <InlineMessages>
                            {friendlyError && <ErrorInline>{friendlyError}</ErrorInline>}
                            {retryInSec !== null && (
                                <RetryInline>
                                    {t('settings.obsActions.connection.errors.retryIn', { sec: retryInSec })}
                                </RetryInline>
                            )}
                        </InlineMessages>
                    )}

                    <GuideLink type="button" onClick={() => openHelp('obs-websocket-setup.md')}>
                        <FiBookOpen />
                        {t('settings.obsActions.connection.openGuide')}
                    </GuideLink>
                </CardContent>
            </SettingsCard>

            <SettingsCard>
                <CardHeader>
                    <CardTitle>
                        <FiList />
                        {t('settings.obsActions.listTitle')}
                    </CardTitle>
                    <HeaderRight>
                        <SearchWrapper>
                            <SearchIcon />
                            <SearchInput
                                type="text"
                                placeholder={t('settings.obsActions.searchPlaceholder')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </SearchWrapper>
                        <Button $variant="primary" $size="sm" type="button" onClick={handleAdd}>
                            <FiPlus />
                            {t('settings.obsActions.addAction')}
                        </Button>
                    </HeaderRight>
                </CardHeader>
                <CardContent>
                    {filteredActions.length === 0 ? (
                        <EmptyState>
                            <FiSliders />
                            <h3>
                                {actions.length === 0
                                    ? t('settings.obsActions.empty.title')
                                    : t('settings.obsActions.empty.noResults')}
                            </h3>
                            <p>
                                {actions.length === 0
                                    ? t('settings.obsActions.empty.description')
                                    : t('settings.obsActions.empty.tryDifferent')}
                            </p>
                        </EmptyState>
                    ) : (
                        <ActionsTable>
                            <thead>
                                <TableHeaderRow>
                                    <TableHeadCell>{t('settings.obsActions.editor.nameLabel')}</TableHeadCell>
                                    <TableHeadCell>{t('settings.obsActions.editor.operationLabel')}</TableHeadCell>
                                    <TableHeadCell>{t('settings.obsActions.editor.modeLabel')}</TableHeadCell>
                                    <TableHeadCell />
                                </TableHeaderRow>
                            </thead>
                            <tbody>
                                {filteredActions.map(action => (
                                    <TableRow key={action.id}>
                                        <TableCell>
                                            <RowName title={action.name}>
                                                <FiSliders size={14} />
                                                {action.name}
                                            </RowName>
                                        </TableCell>
                                        <TableCell>
                                            <OperationBadge>
                                                {t(`settings.obsActions.operations.${action.operation}`)}
                                            </OperationBadge>
                                        </TableCell>
                                        <TableCell>
                                            <RowDescription title={describeAction(action, t)}>
                                                {describeAction(action, t)}
                                            </RowDescription>
                                        </TableCell>
                                        <TableCell>
                                            <RowActions>
                                                <ActionIconButton
                                                    $color={tokens.color.success.text}
                                                    $borderColor={tokens.color.success.softBorder}
                                                    $hoverBackground={tokens.color.success.soft}
                                                    onClick={() => handleTest(action)}
                                                    disabled={!isConnected}
                                                    title={t('settings.obsActions.actions.test')}
                                                >
                                                    <FiPlay />
                                                </ActionIconButton>
                                                <ActionIconButton
                                                    $color={tokens.color.accent.primary}
                                                    $borderColor={tokens.color.accent.softBorder}
                                                    $hoverBackground={tokens.color.accent.soft}
                                                    onClick={() => handleEdit(action)}
                                                    title={t('settings.obsActions.actions.edit')}
                                                >
                                                    <FiEdit2 />
                                                </ActionIconButton>
                                                <ActionIconButton
                                                    $color={tokens.color.danger.text}
                                                    $borderColor={tokens.color.danger.softBorder}
                                                    $hoverBackground={tokens.color.danger.soft}
                                                    onClick={() => setDeleteTarget(action)}
                                                    title={t('settings.obsActions.actions.delete')}
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
                <ObsActionEditorPopup
                    action={editTarget}
                    onSave={handleEditorSave}
                    onClose={handleEditorClose}
                />
            )}

            {deleteTarget && (
                <Portal id="obs-action-delete" onClose={() => setDeleteTarget(null)}>
                    <ConfirmDialog
                        variant="danger"
                        title={t('settings.obsActions.confirmDelete.title')}
                        text={<>
                            {t('settings.obsActions.confirmDelete.message', { name: deleteTarget.name })}
                            <br />
                            {t('settings.obsActions.confirmDelete.warning')}
                        </>}
                        confirmLabel={t('settings.obsActions.actions.delete')}
                        cancelLabel={t('common.cancel')}
                        onCancel={() => setDeleteTarget(null)}
                        onConfirm={handleConfirmDelete}
                    />
                </Portal>
            )}
        </Container>
    );
}
