import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import {
    FiPlus, FiEdit2, FiTrash2, FiSearch, FiPlay, FiSliders,
    FiZap, FiWifi, FiWifiOff, FiRefreshCw, FiSave,
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
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
} from '../../../services/api';
import { useObsStatus } from '../../../hooks/useObsStatus';
import ObsActionEditorPopup from './bot/triggers/ObsActionEditorPopup';
import Popup from '../../utils/PopupComponent';
import Switch from '../../utils/Switch';

// ─── Styles ─────────────────────────────────────────────────────

const Container = styled.div`
    width: 100%;
`;

const ConnectionCard = styled.div`
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(59, 130, 246, 0.02) 100%);
    border: 1px solid #333;
    border-radius: 12px;
    padding: 16px 20px;
    margin-bottom: 24px;
    display: flex;
    flex-direction: column;
    gap: 14px;
`;

const ConnectionHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;

    h3 {
        margin: 0;
        font-size: 0.95rem;
        font-weight: 600;
        color: #fff;
        display: flex;
        align-items: center;
        gap: 10px;

        svg { color: #3b82f6; }
    }
`;

const HeaderSeparator = styled.div`
    width: 1px;
    align-self: stretch;
    background: #333;
`;

const StatusBadge = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 500;
    margin-left: auto;
    background: ${p => {
        if (p.$status === 'connected') return 'rgba(16, 185, 129, 0.18)';
        if (p.$status === 'connecting') return 'rgba(234, 179, 8, 0.18)';
        if (p.$status === 'error') return 'rgba(239, 68, 68, 0.18)';
        return 'rgba(107, 114, 128, 0.2)';
    }};
    color: ${p => {
        if (p.$status === 'connected') return '#10b981';
        if (p.$status === 'connecting') return '#eab308';
        if (p.$status === 'error') return '#ef4444';
        return '#888';
    }};
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

const Field = styled.div`
    display: flex;
    flex-direction: column;
    gap: 5px;
`;

const FieldLabel = styled.label`
    font-size: 0.75rem;
    color: #888;
`;

const FieldInput = styled.input`
    background: #0f0f0f;
    border: 1px solid #333;
    border-radius: 8px;
    padding: 9px 12px;
    color: #eee;
    font-size: 0.88rem;
    outline: none;
    transition: border-color 0.15s;

    &:focus { border-color: #3b82f6; }
`;

const SwitchRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.85rem;
    color: #ccc;
`;

const ConnectionButtons = styled.div`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
`;

const ConnectionButton = styled.button`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border: 1px solid ${p => p.$primary ? '#3b82f6' : '#444'};
    border-radius: 8px;
    background: ${p => p.$primary ? '#3b82f6' : 'rgba(107, 114, 128, 0.1)'};
    color: ${p => p.$primary ? '#fff' : '#ccc'};
    cursor: pointer;
    font-size: 0.82rem;
    transition: all 0.2s ease;

    &:hover:not(:disabled) {
        background: ${p => p.$primary ? '#2563eb' : 'rgba(107, 114, 128, 0.2)'};
        border-color: ${p => p.$primary ? '#2563eb' : '#555'};
    }

    &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }
`;

const ErrorInline = styled.span`
    font-size: 0.78rem;
    color: #ef4444;
    line-height: 1.3;
`;

const RetryInline = styled.span`
    font-size: 0.78rem;
    color: #eab308;
    line-height: 1.3;
`;

const Hint = styled.div`
    font-size: 0.72rem;
    color: #666;
    font-style: italic;
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
        border-color: #3b82f6;
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
    border: 1px solid #3b82f6;
    border-radius: 8px;
    background: rgba(59, 130, 246, 0.15);
    color: #3b82f6;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    transition: all 0.2s ease;
    white-space: nowrap;

    &:hover {
        background: rgba(59, 130, 246, 0.25);
    }

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
    grid-template-columns: minmax(160px, 1.2fr) minmax(140px, auto) minmax(200px, 2fr) auto;
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
    grid-template-columns: minmax(160px, 1.2fr) minmax(140px, auto) minmax(200px, 2fr) auto;
    gap: 14px;
    padding: 10px 14px;
    align-items: center;
    border-bottom: 1px solid #2a2a2a;
    transition: background 0.15s;

    &:last-child {
        border-bottom: none;
    }

    &:hover {
        background: rgba(59, 130, 246, 0.05);
    }
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

    svg { color: #3b82f6; flex-shrink: 0; }
`;

const OperationBadge = styled.div`
    justify-self: start;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 0.7rem;
    background: rgba(59, 130, 246, 0.15);
    color: #3b82f6;
    white-space: nowrap;
`;

const RowDescription = styled.div`
    font-size: 0.8rem;
    color: #888;
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

    svg {
        width: 14px;
        height: 14px;
    }

    &:hover:not(:disabled) {
        border-color: ${p => p.$color || '#555'};
        background: ${p => p.$color ? `${p.$color}15` : 'rgba(255,255,255,0.04)'};
    }

    &:disabled {
        opacity: 0.35;
        cursor: not-allowed;
    }
`;

const EmptyState = styled.div`
    text-align: center;
    padding: 60px 20px;
    color: #666;

    svg {
        width: 48px;
        height: 48px;
        color: #333;
        margin-bottom: 12px;
    }

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
            <ConnectionCard>
                <ConnectionHeader>
                    <h3>
                        <FiZap />
                        {t('settings.obsActions.connection.title')}
                    </h3>
                    {friendlyError && (
                        <>
                            <HeaderSeparator />
                            <ErrorInline>{friendlyError}</ErrorInline>
                        </>
                    )}
                    {retryInSec !== null && (
                        <RetryInline>
                            {t('settings.obsActions.connection.errors.retryIn', { sec: retryInSec })}
                        </RetryInline>
                    )}
                    <StatusBadge $status={obsStatus.status}>
                        {isConnected ? <FiWifi size={12} /> : <FiWifiOff size={12} />}
                        {statusLabel}
                    </StatusBadge>
                </ConnectionHeader>

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
                    <ConnectionButton onClick={handleSaveConnection}>
                        <FiSave size={14} />
                        {t('settings.obsActions.connection.save')}
                    </ConnectionButton>
                    {isConnected ? (
                        <ConnectionButton onClick={handleDisconnect}>
                            <FiWifiOff size={14} />
                            {t('settings.obsActions.connection.disconnect')}
                        </ConnectionButton>
                    ) : (
                        <ConnectionButton $primary onClick={handleConnect}>
                            <FiWifi size={14} />
                            {t('settings.obsActions.connection.connect')}
                        </ConnectionButton>
                    )}
                    <ConnectionButton onClick={handleRefreshCache} disabled={!isConnected}>
                        <FiRefreshCw size={14} />
                        {t('settings.obsActions.connection.refreshCache')}
                    </ConnectionButton>
                </ConnectionButtons>

                <Hint>{t('settings.obsActions.connection.hint')}</Hint>
            </ConnectionCard>

            <Header>
                <SearchWrapper>
                    <SearchIcon />
                    <SearchInput
                        type="text"
                        placeholder={t('settings.obsActions.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </SearchWrapper>
                <AddButton onClick={handleAdd}>
                    <FiPlus />
                    {t('settings.obsActions.addAction')}
                </AddButton>
            </Header>

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
                    <TableHeaderRow>
                        <div>{t('settings.obsActions.editor.nameLabel')}</div>
                        <div>{t('settings.obsActions.editor.operationLabel')}</div>
                        <div>{t('settings.obsActions.editor.modeLabel')}</div>
                        <div />
                    </TableHeaderRow>
                    {filteredActions.map(action => (
                        <TableRow key={action.id}>
                            <RowName title={action.name}>
                                <FiSliders size={14} />
                                {action.name}
                            </RowName>
                            <OperationBadge>
                                {t(`settings.obsActions.operations.${action.operation}`)}
                            </OperationBadge>
                            <RowDescription title={describeAction(action, t)}>
                                {describeAction(action, t)}
                            </RowDescription>
                            <RowActions>
                                <ActionIconButton
                                    $color="#22c55e"
                                    onClick={() => handleTest(action)}
                                    disabled={!isConnected}
                                    title={t('settings.obsActions.actions.test')}
                                >
                                    <FiPlay />
                                </ActionIconButton>
                                <ActionIconButton
                                    $color="#3b82f6"
                                    onClick={() => handleEdit(action)}
                                    title={t('settings.obsActions.actions.edit')}
                                >
                                    <FiEdit2 />
                                </ActionIconButton>
                                <ActionIconButton
                                    $color="#dc2626"
                                    onClick={() => setDeleteTarget(action)}
                                    title={t('settings.obsActions.actions.delete')}
                                >
                                    <FiTrash2 />
                                </ActionIconButton>
                            </RowActions>
                        </TableRow>
                    ))}
                </ActionsTable>
            )}

            {editorOpen && (
                <ObsActionEditorPopup
                    action={editTarget}
                    onSave={handleEditorSave}
                    onClose={handleEditorClose}
                />
            )}

            {deleteTarget && (
                <Popup onClose={() => setDeleteTarget(null)}>
                    <ConfirmPopupContent>
                        <ConfirmPopupTitle>
                            {t('settings.obsActions.confirmDelete.title')}
                        </ConfirmPopupTitle>
                        <ConfirmPopupText>
                            {t('settings.obsActions.confirmDelete.message', { name: deleteTarget.name })}
                            <span className="warning">
                                {t('settings.obsActions.confirmDelete.warning')}
                            </span>
                        </ConfirmPopupText>
                        <ConfirmPopupButtons>
                            <ConfirmPopupButton onClick={() => setDeleteTarget(null)}>
                                {t('common.cancel')}
                            </ConfirmPopupButton>
                            <ConfirmPopupButton $danger onClick={handleConfirmDelete}>
                                {t('settings.obsActions.actions.delete')}
                            </ConfirmPopupButton>
                        </ConfirmPopupButtons>
                    </ConfirmPopupContent>
                </Popup>
            )}
        </Container>
    );
}
