import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled, { ThemeProvider } from 'styled-components';
import merge from 'lodash/merge';
import SeekbarComponent from '../../utils/SeekbarComponent';
import ColorSelectorButton from './ColorSelectorButton';
import FontAndSizeEditor from '../../utils/FontAndSizeEditor';
import RadioGroup from '../../utils/TextRadioGroup';
import GradientEditor from '../../utils/GradientEditor';
import Switch from '../../utils/Switch';
import { ImageUploadField, darkTheme as imageUploadTheme } from '../../utils/BackgroundImageEditorComponent';
import { defaultDonationGoal } from '../../../theme';
import {
    FiImage, FiType, FiBarChart2, FiTarget,
    FiSettings, FiCopy
} from 'react-icons/fi';
import {
    ControlGroup, Section, SectionHeader, SectionTitle,
    TabSection, TabHeader, TabTitle, TabContent,
    ActionButton
} from './SharedSettingsStyles';

import { Row } from '../SettingsComponent';
import NumericEditorComponent from '../../utils/NumericEditorComponent';
import XYPad from '../../utils/XYPad';
import { getDaWidgetUrl, setDaWidgetUrl, getDaStatus } from '../../../services/api';

// ─── Styled ──────────────────────────────────────────────────────

const Wrapper = styled.div`
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 12px;
    box-sizing: border-box;
`;

const TabBar = styled.div`
    display: flex;
    gap: 4px;
    align-self: flex-start;
`;

const TabButton = styled.button`
    padding: 8px 20px;
    background: ${({ $active }) => $active ? 'rgba(100, 108, 255, 0.2)' : 'rgba(40, 40, 40, 0.5)'};
    border: 1px solid ${({ $active }) => $active ? '#646cff' : '#333'};
    border-radius: 8px;
    color: ${({ $active }) => $active ? '#fff' : '#888'};
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 8px;
    &:hover {
        color: #ccc;
        background: rgba(100, 108, 255, 0.12);
        border-color: #555;
    }
    svg { width: 16px; height: 16px; }
`;

const InputField = styled.input`
    width: calc(100% - 24px);
    padding: 10px 12px;
    background: #2a2a2a;
    border: 1px solid #444;
    border-radius: 6px;
    color: #fff;
    font-size: 14px;
    font-family: inherit;
    transition: all 0.2s ease;
    &:focus { outline: none; border-color: #646cff; background: #333; }
    &::placeholder { color: #666; }
`;

const Label = styled.label`
    font-size: 0.9rem;
    font-weight: 500;
    color: #e0e0e0;
    margin-bottom: 8px;
    display: block;
`;

const SwitchRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const SmallLabel = styled.span`
    font-size: 0.85rem;
    color: #999;
`;



const OffsetGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-top: 12px;
`;

const InsetGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
`;

const StatusRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
`;

const StatusLED = styled.div`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${({ $on }) => $on ? '#44ff44' : '#ff4444'};
    box-shadow: 0 0 4px ${({ $on }) => $on ? '#44ff44' : '#ff4444'},
        inset 0 1px 2px rgba(255,255,255,0.3);
    border: 1px solid ${({ $on }) => $on ? '#33cc33' : '#cc3333'};
    transition: all 0.3s ease;
`;

const StatusText = styled.span`
    font-size: 0.8rem;
    color: #999;
