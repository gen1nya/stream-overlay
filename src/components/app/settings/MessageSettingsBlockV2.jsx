import React, {useCallback, useMemo, useState} from 'react';
import styled, {ThemeProvider} from 'styled-components';
import merge from 'lodash/merge';
import SeekbarComponent from '../../utils/SeekbarComponent';
import ColorSelectorButton from './ColorSelectorButton';
import FontAndSizeEditor from '../../utils/FontAndSizeEditor';
import RadioGroup from '../../utils/TextRadioGroup';
import GradientEditor from '../../utils/GradientEditor';
import XYPad from '../../utils/XYPad';
import Switch from '../../utils/Switch';
import {ImageUploadField, darkTheme as imageUploadTheme} from '../../utils/BackgroundImageEditorComponent';
import {defaultV2Message} from '../../../theme';
import {
    FiImage, FiType, FiLayout,
    FiAlignCenter, FiSquare, FiGrid
} from 'react-icons/fi';
import {
    ControlGroup,
    Section, SectionHeader, SectionTitle,
    TabSection, TabHeader, TabTitle, TabContent
} from './SharedSettingsStyles';
import {Spacer} from '../../utils/Separator';
import {Row} from '../SettingsComponent';
import {useTranslation} from 'react-i18next';

// ─── Styled helpers ──────────────────────────────────────────────
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
    background: ${({$active}) => $active ? 'rgba(100, 108, 255, 0.2)' : 'rgba(40, 40, 40, 0.5)'};
    border: 1px solid ${({$active}) => $active ? '#646cff' : '#333'};
    border-radius: 8px;
    color: ${({$active}) => $active ? '#fff' : '#888'};
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

    svg {
        width: 16px;
        height: 16px;
    }
`;

const InsetGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
`;

const OffsetGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-top: 12px;
`;

const OffsetCard = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: rgba(40, 40, 40, 0.3);
    border: 1px solid #333;
    border-radius: 8px;
    padding: 16px;
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

const SubTitle = styled.div`
    font-size: 0.9rem;
    font-weight: 500;
    color: #bbb;
