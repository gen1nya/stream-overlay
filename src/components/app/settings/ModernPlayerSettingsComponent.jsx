import React, { useState } from 'react';
import styled from 'styled-components';
import SeekbarComponent from "../../utils/SeekbarComponent";
import NumericEditorComponent from "../../utils/NumericEditorComponent";
import FontAndSizeEditor from "../../utils/FontAndSizeEditor";
import {
    CardContent,
    CardHeader,
    CardTitle,
    Section,
    SectionHeader,
    SectionTitle,
    SettingsCard,
    ControlGroup
} from "./SharedSettingsStyles";
import {TbShadow} from "react-icons/tb";
import {FiMusic, FiType, FiImage, FiSettings, FiChevronDown, FiChevronUp} from "react-icons/fi";
import {BiExpand} from "react-icons/bi";
import RadioGroup from "../../utils/TextRadioGroup";
import ColorSelectorButton from "./ColorSelectorButton";
import {RiColorFilterLine} from "react-icons/ri";
import {Row} from "../SettingsComponent";
import {Spacer} from "../../utils/Separator";
import ModernAudioPlayer from "../../player/ModerAudioPlayer";
import Switch from "../../utils/Switch";
import { useTranslation } from 'react-i18next';

const ColorGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-top: 8px;
`;

const DimensionsGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-top: 8px;
`;

const DimensionsSection = styled.div`
    background: rgba(40, 40, 40, 0.3);
    border: 1px solid #333;
    border-radius: 8px;
    padding: 16px;
    opacity: ${props => props.disabled ? 0.5 : 1};
    pointer-events: ${props => props.disabled ? 'none' : 'auto'};
    transition: opacity 0.2s ease;
`;

const DimensionsTitle = styled.h5`
    margin: 0 0 12px 0;
    font-size: 0.9rem;
    font-weight: 500;
    color: #ccc;
    text-align: center;
`;

const TextPropertyCard = styled.div`
    background: rgba(40, 40, 40, 0.3);
    border: 1px solid #333;
    border-radius: 8px;
    padding: 16px;
`;

const TextPropertyTitle = styled.h5`
    margin: 0 0 12px 0;
    font-size: 0.9rem;
    font-weight: 500;
    color: #ccc;
    display: flex;
    align-items: center;
    gap: 8px;
`;

const DisabledControlGroup = styled(ControlGroup)`
    opacity: ${props => props.disabled ? 0.5 : 1};
    pointer-events: ${props => props.disabled ? 'none' : 'auto'};
    transition: opacity 0.2s ease;
`;

const CollapsibleHeader = styled.div`
    padding: 16px 20px;
    border-bottom: 1px solid #333;
    cursor: pointer;
    transition: background-color 0.2s ease;
    
    &:hover {
        background-color: rgba(255, 255, 255, 0.02);
    }
`;

const CollapsedPreview = styled.div`
    padding: 16px 20px;
    color: #999;
    font-size: 0.9rem;
    line-height: 1.5;
    cursor: pointer;
    transition: background-color 0.2s ease;
    
    &:hover {
        background-color: rgba(255, 255, 255, 0.02);
    }
    
    .highlight {
        color: #4a9eff;
        font-weight: 500;
    }
`;

const CollapseToggle = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    color: #FFF;
    font-size: 1rem;
    transition: color 0.2s ease;
    
    svg {
        width: 18px;
        height: 18px;
        transition: transform 0.2s ease;
    }
    
    ${CollapsibleHeader}:hover & {
        color: #ccc;
    }
