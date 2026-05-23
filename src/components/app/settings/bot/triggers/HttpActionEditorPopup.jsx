import React, { useCallback, useEffect, useId, useMemo, useState } from "react";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { FiX, FiSave, FiPlay, FiPlus, FiTrash2, FiGlobe, FiLock, FiUnlock } from "react-icons/fi";
import { v4 as uuidv4 } from "uuid";
import { Portal } from "../../../../../context/PortalContext";
import { saveHttpAction, testHttpAction, setHttpSecret, hasHttpSecret } from "../../../../../services/api";

const PopupContainer = styled.div`
    background: linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%);
    border: 1px solid #444;
    border-radius: 16px;
    max-width: 720px;
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
    gap: 16px;
    padding: 16px 24px;
    border-bottom: 1px solid #333;
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(34, 197, 94, 0.05) 100%);
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
        svg { color: #22c55e; }
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
    border: 1px solid ${p => p.$primary ? '#22c55e' : p.$test ? '#3b82f6' : '#444'};
    border-radius: 8px;
    background: ${p => p.$primary ? '#22c55e' : p.$test ? 'rgba(59, 130, 246, 0.12)' : 'rgba(107, 114, 128, 0.1)'};
    color: ${p => p.$primary ? '#fff' : p.$test ? '#3b82f6' : '#888'};
    cursor: pointer;
    font-size: 0.85rem;
    transition: all 0.2s ease;

    &:hover:not(:disabled) {
        background: ${p => p.$primary ? '#16a34a' : p.$test ? 'rgba(59, 130, 246, 0.22)' : 'rgba(107, 114, 128, 0.2)'};
        border-color: ${p => p.$primary ? '#16a34a' : p.$test ? '#3b82f6' : '#555'};
        color: ${p => p.$primary ? '#fff' : p.$test ? '#60a5fa' : '#ccc'};
    }
    &:disabled { opacity: 0.45; cursor: not-allowed; }
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
    svg { color: #22c55e; }
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
    width: 100%;
    box-sizing: border-box;
    &:focus { border-color: #22c55e; }
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
    &:focus { border-color: #22c55e; }
`;

const Textarea = styled.textarea`
    background: #0f0f0f;
    border: 1px solid #333;
    border-radius: 8px;
    padding: 10px 12px;
    color: #eee;
    font-size: 0.85rem;
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    outline: none;
    resize: vertical;
    min-height: 110px;
    transition: border-color 0.15s;
    width: 100%;
    box-sizing: border-box;
    &:focus { border-color: #22c55e; }
`;

const Row = styled.div`
    display: grid;
    grid-template-columns: ${p => p.$cols || '120px 1fr'};
    gap: 8px;
    align-items: start;
`;

const HeaderRow = styled.div`
    display: grid;
    grid-template-columns: minmax(160px, 1fr) minmax(180px, 1.4fr) auto auto;
    gap: 8px;
    align-items: start;
`;

const SecretToggle = styled.button`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 9px 10px;
    border: 1px solid ${p => p.$active ? '#eab308' : '#333'};
    border-radius: 8px;
    background: ${p => p.$active ? 'rgba(234, 179, 8, 0.12)' : 'rgba(255, 255, 255, 0.02)'};
    color: ${p => p.$active ? '#eab308' : '#888'};
    cursor: pointer;
    font-size: 0.78rem;
    transition: all 0.15s;
    white-space: nowrap;
    &:hover { border-color: ${p => p.$active ? '#facc15' : '#555'}; color: ${p => p.$active ? '#facc15' : '#bbb'}; }
`;

