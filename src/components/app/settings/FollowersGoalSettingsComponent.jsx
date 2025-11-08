import React, { useState } from 'react';
import styled from 'styled-components';
import {
    CardContent,
    CardTitle,
    Section,
    SectionHeader,
    SectionTitle,
    SettingsCard,
    ControlGroup, ActionButton
} from "./SharedSettingsStyles";
import {
    FiTarget,
    FiType,
    FiSettings,
    FiBarChart2,
    FiChevronUp,
    FiChevronDown,
    FiExternalLink,
    FiCopy
} from 'react-icons/fi';
import { BiExpand } from "react-icons/bi";
import SeekbarComponent from "../../utils/SeekbarComponent";
import NumericEditorComponent from "../../utils/NumericEditorComponent";
import ColorSelectorButton from "./ColorSelectorButton";
import FontAndSizeEditor from "../../utils/FontAndSizeEditor";
import { Row } from "../SettingsComponent";
import { Spacer } from "../../utils/Separator";
import Switch from "../../utils/Switch";
import {hexToRgba, parseRgbaToHexAndAlpha} from "../../../utils";
import { useTranslation } from "react-i18next";

const ColorGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-top: 8px;
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

    &:focus {
        outline: none;
        border-color: #646cff;
        background: #333;
    }

    &::placeholder {
        color: #666;
    }
`;

const Label = styled.label`
    font-size: 0.9rem;
    font-weight: 500;
    color: #e0e0e0;
    margin-bottom: 8px;
    display: block;
`;

const LinkButton = styled(ActionButton)`
    background: rgba(30, 64, 175, 0.35);
    border-color: #1e40af;

    &:hover {
        background: rgba(29, 78, 216, 0.62);
        border-color: #1d4ed8;
    }