`;

export default function ModernPlayerSettingsComponent({
                                                          current,
                                                          onChange,
                                                          openColorPopup
                                                      }) {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);

    const toggleOpen = () => setIsOpen((prev) => !prev);

    const updatePlayer = (path, value) => {
        onChange(prev => {
            const newState = { ...prev };
            if (!newState.modernPlayer) newState.modernPlayer = {};
            const keys = path.split('.');
            let current = newState.modernPlayer;

            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) current[keys[i]] = {};
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
            return newState;
        });
    };

    const updateColor = (path, color, alpha = null) => {
        if (alpha !== null) {
            updatePlayer(`${path}Opacity`, alpha);
        }
        updatePlayer(`${path}`, color);
    };

    const modernPlayer = current.modernPlayer || {};
    const currentMode = modernPlayer.mode ?? 'compact';
    const currentVisualization = modernPlayer.visualization ?? 'waveform';
    const isCompactMode = currentMode === 'compact';
    const isExpandedMode = currentMode === 'expanded';
    const borderRadius = modernPlayer.borderRadius ?? 16;
    const shadowRadius = modernPlayer.shadowRadius ?? 20;

    return (
        <SettingsCard>
            <CollapsibleHeader onClick={toggleOpen}>
                <Row gap="12px">
                    <CardTitle>
                        <FiMusic/>
                        {t('settings.players.modern.title')}
                    </CardTitle>

                    <Spacer />

                    <CollapseToggle>
                        {isOpen
                            ? t('settings.players.modern.collapse.close')
                            : t('settings.players.modern.collapse.open')}
                        {isOpen ? <FiChevronUp /> : <FiSettings />}
                    </CollapseToggle>
                </Row>
            </CollapsibleHeader>

            {/* Свернутое описание */}
            {!isOpen && (
                <CollapsedPreview onClick={toggleOpen}>
                    <ModernAudioPlayer/>
                </CollapsedPreview>
            )}

            {isOpen && (
                <CardContent>
                    {/* Общие настройки */}
                    <Section>
                        <SectionHeader>
                            <SectionTitle>
                                <FiMusic />
                                {t('settings.players.modern.sections.preview')}
                            </SectionTitle>
                        </SectionHeader>
                        <ModernAudioPlayer/>


                        <SectionHeader>
                            <SectionTitle>
                                <FiSettings />
                                {t('settings.players.modern.sections.general')}
                            </SectionTitle>
                        </SectionHeader>

                        <Row gap="20px">
                            <ControlGroup>
                                <RadioGroup
                                    title={t('settings.players.modern.mode.label')}
                                    defaultSelected={currentMode}
                                    items={[
                                        { key: 'compact', text: t('settings.players.modern.mode.compact') },
                                        { key: 'expanded', text: t('settings.players.modern.mode.expanded') }
                                    ]}
                                    direction="horizontal"
                                    itemWidth="140px"
                                    onChange={value => updatePlayer('mode', value)}
                                />
                            </ControlGroup>

                            <Spacer />

                            <ControlGroup>
                                <SeekbarComponent
                                    title={t('settings.players.modern.mode.borderRadius', { value: borderRadius })}
                                    min={0}
                                    max={32}
                                    value={borderRadius}
                                    step={1}
                                    width="200px"
                                    onChange={value => updatePlayer('borderRadius', value)}
                                />
                            </ControlGroup>
                        </Row>
                        <Row>
                            <ControlGroup>
                                <RadioGroup
                                    title={t('settings.players.modern.visualization.label')}
                                    defaultSelected={currentVisualization}
                                    items={[
                                        { key: 'spectrum', text: t('settings.players.modern.visualization.spectrum') },
                                        { key: 'waveform', text: t('settings.players.modern.visualization.waveform') },
                                        { key: 'vumeter', text: t('settings.players.modern.visualization.vumeter') },
                                    ]}
                                    direction="horizontal"
                                    itemWidth="140px"
                                    onChange={value => updatePlayer('visualization', value)}
                                />
                            </ControlGroup>

                        </Row>
                    </Section>

                    {/* Размеры */}
                    <Section>
                        <SectionHeader>
                            <SectionTitle>
                                <BiExpand />
                                {t('settings.players.modern.sections.dimensions')}
                            </SectionTitle>
                        </SectionHeader>

                        <DimensionsGrid>
                            <DimensionsSection disabled={!isCompactMode}>
                                <DimensionsTitle>{t('settings.players.modern.dimensions.compact')}</DimensionsTitle>
                                <ControlGroup>
                                    <NumericEditorComponent
                                        title={t('settings.players.modern.dimensions.width')}
                                        value={modernPlayer.widthCompact ?? 300}
                                        max={600}
                                        min={200}
                                        width="120px"
                                        onChange={isCompactMode ? value => updatePlayer('widthCompact', value) : undefined}
                                    />
                                </ControlGroup>
                                <ControlGroup>
                                    <NumericEditorComponent
                                        title={t('settings.players.modern.dimensions.height')}
                                        value={modernPlayer.heightCompact ?? 64}
                                        max={120}
                                        min={40}
                                        width="120px"
                                        onChange={isCompactMode ? value => updatePlayer('heightCompact', value) : undefined}
                                    />
                                </ControlGroup>
                            </DimensionsSection>

                            <DimensionsSection disabled={!isExpandedMode}>
                                <DimensionsTitle>{t('settings.players.modern.dimensions.expanded')}</DimensionsTitle>
                                <ControlGroup>
                                    <NumericEditorComponent
                                        title={t('settings.players.modern.dimensions.width')}
                                        value={modernPlayer.widthExpanded ?? 400}
                                        max={800}
                                        min={300}
                                        width="120px"
                                        onChange={isExpandedMode ? value => updatePlayer('widthExpanded', value) : undefined}
                                    />
                                </ControlGroup>
                                <ControlGroup>
                                    <NumericEditorComponent
                                        title={t('settings.players.modern.dimensions.height')}
                                        value={modernPlayer.heightExpanded ?? 80}
                                        max={250}
                                        min={60}
                                        width="120px"
                                        onChange={isExpandedMode ? value => updatePlayer('heightExpanded', value) : undefined}
                                    />
                                </ControlGroup>
                            </DimensionsSection>
                        </DimensionsGrid>
                    </Section>

                    {/* Цветовая схема */}
                    <Section>
                        <SectionHeader>
                            <SectionTitle>
                                <RiColorFilterLine />
                                {t('settings.players.modern.sections.colors')}
                            </SectionTitle>
                        </SectionHeader>

                        <ColorGrid>
                            <ControlGroup>
                                <ColorSelectorButton
                                    openColorPopup={openColorPopup}
                                    title={t('settings.players.modern.colors.background')}
                                    alpha={modernPlayer.backgroundOpacity ?? 0.94}
                                    hex={modernPlayer.backgroundColor ?? "#000000"}
                                    onColorChange={({color, alpha}) => {
                                        updatePlayer('backgroundColor', color);
                                        updatePlayer('backgroundOpacity', alpha);
                                    }}
                                />
                            </ControlGroup>

                            <ControlGroup>
                                <ColorSelectorButton
                                    openColorPopup={openColorPopup}
                                    title={t('settings.players.modern.colors.tint')}
                                    alpha={modernPlayer.backgroundTintOpacity ?? 0.3}
                                    hex={modernPlayer.backgroundTint ?? "#000000"}
                                    onColorChange={({color, alpha}) => {
                                        updatePlayer('backgroundTint', color);
                                        updatePlayer('backgroundTintOpacity', alpha);
                                    }}
                                />
                            </ControlGroup>

                            <ControlGroup>
                                <ColorSelectorButton
                                    openColorPopup={openColorPopup}
                                    title={t('settings.players.modern.colors.border')}
                                    alpha={modernPlayer.borderOpacity ?? 1.0}
                                    hex={modernPlayer.borderColor ?? "#333333"}
                                    onColorChange={({color, alpha}) => {
                                        updatePlayer('borderColor', color);
                                        updatePlayer('borderOpacity', alpha);
                                    }}
                                />
                            </ControlGroup>
                        </ColorGrid>
                    </Section>

                    {/* Тень */}
                    <Section>
                        <SectionHeader>
                            <SectionTitle>
                                <TbShadow />
                                {t('settings.players.modern.sections.shadow')}
                            </SectionTitle>
                        </SectionHeader>

                        <Row gap="20px">
                            <ControlGroup>
                                <ColorSelectorButton
                                    openColorPopup={openColorPopup}
                                    title={t('settings.players.modern.shadow.color')}
                                    alpha={modernPlayer.shadowOpacity ?? 0.26}
                                    hex={modernPlayer.shadowColor ?? "#000000"}
                                    onColorChange={({color, alpha}) => {
                                        updatePlayer('shadowColor', color);
                                        updatePlayer('shadowOpacity', alpha);
                                    }}
                                />
                            </ControlGroup>

                            <Spacer />

                            <ControlGroup>
                                <SeekbarComponent
                                    title={t('settings.players.modern.shadow.radius', { value: shadowRadius })}
                                    min={0}
                                    max={50}
                                    value={shadowRadius}
                                    step={1}
                                    width="200px"
                                    onChange={value => updatePlayer('shadowRadius', value)}
                                />
                            </ControlGroup>
                        </Row>
                    </Section>

                    {/* Настройки изображения */}
                    <Section>
                        <SectionHeader>
                            <SectionTitle>
                                <FiImage />
                                {t('settings.players.modern.sections.image')}
                            </SectionTitle>
                        </SectionHeader>

                        <Row gap="20px">
                            <ControlGroup>
                                <RadioGroup
                                    title={t('settings.players.modern.image.position.label')}
                                    defaultSelected={modernPlayer.image?.position ?? 'left'}
                                    items={[
                                        { key: 'left', text: t('settings.players.modern.image.position.left') },
                                        { key: 'right', text: t('settings.players.modern.image.position.right') }
                                    ]}
                                    direction="horizontal"
                                    itemWidth="120px"
                                    onChange={value => updatePlayer('image.position', value)}
                                />
                            </ControlGroup>

                            <ControlGroup>
                                <label style={{ fontSize: '0.9rem', fontWeight: '500', color: '#e0e0e0', marginBottom: '8px' }}>
                                    {t('settings.players.modern.image.showCover')}
                                </label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Switch
                                        checked={modernPlayer.image?.show ?? true}
                                        onChange={(e) => updatePlayer('image.show', e.target.checked)}
                                    />
                                    <span style={{ fontSize: '0.85rem', color: '#999' }}>
                                        {modernPlayer.image?.show
                                            ? t('settings.players.modern.image.status.enabled')
                                            : t('settings.players.modern.image.status.disabled')}
                                    </span>
                                </div>
                            </ControlGroup>

                            <Spacer />

                            <DisabledControlGroup disabled={!isCompactMode}>
                                <NumericEditorComponent
                                    title={t('settings.players.modern.image.sizeCompact')}
                                    value={modernPlayer.image?.compact?.size ?? 48}
                                    max={120}
                                    min={32}
                                    width="120px"
                                    onChange={isCompactMode ? value => updatePlayer('image.compact.size', value) : undefined}
                                />
                            </DisabledControlGroup>

                            <DisabledControlGroup disabled={!isExpandedMode}>
                                <NumericEditorComponent
                                    title={t('settings.players.modern.image.sizeExpanded')}
                                    value={modernPlayer.image?.extended?.size ?? 48}
                                    max={120}
                                    min={32}
                                    width="120px"
                                    onChange={isExpandedMode ? value => updatePlayer('image.extended.size', value) : undefined}
                                />
                            </DisabledControlGroup>
                        </Row>
                    </Section>

                    {/* Настройки текста */}
                    <Section>
                        <SectionHeader>
                            <SectionTitle>
                                <FiType />
                                {t('settings.players.modern.sections.text')}
                            </SectionTitle>
                        </SectionHeader>

                        <ControlGroup>
                            <Row>
                                <RadioGroup
                                    title={t('settings.players.modern.text.alignment.label')}
                                    defaultSelected={modernPlayer.text?.textAlign ?? 'left'}
                                    items={[
                                        { key: 'left', text: t('settings.players.modern.text.alignment.left') },
                                        { key: 'center', text: t('settings.players.modern.text.alignment.center') },
                                        { key: 'right', text: t('settings.players.modern.text.alignment.right') },
                                    ]}
                                    direction="horizontal"
                                    itemWidth="120px"
                                    onChange={value => updatePlayer('text.textAlign', value)}
                                />
                            </Row>
                        </ControlGroup>

                        <ColorGrid>
                            <TextPropertyCard>
                                <TextPropertyTitle>
                                    <FiMusic />
                                    {t('settings.players.modern.text.title.heading')}
                                </TextPropertyTitle>
                                <ControlGroup>
                                    <ColorSelectorButton
                                        openColorPopup={openColorPopup}
                                        title={t('settings.players.modern.text.title.color')}
                                        alpha={1.0}
                                        hex={modernPlayer.text?.title?.color ?? "#ffffff"}
                                        onColorChange={({color}) => {
                                            updatePlayer('text.title.color', color);
                                        }}
                                    />
                                </ControlGroup>
                                <ControlGroup>
                                    <FontAndSizeEditor
                                        title={t('settings.players.modern.text.title.font')}
                                        fontSize={modernPlayer.text?.title?.fontSize ?? 16}
                                        fontFamily={modernPlayer.text?.title?.family ?? "Roboto"}
                                        onFontChange={({family, url}) => {
                                            updatePlayer('text.title.family', family);
                                            updatePlayer('text.title.url', url);
                                        }}
                                        onFontSizeChange={value => {
                                            updatePlayer('text.title.fontSize', value);
                                        }}
                                    />
                                </ControlGroup>
                                <ControlGroup>
                                    <RadioGroup
                                        title={t('settings.players.modern.text.title.weight.label')}
                                        defaultSelected={modernPlayer.text?.title?.fontWeight ?? 'bold'}
                                        items={[
                                            { key: 'normal', text: t('settings.players.modern.text.title.weight.normal') },
                                            { key: 'bold', text: t('settings.players.modern.text.title.weight.bold') }
                                        ]}
                                        direction="horizontal"
                                        itemWidth="100px"
                                        onChange={value => updatePlayer('text.title.fontWeight', value)}
                                    />
                                </ControlGroup>
                            </TextPropertyCard>

                            <TextPropertyCard>
                                <TextPropertyTitle>
                                    <FiType />
                                    {t('settings.players.modern.text.artist.heading')}
                                </TextPropertyTitle>
                                <ControlGroup>
                                    <ColorSelectorButton
                                        openColorPopup={openColorPopup}
                                        title={t('settings.players.modern.text.artist.color')}
                                        alpha={1.0}
                                        hex={modernPlayer.text?.artist?.color ?? "#858585"}
                                        onColorChange={({color}) => {
                                            updatePlayer('text.artist.color', color);
                                        }}
                                    />
                                </ControlGroup>
                                <ControlGroup>
                                    <FontAndSizeEditor
                                        title={t('settings.players.modern.text.artist.font')}
                                        fontSize={modernPlayer.text?.artist?.fontSize ?? 14}
                                        fontFamily={modernPlayer.text?.artist?.family ?? "Roboto"}
                                        onFontChange={({family, url}) => {
                                            updatePlayer('text.artist.family', family);
                                            updatePlayer('text.artist.url', url);
                                        }}
                                        onFontSizeChange={value => {
                                            updatePlayer('text.artist.fontSize', value);
                                        }}
                                    />
                                </ControlGroup>
                                <ControlGroup>
                                    <RadioGroup
                                        title={t('settings.players.modern.text.artist.weight.label')}
                                        defaultSelected={modernPlayer.text?.artist?.fontWeight ?? 'normal'}
                                        items={[
                                            { key: 'normal', text: t('settings.players.modern.text.artist.weight.normal') },
                                            { key: 'bold', text: t('settings.players.modern.text.artist.weight.bold') }
                                        ]}
                                        direction="horizontal"
                                        itemWidth="100px"
                                        onChange={value => updatePlayer('text.artist.fontWeight', value)}
                                    />
                                </ControlGroup>
                            </TextPropertyCard>
                        </ColorGrid>
                    </Section>
                </CardContent>
            )}
        </SettingsCard>
    );
}