const IconBtn = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    border: 1px solid #333;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.02);
    color: #888;
    cursor: pointer;
    transition: all 0.15s;
    &:hover { border-color: #dc2626; color: #dc2626; background: rgba(220, 38, 38, 0.08); }
`;

const AddBtn = styled.button`
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border: 1px dashed #444;
    border-radius: 8px;
    background: transparent;
    color: #aaa;
    cursor: pointer;
    font-size: 0.85rem;
    transition: all 0.15s;
    &:hover { border-color: #22c55e; color: #22c55e; background: rgba(34, 197, 94, 0.06); }
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

const TestResult = styled.div`
    margin: 0 24px 4px;
    padding: 9px 12px;
    background: ${p => p.$ok ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)'};
    border: 1px solid ${p => p.$ok ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'};
    border-radius: 8px;
    font-size: 0.78rem;
    color: ${p => p.$ok ? '#22c55e' : '#ef4444'};
`;

const RadioRow = styled.div`
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
`;

const RadioBtn = styled.button`
    padding: 8px 12px;
    border: 1px solid ${p => p.$active ? '#22c55e' : '#333'};
    background: ${p => p.$active ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.02)'};
    color: ${p => p.$active ? '#fff' : '#aaa'};
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.82rem;
    transition: all 0.15s;
    &:hover { border-color: #22c55e; color: #fff; }
`;

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
const BODY_TYPES = ['none', 'json', 'raw', 'form'];

function buildDefaultAction() {
    return {
        id: uuidv4(),
        name: '',
        method: 'POST',
        url: '',
        headers: [],
        body: { type: 'json', content: '' },
        timeoutMs: 8000,
    };
}

function blankHeader() {
    return {
        id: uuidv4(),
        name: '',
        value: { type: 'plain', value: '' },
    };
}

// ─── Component ──────────────────────────────────────────────────

export default function HttpActionEditorPopup({ action: initialAction, onSave, onClose }) {
    const { t } = useTranslation();
    const portalId = useId();

    const [action, setAction] = useState(() => initialAction ?? buildDefaultAction());

    // Per-header local state: drafts of new secret values and whether
    // a previously-stored secret exists. Keyed by the header's id.
    const [secretDrafts, setSecretDrafts] = useState({});       // headerId -> string
    const [storedSecrets, setStoredSecrets] = useState({});     // headerId -> boolean

    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);

    // On open: for every secret header in the loaded action, probe keytar
    // so the editor can show "saved" vs "empty" indicators.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const results = {};
            for (const header of action.headers || []) {
                if (header.value?.type === 'secret' && header.value.keytarKey) {
                    const has = await hasHttpSecret(header.value.keytarKey);
                    results[header.id] = Boolean(has);
                }
            }
            if (!cancelled) setStoredSecrets(results);
        })();
        return () => { cancelled = true; };
        // Intentionally only run on mount — header lifecycle is handled
        // inline below when the user adds/removes/toggles.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const updateField = useCallback((patch) => {
        setAction(prev => ({ ...prev, ...patch }));
    }, []);

    const updateBody = useCallback((patch) => {
        setAction(prev => ({ ...prev, body: { ...(prev.body || {}), ...patch } }));
    }, []);

    const updateHeader = useCallback((headerId, patch) => {
        setAction(prev => ({
            ...prev,
            headers: (prev.headers || []).map(h => h.id === headerId ? { ...h, ...patch } : h),
        }));
    }, []);

    const addHeader = () => {
        setAction(prev => ({
            ...prev,
            headers: [...(prev.headers || []), blankHeader()],
        }));
    };

    const removeHeader = (headerId) => {
        setAction(prev => ({
            ...prev,
            headers: (prev.headers || []).filter(h => h.id !== headerId),
        }));
        setSecretDrafts(prev => {
            const { [headerId]: _, ...rest } = prev;
            return rest;
        });
        setStoredSecrets(prev => {
            const { [headerId]: _, ...rest } = prev;
            return rest;
        });
    };

    const toggleHeaderSecret = (headerId, makeSecret) => {
        if (makeSecret) {
            const keytarKey = uuidv4();
            updateHeader(headerId, { value: { type: 'secret', keytarKey } });
        } else {
            updateHeader(headerId, { value: { type: 'plain', value: '' } });
            setSecretDrafts(prev => {
                const { [headerId]: _, ...rest } = prev;
                return rest;
            });
            setStoredSecrets(prev => ({ ...prev, [headerId]: false }));
        }
    };

    // Flush pending secret drafts to keytar. Called before save and
    // before test so the executed request actually picks them up.
    const flushSecretDrafts = useCallback(async () => {
        const writes = [];
        for (const header of action.headers || []) {
            if (header.value?.type !== 'secret') continue;
            const draft = secretDrafts[header.id];
            if (draft === undefined) continue;
            writes.push(
                setHttpSecret(header.value.keytarKey, draft).then(() => {
                    if (draft) {
                        setStoredSecrets(prev => ({ ...prev, [header.id]: true }));
                    }
                })
            );
        }
        await Promise.all(writes);
        setSecretDrafts({});
    }, [action.headers, secretDrafts]);

    const errors = useMemo(() => {
        const errs = [];
        if (!action.name?.trim()) errs.push(t('settings.httpActions.editor.nameLabel'));
        if (!action.url?.trim()) errs.push(t('settings.httpActions.editor.urlLabel'));
        return errs;
    }, [action.name, action.url, t]);
    const isValid = errors.length === 0;

    const handleSave = async () => {
        if (!isValid) return;
        setSaving(true);
        try {
            await flushSecretDrafts();
            // Strip transient UI fields just in case any leak in.
            const cleanHeaders = (action.headers || []).map(h => ({
                id: h.id,
                name: h.name,
                value: h.value,
            }));
            const cleanAction = { ...action, headers: cleanHeaders };
            const ok = await saveHttpAction(cleanAction);
            if (ok) onSave?.(cleanAction);
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async () => {
        if (!isValid) return;
        setTesting(true);
        setTestResult(null);
        try {
            await flushSecretDrafts();
            const cleanHeaders = (action.headers || []).map(h => ({
                id: h.id,
                name: h.name,
                value: h.value,
            }));
            const result = await testHttpAction({ ...action, headers: cleanHeaders });
            setTestResult(result);
        } catch (err) {
            setTestResult({ ok: false, error: err?.message || String(err), durationMs: 0 });
        } finally {
            setTesting(false);
        }
    };

    const bodyType = action.body?.type || 'none';
    const showBody = action.method !== 'GET' && bodyType !== 'none';

    return (
        <Portal
            id={`http-action-editor-${portalId}`}
            onClose={onClose}
            overlayBackground="rgba(0, 0, 0, 0.8)"
            padding="20px"
        >
            <PopupContainer>
                <PopupHeader>
                    <h3>
                        <FiGlobe />
                        {initialAction
                            ? `${t('settings.httpActions.editor.save')} — ${initialAction.name || ''}`
                            : t('settings.httpActions.addAction')}
                    </h3>
                    <HeaderActions>
                        <HeaderButton $test onClick={handleTest} disabled={!isValid || testing}>
                            <FiPlay />
                            {testing ? t('settings.httpActions.editor.testRunning') : t('settings.httpActions.editor.test')}
                        </HeaderButton>
                        <HeaderButton onClick={onClose}>
                            <FiX />
                            {t('settings.httpActions.editor.cancel')}
                        </HeaderButton>
                        <HeaderButton $primary onClick={handleSave} disabled={!isValid || saving}>
                            <FiSave />
                            {t('settings.httpActions.editor.save')}
                        </HeaderButton>
                    </HeaderActions>
                </PopupHeader>

                {errors.length > 0 && (
                    <ValidationNote>
                        {t('common.fillRequired', 'Заполните обязательные поля')}: {errors.join(', ')}
                    </ValidationNote>
                )}

                {testResult && (
                    <TestResult $ok={testResult.ok}>
                        {testResult.ok
                            ? t('settings.httpActions.editor.testSuccess', { status: testResult.status, ms: testResult.durationMs })
                            : t('settings.httpActions.editor.testFailure', { error: testResult.error || '?' })}
                    </TestResult>
                )}

                <PopupContent>
                    <Section>
                        <SectionTitle><FiGlobe />{t('settings.httpActions.editor.nameLabel')}</SectionTitle>
                        <FormGroup>
                            <Input
                                type="text"
                                value={action.name}
                                placeholder={t('settings.httpActions.editor.namePlaceholder')}
                                onChange={e => updateField({ name: e.target.value })}
                            />
                        </FormGroup>
                        <Row $cols="120px 1fr">
                            <FormGroup>
                                <Label>{t('settings.httpActions.editor.methodLabel')}</Label>
                                <Select
                                    value={action.method}
                                    onChange={e => updateField({ method: e.target.value })}
                                >
                                    {METHODS.map(m => (
                                        <option key={m} value={m}>
                                            {t(`settings.httpActions.methods.${m}`)}
                                        </option>
                                    ))}
                                </Select>
                            </FormGroup>
                            <FormGroup>
                                <Label>{t('settings.httpActions.editor.urlLabel')}</Label>
                                <Input
                                    type="text"
                                    value={action.url}
                                    placeholder={t('settings.httpActions.editor.urlPlaceholder')}
                                    onChange={e => updateField({ url: e.target.value })}
                                />
                                <Hint>{t('settings.httpActions.editor.urlHint')}</Hint>
                            </FormGroup>
                        </Row>
                    </Section>

                    <Section>
                        <SectionTitle><FiLock />{t('settings.httpActions.editor.headersLabel')}</SectionTitle>
                        {(action.headers || []).map((header) => {
                            const isSecret = header.value?.type === 'secret';
                            const hasStored = isSecret && storedSecrets[header.id];
                            const draft = secretDrafts[header.id] ?? '';
                            return (
                                <HeaderRow key={header.id}>
                                    <Input
                                        type="text"
                                        value={header.name}
                                        placeholder={t('settings.httpActions.editor.headerNamePlaceholder')}
                                        onChange={e => updateHeader(header.id, { name: e.target.value })}
                                    />
                                    {isSecret ? (
                                        <Input
                                            type="password"
                                            value={draft}
                                            placeholder={hasStored
                                                ? t('settings.httpActions.editor.headerSecretPlaceholder')
                                                : t('settings.httpActions.editor.headerValuePlaceholder')}
                                            onChange={e => setSecretDrafts(prev => ({ ...prev, [header.id]: e.target.value }))}
                                        />
                                    ) : (
                                        <Input
                                            type="text"
                                            value={header.value?.value || ''}
                                            placeholder={t('settings.httpActions.editor.headerValuePlaceholder')}
                                            onChange={e => updateHeader(header.id, { value: { type: 'plain', value: e.target.value } })}
                                        />
                                    )}
                                    <SecretToggle
                                        $active={isSecret}
                                        onClick={() => toggleHeaderSecret(header.id, !isSecret)}
                                        title={t('settings.httpActions.editor.secretHint')}
                                    >
                                        {isSecret ? <FiLock size={12} /> : <FiUnlock size={12} />}
                                        {t('settings.httpActions.editor.secretToggle')}
                                    </SecretToggle>
                                    <IconBtn onClick={() => removeHeader(header.id)}>
                                        <FiTrash2 size={14} />
                                    </IconBtn>
                                </HeaderRow>
                            );
                        })}
                        <AddBtn onClick={addHeader}>
                            <FiPlus />
                            {t('settings.httpActions.editor.addHeader')}
                        </AddBtn>
                        <Hint>{t('settings.httpActions.editor.secretHint')}</Hint>
                    </Section>

                    <Section>
                        <SectionTitle><FiGlobe />{t('settings.httpActions.editor.bodyLabel')}</SectionTitle>
                        <RadioRow>
                            {BODY_TYPES.map(bt => (
                                <RadioBtn
                                    key={bt}
                                    $active={bodyType === bt}
                                    onClick={() => updateBody({ type: bt })}
                                    disabled={action.method === 'GET' && bt !== 'none'}
                                    style={action.method === 'GET' && bt !== 'none' ? { opacity: 0.4, cursor: 'not-allowed' } : null}
                                >
                                    {t(`settings.httpActions.bodyTypes.${bt}`)}
                                </RadioBtn>
                            ))}
                        </RadioRow>
                        {showBody && (
                            <Textarea
                                value={action.body?.content || ''}
                                placeholder={t('settings.httpActions.editor.bodyContentPlaceholder')}
                                onChange={e => updateBody({ content: e.target.value })}
                            />
                        )}
                    </Section>

                    <Section>
                        <SectionTitle>{t('settings.httpActions.editor.timeoutLabel')}</SectionTitle>
                        <Row $cols="160px 1fr">
                            <Input
                                type="number"
                                min={500}
                                max={120000}
                                value={action.timeoutMs ?? 8000}
                                onChange={e => updateField({ timeoutMs: parseInt(e.target.value, 10) || 8000 })}
                            />
                            <div />
                        </Row>
                    </Section>
                </PopupContent>
            </PopupContainer>
        </Portal>
    );
}
