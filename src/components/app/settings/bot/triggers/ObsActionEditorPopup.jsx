import React, { useCallback, useEffect, useId, useState } from "react";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import {
    FiX, FiSave, FiPlay, FiPause, FiSquare, FiSkipForward, FiSkipBack,
    FiRotateCcw, FiRepeat, FiEye, FiEyeOff, FiSliders,
} from "react-icons/fi";
import { v4 as uuidv4 } from "uuid";
import { Portal } from "../../../../../context/PortalContext";
import {
    saveObsAction,
    listObsScenes,
    listObsInputs,
    listObsHotkeys,
    listObsSceneItems,
    listObsSourceFilters,
    refreshObsCache,
    testObsAction,
} from "../../../../../services/api";
import { useObsStatus } from "../../../../../hooks/useObsStatus";

// ─── Styles (trimmed clone of MediaEventEditorPopup) ────────────

const PopupContainer = styled.div`
    background: linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%);
    border: 1px solid #444;
    border-radius: 16px;
    max-width: 640px;
    width: 100%;
    max-height: 90vh;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
`;

const PopupHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    padding: 16px 24px;
    border-bottom: 1px solid #333;
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(59, 130, 246, 0.05) 100%);
    flex-shrink: 0;
    flex-wrap: wrap;

    h3 {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 600;
        color: #fff;
        display: flex;
        align-items: center;
        gap: 10px;

        svg {
            color: #3b82f6;
        }
    }
`;

const HeaderActions = styled.div`
    display: flex;
    gap: 8px;
`;

const HeaderButton = styled.button`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border: 1px solid ${p => p.$primary ? '#3b82f6' : p.$test ? '#10b981' : '#444'};
    border-radius: 8px;
    background: ${p => p.$primary ? '#3b82f6' : p.$test ? 'rgba(16, 185, 129, 0.12)' : 'rgba(107, 114, 128, 0.1)'};
    color: ${p => p.$primary ? '#fff' : p.$test ? '#10b981' : '#888'};
    cursor: pointer;
    font-size: 0.85rem;
    transition: all 0.2s ease;

    &:hover:not(:disabled) {
        background: ${p => p.$primary ? '#2563eb' : p.$test ? 'rgba(16, 185, 129, 0.22)' : 'rgba(107, 114, 128, 0.2)'};
        border-color: ${p => p.$primary ? '#2563eb' : p.$test ? '#10b981' : '#555'};
        color: ${p => p.$primary ? '#fff' : p.$test ? '#34d399' : '#ccc'};
    }

    &:disabled {
        opacity: 0.45;
        cursor: not-allowed;
    }
`;

const PopupContent = styled.div`
    padding: 20px 24px 24px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 18px;
`;

const Section = styled.div`
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid #333;
    border-radius: 10px;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const SectionTitle = styled.div`
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #888;
    display: flex;
    align-items: center;
    gap: 6px;

    svg {
        color: #3b82f6;
    }
`;

const FormGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const Label = styled.label`
    font-size: 0.8rem;
    color: #bbb;
`;

const Input = styled.input`
    background: #0f0f0f;
    border: 1px solid #333;
    border-radius: 8px;
    padding: 10px 12px;
    color: #eee;
    font-size: 0.9rem;
    outline: none;
    transition: border-color 0.15s;

    &:focus { border-color: #3b82f6; }
`;

const Select = styled.select`
    background: #0f0f0f;
    border: 1px solid #333;
    border-radius: 8px;
    padding: 10px 12px;
    color: #eee;
    font-size: 0.9rem;
    outline: none;
    transition: border-color 0.15s;
    min-width: 0;

    &:focus { border-color: #3b82f6; }
`;

const RadioRow = styled.div`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
`;

const RadioButton = styled.button`
    flex: 1;
    min-width: 110px;
    padding: 9px 12px;
    border: 1px solid ${p => p.$active ? '#3b82f6' : '#333'};
    background: ${p => p.$active ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.02)'};
    color: ${p => p.$active ? '#fff' : '#aaa'};
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.85rem;
    white-space: nowrap;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;

    svg { flex-shrink: 0; }

    &:hover { border-color: #3b82f6; color: #fff; }
`;