`;

export default function FollowersGoalSettingsComponent({ current, onChange, openColorPopup }) {
    const [isOpen, setIsOpen] = useState(true);
    const { t } = useTranslation();

    const toggleOpen = () => setIsOpen((prev) => !prev);

    const updateFollowersGoal = (path, value) => {
        onChange(prev => {
            const newState = { ...prev };
            if (!newState.followersGoal) newState.followersGoal = {};
            const keys = path.split('.');
            let currentObj = newState.followersGoal;

            for (let i = 0; i < keys.length - 1; i++) {
                if (!currentObj[keys[i]]) currentObj[keys[i]] = {};
                currentObj = currentObj[keys[i]];
            }
            currentObj[keys[keys.length - 1]] = value;
            return newState;
        });
    };

    const handleCopyLink = () => {
        let chatUrl = 'http://localhost:5173/new-followers-overlay';
        navigator.clipboard.writeText(chatUrl).catch(console.error);
    };

    const followersGoal = current.followersGoal || {};

    return (
        <SettingsCard>
            <CollapsibleHeader onClick={toggleOpen}>
                <Row gap="12px">
                    <CardTitle>
                        <FiTarget />
                        {t('settings.followersGoal.title')}
                    </CardTitle>

                    <Spacer />

                    <CollapseToggle>
                        {isOpen ? t('settings.shared.collapse.close') : t('settings.shared.collapse.open')}
                        {isOpen ? <FiChevronUp /> : <FiChevronDown />}
                    </CollapseToggle>
                </Row>
            </CollapsibleHeader>

            {!isOpen && (
                <CollapsedPreview onClick={toggleOpen}>
                    {t('settings.followersGoal.collapsedPreview.prefix')}{' '}
                    <span className="highlight">{followersGoal.target || 1000}</span>{' '}
                    {t('settings.followersGoal.collapsedPreview.suffix')}
                </CollapsedPreview>
            )}

            {isOpen && (
                <CardContent>
                    {/* Основные настройки */}
                    <Section>
                        {/**/}
                    <Row>
                        <LinkButton onClick={handleCopyLink}>
                            <FiCopy />
                            {t('common.copyLink')}
                        </LinkButton>
                    </Row>

                    <SectionHeader>
                        <SectionTitle>
                            <FiSettings />
                            {t('settings.followersGoal.sections.general.title')}
                        </SectionTitle>
                    </SectionHeader>

                    <Row gap="20px">
                        <ControlGroup flex="1">
                            <NumericEditorComponent
                                title={t('settings.followersGoal.sections.general.target')}
                                value={followersGoal.target ?? 1000}
                                min={1}
                                max={1000000}
                                width="180px"
                                onChange={value => updateFollowersGoal('target', value)}
                            />
                        </ControlGroup>

                            <Spacer />

                        <ControlGroup flex="1">
                            <NumericEditorComponent
                                title={t('settings.followersGoal.sections.general.width')}
                                value={followersGoal.width ?? 400}
                                min={200}
                                max={800}
                                width="180px"
                                onChange={value => updateFollowersGoal('width', value)}
                            />
                        </ControlGroup>
                    </Row>

                    <ControlGroup>
                        <Label>{t('settings.followersGoal.sections.general.titleLabel')}</Label>
                        <InputField
                            type="text"
                            value={followersGoal.title ?? t('settings.followersGoal.sections.general.titlePlaceholder')}
                            onChange={(e) => updateFollowersGoal('title', e.target.value)}
                            placeholder={t('settings.followersGoal.sections.general.titlePlaceholder')}
                        />
                    </ControlGroup>

                    <ControlGroup>
                        <Label>{t('settings.followersGoal.sections.general.completedLabel')}</Label>
                        <InputField
                            type="text"
                            value={followersGoal.completedMessage ?? t('settings.followersGoal.sections.general.completedPlaceholder')}
                            onChange={(e) => updateFollowersGoal('completedMessage', e.target.value)}
                            placeholder={t('settings.followersGoal.sections.general.completedPlaceholder')}
                        />
                    </ControlGroup>

                    <ControlGroup>
                        <Label>{t('settings.followersGoal.sections.general.customGoalLabel')}</Label>
                        <InputField
                            type="text"
                            value={followersGoal.goalText ?? ''}
                            onChange={(e) => updateFollowersGoal('goalText', e.target.value || null)}
                            placeholder={t('settings.followersGoal.sections.general.customGoalPlaceholder')}
                        />
                    </ControlGroup>
                    </Section>

                    {/* Размеры и оформление */}
                    <Section>
                        <SectionHeader>
                            <SectionTitle>
                                <BiExpand />
                                {t('settings.followersGoal.sections.layout.title')}
                            </SectionTitle>
                        </SectionHeader>

                        <Row gap="20px">
                            <ControlGroup>
                                <SeekbarComponent
                                    title={t('settings.followersGoal.sections.layout.padding', {value: followersGoal.padding ?? 16})}
                                    min={0}
                                    max={40}
                                    value={followersGoal.padding ?? 16}
                                    step={1}
                                    width="200px"
                                    onChange={value => updateFollowersGoal('padding', value)}
                                />
                            </ControlGroup>

                            <ControlGroup>
                                <SeekbarComponent
                                    title={t('settings.followersGoal.sections.layout.spacing', {value: followersGoal.spacing ?? 12})}
                                    min={0}
                                    max={32}
                                    value={followersGoal.spacing ?? 12}
                                    step={1}
                                    width="200px"
                                    onChange={value => updateFollowersGoal('spacing', value)}
                                />
                            </ControlGroup>
                        </Row>

                        <Row gap="20px">
                            <ControlGroup>
                                <SeekbarComponent
                                    title={t('settings.followersGoal.sections.layout.radius', {value: followersGoal.borderRadius ?? 12})}
                                    min={0}
                                    max={32}
                                    value={followersGoal.borderRadius ?? 12}
                                    step={1}
                                    width="200px"
                                    onChange={value => updateFollowersGoal('borderRadius', value)}
                                />
                            </ControlGroup>

                            <ControlGroup>
                                <SeekbarComponent
                                    title={t('settings.followersGoal.sections.layout.border', {value: followersGoal.borderWidth ?? 2})}
                                    min={0}
                                    max={8}
                                    value={followersGoal.borderWidth ?? 2}
                                    step={1}
                                    width="200px"
                                    onChange={value => updateFollowersGoal('borderWidth', value)}
                                />
                            </ControlGroup>
                        </Row>

                        <ColorGrid>
                            <ControlGroup>
                                <ColorSelectorButton
                                    openColorPopup={openColorPopup}
                                    title={t('settings.followersGoal.sections.layout.background')}
                                    alpha={parseRgbaToHexAndAlpha(followersGoal.backgroundColor ?? 1.0).alpha ?? 1.0}
                                    hex={parseRgbaToHexAndAlpha(followersGoal.backgroundColor ?? "#000000").hex ?? "#000000"}
                                    onColorChange={({color, alpha}) => {
                                        updateFollowersGoal('backgroundColor', hexToRgba(color, alpha));
                                    }}
                                />
                            </ControlGroup>

                            <ControlGroup>
                                <ColorSelectorButton
                                    openColorPopup={openColorPopup}
                                    title={t('settings.followersGoal.sections.layout.stroke')}
                                    alpha={parseRgbaToHexAndAlpha(followersGoal.borderColor ?? 1.0).alpha ?? 1.0}
                                    hex={parseRgbaToHexAndAlpha(followersGoal.borderColor ?? "#ffffff").hex ?? "#ffffff"}
                                    onColorChange={({color, alpha}) => {
                                        updateFollowersGoal('borderColor', hexToRgba(color, alpha));
                                    }}
                                />
                            </ControlGroup>
                        </ColorGrid>
                    </Section>

                    {/* Настройки прогресс-бара */}
                    <Section>
                        <SectionHeader>
                            <SectionTitle>
                                <FiBarChart2 />
                                {t('settings.followersGoal.sections.progressBar.title')}
                            </SectionTitle>
                        </SectionHeader>

                        <Row gap="20px">
                            <ControlGroup>
                                <SeekbarComponent
                                    title={t('settings.followersGoal.sections.progressBar.height', {value: followersGoal.barHeight ?? 24})}
                                    min={16}
                                    max={64}
                                    value={followersGoal.barHeight ?? 24}
                                    step={1}
                                    width="200px"
                                    onChange={value => updateFollowersGoal('barHeight', value)}
                                />
                            </ControlGroup>

                            <ControlGroup>
                                <SeekbarComponent
                                    title={t('settings.followersGoal.sections.progressBar.radius', {value: followersGoal.barBorderRadius ?? 12})}
                                    min={0}
                                    max={32}
                                    value={followersGoal.barBorderRadius ?? 12}
                                    step={1}
                                    width="200px"
                                    onChange={value => updateFollowersGoal('barBorderRadius', value)}
                                />
                            </ControlGroup>
                        </Row>

                        <Row gap="20px">
                            <ControlGroup>
                                <Label>{t('settings.followersGoal.sections.progressBar.glow.label')}</Label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Switch
                                        checked={followersGoal.barGlow ?? true}
                                        onChange={(e) => updateFollowersGoal('barGlow', e.target.checked)}
                                    />
                                    <span style={{ fontSize: '0.85rem', color: '#999' }}>
                                        {followersGoal.barGlow ? t('settings.shared.toggle.enabled') : t('settings.shared.toggle.disabled')}
                                    </span>
                                </div>
                            </ControlGroup>

                            <Spacer />

                            <ControlGroup>
                                <Label>{t('settings.followersGoal.sections.progressBar.animation.label')}</Label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Switch
                                        checked={followersGoal.animateOnComplete ?? true}
                                        onChange={(e) => updateFollowersGoal('animateOnComplete', e.target.checked)}
                                    />
                                    <span style={{ fontSize: '0.85rem', color: '#999' }}>
                                        {followersGoal.animateOnComplete ? t('settings.shared.toggle.enabled') : t('settings.shared.toggle.disabled')}
                                    </span>
                                </div>
                            </ControlGroup>
                        </Row>

                        <ColorGrid>
                            <ControlGroup>
                                <ColorSelectorButton
                                    openColorPopup={openColorPopup}
                                    title={t('settings.followersGoal.sections.progressBar.background')}
                                    alpha={parseRgbaToHexAndAlpha(followersGoal.barBackground ?? 1.0).alpha ?? 1.0}
                                    hex={parseRgbaToHexAndAlpha(followersGoal.barBackground ?? "#000000").hex ?? "#000000"}
                                    onColorChange={({color, alpha}) => {
                                        updateFollowersGoal('barBackground', hexToRgba(color, alpha));
                                    }}
                                />
                            </ControlGroup>

                            <ControlGroup>
                                <ColorSelectorButton
                                    openColorPopup={openColorPopup}
                                    title={t('settings.followersGoal.sections.progressBar.border')}
                                    alpha={parseRgbaToHexAndAlpha(followersGoal.barBorderColor ?? 1.0).alpha ?? 1.0}
                                    hex={parseRgbaToHexAndAlpha(followersGoal.barBorderColor ?? "#ffffff").hex ?? "#ffffff"}
                                    onColorChange={({color, alpha}) => {
                                        updateFollowersGoal('barBorderColor', hexToRgba(color, alpha));
                                    }}
                                />
                            </ControlGroup>
                        </ColorGrid>

                        <ControlGroup>
                            <Label>{t('settings.followersGoal.sections.progressBar.gradient')}</Label>
                            <InputField
                                type="text"
                                value={followersGoal.barGradient ?? 'linear-gradient(90deg, #9b74ff 0%, #7c4dff 100%)'}
                                onChange={(e) => updateFollowersGoal('barGradient', e.target.value)}
                                placeholder="linear-gradient(90deg, #9b74ff 0%, #7c4dff 100%)"
                            />
                        </ControlGroup>

                        <ControlGroup>
                            <Label>{t('settings.followersGoal.sections.progressBar.completedGradient')}</Label>
                            <InputField
                                type="text"
                                value={followersGoal.completedGradient ?? 'linear-gradient(90deg, #00ff88 0%, #00cc6a 100%)'}
                                onChange={(e) => updateFollowersGoal('completedGradient', e.target.value)}
                                placeholder="linear-gradient(90deg, #00ff88 0%, #00cc6a 100%)"
                            />
                        </ControlGroup>
                    </Section>

                    {/* Настройки текста */}
                    <Section>
                        <SectionHeader>
                            <SectionTitle>
                                <FiType />
                                {t('settings.followersGoal.sections.text.title')}
                            </SectionTitle>
                        </SectionHeader>

                        <ColorGrid>
                            <TextPropertyCard>
                                <TextPropertyTitle>
                                    <FiTarget />
                                    {t('settings.followersGoal.sections.text.cards.header.title')}
                                </TextPropertyTitle>
                                <ControlGroup>
                                    <ColorSelectorButton
                                        openColorPopup={openColorPopup}
                                        title={t('settings.shared.controls.textColor')}
                                        alpha={1.0}
                                        hex={followersGoal.titleColor ?? "#ffffff"}
                                        onColorChange={({color}) => {
                                            updateFollowersGoal('titleColor', color);
                                        }}
                                    />
                                </ControlGroup>
                                <ControlGroup>
                                    <FontAndSizeEditor
                                        title={t('settings.shared.controls.font')}
                                        fontSize={followersGoal.titleFont?.size ?? 18}
                                        fontFamily={followersGoal.titleFont?.family ?? "Arial"}
                                        onFontChange={({family, url}) => {
                                            updateFollowersGoal('titleFont.family', family);
                                            updateFollowersGoal('titleFont.url', url);
                                        }}
                                        onFontSizeChange={value => {
                                            updateFollowersGoal('titleFont.size', value);
                                        }}
                                    />
                                </ControlGroup>
                                <ControlGroup>
                                    <SeekbarComponent
                                        title={t('settings.shared.controls.weight', {value: followersGoal.titleFont?.weight ?? 700})}
                                        min={100}
                                        max={900}
                                        value={followersGoal.titleFont?.weight ?? 700}
                                        step={100}
                                        width="200px"
                                        onChange={value => updateFollowersGoal('titleFont.weight', value)}
                                    />
                                </ControlGroup>
                                <ControlGroup>
                                    <Label>{t('settings.followersGoal.sections.text.cards.header.glow')}</Label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Switch
                                            checked={followersGoal.titleGlow ?? true}
                                            onChange={(e) => updateFollowersGoal('titleGlow', e.target.checked)}
                                        />
                                    </div>
                                </ControlGroup>
                            </TextPropertyCard>

                            <TextPropertyCard>
                                <TextPropertyTitle>
                                    <FiBarChart2 />
                                    {t('settings.followersGoal.sections.text.cards.counter.title')}
                                </TextPropertyTitle>
                                <ControlGroup>
                                    <ColorSelectorButton
                                        openColorPopup={openColorPopup}
                                        title={t('settings.shared.controls.textColor')}
                                        alpha={1.0}
                                        hex={followersGoal.counterColor ?? "#9b74ff"}
                                        onColorChange={({color}) => {
                                            updateFollowersGoal('counterColor', color);
                                        }}
                                    />
                                </ControlGroup>
                                <ControlGroup>
                                    <FontAndSizeEditor
                                        title={t('settings.shared.controls.font')}
                                        fontSize={followersGoal.counterFont?.size ?? 20}
                                        fontFamily={followersGoal.counterFont?.family ?? "Arial"}
                                        onFontChange={({family, url}) => {
                                            updateFollowersGoal('counterFont.family', family);
                                            updateFollowersGoal('counterFont.url', url);
                                        }}
                                        onFontSizeChange={value => {
                                            updateFollowersGoal('counterFont.size', value);
                                        }}
                                    />
                                </ControlGroup>
                                <ControlGroup>
                                    <SeekbarComponent
                                        title={t('settings.shared.controls.weight', {value: followersGoal.counterFont?.weight ?? 700})}
                                        min={100}
                                        max={900}
                                        value={followersGoal.counterFont?.weight ?? 700}
                                        step={100}
                                        width="200px"
                                        onChange={value => updateFollowersGoal('counterFont.weight', value)}
                                    />
                                </ControlGroup>
                            </TextPropertyCard>

                            <TextPropertyCard>
                                <TextPropertyTitle>
                                    <FiType />
                                    {t('settings.followersGoal.sections.text.cards.percentage.title')}
                                </TextPropertyTitle>
                                <ControlGroup>
                                    <ColorSelectorButton
                                        openColorPopup={openColorPopup}
                                        title={t('settings.shared.controls.textColor')}
                                        alpha={1.0}
                                        hex={followersGoal.percentageColor ?? "#ffffff"}
                                        onColorChange={({color}) => {
                                            updateFollowersGoal('percentageColor', color);
                                        }}
                                    />
                                </ControlGroup>
                                <ControlGroup>
                                    <FontAndSizeEditor
                                        title={t('settings.shared.controls.font')}
                                        fontSize={followersGoal.percentageFont?.size ?? 14}
                                        fontFamily={followersGoal.percentageFont?.family ?? "Arial"}
                                        onFontChange={({family, url}) => {
                                            updateFollowersGoal('percentageFont.family', family);
                                            updateFollowersGoal('percentageFont.url', url);
                                        }}
                                        onFontSizeChange={value => {
                                            updateFollowersGoal('percentageFont.size', value);
                                        }}
                                    />
                                </ControlGroup>
                                <ControlGroup>
                                    <SeekbarComponent
                                        title={t('settings.shared.controls.weight', {value: followersGoal.percentageFont?.weight ?? 600})}
                                        min={100}
                                        max={900}
                                        value={followersGoal.percentageFont?.weight ?? 600}
                                        step={100}
                                        width="200px"
                                        onChange={value => updateFollowersGoal('percentageFont.weight', value)}
                                    />
                                </ControlGroup>
                            </TextPropertyCard>

                            <TextPropertyCard>
                                <TextPropertyTitle>
                                    <FiType />
                                    {t('settings.followersGoal.sections.text.cards.goal.title')}
                                </TextPropertyTitle>
                                <ControlGroup>
                                    <ColorSelectorButton
                                        openColorPopup={openColorPopup}
                                        title={t('settings.shared.controls.textColor')}
                                        alpha={0.7}
                                        hex={followersGoal.goalColor ?? "#ffffff"}
                                        onColorChange={({color, alpha}) => {
                                            const r = parseInt(color.slice(1,3), 16);
                                            const g = parseInt(color.slice(3,5), 16);
                                            const b = parseInt(color.slice(5,7), 16);
                                            updateFollowersGoal('goalColor', `rgba(${r}, ${g}, ${b}, ${alpha})`);
                                        }}
                                    />
                                </ControlGroup>
                                <ControlGroup>
                                    <FontAndSizeEditor
                                        title={t('settings.shared.controls.font')}
                                        fontSize={followersGoal.goalFont?.size ?? 14}
                                        fontFamily={followersGoal.goalFont?.family ?? "Arial"}
                                        onFontChange={({family, url}) => {
                                            updateFollowersGoal('goalFont.family', family);
                                            updateFollowersGoal('goalFont.url', url);
                                        }}
                                        onFontSizeChange={value => {
                                            updateFollowersGoal('goalFont.size', value);
                                        }}
                                    />
                                </ControlGroup>
                                <ControlGroup>
                                    <SeekbarComponent
                                        title={t('settings.shared.controls.topMargin', {value: followersGoal.goalTextMargin ?? 4})}
                                        min={0}
                                        max={24}
                                        value={followersGoal.goalTextMargin ?? 4}
                                        step={1}
                                        width="200px"
                                        onChange={value => updateFollowersGoal('goalTextMargin', value)}
                                    />
                                </ControlGroup>
                            </TextPropertyCard>

                            <TextPropertyCard>
                                <TextPropertyTitle>
                                    <FiTarget />
                                    {t('settings.followersGoal.sections.text.cards.completed.title')}
                                </TextPropertyTitle>
                                <ControlGroup>
                                    <ColorSelectorButton
                                        openColorPopup={openColorPopup}
                                        title={t('settings.shared.controls.textColor')}
                                        alpha={1.0}
                                        hex={followersGoal.completedColor ?? "#00ff88"}
                                        onColorChange={({color}) => {
                                            updateFollowersGoal('completedColor', color);
                                        }}
                                    />
                                </ControlGroup>
                                <ControlGroup>
                                    <FontAndSizeEditor
                                        title={t('settings.shared.controls.font')}
                                        fontSize={followersGoal.completedFont?.size ?? 16}
                                        fontFamily={followersGoal.completedFont?.family ?? "Arial"}
                                        onFontChange={({family, url}) => {
                                            updateFollowersGoal('completedFont.family', family);
                                            updateFollowersGoal('completedFont.url', url);
                                        }}
                                        onFontSizeChange={value => {
                                            updateFollowersGoal('completedFont.size', value);
                                        }}
                                    />
                                </ControlGroup>
                                <ControlGroup>
                                    <SeekbarComponent
                                        title={t('settings.shared.controls.weight', {value: followersGoal.completedFont?.weight ?? 700})}
                                        min={100}
                                        max={900}
                                        value={followersGoal.completedFont?.weight ?? 700}
                                        step={100}
                                        width="200px"
                                        onChange={value => updateFollowersGoal('completedFont.weight', value)}
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