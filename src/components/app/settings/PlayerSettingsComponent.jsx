import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import SeekbarComponent from "../../utils/SeekbarComponent";
import NumericEditorComponent from "../../utils/NumericEditorComponent";
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
import {FiMusic, FiCornerUpLeft, FiType, FiChevronDown, FiChevronUp, FiDisc, FiSettings} from "react-icons/fi";
import RadioGroup from "../../utils/TextRadioGroup";
import ColorSelectorButton from "./ColorSelectorButton";
import {RiColorFilterLine} from "react-icons/ri";
import {Row} from "../SettingsComponent";
import {Spacer} from "../../utils/Separator";
import { useTranslation } from "react-i18next";

const ColorGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-top: 8px;
`;

const RadiusGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-top: 8px;
`;

const RadiusSection = styled.div`
    background: rgba(40, 40, 40, 0.3);
    border: 1px solid #333;
    border-radius: 8px;
    padding: 16px;
`;

const RadiusTitle = styled.h5`
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

const TEXT_ALIGN_OPTIONS = [
    { key: 'left', labelKey: 'settings.players.vinyl.sections.text.alignment.options.left' },
    { key: 'center', labelKey: 'settings.players.vinyl.sections.text.alignment.options.center' },
    { key: 'right', labelKey: 'settings.players.vinyl.sections.text.alignment.options.right' },
];

export default function PlayerSettingsComponent({
                                                    current,
                                                    onChange,
                                                    openColorPopup,
                                                }) {
    const [isOpen, setIsOpen] = useState(false);
    const { t } = useTranslation();

    const toggleOpen = () => setIsOpen((prev) => !prev);

    const updatePlayer = (path, value) => {
        onChange(prev => {
            const newState = { ...prev };
            if (!newState.player) newState.player = {};
            const keys = path.split('.');
            let current = newState.player;

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
        updatePlayer(`${path}Color`, color);
    };

    const updateRadius = (corner, value) => {
        onChange(prev => ({
            ...prev,
            player: {
                ...prev.player,
                borderRadius: {
                    ...prev.player?.borderRadius,
                    [corner]: value,
                },
            },
        }));
    };

    const player = current.player || {};
    const textAlignOptions = useMemo(
        () => TEXT_ALIGN_OPTIONS.map(option => ({ key: option.key, text: t(option.labelKey) })),
        [t],
    );

    return (
        <SettingsCard>
            <CollapsibleHeader onClick={toggleOpen}>
                <Row gap="12px">
                    <CardTitle>
                        <FiDisc/>
                        {t('settings.players.vinyl.title')}
                    </CardTitle>

                    <Spacer />

                    <CollapseToggle>
                        {isOpen ? t('settings.shared.collapse.close') : t('settings.shared.collapse.open')}
                        {isOpen ? <FiChevronUp /> : <FiSettings />}
                    </CollapseToggle>
                </Row>
            </CollapsibleHeader>

            {/* Свернутое описание */}
            {/*{!isOpen && (
                <CollapsedPreview onClick={toggleOpen}>
                </CollapsedPreview>
            )}*/}

            {isOpen && (
                <CardContent>
                    {/* Цветовая схема */}
                    <Section>
                        <SectionHeader>
                            <SectionTitle>
                                <RiColorFilterLine   />
                                {t('settings.players.vinyl.sections.colors.title')}
                            </SectionTitle>
                        </SectionHeader>

                        <ColorGrid>
                            <ControlGroup>
                                <ColorSelectorButton
                                    openColorPopup={openColorPopup}
                                    title={t('settings.players.vinyl.colors.background')}
                                    alpha={player.backgroundOpacity ?? 1.0}
                                    hex={player.backgroundColor ?? "#3e837c"}
                                    onColorChange={({color, alpha}) => {
                                        updateColor('background', color, alpha);
                                    }}
                                />
                            </ControlGroup>

                            <ControlGroup>
                                <ColorSelectorButton
                                    openColorPopup={openColorPopup}
                                    title={t('settings.players.vinyl.colors.border')}
                                    alpha={player.borderOpacity ?? 1.0}
                                    hex={player.borderColor ?? "#3e837c"}
                                    onColorChange={({color, alpha}) => {
                                        updateColor('border', color, alpha);
                                    }}
                                />
                            </ControlGroup>
                        </ColorGrid>
                    </Section>

                    {/* Тени и эффекты */}
                    <Section>
                        <SectionHeader>
                            <SectionTitle>
                                <TbShadow />
                                {t('settings.players.vinyl.sections.shadows.title')}
                            </SectionTitle>
                        </SectionHeader>

                        <ColorGrid>
                            <ControlGroup>
                                <ColorSelectorButton
                                    openColorPopup={openColorPopup}
                                    title={t('settings.players.vinyl.shadows.player')}
                                    alpha={player.shadowOpacity ?? 1.0}
                                    hex={player.shadowColor ?? "#3e837c"}
                                    onColorChange={({color, alpha}) => {
                                        updateColor('shadow', color, alpha);
                                    }}
                                />
                            </ControlGroup>

                            <ControlGroup>
                                <ColorSelectorButton
                                    openColorPopup={openColorPopup}
                                    title={t('settings.players.vinyl.shadows.disk')}
                                    alpha={player.diskShadowOpacity ?? 1.0}
                                    hex={player.diskShadowColor ?? "#3e837c"}
                                    onColorChange={({color, alpha}) => {
                                        updateColor('diskShadow', color, alpha);
                                    }}
                                />
                            </ControlGroup>
                        </ColorGrid>
                    </Section>

                    {/* Скругление углов */}
                    <Section>
                        <SectionHeader>
                            <SectionTitle>
                                <FiCornerUpLeft />
                                {t('settings.players.vinyl.sections.radius.title')}
                            </SectionTitle>
                        </SectionHeader>

                        <RadiusGrid>
                            <RadiusSection>
                                <RadiusTitle>{t('settings.players.vinyl.sections.radius.groups.top')}</RadiusTitle>
                                <ControlGroup>
                                    <SeekbarComponent
                                        title={t('settings.players.vinyl.sections.radius.labels.left', {value: player.borderRadius?.topLeft ?? 0})}
                                        min={0}
                                        max={150}
                                        value={player.borderRadius?.topLeft ?? 0}
                                        step={1}
                                        width="100%"
                                        onChange={value => updateRadius('topLeft', value)}
                                    />
                                </ControlGroup>
                                <ControlGroup>
                                    <SeekbarComponent
                                        title={t('settings.players.vinyl.sections.radius.labels.right', {value: player.borderRadius?.topRight ?? 0})}
                                        min={0}
                                        max={150}
                                        value={player.borderRadius?.topRight ?? 0}
                                        step={1}
                                        width="100%"
                                        onChange={value => updateRadius('topRight', value)}
                                    />
                                </ControlGroup>
                            </RadiusSection>

                            <RadiusSection>
                                <RadiusTitle>{t('settings.players.vinyl.sections.radius.groups.bottom')}</RadiusTitle>
                                <ControlGroup>
                                    <SeekbarComponent
                                        title={t('settings.players.vinyl.sections.radius.labels.left', {value: player.borderRadius?.bottomLeft ?? 0})}
                                        min={0}
                                        max={150}
                                        value={player.borderRadius?.bottomLeft ?? 0}
                                        step={1}
                                        width="100%"
                                        onChange={value => updateRadius('bottomLeft', value)}
                                    />
                                </ControlGroup>
                                <ControlGroup>
                                    <SeekbarComponent
                                        title={t('settings.players.vinyl.sections.radius.labels.right', {value: player.borderRadius?.bottomRight ?? 0})}
                                        min={0}
                                        max={150}
                                        value={player.borderRadius?.bottomRight ?? 0}
                                        step={1}
                                        width="100%"
                                        onChange={value => updateRadius('bottomRight', value)}
                                    />
                                </ControlGroup>
                            </RadiusSection>
                        </RadiusGrid>
                    </Section>

                    {/* Настройки текста */}
                    <Section>
                        <SectionHeader>
                            <SectionTitle>
                                <FiType />
                                {t('settings.players.vinyl.sections.text.title')}
                            </SectionTitle>
                        </SectionHeader>

                        <ControlGroup>
                            <Row>
                                <RadioGroup
                                    title={t('settings.players.vinyl.sections.text.alignment.title')}
                                    defaultSelected={player.text?.textAlign ?? 'left'}
                                    items={textAlignOptions}
                                    direction="horizontal"
                                    itemWidth="120px"
                                    onChange={value => updatePlayer('text.textAlign', value)}
                                />
                            </Row>
                        </ControlGroup>

                        <ColorGrid>
                            <TextPropertyCard>
                                <TextPropertyTitle>
                                    <FiType />
                                    {t('settings.players.vinyl.sections.text.cards.artist.title')}
                                </TextPropertyTitle>
                                <ControlGroup>
                                    <ColorSelectorButton
                                        openColorPopup={openColorPopup}
                                        title={t('settings.shared.controls.textColor')}
                                        alpha={1.0}
                                        hex={player.text?.artist?.color ?? "#ffffff"}
                                        onColorChange={({color}) => {
                                            updatePlayer('text.artist.color', color);
                                        }}
                                    />
                                </ControlGroup>
                                <ControlGroup>
                                    <NumericEditorComponent
                                        title={t('settings.shared.controls.fontSize')}
                                        value={player.text?.artist?.fontSize ?? 16}
                                        max={32}
                                        min={8}
                                        width="120px"
                                        onChange={value => {
                                            updatePlayer('text.artist.fontSize', value);
                                        }}
                                    />
                                </ControlGroup>
                            </TextPropertyCard>

                            <TextPropertyCard>
                                <TextPropertyTitle>
                                    <FiMusic />
                                    {t('settings.players.vinyl.sections.text.cards.track.title')}
                                </TextPropertyTitle>
                                <ControlGroup>
                                    <ColorSelectorButton
                                        openColorPopup={openColorPopup}
                                        title={t('settings.shared.controls.textColor')}
                                        alpha={1.0}
                                        hex={player.text?.title?.color ?? "#ffffff"}
                                        onColorChange={({color}) => {
                                            updatePlayer('text.title.color', color);
                                        }}
                                    />
                                </ControlGroup>
                                <ControlGroup>
                                    <NumericEditorComponent
                                        title={t('settings.shared.controls.fontSize')}
                                        value={player.text?.title?.fontSize ?? 16}
                                        max={32}
                                        min={8}
                                        width="120px"
                                        onChange={value => {
                                            updatePlayer('text.title.fontSize', value);
                                        }}
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