const Hint = styled.div`
    font-size: 0.75rem;
    color: #666;
    font-style: italic;
`;

const ValidationNote = styled.div`
    margin: 14px 24px 4px;
    padding: 9px 12px;
    background: rgba(234, 179, 8, 0.08);
    border: 1px solid rgba(234, 179, 8, 0.3);
    border-radius: 8px;
    font-size: 0.78rem;
    color: #eab308;
`;

// ─── Defaults per operation ─────────────────────────────────────

const OPERATIONS = [
    'switch_scene',
    'toggle_scene_item',
    'toggle_filter',
    'trigger_hotkey',
    'record_control',
    'stream_control',
    'virtualcam_control',
    'media_control',
];

const TOGGLE_MODES = ['on', 'off', 'toggle'];
const START_STOP_MODES = ['start', 'stop', 'toggle'];
const MEDIA_ACTIONS = ['play', 'pause', 'restart', 'stop', 'next', 'previous'];

// Icons per mode — scanned visually faster than the Russian labels.
const MODE_ICONS = {
    on:       <FiEye size={14} />,
    off:      <FiEyeOff size={14} />,
    toggle:   <FiRepeat size={14} />,
    start:    <FiPlay size={14} />,
    stop:     <FiSquare size={14} />,
    play:     <FiPlay size={14} />,
    pause:    <FiPause size={14} />,
    restart:  <FiRotateCcw size={14} />,
    next:     <FiSkipForward size={14} />,
    previous: <FiSkipBack size={14} />,
};

// Input kinds that respond to TriggerMediaInputAction. Filtering the
// source dropdown to just these keeps the media_control subform from
// listing text/audio-capture/game-capture sources that can't be
// controlled as media.
const MEDIA_INPUT_KINDS = new Set(['ffmpeg_source', 'vlc_source', 'slideshow_v2']);

function buildDefaultAction(operation, existingName = '') {
    const base = { id: uuidv4(), name: existingName, operation };
    switch (operation) {
        case 'switch_scene':
            return { ...base, sceneName: '' };
        case 'toggle_scene_item':
            return { ...base, sceneName: '', sourceName: '', mode: 'toggle' };
        case 'toggle_filter':
            return { ...base, sourceName: '', filterName: '', mode: 'toggle' };
        case 'trigger_hotkey':
            return { ...base, hotkeyName: '' };
        case 'record_control':
        case 'stream_control':
        case 'virtualcam_control':
            return { ...base, mode: 'toggle' };
        case 'media_control':
            return { ...base, sourceName: '', mediaAction: 'play' };
        default:
            return base;
    }
}

function validationErrors(action, t) {
    const errors = [];
    if (!action?.name?.trim()) errors.push(t('settings.obsActions.editor.nameLabel'));
    switch (action.operation) {
        case 'switch_scene':
            if (!action.sceneName) errors.push(t('settings.obsActions.editor.sceneLabel'));
            break;
        case 'toggle_scene_item':
            if (!action.sceneName) errors.push(t('settings.obsActions.editor.sceneLabel'));
            if (!action.sourceName) errors.push(t('settings.obsActions.editor.sourceLabel'));
            break;
        case 'toggle_filter':
            if (!action.sourceName) errors.push(t('settings.obsActions.editor.sourceLabel'));
            if (!action.filterName) errors.push(t('settings.obsActions.editor.filterLabel'));
            break;
        case 'trigger_hotkey':
            if (!action.hotkeyName) errors.push(t('settings.obsActions.editor.hotkeyLabel'));
            break;
        case 'record_control':
        case 'stream_control':
        case 'virtualcam_control':
            if (!action.mode) errors.push(t('settings.obsActions.editor.modeLabel'));
            break;
        case 'media_control':
            if (!action.sourceName) errors.push(t('settings.obsActions.editor.sourceLabel'));
            if (!action.mediaAction) errors.push(t('settings.obsActions.editor.mediaActionLabel'));
            break;
        default:
            errors.push('?');
    }
    return errors;
}