`;

// ─── Component ──────────────────────────────────────────────────
export default function MessageSettingsBlockV2({current, onChange, openColorPopup}) {
    const {t} = useTranslation();
    const [activeTab, setActiveTab] = useState('background');

    // Merge saved config with defaults
    const cfg = useMemo(
        () => merge({}, defaultV2Message, current.v2?.message),
        [current.v2?.message]
    );

    // ─── Updaters ────────────────────────────────────────────────
    const updateV2 = useCallback(
        (updater) =>
            onChange((prev) => {
                const prevMsg = prev.v2?.message ?? {};
                const merged = merge({}, defaultV2Message, prevMsg);
                const next = typeof updater === 'function' ? updater(merged) : {...merged, ...updater};
                return {...prev, v2: {...prev.v2, message: next}};
            }),
        [onChange]
    );

    const updateBg = useCallback(
        (key, val) => updateV2(prev => ({
            ...prev,
            background: {...prev.background, [key]: val}
        })),
        [updateV2]
    );

    const updateBgNested = useCallback(
        (section, key, val) => updateV2(prev => ({
            ...prev,
            background: {
                ...prev.background,
                [section]: {...prev.background[section], [key]: val}
            }
        })),
        [updateV2]
    );

    const updateHeader = useCallback(
        (key, val) => updateV2(prev => ({
            ...prev,
            content: {
                ...prev.content,
                header: {...prev.content.header, [key]: val}
            }
        })),
        [updateV2]
    );

    const updateHeaderNested = useCallback(
        (section, key, val) => updateV2(prev => ({
            ...prev,
            content: {
                ...prev.content,
                header: {
                    ...prev.content.header,
                    [section]: {...prev.content.header[section], [key]: val}
                }
            }
        })),
        [updateV2]
    );

    const updateText = useCallback(
        (key, val) => updateV2(prev => ({
            ...prev,
            content: {
                ...prev.content,
                text: {...prev.content.text, [key]: val}
            }
        })),
        [updateV2]
    );

    const updateLayerInset = useCallback(
        (layer, key, val) => updateV2(prev => ({
            ...prev,
            background: {
                ...prev.background,
                layerInset: {
                    ...prev.background.layerInset,
                    [layer]: {...prev.background.layerInset[layer], [key]: val}
                }
            }
        })),
        [updateV2]
    );

    const updateDecor = useCallback(
        (which, key, val) => updateV2(prev => ({
            ...prev,
            background: {
                ...prev.background,
                [which]: {...prev.background[which], [key]: val}
            }
        })),
        [updateV2]
    );

    // ─── Options ─────────────────────────────────────────────────
    const bgTypeOptions = useMemo(() => [
        {key: 'color', text: t('settings.chatMessages.background.options.color', 'Цвет')},
        {key: 'gradient', text: t('settings.chatMessages.background.options.gradient', 'Градиент')},
        {key: 'image', text: t('settings.chatMessages.background.options.image', 'Изображение')},
    ], [t]);

    const layoutOptions = useMemo(() => [
        {key: 'top', text: 'Сверху'},
        {key: 'left', text: 'Слева'},
    ], []);

    const positionOptions = useMemo(() => [
        {key: 'inside', text: 'Внутри'},
        {key: 'outside', text: 'Снаружи'},
    ], []);

    const alignOptions = useMemo(() => [
        {key: 'left', text: 'Лево'},
        {key: 'center', text: 'Центр'},
        {key: 'right', text: 'Право'},
    ], []);

    const emotePlacementOptions = useMemo(() => [
        {key: 'left', text: 'Слева'},
        {key: 'right', text: 'Справа'},
    ], []);

    // ─── Shorthand refs ──────────────────────────────────────────
    const bg = cfg.background;
    const bgColor = bg.color;
    const bgGrad = bg.gradient;
    const bgImage = bg.image;
    const header = cfg.content.header;
    const text = cfg.content.text;

    // ═════════════════════════════════════════════════════════════
    // RENDER
    // ═════════════════════════════════════════════════════════════
    return (
        <Wrapper>
            <TabBar>
                <TabButton $active={activeTab === 'background'} onClick={() => setActiveTab('background')}>
                    <FiImage/> Фон
                </TabButton>
                <TabButton $active={activeTab === 'content'} onClick={() => setActiveTab('content')}>
                    <FiType/> Контент
                </TabButton>
            </TabBar>

            {activeTab === 'background' && renderBackgroundTab()}
            {activeTab === 'content' && renderContentTab()}
        </Wrapper>
    );

    // ═════════════════════════════════════════════════════════════
    // TAB 1: BACKGROUND
    // ═════════════════════════════════════════════════════════════
    function renderBackgroundTab() {
        return (
            <>
                {/* ── Decor (header/footer images) ── */}
                <Section>
                    <SectionHeader>
                        <SectionTitle><FiImage/> Декор (шапка / подвал)</SectionTitle>
                    </SectionHeader>

                    <OffsetGrid>
                        <OffsetCard>
                            <ThemeProvider theme={imageUploadTheme}>
                                <ImageUploadField
                                    label="Изображение шапки"
                                    value={bg.headerDecor.image}
                                    onChange={(url) => updateDecor('headerDecor', 'image', url)}
                                    onClear={() => updateDecor('headerDecor', 'image', null)}
                                />
                            </ThemeProvider>
                            <XYPad
                                title="Смещение шапки"
                                valueX={bg.headerDecor.translate.x}
                                valueY={bg.headerDecor.translate.y}
                                min={-100}
                                max={100}
                                size={100}
                                onChange={({x, y}) => updateDecor('headerDecor', 'translate', {x, y})}
                            />
                        </OffsetCard>

                        <OffsetCard>
                            <ThemeProvider theme={imageUploadTheme}>
                                <ImageUploadField
                                    label="Изображение подвала"
                                    value={bg.footerDecor.image}
                                    onChange={(url) => updateDecor('footerDecor', 'image', url)}
                                    onClear={() => updateDecor('footerDecor', 'image', null)}
                                />
                            </ThemeProvider>
                            <XYPad
                                title="Смещение подвала"
                                valueX={bg.footerDecor.translate.x}
                                valueY={bg.footerDecor.translate.y}
                                min={-100}
                                max={100}
                                size={100}
                                onChange={({x, y}) => updateDecor('footerDecor', 'translate', {x, y})}
                            />
                        </OffsetCard>
                    </OffsetGrid>
                </Section>

                {/* ── Background type ── */}
                <Section>
                    <SectionHeader>
                        <SectionTitle><FiSquare/> Тип фона</SectionTitle>
                    </SectionHeader>

                    <ControlGroup>
                        <RadioGroup
                            title="Тип фона"
                            defaultSelected={bg.type}
                            items={bgTypeOptions}
                            direction="horizontal"
                            itemWidth="120px"
                            onChange={(v) => updateBg('type', v)}
                        />
                    </ControlGroup>

                    {bg.type === 'color' && renderBgColor()}
                    {bg.type === 'gradient' && renderBgGradient()}
                    {bg.type === 'image' && renderBgImage()}
                </Section>

                {/* ── Margins & Padding ── */}
                <Section>
                    <SectionHeader>
                        <SectionTitle><FiLayout/> Отступы</SectionTitle>
                    </SectionHeader>

                    {renderMarginPadding()}
                </Section>

                {/* ── Layer insets ── */}
                <Section>
                    <SectionHeader>
                        <SectionTitle><FiGrid/> Inset слоёв</SectionTitle>
                    </SectionHeader>

                    {renderLayerInsets()}
                </Section>
            </>
        );
    }

    // ── BG: Color ────────────────────────────────────────────────
    function renderBgColor() {
        return (
            <TabSection>
                <TabHeader><TabTitle>Цвет фона</TabTitle></TabHeader>
                <TabContent>
                    <Row gap="16px">
                        <ControlGroup>
                            <ColorSelectorButton
                                title="Цвет фона"
                                hex={bgColor.color}
                                alpha={bgColor.opacity}
                                openColorPopup={openColorPopup}
                                onColorChange={({color, alpha}) => {
                                    updateBgNested('color', 'color', color);
                                    updateBgNested('color', 'opacity', alpha);
                                }}
                            />
                        </ControlGroup>
                        <ControlGroup>
                            <ColorSelectorButton
                                title="Цвет обводки"
                                hex={bgColor.borderColor}
                                alpha={bgColor.borderOpacity}
                                openColorPopup={openColorPopup}
                                onColorChange={({color, alpha}) => {
                                    updateBgNested('color', 'borderColor', color);
                                    updateBgNested('color', 'borderOpacity', alpha);
                                }}
                            />
                        </ControlGroup>
                        <ControlGroup>
                            <ColorSelectorButton
                                title="Цвет тени"
                                hex={bgColor.shadowColor}
                                alpha={bgColor.shadowOpacity}
                                openColorPopup={openColorPopup}
                                onColorChange={({color, alpha}) => {
                                    updateBgNested('color', 'shadowColor', color);
                                    updateBgNested('color', 'shadowOpacity', alpha);
                                }}
                            />
                        </ControlGroup>
                    </Row>
                    <Row gap="16px">
                        <ControlGroup flex="1">
                            <SeekbarComponent
                                title="Ширина обводки"
                                min={0} max={10} step={1}
                                value={bgColor.borderWidth}
                                onChange={(v) => updateBgNested('color', 'borderWidth', v)}
                            />
                        </ControlGroup>
                        <ControlGroup flex="1">
                            <SeekbarComponent
                                title="Скругление"
                                min={0} max={50} step={1}
                                value={bgColor.borderRadius}
                                onChange={(v) => updateBgNested('color', 'borderRadius', v)}
                            />
                        </ControlGroup>
                        <ControlGroup flex="1">
                            <SeekbarComponent
                                title="Радиус тени"
                                min={0} max={30} step={1}
                                value={bgColor.shadowRadius}
                                onChange={(v) => updateBgNested('color', 'shadowRadius', v)}
                            />
                        </ControlGroup>
                    </Row>
                    <Row gap="16px">
                        <ControlGroup>
                            <XYPad
                                title="Смещение тени"
                                valueX={bgColor.shadowOffsetX ?? 0}
                                valueY={bgColor.shadowOffsetY ?? 0}
                                min={-30}
                                max={30}
                                size={100}
                                onChange={({x, y}) => {
                                    updateBgNested('color', 'shadowOffsetX', x);
                                    updateBgNested('color', 'shadowOffsetY', y);
                                }}
                            />
                        </ControlGroup>
                    </Row>
                </TabContent>
            </TabSection>
        );
    }

    // ── BG: Gradient ─────────────────────────────────────────────
    function renderBgGradient() {
        return (
            <TabSection>
                <TabHeader><TabTitle>Градиент</TabTitle></TabHeader>
                <TabContent>
                    <GradientEditor
                        value={bg.gradient.gradients?.[0] || {}}
                        onChange={(g) => {
                            updateV2(prev => ({
                                ...prev,
                                background: {
                                    ...prev.background,
                                    gradient: {
                                        ...prev.background.gradient,
                                        gradients: [g]
                                    }
                                }
                            }));
                        }}
                    />
                    <Row gap="16px">
                        <ControlGroup>
                            <ColorSelectorButton
                                title="Цвет обводки"
                                hex={bgGrad.borderColor}
                                alpha={bgGrad.borderOpacity}
                                openColorPopup={openColorPopup}
                                onColorChange={({color, alpha}) => {
                                    updateBgNested('gradient', 'borderColor', color);
                                    updateBgNested('gradient', 'borderOpacity', alpha);
                                }}
                            />
                        </ControlGroup>
                        <ControlGroup>
                            <ColorSelectorButton
                                title="Цвет тени"
                                hex={bgGrad.shadowColor}
                                alpha={bgGrad.shadowOpacity}
                                openColorPopup={openColorPopup}
                                onColorChange={({color, alpha}) => {
                                    updateBgNested('gradient', 'shadowColor', color);
                                    updateBgNested('gradient', 'shadowOpacity', alpha);
                                }}
                            />
                        </ControlGroup>
                    </Row>
                    <Row gap="16px">
                        <ControlGroup flex="1">
                            <SeekbarComponent
                                title="Ширина обводки"
                                min={0} max={10} step={1}
                                value={bgGrad.borderWidth}
                                onChange={(v) => updateBgNested('gradient', 'borderWidth', v)}
                            />
                        </ControlGroup>
                        <ControlGroup flex="1">
                            <SeekbarComponent
                                title="Скругление"
                                min={0} max={50} step={1}
                                value={bgGrad.borderRadius}
                                onChange={(v) => updateBgNested('gradient', 'borderRadius', v)}
                            />
                        </ControlGroup>
                        <ControlGroup flex="1">
                            <SeekbarComponent
                                title="Радиус тени"
                                min={0} max={30} step={1}
                                value={bgGrad.shadowRadius}
                                onChange={(v) => updateBgNested('gradient', 'shadowRadius', v)}
                            />
                        </ControlGroup>
                    </Row>
                    <Row gap="16px">
                        <ControlGroup>
                            <XYPad
                                title="Смещение тени"
                                valueX={bgGrad.shadowOffsetX ?? 0}
                                valueY={bgGrad.shadowOffsetY ?? 0}
                                min={-30}
                                max={30}
                                size={100}
                                onChange={({x, y}) => {
                                    updateBgNested('gradient', 'shadowOffsetX', x);
                                    updateBgNested('gradient', 'shadowOffsetY', y);
                                }}
                            />
                        </ControlGroup>
                    </Row>
                </TabContent>
            </TabSection>
        );
    }

    // ── BG: Image ────────────────────────────────────────────────
    function renderBgImage() {
        return (
            <TabSection>
                <TabHeader><TabTitle>Изображение</TabTitle></TabHeader>
                <TabContent>
                    <ThemeProvider theme={imageUploadTheme}>
                        <ImageUploadField
                            label="Фоновое изображение"
                            value={bgImage.src}
                            onChange={(url) => updateBgNested('image', 'src', url)}
                            onClear={() => updateBgNested('image', 'src', null)}
                        />
                    </ThemeProvider>

                    <Row gap="16px">
                        <ControlGroup>
                            <ColorSelectorButton
                                title="Цвет фона"
                                hex={bgImage.backgroundColor}
                                alpha={1}
                                openColorPopup={openColorPopup}
                                onColorChange={({color}) =>
                                    updateBgNested('image', 'backgroundColor', color)
                                }
                            />
                        </ControlGroup>
                        <ControlGroup>
                            <ColorSelectorButton
                                title="Цвет обводки"
                                hex={bgImage.borderColor}
                                alpha={1}
                                openColorPopup={openColorPopup}
                                onColorChange={({color}) =>
                                    updateBgNested('image', 'borderColor', color)
                                }
                            />
                        </ControlGroup>
                        <ControlGroup>
                            <ColorSelectorButton
                                title="Цвет тени"
                                hex={bgImage.shadowColor}
                                alpha={1}
                                openColorPopup={openColorPopup}
                                onColorChange={({color}) =>
                                    updateBgNested('image', 'shadowColor', color)
                                }
                            />
                        </ControlGroup>
                    </Row>

                    <Row gap="16px">
                        <ControlGroup flex="1">
                            <SeekbarComponent
                                title="Ширина обводки"
                                min={0} max={10} step={1}
                                value={bgImage.borderWidth}
                                onChange={(v) => updateBgNested('image', 'borderWidth', v)}
                            />
                        </ControlGroup>
                        <ControlGroup flex="1">
                            <SeekbarComponent
                                title="Скругление"
                                min={0} max={50} step={1}
                                value={bgImage.borderRadius}
                                onChange={(v) => updateBgNested('image', 'borderRadius', v)}
                            />
                        </ControlGroup>
                        <ControlGroup flex="1">
                            <SeekbarComponent
                                title="Радиус тени"
                                min={0} max={30} step={1}
                                value={bgImage.shadowRadius}
                                onChange={(v) => updateBgNested('image', 'shadowRadius', v)}
                            />
                        </ControlGroup>
                    </Row>
                    <Row gap="16px">
                        <ControlGroup>
                            <XYPad
                                title="Смещение тени"
                                valueX={bgImage.shadowOffsetX ?? 0}
                                valueY={bgImage.shadowOffsetY ?? 0}
                                min={-30}
                                max={30}
                                size={100}
                                onChange={({x, y}) => {
                                    updateBgNested('image', 'shadowOffsetX', x);
                                    updateBgNested('image', 'shadowOffsetY', y);
                                }}
                            />
                        </ControlGroup>
                    </Row>
                </TabContent>
            </TabSection>
        );
    }

    // ── Margin / Padding ─────────────────────────────────────────
    function renderMarginPadding() {
        return (
            <>
                <SubTitle>Внешние отступы (margin)</SubTitle>
                <Row gap="16px">
                    <ControlGroup flex="1">
                        <SeekbarComponent
                            title="Горизонтальный"
                            min={0} max={60} step={1}
                            value={bg.margin.horizontal}
                            onChange={(v) => updateV2(prev => ({
                                ...prev,
                                background: {
                                    ...prev.background,
                                    margin: {...prev.background.margin, horizontal: v}
                                }
                            }))}
                        />
                    </ControlGroup>
                    <ControlGroup flex="1">
                        <SeekbarComponent
                            title="Вертикальный"
                            min={0} max={60} step={1}
                            value={bg.margin.vertical}
                            onChange={(v) => updateV2(prev => ({
                                ...prev,
                                background: {
                                    ...prev.background,
                                    margin: {...prev.background.margin, vertical: v}
                                }
                            }))}
                        />
                    </ControlGroup>
                </Row>

                <SubTitle>Внутренние отступы (padding)</SubTitle>
                <InsetGrid>
                    <ControlGroup>
                        <SeekbarComponent
                            title="Сверху"
                            min={0} max={60} step={1}
                            value={bg.padding.top}
                            onChange={(v) => updateV2(prev => ({
                                ...prev,
                                background: {
                                    ...prev.background,
                                    padding: {...prev.background.padding, top: v}
                                }
                            }))}
                        />
                    </ControlGroup>
                    <ControlGroup>
                        <SeekbarComponent
                            title="Справа"
                            min={0} max={60} step={1}
                            value={bg.padding.right}
                            onChange={(v) => updateV2(prev => ({
                                ...prev,
                                background: {
                                    ...prev.background,
                                    padding: {...prev.background.padding, right: v}
                                }
                            }))}
                        />
                    </ControlGroup>
                    <ControlGroup>
                        <SeekbarComponent
                            title="Снизу"
                            min={0} max={60} step={1}
                            value={bg.padding.bottom}
                            onChange={(v) => updateV2(prev => ({
                                ...prev,
                                background: {
                                    ...prev.background,
                                    padding: {...prev.background.padding, bottom: v}
                                }
                            }))}
                        />
                    </ControlGroup>
                    <ControlGroup>
                        <SeekbarComponent
                            title="Слева"
                            min={0} max={60} step={1}
                            value={bg.padding.left}
                            onChange={(v) => updateV2(prev => ({
                                ...prev,
                                background: {
                                    ...prev.background,
                                    padding: {...prev.background.padding, left: v}
                                }
                            }))}
                        />
                    </ControlGroup>
                </InsetGrid>
            </>
        );
    }

    // ── Layer insets ──────────────────────────────────────────────
    function renderLayerInsets() {
        const layers = [
            {key: 'color', label: 'Цвет'},
            {key: 'gradient', label: 'Градиент'},
            {key: 'image', label: 'Изображение'},
        ];
        const sides = ['top', 'right', 'bottom', 'left'];
        const sideLabels = {top: 'Сверху', right: 'Справа', bottom: 'Снизу', left: 'Слева'};

        return layers.map(layer => (
            <TabSection key={layer.key}>
                <TabHeader><TabTitle>Inset: {layer.label}</TabTitle></TabHeader>
                <TabContent>
                    <InsetGrid>
                        {sides.map(side => (
                            <ControlGroup key={side}>
                                <SeekbarComponent
                                    title={sideLabels[side]}
                                    min={-30} max={30} step={1}
                                    value={bg.layerInset[layer.key][side]}
                                    onChange={(v) => updateLayerInset(layer.key, side, v)}
                                />
                            </ControlGroup>
                        ))}
                    </InsetGrid>
                </TabContent>
            </TabSection>
        ));
    }

    // ═════════════════════════════════════════════════════════════
    // TAB 2: CONTENT
    // ═════════════════════════════════════════════════════════════
    function renderContentTab() {
        return (
            <>
                {/* ── Header ── */}
                <Section>
                    <SectionHeader>
                        <SectionTitle><FiAlignCenter/> Заголовок</SectionTitle>
                    </SectionHeader>

                    {renderHeaderSettings()}
                </Section>

                {/* ── Emotes ── */}
                <Section>
                    <SectionHeader>
                        <SectionTitle><FiImage/> Эмоуты в заголовке</SectionTitle>
                    </SectionHeader>

                    {renderEmoteSettings()}
                </Section>

                {/* ── Text ── */}
                <Section>
                    <SectionHeader>
                        <SectionTitle><FiType/> Текст сообщения</SectionTitle>
                    </SectionHeader>

                    {renderTextSettings()}
                </Section>
            </>
        );
    }

    // ── Header settings ──────────────────────────────────────────
    function renderHeaderSettings() {
        return (
            <>
                <Row>
                    <ControlGroup>
                        <RadioGroup
                            title="Расположение"
                            defaultSelected={header.layout}
                            items={layoutOptions}
                            direction="horizontal"
                            itemWidth="100px"
                            onChange={(v) => updateHeader('layout', v)}
                        />
                    </ControlGroup>
                    <Spacer/>
                    <ControlGroup>
                        <RadioGroup
                            title="Позиция"
                            defaultSelected={header.position}
                            items={positionOptions}
                            direction="horizontal"
                            itemWidth="100px"
                            onChange={(v) => updateHeader('position', v)}
                        />
                    </ControlGroup>
                    <Spacer/>
                    <ControlGroup>
                        <RadioGroup
                            title="Выравнивание"
                            defaultSelected={header.align}
                            items={alignOptions}
                            direction="horizontal"
                            itemWidth="80px"
                            onChange={(v) => updateHeader('align', v)}
                        />
                    </ControlGroup>
                </Row>

                <Row>
                    <ControlGroup>
                        <XYPad
                            title="Смещение заголовка"
                            valueX={header.translate.x}
                            valueY={header.translate.y}
                            min={-50}
                            max={50}
                            size={100}
                            onChange={({x, y}) => updateHeader('translate', {x, y})}
                        />
                    </ControlGroup>
                    <Spacer/>
                    <ControlGroup>
                        <FontAndSizeEditor
                            title="Шрифт заголовка"
                            fontSize={header.font.size}
                            fontFamily={header.font.family}
                            onFontChange={({family, url}) =>
                                updateHeader('font', {...header.font, family, url})
                            }
                            onFontSizeChange={(v) =>
                                updateHeader('font', {...header.font, size: v})
                            }
                        />
                    </ControlGroup>
                </Row>

                {header.position === 'outside' && (
                    <Row gap="16px">
                        <ControlGroup flex="1">
                            <SeekbarComponent
                                title="Z-index заголовка (поверх фона)"
                                min={-5} max={10} step={1}
                                value={header.zIndex ?? 0}
                                onChange={(v) => updateHeader('zIndex', v)}
                            />
                        </ControlGroup>
                    </Row>
                )}

                <Row gap="16px">
                    <ControlGroup>
                        <SwitchRow>
                            <Switch
                                checked={header.customColor.enabled}
                                onChange={(e) =>
                                    updateHeaderNested('customColor', 'enabled', e.target.checked)
                                }
                            />
                            <SmallLabel>
                                {header.customColor.enabled ? 'Свой цвет' : 'Цвет Twitch'}
                            </SmallLabel>
                        </SwitchRow>
                    </ControlGroup>
                    {header.customColor.enabled && (
                        <ControlGroup>
                            <ColorSelectorButton
                                title="Цвет заголовка"
                                hex={header.customColor.color}
                                alpha={1}
                                openColorPopup={openColorPopup}
                                onColorChange={({color}) =>
                                    updateHeaderNested('customColor', 'color', color)
                                }
                            />
                        </ControlGroup>
                    )}
                </Row>

                {/* Header background */}
                <TabSection>
                    <TabHeader>
                        <TabTitle>
                            <SwitchRow>
                                <Switch
                                    checked={header.background.enabled}
                                    onChange={(e) =>
                                        updateHeaderNested('background', 'enabled', e.target.checked)
                                    }
                                />
                                Фон заголовка
                            </SwitchRow>
                        </TabTitle>
                    </TabHeader>
                    {header.background.enabled && (
                        <TabContent>
                            <Row gap="16px">
                                <ControlGroup>
                                    <ColorSelectorButton
                                        title="Цвет"
                                        hex={header.background.color}
                                        alpha={header.background.opacity}
                                        openColorPopup={openColorPopup}
                                        onColorChange={({color, alpha}) => {
                                            updateHeaderNested('background', 'color', color);
                                            updateHeaderNested('background', 'opacity', alpha);
                                        }}
                                    />
                                </ControlGroup>
                                <ControlGroup>
                                    <ColorSelectorButton
                                        title="Обводка"
                                        hex={header.background.borderColor}
                                        alpha={header.background.borderOpacity}
                                        openColorPopup={openColorPopup}
                                        onColorChange={({color, alpha}) => {
                                            updateHeaderNested('background', 'borderColor', color);
                                            updateHeaderNested('background', 'borderOpacity', alpha);
                                        }}
                                    />
                                </ControlGroup>
                                <ControlGroup>
                                    <ColorSelectorButton
                                        title="Тень"
                                        hex={header.background.shadowColor}
                                        alpha={header.background.shadowOpacity}
                                        openColorPopup={openColorPopup}
                                        onColorChange={({color, alpha}) => {
                                            updateHeaderNested('background', 'shadowColor', color);
                                            updateHeaderNested('background', 'shadowOpacity', alpha);
                                        }}
                                    />
                                </ControlGroup>
                            </Row>
                            <Row gap="16px">
                                <ControlGroup flex="1">
                                    <SeekbarComponent
                                        title="Ширина обводки"
                                        min={0} max={10} step={1}
                                        value={header.background.borderWidth}
                                        onChange={(v) => updateHeaderNested('background', 'borderWidth', v)}
                                    />
                                </ControlGroup>
                                <ControlGroup flex="1">
                                    <SeekbarComponent
                                        title="Скругление"
                                        min={0} max={30} step={1}
                                        value={header.background.borderRadius}
                                        onChange={(v) => updateHeaderNested('background', 'borderRadius', v)}
                                    />
                                </ControlGroup>
                                <ControlGroup flex="1">
                                    <SeekbarComponent
                                        title="Радиус тени"
                                        min={0} max={20} step={1}
                                        value={header.background.shadowRadius}
                                        onChange={(v) => updateHeaderNested('background', 'shadowRadius', v)}
                                    />
                                </ControlGroup>
                            </Row>
                            <Row gap="16px">
                                <ControlGroup flex="1">
                                    <SeekbarComponent
                                        title="Отступ верт."
                                        min={0} max={20} step={1}
                                        value={header.background.paddingV ?? 2}
                                        onChange={(v) => updateHeaderNested('background', 'paddingV', v)}
                                    />
                                </ControlGroup>
                                <ControlGroup flex="1">
                                    <SeekbarComponent
                                        title="Отступ гориз."
                                        min={0} max={20} step={1}
                                        value={header.background.paddingH ?? 6}
                                        onChange={(v) => updateHeaderNested('background', 'paddingH', v)}
                                    />
                                </ControlGroup>
                            </Row>
                            <Row gap="16px">
                                <ControlGroup>
                                    <XYPad
                                        title="Смещение тени"
                                        valueX={header.background.shadowOffsetX ?? 0}
                                        valueY={header.background.shadowOffsetY ?? 0}
                                        min={-30}
                                        max={30}
                                        size={100}
                                        onChange={({x, y}) => {
                                            updateHeaderNested('background', 'shadowOffsetX', x);
                                            updateHeaderNested('background', 'shadowOffsetY', y);
                                        }}
                                    />
                                </ControlGroup>
                            </Row>
                        </TabContent>
                    )}
                </TabSection>
            </>
        );
    }

    // ── Emote settings ───────────────────────────────────────────
    function renderEmoteSettings() {
        return (
            <>
                <Row gap="16px">
                    <ControlGroup>
                        <RadioGroup
                            title="Позиция эмоутов"
                            defaultSelected={header.emotes.position}
                            items={positionOptions}
                            direction="horizontal"
                            itemWidth="100px"
                            onChange={(v) => updateHeaderNested('emotes', 'position', v)}
                        />
                    </ControlGroup>
                </Row>

                {header.emotes.position === 'outside' && (
                    <Row gap="16px">
                        <ControlGroup>
                            <RadioGroup
                                title="Размещение"
                                defaultSelected={header.emotes.placement}
                                items={emotePlacementOptions}
                                direction="horizontal"
                                itemWidth="100px"
                                onChange={(v) => updateHeaderNested('emotes', 'placement', v)}
                            />
                        </ControlGroup>
                        <ControlGroup flex="1">
                            <SeekbarComponent
                                title="Отступ (gap)"
                                min={0} max={20} step={1}
                                value={header.emotes.gap}
                                onChange={(v) => updateHeaderNested('emotes', 'gap', v)}
                            />
                        </ControlGroup>
                    </Row>
                )}
            </>
        );
    }

    // ── Text settings ────────────────────────────────────────────
    function renderTextSettings() {
        return (
            <>
                <Row>
                    <ControlGroup>
                        <ColorSelectorButton
                            title="Цвет текста"
                            hex={text.color}
                            alpha={text.opacity}
                            openColorPopup={openColorPopup}
                            onColorChange={({color, alpha}) => {
                                updateText('color', color);
                                updateText('opacity', alpha);
                            }}
                        />
                    </ControlGroup>
                    <Spacer/>
                    <ControlGroup>
                        <RadioGroup
                            title="Выравнивание"
                            defaultSelected={text.align}
                            items={alignOptions}
                            direction="horizontal"
                            itemWidth="80px"
                            onChange={(v) => updateText('align', v)}
                        />
                    </ControlGroup>
                </Row>

                <ControlGroup>
                    <FontAndSizeEditor
                        title="Шрифт текста"
                        fontSize={text.font.size}
                        fontFamily={text.font.family}
                        onFontChange={({family, url}) =>
                            updateText('font', {...text.font, family, url})
                        }
                        onFontSizeChange={(v) =>
                            updateText('font', {...text.font, size: v})
                        }
                    />
                </ControlGroup>

                <Row>
                    <ControlGroup>
                        <ColorSelectorButton
                            title="Цвет тени"
                            hex={text.shadowColor}
                            alpha={text.shadowOpacity}
                            openColorPopup={openColorPopup}
                            onColorChange={({color, alpha}) => {
                                updateText('shadowColor', color);
                                updateText('shadowOpacity', alpha);
                            }}
                        />
                    </ControlGroup>
                    <Spacer/>
                    <ControlGroup flex="1">
                        <SeekbarComponent
                            title="Радиус тени"
                            min={0} max={20} step={1}
                            value={text.shadowRadius}
                            onChange={(v) => updateText('shadowRadius', v)}
                        />
                    </ControlGroup>
                </Row>

                <ControlGroup>
                    <SeekbarComponent
                        title="Размер эмоутов"
                        min={12} max={64} step={1}
                        value={text.emoteSize}
                        onChange={(v) => updateText('emoteSize', v)}
                    />
                </ControlGroup>
            </>
        );
    }
}
