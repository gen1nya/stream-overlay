import React, { useState } from "react";
import ReactDOM from "react-dom";
import styled from "styled-components";
import { useTranslation } from 'react-i18next';
import {
    FiX, FiSave, FiImage, FiVideo, FiType, FiDroplet, FiLayers
} from 'react-icons/fi';
import NumericEditorComponent from "../../../../utils/NumericEditorComponent";
import DebouncedTextarea from "../../../../utils/DebouncedTextarea";
import FontAndSizeEditor from "../../../../utils/FontAndSizeEditor";
import InlineColorPicker from "../../../../utils/InlineColorPicker";
import { v4 as uuidv4 } from 'uuid';
import { saveMediaEvent } from "../../../../../services/api";

const PopupOverlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 20px;
`;

const PopupContainer = styled.div`
    background: linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%);
    border: 1px solid #444;
    border-radius: 16px;
    max-width: 700px;
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
    padding: 16px 24px;
    border-bottom: 1px solid #333;
    background: linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(236, 72, 153, 0.05) 100%);
    flex-shrink: 0;

    h3 {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 600;
        color: #fff;
        display: flex;
        align-items: center;
        gap: 10px;

        svg {
            color: #ec4899;
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
    border: 1px solid ${props => props.$primary ? '#ec4899' : '#444'};
    border-radius: 8px;
    background: ${props => props.$primary ? '#ec4899' : 'rgba(107, 114, 128, 0.1)'};
    color: ${props => props.$primary ? '#fff' : '#888'};
    cursor: pointer;
    font-size: 0.85rem;
    transition: all 0.2s ease;

    &:hover {
        background: ${props => props.$primary ? '#db2777' : 'rgba(107, 114, 128, 0.2)'};
        border-color: ${props => props.$primary ? '#db2777' : '#555'};
        color: ${props => props.$primary ? '#fff' : '#ccc'};
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    svg {
        width: 14px;
        height: 14px;
    }
`;

const PopupContent = styled.div`
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;

    &::-webkit-scrollbar {
        width: 8px;
    }

    &::-webkit-scrollbar-track {
        background: #1e1e1e;
    }

    &::-webkit-scrollbar-thumb {
        background: #444;
        border-radius: 4px;
    }

    &::-webkit-scrollbar-thumb:hover {
        background: #555;
    }
`;

const Section = styled.div`
    background: rgba(40, 40, 40, 0.5);
    border: 1px solid #333;
    border-radius: 12px;
    flex-shrink: 0;
`;

const SectionHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    background: rgba(30, 30, 30, 0.5);
    border-bottom: 1px solid #333;

    svg {
        width: 16px;
        height: 16px;
        color: ${props => props.$color || '#ec4899'};
    }

    h4 {
        margin: 0;
        font-size: 0.9rem;
        font-weight: 600;
        color: #e0e0e0;
    }
`;

const SectionContent = styled.div`
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
`;

const FormRow = styled.div`
    display: flex;
    gap: 12px;
    align-items: ${props => props.$align || 'flex-start'};
    flex-wrap: wrap;
`;

const FormGroup = styled.div`
    flex: ${props => props.$flex || 1};
    min-width: ${props => props.$minWidth || '120px'};
`;

const Label = styled.label`
    display: block;
    margin-bottom: 6px;
    font-size: 0.8rem;
    color: #aaa;
`;

const Input = styled.input`
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #444;
    border-radius: 8px;
    background: #1e1e1e;
    color: #fff;
    font-size: 14px;
    transition: all 0.2s ease;
    box-sizing: border-box;

    &::placeholder {
        color: #666;
    }

    &:focus {
        outline: none;
        border-color: #ec4899;
        background: #252525;
    }
`;

const MediaTypeSelector = styled.div`
    display: flex;
    gap: 8px;
`;

const MediaTypeButton = styled.button`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border: 1px solid ${props => props.$selected ? '#ec4899' : '#333'};
    border-radius: 8px;
    background: ${props => props.$selected ? 'rgba(236, 72, 153, 0.15)' : 'rgba(30, 30, 30, 0.5)'};
    color: ${props => props.$selected ? '#fff' : '#888'};
    cursor: pointer;
    font-size: 0.85rem;
    transition: all 0.2s ease;

    &:hover {
        border-color: #ec4899;
        background: rgba(236, 72, 153, 0.1);
        color: #ccc;
    }

    svg {
        width: 16px;
        height: 16px;
        color: ${props => props.$selected ? '#ec4899' : '#666'};
    }
`;

const MediaPreview = styled.div`
    margin-top: 10px;
    border: 1px solid #333;
    border-radius: 8px;
    overflow: hidden;
    background: #1a1a1a;
    max-height: 150px;
    display: flex;
    align-items: center;
    justify-content: center;

    img, video {
        max-width: 100%;
        max-height: 150px;
        object-fit: contain;
    }
`;

const VariablesHint = styled.div`
    padding: 10px 12px;
    background: rgba(236, 72, 153, 0.05);
    border: 1px solid rgba(236, 72, 153, 0.2);
    border-radius: 6px;
    font-size: 0.75rem;
    color: #888;

    .title {
        color: #aaa;
        margin-bottom: 4px;
    }
`;

const VariableItem = styled.span`
    display: inline-block;
    margin-right: 10px;
    color: #ec4899;
    font-weight: 500;
    font-family: monospace;
`;

const StyleRow = styled.div`
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    align-items: flex-start;
`;

const ColorGroup = styled.div`
    flex: 1;
    min-width: 140px;
    max-width: 200px;
`;

const SmallInputGroup = styled.div`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
`;

const SmallInput = styled.div`
    flex: 1;
    min-width: 70px;
    max-width: 100px;
`;

const DEFAULT_STYLE = {
    fontSize: 24,
    fontFamily: 'Roboto',
    fontUrl: '',
    fontColor: '#ffffff',
    fontOpacity: 1,
    shadowColor: '#000000',
    shadowOpacity: 0.5,
    shadowRadius: 4,
    shadowOffsetX: 2,
    shadowOffsetY: 2,
    backgroundColor: '#000000',
    backgroundOpacity: 0.5
};

const DEFAULT_MEDIA_EVENT = {
    id: '',
    name: '',
    mediaType: 'image',
    mediaUrl: '',
    caption: '',
    displayDuration: 5,
    style: DEFAULT_STYLE
};

export default function MediaEventEditorPopup({ mediaEvent, onSave, onClose }) {
    const { t } = useTranslation();
    const [saving, setSaving] = useState(false);
    const [edited, setEdited] = useState(() => {
        if (mediaEvent) {
            return {
                ...DEFAULT_MEDIA_EVENT,
                ...mediaEvent,
                style: { ...DEFAULT_STYLE, ...mediaEvent.style }
            };
        }
        return { ...DEFAULT_MEDIA_EVENT, id: uuidv4() };
    });

    const updateField = (field, value) => {
        setEdited(prev => ({ ...prev, [field]: value }));
    };

    const updateStyle = (field, value) => {
        setEdited(prev => ({
            ...prev,
            style: { ...prev.style, [field]: value }
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const success = await saveMediaEvent(edited);
            if (success) {
                onSave(edited);
            } else {
                console.error('Failed to save media event');
            }
        } catch (error) {
            console.error('Error saving media event:', error);
        } finally {
            setSaving(false);
        }
    };

    const isValid = () => {
        return edited.name.trim() && edited.mediaUrl.trim() && !saving;
    };

    const handleFontChange = (font) => {
        updateStyle('fontFamily', font.family);
        updateStyle('fontUrl', font.url || '');
    };

    const portalRoot = document.getElementById('popup-root') || document.body;

    return ReactDOM.createPortal(
        <PopupOverlay onClick={onClose}>
            <PopupContainer onClick={(e) => e.stopPropagation()}>
                <PopupHeader>
                    <h3>
                        <FiImage />
                        {mediaEvent ? t('settings.bot.triggers.mediaEvent.editTitle') : t('settings.bot.triggers.mediaEvent.createTitle')}
                    </h3>
                    <HeaderActions>
                        <HeaderButton onClick={onClose}>
                            <FiX />
                            {t('common.cancel')}
                        </HeaderButton>
                        <HeaderButton $primary onClick={handleSave} disabled={!isValid()}>
                            <FiSave />
                            {saving ? t('common.saving') : t('common.save')}
                        </HeaderButton>
                    </HeaderActions>
                </PopupHeader>

                <PopupContent>
                    {/* Basic Info */}
                    <Section>
                        <SectionHeader $color="#ec4899">
                            <FiImage />
                            <h4>{t('settings.bot.triggers.mediaEvent.basicInfo')}</h4>
                        </SectionHeader>
                        <SectionContent>
                            <FormGroup>
                                <Label>{t('settings.bot.triggers.mediaEvent.name')}</Label>
                                <Input
                                    value={edited.name}
                                    onChange={(e) => updateField('name', e.target.value)}
                                    placeholder={t('settings.bot.triggers.mediaEvent.namePlaceholder')}
                                />
                            </FormGroup>

                            <FormRow>
                                <FormGroup $flex={2}>
                                    <Label>{t('settings.bot.triggers.mediaEvent.mediaType')}</Label>
                                    <MediaTypeSelector>
                                        <MediaTypeButton
                                            $selected={edited.mediaType === 'image'}
                                            onClick={() => updateField('mediaType', 'image')}
                                        >
                                            <FiImage />
                                            {t('settings.bot.triggers.mediaEvent.image')}
                                        </MediaTypeButton>
                                        <MediaTypeButton
                                            $selected={edited.mediaType === 'video'}
                                            onClick={() => updateField('mediaType', 'video')}
                                        >
                                            <FiVideo />
                                            {t('settings.bot.triggers.mediaEvent.video')}
                                        </MediaTypeButton>
                                    </MediaTypeSelector>
                                </FormGroup>
                                <FormGroup $flex={1} $minWidth="100px">
                                    <Label>{t('settings.bot.triggers.mediaEvent.displayDuration')}</Label>
                                    <NumericEditorComponent
                                        width="100%"
                                        value={edited.displayDuration}
                                        onChange={(value) => updateField('displayDuration', value)}
                                        min={1}
                                        max={300}
                                    />
                                </FormGroup>
                            </FormRow>

                            <FormGroup>
                                <Label>{t('settings.bot.triggers.mediaEvent.mediaUrl')}</Label>
                                <Input
                                    value={edited.mediaUrl}
                                    onChange={(e) => updateField('mediaUrl', e.target.value)}
                                    placeholder={t('settings.bot.triggers.mediaEvent.mediaUrlPlaceholder')}
                                />
                                {edited.mediaUrl && (
                                    <MediaPreview>
                                        {edited.mediaType === 'image' ? (
                                            <img src={edited.mediaUrl} alt="Preview" onError={(e) => e.target.style.display = 'none'} />
                                        ) : (
                                            <video src={edited.mediaUrl} controls muted onError={(e) => e.target.style.display = 'none'} />
                                        )}
                                    </MediaPreview>
                                )}
                            </FormGroup>
                        </SectionContent>
                    </Section>

                    {/* Caption */}
                    <Section>
                        <SectionHeader $color="#3b82f6">
                            <FiType />
                            <h4>{t('settings.bot.triggers.mediaEvent.caption')}</h4>
                        </SectionHeader>
                        <SectionContent>
                            <FormGroup>
                                <Label>{t('settings.bot.triggers.mediaEvent.captionTemplate')}</Label>
                                <DebouncedTextarea
                                    value={edited.caption}
                                    onChange={(value) => updateField('caption', value)}
                                    placeholder={t('settings.bot.triggers.mediaEvent.captionPlaceholder')}
                                    maxLength={500}
                                    minHeight="60px"
                                />
                            </FormGroup>
                            <VariablesHint>
                                <div className="title">{t('settings.bot.triggers.availableVariables')}:</div>
                                <VariableItem>${'{user}'}</VariableItem>
                                <VariableItem>${'{target}'}</VariableItem>
                                <VariableItem>${'{reward}'}</VariableItem>
                                <VariableItem>${'{reward_cost}'}</VariableItem>
                                <VariableItem>${'{raider}'}</VariableItem>
                                <VariableItem>${'{viewers}'}</VariableItem>
                            </VariablesHint>
                        </SectionContent>
                    </Section>

                    {/* Text Styles */}
                    <Section>
                        <SectionHeader $color="#8b5cf6">
                            <FiDroplet />
                            <h4>{t('settings.bot.triggers.mediaEvent.textStyles')}</h4>
                        </SectionHeader>
                        <SectionContent>
                            <StyleRow>
                                <FontAndSizeEditor
                                    title={t('settings.bot.triggers.mediaEvent.font')}
                                    fontFamily={edited.style.fontFamily}
                                    fontSize={edited.style.fontSize}
                                    onFontChange={handleFontChange}
                                    onFontSizeChange={(size) => updateStyle('fontSize', size)}
                                    min={8}
                                    max={200}
                                    width="auto"
                                />
                                <ColorGroup>
                                    <InlineColorPicker
                                        title={t('settings.bot.triggers.mediaEvent.fontColor')}
                                        color={edited.style.fontColor}
                                        alpha={edited.style.fontOpacity}
                                        onChange={({ color, alpha }) => {
                                            updateStyle('fontColor', color);
                                            updateStyle('fontOpacity', alpha);
                                        }}
                                    />
                                </ColorGroup>
                            </StyleRow>

                            <Label style={{ marginTop: '8px' }}>{t('settings.bot.triggers.mediaEvent.textShadow')}</Label>
                            <StyleRow>
                                <ColorGroup>
                                    <InlineColorPicker
                                        title={t('settings.bot.triggers.mediaEvent.shadowColor')}
                                        color={edited.style.shadowColor}
                                        alpha={edited.style.shadowOpacity}
                                        onChange={({ color, alpha }) => {
                                            updateStyle('shadowColor', color);
                                            updateStyle('shadowOpacity', alpha);
                                        }}
                                    />
                                </ColorGroup>
                                <SmallInputGroup>
                                    <SmallInput>
                                        <Label>{t('settings.bot.triggers.mediaEvent.shadowRadius')}</Label>
                                        <NumericEditorComponent
                                            width="100%"
                                            value={edited.style.shadowRadius}
                                            onChange={(value) => updateStyle('shadowRadius', value)}
                                            min={0}
                                            max={50}
                                        />
                                    </SmallInput>
                                    <SmallInput>
                                        <Label>{t('settings.bot.triggers.mediaEvent.shadowOffsetX')}</Label>
                                        <NumericEditorComponent
                                            width="100%"
                                            value={edited.style.shadowOffsetX}
                                            onChange={(value) => updateStyle('shadowOffsetX', value)}
                                            min={-50}
                                            max={50}
                                        />
                                    </SmallInput>
                                    <SmallInput>
                                        <Label>{t('settings.bot.triggers.mediaEvent.shadowOffsetY')}</Label>
                                        <NumericEditorComponent
                                            width="100%"
                                            value={edited.style.shadowOffsetY}
                                            onChange={(value) => updateStyle('shadowOffsetY', value)}
                                            min={-50}
                                            max={50}
                                        />
                                    </SmallInput>
                                </SmallInputGroup>
                            </StyleRow>
                        </SectionContent>
                    </Section>

                    {/* Background Styles */}
                    <Section>
                        <SectionHeader $color="#22c55e">
                            <FiLayers />
                            <h4>{t('settings.bot.triggers.mediaEvent.backgroundStyles')}</h4>
                        </SectionHeader>
                        <SectionContent>
                            <ColorGroup>
                                <InlineColorPicker
                                    title={t('settings.bot.triggers.mediaEvent.backgroundColor')}
                                    color={edited.style.backgroundColor}
                                    alpha={edited.style.backgroundOpacity}
                                    onChange={({ color, alpha }) => {
                                        updateStyle('backgroundColor', color);
                                        updateStyle('backgroundOpacity', alpha);
                                    }}
                                />
                            </ColorGroup>
                        </SectionContent>
                    </Section>
                </PopupContent>
            </PopupContainer>
        </PopupOverlay>,
        portalRoot
    );
}