// ─── Component ──────────────────────────────────────────────────

export default function ObsActionEditorPopup({ action: initialAction, onSave, onClose }) {
    const { t } = useTranslation();
    const obsStatus = useObsStatus();
    const isConnected = obsStatus.status === 'connected';

    const [action, setAction] = useState(() =>
        initialAction ?? buildDefaultAction('switch_scene')
    );
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);

    // Live OBS data
    const [scenes, setScenes] = useState([]);
    const [inputs, setInputs] = useState([]);
    const [hotkeys, setHotkeys] = useState([]);
    const [sceneItemsBySource, setSceneItemsBySource] = useState([]);
    const [filtersForSource, setFiltersForSource] = useState([]);

    const portalId = useId();

    // Load top-level lists when OBS becomes connected
    useEffect(() => {
        if (!isConnected) return;
        let cancelled = false;
        (async () => {
            const [sc, ins, hk] = await Promise.all([
                listObsScenes(),
                listObsInputs(),
                listObsHotkeys(),
            ]);
            if (cancelled) return;
            setScenes(sc ?? []);
            setInputs(ins ?? []);
            setHotkeys(hk ?? []);
        })();
        return () => { cancelled = true; };
    }, [isConnected]);

    // Load scene items when scene changes (for toggle_scene_item)
    useEffect(() => {
        if (!isConnected) return;
        if (action.operation !== 'toggle_scene_item' || !action.sceneName) {
            setSceneItemsBySource([]);
            return;
        }
        let cancelled = false;
        listObsSceneItems(action.sceneName).then(items => {
            if (!cancelled) setSceneItemsBySource(items ?? []);
        });
        return () => { cancelled = true; };
    }, [isConnected, action.operation, action.sceneName]);

    // Load filters when source changes (for toggle_filter)
    useEffect(() => {
        if (!isConnected) return;
        if (action.operation !== 'toggle_filter' || !action.sourceName) {
            setFiltersForSource([]);
            return;
        }
        let cancelled = false;
        listObsSourceFilters(action.sourceName).then(f => {
            if (!cancelled) setFiltersForSource(f ?? []);
        });
        return () => { cancelled = true; };
    }, [isConnected, action.operation, action.sourceName]);

    const updateField = useCallback((patch) => {
        setAction(prev => ({ ...prev, ...patch }));
    }, []);

    const changeOperation = useCallback((newOp) => {
        setAction(prev => buildDefaultAction(newOp, prev.name));
    }, []);

    const errors = validationErrors(action, t);
    const isValid = errors.length === 0;

    const handleSave = async () => {
        if (!isValid) return;
        setSaving(true);
        try {
            const ok = await saveObsAction(action);
            if (ok) onSave?.(action);
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async () => {
        if (!isValid || !isConnected) return;
        setTesting(true);
        try {
            await testObsAction(action);
        } finally {
            setTesting(false);
        }
    };

    const handleRefresh = async () => {
        await refreshObsCache();
        // Re-trigger the load effects by flipping connected path
        if (isConnected) {
            const [sc, ins, hk] = await Promise.all([
                listObsScenes(true),
                listObsInputs(true),
                listObsHotkeys(true),
            ]);
            setScenes(sc ?? []);
            setInputs(ins ?? []);
            setHotkeys(hk ?? []);
        }
    };

    return (
        <Portal
            id={`obs-action-editor-${portalId}`}
            onClose={onClose}
            overlayBackground="rgba(0, 0, 0, 0.8)"
            padding="20px"
        >
            <PopupContainer>
                <PopupHeader>
                    <h3>
                        <FiSliders />
                        {initialAction
                            ? t('settings.obsActions.editor.save') + ' — ' + (initialAction.name || '')
                            : t('settings.obsActions.addAction')}
                    </h3>
                    <HeaderActions>
                        <HeaderButton
                            $test
                            onClick={handleTest}
                            disabled={!isValid || !isConnected || testing}
                            title={!isConnected ? t('settings.obsActions.connection.status.disconnected') : ''}
                        >
                            <FiPlay />
                            {t('settings.obsActions.actions.test')}
                        </HeaderButton>
                        <HeaderButton onClick={onClose}>
                            <FiX />
                            {t('settings.obsActions.editor.cancel')}
                        </HeaderButton>
                        <HeaderButton $primary onClick={handleSave} disabled={!isValid || saving}>
                            <FiSave />
                            {t('settings.obsActions.editor.save')}
                        </HeaderButton>
                    </HeaderActions>
                </PopupHeader>

                {errors.length > 0 && (
                    <ValidationNote>
                        {t('common.fillRequired', 'Заполните обязательные поля')}: {errors.join(', ')}
                    </ValidationNote>
                )}

                <PopupContent>
                    <Section>
                        <SectionTitle><FiSliders />{t('settings.obsActions.editor.nameLabel')}</SectionTitle>
                        <FormGroup>
                            <Input
                                type="text"
                                value={action.name}
                                placeholder={t('settings.obsActions.editor.namePlaceholder')}
                                onChange={e => updateField({ name: e.target.value })}
                            />
                        </FormGroup>
                        <FormGroup>
                            <Label>{t('settings.obsActions.editor.operationLabel')}</Label>
                            <Select
                                value={action.operation}
                                onChange={e => changeOperation(e.target.value)}
                            >
                                {OPERATIONS.map(op => (
                                    <option key={op} value={op}>
                                        {t(`settings.obsActions.operations.${op}`)}
                                    </option>
                                ))}
                            </Select>
                        </FormGroup>
                    </Section>

                    <Section>
                        <SectionTitle><FiSliders />{t('settings.obsActions.editor.operationLabel')}</SectionTitle>
                        {renderSubform({
                            action,
                            updateField,
                            isConnected,
                            scenes,
                            inputs,
                            hotkeys,
                            sceneItemsBySource,
                            filtersForSource,
                            t,
                            onRefresh: handleRefresh,
                        })}
                    </Section>
                </PopupContent>
            </PopupContainer>
        </Portal>
    );
}

// ─── Dynamic subform renderer ───────────────────────────────────

function renderSubform(ctx) {
    const { action, updateField, isConnected, scenes, inputs, hotkeys,
            sceneItemsBySource, filtersForSource, t } = ctx;

    const manualHint = <Hint>{t('settings.obsActions.editor.fallbackManualInput')}</Hint>;

    const SceneField = (
        <FormGroup>
            <Label>{t('settings.obsActions.editor.sceneLabel')}</Label>
            {isConnected && scenes.length > 0 ? (
                <Select
                    value={action.sceneName || ''}
                    onChange={e => updateField({ sceneName: e.target.value })}
                >
                    <option value="">—</option>
                    {scenes.map(s => (
                        <option key={s.sceneName} value={s.sceneName}>{s.sceneName}</option>
                    ))}
                </Select>
            ) : (
                <>
                    <Input
                        type="text"
                        value={action.sceneName || ''}
                        onChange={e => updateField({ sceneName: e.target.value })}
                    />
                    {!isConnected && manualHint}
                </>
            )}
        </FormGroup>
    );

    const SourceField = (options = { fromInputs: false, mediaOnly: false }) => (
        <FormGroup>
            <Label>{t('settings.obsActions.editor.sourceLabel')}</Label>
            {(() => {
                let list = [];
                if (options.fromInputs) {
                    let filtered = inputs;
                    if (options.mediaOnly) {
                        filtered = inputs.filter(i => MEDIA_INPUT_KINDS.has(i.inputKind));
                    }
                    list = filtered.map(i => i.inputName);
                } else {
                    list = sceneItemsBySource.map(si => si.sourceName);
                }

                if (isConnected && list.length > 0) {
                    return (
                        <Select
                            value={action.sourceName || ''}
                            onChange={e => updateField({ sourceName: e.target.value })}
                        >
                            <option value="">—</option>
                            {list.map(name => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </Select>
                    );
                }
                return (
                    <>
                        <Input
                            type="text"
                            value={action.sourceName || ''}
                            onChange={e => updateField({ sourceName: e.target.value })}
                        />
                        {!isConnected && manualHint}
                    </>
                );
            })()}
        </FormGroup>
    );

    const ModeRadio = (modes) => (
        <FormGroup>
            <Label>{t('settings.obsActions.editor.modeLabel')}</Label>
            <RadioRow>
                {modes.map(m => (
                    <RadioButton
                        key={m}
                        $active={action.mode === m}
                        onClick={() => updateField({ mode: m })}
                        type="button"
                    >
                        {MODE_ICONS[m]}
                        {t(`settings.obsActions.modes.${m}`)}
                    </RadioButton>
                ))}
            </RadioRow>
        </FormGroup>
    );

    switch (action.operation) {
        case 'switch_scene':
            return SceneField;

        case 'toggle_scene_item':
            return (
                <>
                    {SceneField}
                    {SourceField()}
                    {ModeRadio(TOGGLE_MODES)}
                </>
            );

        case 'toggle_filter':
            return (
                <>
                    {SourceField({ fromInputs: true })}
                    <FormGroup>
                        <Label>{t('settings.obsActions.editor.filterLabel')}</Label>
                        {isConnected && filtersForSource.length > 0 ? (
                            <Select
                                value={action.filterName || ''}
                                onChange={e => updateField({ filterName: e.target.value })}
                            >
                                <option value="">—</option>
                                {filtersForSource.map(f => (
                                    <option key={f.filterName} value={f.filterName}>{f.filterName}</option>
                                ))}
                            </Select>
                        ) : (
                            <>
                                <Input
                                    type="text"
                                    value={action.filterName || ''}
                                    onChange={e => updateField({ filterName: e.target.value })}
                                />
                                {!isConnected && manualHint}
                            </>
                        )}
                    </FormGroup>
                    {ModeRadio(TOGGLE_MODES)}
                </>
            );

        case 'trigger_hotkey':
            return (
                <FormGroup>
                    <Label>{t('settings.obsActions.editor.hotkeyLabel')}</Label>
                    {isConnected && hotkeys.length > 0 ? (
                        <Select
                            value={action.hotkeyName || ''}
                            onChange={e => updateField({ hotkeyName: e.target.value })}
                        >
                            <option value="">—</option>
                            {hotkeys.map(hk => (
                                <option key={hk} value={hk}>{hk}</option>
                            ))}
                        </Select>
                    ) : (
                        <>
                            <Input
                                type="text"
                                value={action.hotkeyName || ''}
                                onChange={e => updateField({ hotkeyName: e.target.value })}
                            />
                            {!isConnected && manualHint}
                        </>
                    )}
                </FormGroup>
            );

        case 'record_control':
        case 'stream_control':
        case 'virtualcam_control':
            return ModeRadio(START_STOP_MODES);

        case 'media_control':
            return (
                <>
                    {SourceField({ fromInputs: true, mediaOnly: true })}
                    <FormGroup>
                        <Label>{t('settings.obsActions.editor.mediaActionLabel')}</Label>
                        <RadioRow>
                            {MEDIA_ACTIONS.map(a => (
                                <RadioButton
                                    key={a}
                                    $active={action.mediaAction === a}
                                    onClick={() => updateField({ mediaAction: a })}
                                    type="button"
                                >
                                    {MODE_ICONS[a]}
                                    {t(`settings.obsActions.modes.${a}`)}
                                </RadioButton>
                            ))}
                        </RadioRow>
                    </FormGroup>
                </>
            );

        default:
            return null;
    }
}