`;

// ─── Component ───────────────────────────────────────────────────

export default function DonationGoalSettingsComponent({ current, onChange, openColorPopup }) {
    const [activeTab, setActiveTab] = useState('background');
    const [widgetUrl, setWidgetUrl] = useState('');
    const [urlStatus, setUrlStatus] = useState(''); // '' | 'saving' | 'ok' | 'error'
    const [daStatus, setDaStatus] = useState({ connected: false, goalTitle: '', widgetUrl: '' });

    useEffect(() => {
        getDaWidgetUrl?.().then(url => setWidgetUrl(url || ''));
        getDaStatus?.().then(s => s && setDaStatus(s));
        const interval = setInterval(() => {
            getDaStatus?.().then(s => s && setDaStatus(s));
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const isValidDaUrl = (url) => {
        if (!url) return true; // пустая строка = отключить
        return /^https?:\/\/www\.donationalerts\.com\/widget\/goal\/\d+\?token=.+/.test(url);
    };

    const urlValid = isValidDaUrl(widgetUrl.trim());

    const handleSaveUrl = async () => {
        const url = widgetUrl.trim();
        if (!isValidDaUrl(url)) {
            setUrlStatus('error');
            setTimeout(() => setUrlStatus(''), 3000);
            return;
        }
        setUrlStatus('saving');
        try {
            const result = await setDaWidgetUrl(url);
            setUrlStatus(result?.success ? 'ok' : 'error');
            if (result?.success) {
                setTimeout(() => getDaStatus?.().then(s => s && setDaStatus(s)), 3000);
            }
        } catch {
            setUrlStatus('error');
        }
        setTimeout(() => setUrlStatus(''), 3000);
    };

    // Merge with defaults
    const cfg = useMemo(
        () => merge({}, defaultDonationGoal, current.donationGoal),
        [current.donationGoal]
    );

    // ─── Updaters ────────────────────────────────────────────────
    const updateGoal = useCallback(
        (updater) =>
            onChange((prev) => {
                const prevGoal = prev.donationGoal ?? {};
                const merged = merge({}, defaultDonationGoal, prevGoal);
                const next = typeof updater === 'function' ? updater(merged) : { ...merged, ...updater };
                return { ...prev, donationGoal: next };
            }),
        [onChange]
    );

    const updateNested = useCallback(
        (path, val) => updateGoal(prev => {
            const keys = path.split('.');
            const result = { ...prev };
            let obj = result;
            for (let i = 0; i < keys.length - 1; i++) {
                obj[keys[i]] = { ...obj[keys[i]] };
                obj = obj[keys[i]];
            }
            obj[keys[keys.length - 1]] = val;
            return result;
        }),
        [updateGoal]
    );

    // ─── Options ─────────────────────────────────────────────────
    const bgTypeOptions = useMemo(() => [
        { key: 'color', text: 'Цвет' },
        { key: 'gradient', text: 'Градиент' },
        { key: 'image', text: 'Изображение' },
    ], []);

    const imageModeOptions = useMemo(() => [
        { key: 'stretch', text: 'Растянуть' },
        { key: 'three-part', text: 'Три части' },
    ], []);

    const barImageModeOptions = useMemo(() => [
        { key: 'stretch', text: 'Растянуть' },
        { key: 'repeat', text: 'Повторять' },
    ], []);

    const alignOptions = useMemo(() => [
        { key: 'left', text: 'Лево' },
        { key: 'center', text: 'Центр' },
        { key: 'right', text: 'Право' },
    ], []);

    const labelFormatOptions = useMemo(() => [
        { key: 'currency', text: 'Валюта' },
        { key: 'percentage', text: 'Проценты' },
    ], []);

    const labelPlacementOptions = useMemo(() => [
        { key: 'on-bar', text: 'На баре' },
        { key: 'below', text: 'Снизу' },
        { key: 'hidden', text: 'Скрыть' },
    ], []);

    const capTypeOptions = useMemo(() => [
        { key: 'shape', text: 'Форма' },
        { key: 'image', text: 'Изображение' },
    ], []);

    const capShapeOptions = useMemo(() => [
        { key: 'circle', text: 'Круг' },
        { key: 'diamond', text: 'Ромб' },
        { key: 'custom', text: 'SVG' },
    ], []);

    const celebrationTypeOptions = useMemo(() => [
        { key: 'pulse', text: 'Пульс' },
        { key: 'glow', text: 'Свечение' },
        { key: 'shake', text: 'Тряска' },
    ], []);

    // Shorthand refs
    const bg = cfg.background;
    const title = cfg.title;
    const bar = cfg.bar;
    const fill = bar.fill;
    const cap = bar.cap;
    const label = cfg.progressLabel;
    const anim = cfg.animation;

    const handleCopyLink = () => {
        navigator.clipboard.writeText('http://localhost:5173/donation-goal-overlay').catch(console.error);
    };

    // ═══════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════
    return (
        <ThemeProvider theme={imageUploadTheme}>
            <Wrapper>
                <Section>
                    <SectionHeader>
                        <SectionTitle><FiTarget /> DonationAlerts</SectionTitle>
                    </SectionHeader>
                    <Row gap="8px">
                        <InputField
                            style={{
                                flex: 1,
                                borderColor: widgetUrl.trim() && !urlValid ? '#e53935' : undefined,
                            }}
                            value={widgetUrl}
                            onChange={e => setWidgetUrl(e.target.value)}
                            placeholder="https://www.donationalerts.com/widget/goal/...?token=..."
                        />
                        <ActionButton
                            onClick={handleSaveUrl}
                            disabled={!urlValid || urlStatus === 'saving'}
                            style={{ whiteSpace: 'nowrap', opacity: !urlValid ? 0.5 : 1 }}
                        >
                            {urlStatus === 'saving' ? '...' : urlStatus === 'ok' ? 'OK' : urlStatus === 'error' ? 'Ошибка' : 'Подключить'}
                        </ActionButton>
                    </Row>
                    {widgetUrl.trim() && !urlValid && (
                        <SmallLabel style={{ color: '#e53935' }}>
                            Формат: https://www.donationalerts.com/widget/goal/ID?token=TOKEN
                        </SmallLabel>
                    )}
                    {daStatus.widgetUrl && (
                        <StatusRow>
                            <StatusLED $on={daStatus.connected} />
                            <StatusText>
                                {daStatus.connected
                                    ? `Подключено${daStatus.goalTitle ? `: ${daStatus.goalTitle}` : ''}`
                                    : 'Отключено'}
                            </StatusText>
                        </StatusRow>
                    )}
                </Section>

                <Row gap="20px">
                    <ActionButton onClick={handleCopyLink}>
                        <FiCopy /> Копировать ссылку
                    </ActionButton>
                    <ControlGroup>
                        <NumericEditorComponent
                            title="Ширина"
                            value={cfg.container.width} min={200} max={1200} width="140px"
                            onChange={val => updateNested('container.width', val)}
                        />
                    </ControlGroup>
                    <ControlGroup>
                        <NumericEditorComponent
                            title="Высота"
                            value={cfg.container.height} min={60} max={400} width="140px"
                            onChange={val => updateNested('container.height', val)}
                        />
                    </ControlGroup>
                </Row>

                <TabBar>
                    <TabButton $active={activeTab === 'background'} onClick={() => setActiveTab('background')}>
                        <FiImage /> Фон
                    </TabButton>
                    <TabButton $active={activeTab === 'content'} onClick={() => setActiveTab('content')}>
                        <FiType /> Контент
                    </TabButton>
                </TabBar>

                {activeTab === 'background' && renderBackgroundTab()}
                {activeTab === 'content' && renderContentTab()}
            </Wrapper>
        </ThemeProvider>
    );

    // ═══════════════════════════════════════════════════════════════
    // TAB 1: BACKGROUND
    // ═══════════════════════════════════════════════════════════════
    function renderBackgroundTab() {
        return (
            <>
                {/* ── Decor ── */}
                <Section>
                    <SectionHeader>
                        <SectionTitle><FiImage /> Декор (шапка / подвал)</SectionTitle>
                    </SectionHeader>

                    <OffsetGrid>
                        <ControlGroup>
                            <Label>Шапка</Label>
                            <ImageUploadField
                                value={bg.headerDecor.image}
                                onChange={url => updateNested('background.headerDecor.image', url)}
                                onClear={() => updateNested('background.headerDecor.image', null)}
                            />
                            {bg.headerDecor.image && (
                                <XYPad
                                    x={bg.headerDecor.translate.x}
                                    y={bg.headerDecor.translate.y}
                                    onChange={({ x, y }) => updateNested('background.headerDecor.translate', { x, y })}
                                    min={-100} max={100}
                                />
                            )}
                        </ControlGroup>
                        <ControlGroup>
                            <Label>Подвал</Label>
                            <ImageUploadField
                                value={bg.footerDecor.image}
                                onChange={url => updateNested('background.footerDecor.image', url)}
                                onClear={() => updateNested('background.footerDecor.image', null)}
                            />
                            {bg.footerDecor.image && (
                                <XYPad
                                    x={bg.footerDecor.translate.x}
                                    y={bg.footerDecor.translate.y}
                                    onChange={({ x, y }) => updateNested('background.footerDecor.translate', { x, y })}
                                    min={-100} max={100}
                                />
                            )}
                        </ControlGroup>
                    </OffsetGrid>
                </Section>

                {/* ── Background Type ── */}
                <Section>
                    <SectionHeader>
                        <SectionTitle><FiImage /> Тип фона</SectionTitle>
                    </SectionHeader>
                    <RadioGroup
                        items={bgTypeOptions}
                        defaultSelected={bg.type}
                        onChange={val => updateNested('background.type', val)}
                    />
                </Section>

                {/* ── Color ── */}
                {bg.type === 'color' && (
                    <TabSection>
                        <TabHeader><TabTitle>Цвет фона</TabTitle></TabHeader>
                        <TabContent>
                            <Row gap="20px">
                                <ControlGroup>
                                    <ColorSelectorButton
                                        openColorPopup={openColorPopup}
                                        title="Цвет"
                                        hex={bg.color.color}
                                        alpha={bg.color.opacity}
                                        onColorChange={({ color, alpha }) => {
                                            updateNested('background.color.color', color);
                                            updateNested('background.color.opacity', alpha);
                                        }}
                                    />
                                </ControlGroup>
                            </Row>
                        </TabContent>
                    </TabSection>
                )}

                {/* ── Gradient ── */}
                {bg.type === 'gradient' && (
                    <TabSection>
                        <TabHeader><TabTitle>Градиент</TabTitle></TabHeader>
                        <TabContent>
                            <GradientEditor
                                gradient={bg.gradient.gradients[0] || null}
                                onChange={grad => updateNested('background.gradient.gradients', [grad])}
                            />
                        </TabContent>
                    </TabSection>
                )}

                {/* ── Image ── */}
                {bg.type === 'image' && (
                    <TabSection>
                        <TabHeader><TabTitle>Изображение</TabTitle></TabHeader>
                        <TabContent>
                            <RadioGroup
                                items={imageModeOptions}
                                defaultSelected={bg.image.mode}
                                onChange={val => updateNested('background.image.mode', val)}
                            />
                            {bg.image.mode === 'stretch' && (
                                <ControlGroup>
                                    <ImageUploadField
                                        value={bg.image.src}
                                        onChange={url => updateNested('background.image.src', url)}
                                        onClear={() => updateNested('background.image.src', null)}
                                    />
                                </ControlGroup>
                            )}
                            {bg.image.mode === 'three-part' && (
                                <OffsetGrid>
                                    <ControlGroup>
                                        <Label>Верх</Label>
                                        <ImageUploadField
                                            value={bg.image.top}
                                            onChange={url => updateNested('background.image.top', url)}
                                            onClear={() => updateNested('background.image.top', null)}
                                        />
                                    </ControlGroup>
                                    <ControlGroup>
                                        <Label>Середина</Label>
                                        <ImageUploadField
                                            value={bg.image.middle}
                                            onChange={url => updateNested('background.image.middle', url)}
                                            onClear={() => updateNested('background.image.middle', null)}
                                        />
                                    </ControlGroup>
                                    <ControlGroup>
                                        <Label>Низ</Label>
                                        <ImageUploadField
                                            value={bg.image.bottom}
                                            onChange={url => updateNested('background.image.bottom', url)}
                                            onClear={() => updateNested('background.image.bottom', null)}
                                        />
                                    </ControlGroup>
                                </OffsetGrid>
                            )}
                            <ControlGroup>
                                <ColorSelectorButton
                                    openColorPopup={openColorPopup}
                                    title="Фоновый цвет"
                                    hex={bg.image.backgroundColor}
                                    alpha={1}
                                    onColorChange={({ color }) => updateNested('background.image.backgroundColor', color)}
                                />
                            </ControlGroup>
                        </TabContent>
                    </TabSection>
                )}

                {/* ── Border & Shadow ── */}
                <Section>
                    <SectionHeader>
                        <SectionTitle>Обводка и тень</SectionTitle>
                    </SectionHeader>
                    <Row gap="20px">
                        <ControlGroup>
                            <ColorSelectorButton
                                openColorPopup={openColorPopup}
                                title="Обводка"
                                hex={bg.borderColor}
                                alpha={bg.borderOpacity}
                                onColorChange={({ color, alpha }) => {
                                    updateNested('background.borderColor', color);
                                    updateNested('background.borderOpacity', alpha);
                                }}
                            />
                        </ControlGroup>
                        <ControlGroup>
                            <SeekbarComponent
                                title={`Ширина обводки: ${bg.borderWidth}px`}
                                min={0} max={10} value={bg.borderWidth} step={1} width="200px"
                                onChange={val => updateNested('background.borderWidth', val)}
                            />
                        </ControlGroup>
                    </Row>
                    <Row gap="20px">
                        <ControlGroup>
                            <SeekbarComponent
                                title={`Скругление: ${bg.borderRadius}px`}
                                min={0} max={50} value={bg.borderRadius} step={1} width="200px"
                                onChange={val => updateNested('background.borderRadius', val)}
                            />
                        </ControlGroup>
                    </Row>
                    <Row gap="20px">
                        <ControlGroup>
                            <ColorSelectorButton
                                openColorPopup={openColorPopup}
                                title="Тень"
                                hex={bg.shadowColor}
                                alpha={bg.shadowOpacity}
                                onColorChange={({ color, alpha }) => {
                                    updateNested('background.shadowColor', color);
                                    updateNested('background.shadowOpacity', alpha);
                                }}
                            />
                        </ControlGroup>
                        <ControlGroup>
                            <SeekbarComponent
                                title={`Радиус тени: ${bg.shadowRadius}px`}
                                min={0} max={30} value={bg.shadowRadius} step={1} width="200px"
                                onChange={val => updateNested('background.shadowRadius', val)}
                            />
                        </ControlGroup>
                    </Row>
                </Section>

                {/* ── Container ── */}
                <Section>
                    <SectionHeader>
                        <SectionTitle>Отступы и смещение</SectionTitle>
                    </SectionHeader>
                    <Label>Отступы (padding)</Label>
                    <InsetGrid>
                        {['top', 'right', 'bottom', 'left'].map(side => (
                            <ControlGroup key={side}>
                                <SeekbarComponent
                                    title={`${side}: ${cfg.container.padding[side]}px`}
                                    min={0} max={60} value={cfg.container.padding[side]} step={1} width="100%"
                                    onChange={val => updateNested(`container.padding.${side}`, val)}
                                />
                            </ControlGroup>
                        ))}
                    </InsetGrid>
                    <Label>Смещение (offset)</Label>
                    <XYPad
                        x={cfg.container.offset.x}
                        y={cfg.container.offset.y}
                        onChange={({ x, y }) => updateNested('container.offset', { x, y })}
                        min={-200} max={200}
                    />
                </Section>
            </>
        );
    }

    // ═══════════════════════════════════════════════════════════════
    // TAB 2: CONTENT
    // ═══════════════════════════════════════════════════════════════
    function renderContentTab() {
        return (
            <>
                {/* ── Title ── */}
                <Section>
                    <SectionHeader>
                        <SectionTitle><FiType /> Заголовок</SectionTitle>
                    </SectionHeader>
                    <ControlGroup>
                        <Label>Текст заголовка</Label>
                        <InputField
                            value={title.text}
                            onChange={e => updateNested('title.text', e.target.value)}
                            placeholder="{goalName}"
                        />
                        <SmallLabel>Подстановки: {'{goalName}'}, {'{current}'}, {'{target}'}, {'{currency}'}</SmallLabel>
                    </ControlGroup>
                    <Row gap="20px">
                        <ControlGroup>
                            <FontAndSizeEditor
                                title="Шрифт"
                                fontSize={title.font.size}
                                fontFamily={title.font.family}
                                onFontChange={({ family, url }) => {
                                    updateNested('title.font.family', family);
                                    updateNested('title.font.url', url);
                                }}
                                onFontSizeChange={val => updateNested('title.font.size', val)}
                            />
                        </ControlGroup>
                        <ControlGroup>
                            <ColorSelectorButton
                                openColorPopup={openColorPopup}
                                title="Цвет текста"
                                hex={title.color}
                                alpha={title.opacity}
                                onColorChange={({ color, alpha }) => {
                                    updateNested('title.color', color);
                                    updateNested('title.opacity', alpha);
                                }}
                            />
                        </ControlGroup>
                    </Row>
                    <ControlGroup>
                        <Label>Выравнивание</Label>
                        <RadioGroup
                            items={alignOptions}
                            defaultSelected={title.align}
                            onChange={val => updateNested('title.align', val)}
                        />
                    </ControlGroup>
                    <Row gap="20px">
                        <ControlGroup>
                            <ColorSelectorButton
                                openColorPopup={openColorPopup}
                                title="Тень текста"
                                hex={title.shadowColor}
                                alpha={title.shadowOpacity}
                                onColorChange={({ color, alpha }) => {
                                    updateNested('title.shadowColor', color);
                                    updateNested('title.shadowOpacity', alpha);
                                }}
                            />
                        </ControlGroup>
                        <ControlGroup>
                            <SeekbarComponent
                                title={`Радиус тени: ${title.shadowRadius}px`}
                                min={0} max={20} value={title.shadowRadius} step={1} width="200px"
                                onChange={val => updateNested('title.shadowRadius', val)}
                            />
                        </ControlGroup>
                    </Row>
                    <Row gap="20px">
                        <ControlGroup>
                            <SeekbarComponent
                                title={`Отступ сверху: ${title.margin.top}px`}
                                min={0} max={40} value={title.margin.top} step={1} width="200px"
                                onChange={val => updateNested('title.margin.top', val)}
                            />
                        </ControlGroup>
                        <ControlGroup>
                            <SeekbarComponent
                                title={`Отступ снизу: ${title.margin.bottom}px`}
                                min={0} max={40} value={title.margin.bottom} step={1} width="200px"
                                onChange={val => updateNested('title.margin.bottom', val)}
                            />
                        </ControlGroup>
                    </Row>
                </Section>

                {/* ── Progress Bar Container ── */}
                <Section>
                    <SectionHeader>
                        <SectionTitle><FiBarChart2 /> Прогресс-бар (контейнер)</SectionTitle>
                    </SectionHeader>
                    <Row gap="20px">
                        <ControlGroup>
                            <SeekbarComponent
                                title={`Высота: ${bar.height}px`}
                                min={16} max={80} value={bar.height} step={1} width="200px"
                                onChange={val => updateNested('bar.height', val)}
                            />
                        </ControlGroup>
                        <ControlGroup>
                            <SeekbarComponent
                                title={`Скругление: ${bar.borderRadius}px`}
                                min={0} max={40} value={bar.borderRadius} step={1} width="200px"
                                onChange={val => updateNested('bar.borderRadius', val)}
                            />
                        </ControlGroup>
                    </Row>
                    <Row gap="20px">
                        <ControlGroup>
                            <ColorSelectorButton
                                openColorPopup={openColorPopup}
                                title="Обводка бара"
                                hex={bar.borderColor}
                                alpha={bar.borderOpacity}
                                onColorChange={({ color, alpha }) => {
                                    updateNested('bar.borderColor', color);
                                    updateNested('bar.borderOpacity', alpha);
                                }}
                            />
                        </ControlGroup>
                        <ControlGroup>
                            <SeekbarComponent
                                title={`Ширина обводки: ${bar.borderWidth}px`}
                                min={0} max={10} value={bar.borderWidth} step={1} width="200px"
                                onChange={val => updateNested('bar.borderWidth', val)}
                            />
                        </ControlGroup>
                    </Row>
                    <ControlGroup>
                        <Label>Фон бара</Label>
                        <RadioGroup
                            items={bgTypeOptions}
                            defaultSelected={bar.background.type}
                            onChange={val => updateNested('bar.background.type', val)}
                        />
                    </ControlGroup>
                    {bar.background.type === 'color' && (
                        <ControlGroup>
                            <ColorSelectorButton
                                openColorPopup={openColorPopup}
                                title="Цвет фона бара"
                                hex={bar.background.color}
                                alpha={bar.background.opacity}
                                onColorChange={({ color, alpha }) => {
                                    updateNested('bar.background.color', color);
                                    updateNested('bar.background.opacity', alpha);
                                }}
                            />
                        </ControlGroup>
                    )}
                    {bar.background.type === 'gradient' && (
                        <ControlGroup>
                            <GradientEditor
                                gradient={bar.background.gradient.gradients[0] || null}
                                onChange={grad => updateNested('bar.background.gradient.gradients', [grad])}
                            />
                        </ControlGroup>
                    )}
                    {bar.background.type === 'image' && (
                        <>
                            <ControlGroup>
                                <ImageUploadField
                                    value={bar.background.image.src}
                                    onChange={url => updateNested('bar.background.image.src', url)}
                                    onClear={() => updateNested('bar.background.image.src', null)}
                                />
                            </ControlGroup>
                            <RadioGroup
                                items={barImageModeOptions}
                                defaultSelected={bar.background.image.mode}
                                onChange={val => updateNested('bar.background.image.mode', val)}
                            />
                        </>
                    )}
                </Section>

                {/* ── Fill ── */}
                <Section>
                    <SectionHeader>
                        <SectionTitle><FiBarChart2 /> Заполнение (Fill)</SectionTitle>
                    </SectionHeader>
                    <Label>Отступ от краёв бара (padding)</Label>
                    <InsetGrid>
                        {['top', 'right', 'bottom', 'left'].map(side => (
                            <ControlGroup key={side}>
                                <SeekbarComponent
                                    title={`${side}: ${fill.padding[side]}px`}
                                    min={0} max={20} value={fill.padding[side]} step={1} width="100%"
                                    onChange={val => updateNested(`bar.fill.padding.${side}`, val)}
                                />
                            </ControlGroup>
                        ))}
                    </InsetGrid>
                    <ControlGroup>
                        <SeekbarComponent
                            title={`Скругление fill: ${fill.borderRadius}px`}
                            min={0} max={40} value={fill.borderRadius} step={1} width="200px"
                            onChange={val => updateNested('bar.fill.borderRadius', val)}
                        />
                    </ControlGroup>
                    <ControlGroup>
                        <Label>Фон заполнения</Label>
                        <RadioGroup
                            items={bgTypeOptions}
                            defaultSelected={fill.background.type}
                            onChange={val => updateNested('bar.fill.background.type', val)}
                        />
                    </ControlGroup>
                    {fill.background.type === 'color' && (
                        <ControlGroup>
                            <ColorSelectorButton
                                openColorPopup={openColorPopup}
                                title="Цвет заполнения"
                                hex={fill.background.color}
                                alpha={fill.background.opacity}
                                onColorChange={({ color, alpha }) => {
                                    updateNested('bar.fill.background.color', color);
                                    updateNested('bar.fill.background.opacity', alpha);
                                }}
                            />
                        </ControlGroup>
                    )}
                    {fill.background.type === 'gradient' && (
                        <ControlGroup>
                            <GradientEditor
                                gradient={fill.background.gradient.gradients[0] || null}
                                onChange={grad => updateNested('bar.fill.background.gradient.gradients', [grad])}
                            />
                        </ControlGroup>
                    )}
                    {fill.background.type === 'image' && (
                        <>
                            <ControlGroup>
                                <ImageUploadField
                                    value={fill.background.image.src}
                                    onChange={url => updateNested('bar.fill.background.image.src', url)}
                                    onClear={() => updateNested('bar.fill.background.image.src', null)}
                                />
                            </ControlGroup>
                            <RadioGroup
                                items={barImageModeOptions}
                                defaultSelected={fill.background.image.mode}
                                onChange={val => updateNested('bar.fill.background.image.mode', val)}
                            />
                        </>
                    )}
                </Section>

                {/* ── Cap ── */}
                <Section>
                    <SectionHeader>
                        <SectionTitle><FiTarget /> Точка перехода (Cap)</SectionTitle>
                    </SectionHeader>
                    <SwitchRow>
                        <Switch
                            checked={cap.enabled}
                            onChange={e => updateNested('bar.cap.enabled', e.target.checked)}
                        />
                        <SmallLabel>{cap.enabled ? 'Включено' : 'Выключено'}</SmallLabel>
                    </SwitchRow>
                    {cap.enabled && (
                        <>
                            <ControlGroup>
                                <RadioGroup
                                    items={capTypeOptions}
                                    defaultSelected={cap.type}
                                    onChange={val => updateNested('bar.cap.type', val)}
                                />
                            </ControlGroup>
                            {cap.type === 'image' && (
                                <>
                                    <ControlGroup>
                                        <ImageUploadField
                                            value={cap.image.src}
                                            onChange={url => updateNested('bar.cap.image.src', url)}
                                            onClear={() => updateNested('bar.cap.image.src', null)}
                                        />
                                    </ControlGroup>
                                    <Row gap="20px">
                                        <ControlGroup>
                                            <NumericEditorComponent
                                                title="Ширина" value={cap.image.width}
                                                min={8} max={100} width="120px"
                                                onChange={val => updateNested('bar.cap.image.width', val)}
                                            />
                                        </ControlGroup>
                                        <ControlGroup>
                                            <NumericEditorComponent
                                                title="Высота" value={cap.image.height}
                                                min={8} max={100} width="120px"
                                                onChange={val => updateNested('bar.cap.image.height', val)}
                                            />
                                        </ControlGroup>
                                    </Row>
                                    <Row gap="20px">
                                        <ControlGroup>
                                            <SeekbarComponent
                                                title={`Смещение X: ${cap.image.offset.x}px`}
                                                min={-50} max={50} value={cap.image.offset.x} step={1} width="200px"
                                                onChange={val => updateNested('bar.cap.image.offset.x', val)}
                                            />
                                        </ControlGroup>
                                        <ControlGroup>
                                            <SeekbarComponent
                                                title={`Смещение Y: ${cap.image.offset.y}px`}
                                                min={-50} max={50} value={cap.image.offset.y} step={1} width="200px"
                                                onChange={val => updateNested('bar.cap.image.offset.y', val)}
                                            />
                                        </ControlGroup>
                                    </Row>
                                </>
                            )}
                            {cap.type === 'shape' && (
                                <>
                                    <ControlGroup>
                                        <RadioGroup
                                            items={capShapeOptions}
                                            defaultSelected={cap.shape.form}
                                            onChange={val => updateNested('bar.cap.shape.form', val)}
                                        />
                                    </ControlGroup>
                                    <ControlGroup>
                                        <SeekbarComponent
                                            title={`Размер: ${cap.shape.size}px`}
                                            min={8} max={60} value={cap.shape.size} step={1} width="200px"
                                            onChange={val => updateNested('bar.cap.shape.size', val)}
                                        />
                                    </ControlGroup>
                                    <Row gap="20px">
                                        <ControlGroup>
                                            <ColorSelectorButton
                                                openColorPopup={openColorPopup}
                                                title="Цвет формы"
                                                hex={cap.shape.background.color}
                                                alpha={1}
                                                onColorChange={({ color }) => updateNested('bar.cap.shape.background.color', color)}
                                            />
                                        </ControlGroup>
                                        <ControlGroup>
                                            <ColorSelectorButton
                                                openColorPopup={openColorPopup}
                                                title="Обводка"
                                                hex={cap.shape.borderColor}
                                                alpha={1}
                                                onColorChange={({ color }) => updateNested('bar.cap.shape.borderColor', color)}
                                            />
                                        </ControlGroup>
                                    </Row>
                                    <ControlGroup>
                                        <SeekbarComponent
                                            title={`Обводка: ${cap.shape.borderWidth}px`}
                                            min={0} max={5} value={cap.shape.borderWidth} step={1} width="200px"
                                            onChange={val => updateNested('bar.cap.shape.borderWidth', val)}
                                        />
                                    </ControlGroup>
                                    <Row gap="20px">
                                        <ControlGroup>
                                            <ColorSelectorButton
                                                openColorPopup={openColorPopup}
                                                title="Свечение"
                                                hex={cap.shape.glow.color}
                                                alpha={cap.shape.glow.opacity}
                                                onColorChange={({ color, alpha }) => {
                                                    updateNested('bar.cap.shape.glow.color', color);
                                                    updateNested('bar.cap.shape.glow.opacity', alpha);
                                                }}
                                            />
                                        </ControlGroup>
                                        <ControlGroup>
                                            <SeekbarComponent
                                                title={`Радиус свечения: ${cap.shape.glow.radius}px`}
                                                min={0} max={30} value={cap.shape.glow.radius} step={1} width="200px"
                                                onChange={val => updateNested('bar.cap.shape.glow.radius', val)}
                                            />
                                        </ControlGroup>
                                    </Row>
                                    {cap.shape.form === 'custom' && (
                                        <ControlGroup>
                                            <Label>SVG (вставьте SVG-код)</Label>
                                            <InputField
                                                value={cap.shape.customSvg || ''}
                                                onChange={e => updateNested('bar.cap.shape.customSvg', e.target.value)}
                                                placeholder='<svg>...</svg>'
                                            />
                                        </ControlGroup>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </Section>

                {/* ── Progress Label ── */}
                <Section>
                    <SectionHeader>
                        <SectionTitle><FiType /> Текст прогресса</SectionTitle>
                    </SectionHeader>
                    <Row gap="20px">
                        <ControlGroup>
                            <Label>Формат</Label>
                            <RadioGroup
                                items={labelFormatOptions}
                                defaultSelected={label.format}
                                onChange={val => updateNested('progressLabel.format', val)}
                            />
                        </ControlGroup>
                        <ControlGroup>
                            <Label>Размещение</Label>
                            <RadioGroup
                                items={labelPlacementOptions}
                                defaultSelected={label.placement}
                                onChange={val => updateNested('progressLabel.placement', val)}
                            />
                        </ControlGroup>
                    </Row>
                    {label.placement !== 'hidden' && (
                        <>
                            <Row gap="20px">
                                <ControlGroup>
                                    <FontAndSizeEditor
                                        title="Шрифт"
                                        fontSize={label.font.size}
                                        fontFamily={label.font.family}
                                        onFontChange={({ family, url }) => {
                                            updateNested('progressLabel.font.family', family);
                                            updateNested('progressLabel.font.url', url);
                                        }}
                                        onFontSizeChange={val => updateNested('progressLabel.font.size', val)}
                                    />
                                </ControlGroup>
                                <ControlGroup>
                                    <ColorSelectorButton
                                        openColorPopup={openColorPopup}
                                        title="Цвет"
                                        hex={label.color}
                                        alpha={label.opacity}
                                        onColorChange={({ color, alpha }) => {
                                            updateNested('progressLabel.color', color);
                                            updateNested('progressLabel.opacity', alpha);
                                        }}
                                    />
                                </ControlGroup>
                            </Row>
                            {label.placement === 'below' && (
                                <ControlGroup>
                                    <Label>Выравнивание</Label>
                                    <RadioGroup
                                        items={alignOptions}
                                        defaultSelected={label.align}
                                        onChange={val => updateNested('progressLabel.align', val)}
                                    />
                                </ControlGroup>
                            )}
                            <Row gap="20px">
                                <ControlGroup>
                                    <ColorSelectorButton
                                        openColorPopup={openColorPopup}
                                        title="Тень текста"
                                        hex={label.shadowColor}
                                        alpha={label.shadowOpacity}
                                        onColorChange={({ color, alpha }) => {
                                            updateNested('progressLabel.shadowColor', color);
                                            updateNested('progressLabel.shadowOpacity', alpha);
                                        }}
                                    />
                                </ControlGroup>
                                <ControlGroup>
                                    <SeekbarComponent
                                        title={`Радиус тени: ${label.shadowRadius}px`}
                                        min={0} max={20} value={label.shadowRadius} step={1} width="200px"
                                        onChange={val => updateNested('progressLabel.shadowRadius', val)}
                                    />
                                </ControlGroup>
                            </Row>
                        </>
                    )}
                </Section>

                {/* ── Animations ── */}
                <Section>
                    <SectionHeader>
                        <SectionTitle><FiSettings /> Анимации</SectionTitle>
                    </SectionHeader>
                    <SwitchRow>
                        <Switch
                            checked={anim.fillTransition.enabled}
                            onChange={e => updateNested('animation.fillTransition.enabled', e.target.checked)}
                        />
                        <SmallLabel>Плавное заполнение</SmallLabel>
                    </SwitchRow>
                    {anim.fillTransition.enabled && (
                        <Row gap="20px">
                            <ControlGroup>
                                <SeekbarComponent
                                    title={`Длительность: ${anim.fillTransition.duration}ms`}
                                    min={200} max={3000} value={anim.fillTransition.duration} step={100} width="200px"
                                    onChange={val => updateNested('animation.fillTransition.duration', val)}
                                />
                            </ControlGroup>
                        </Row>
                    )}
                    <SwitchRow>
                        <Switch
                            checked={anim.celebration.enabled}
                            onChange={e => updateNested('animation.celebration.enabled', e.target.checked)}
                        />
                        <SmallLabel>Celebration при 100%</SmallLabel>
                    </SwitchRow>
                    {anim.celebration.enabled && (
                        <>
                            <ControlGroup>
                                <RadioGroup
                                    items={celebrationTypeOptions}
                                    defaultSelected={anim.celebration.type}
                                    onChange={val => updateNested('animation.celebration.type', val)}
                                />
                            </ControlGroup>
                            <ControlGroup>
                                <SeekbarComponent
                                    title={`Длительность: ${anim.celebration.duration}ms`}
                                    min={1000} max={10000} value={anim.celebration.duration} step={500} width="200px"
                                    onChange={val => updateNested('animation.celebration.duration', val)}
                                />
                            </ControlGroup>
                        </>
                    )}
                </Section>
            </>
        );
    }
}
