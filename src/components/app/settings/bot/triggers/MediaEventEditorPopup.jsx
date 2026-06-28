import React, { useState, useEffect, useId, useRef } from "react";
import styled from "styled-components";
import { tokens } from "../../../../../designSystem/tokens";
import { useTranslation } from 'react-i18next';
import {
    FiX, FiSave, FiImage, FiVideo, FiType, FiDroplet, FiLayers, FiGrid, FiMusic, FiFolder
} from 'react-icons/fi';
import NumericEditorComponent from "../../../../utils/NumericEditorComponent";
import DebouncedTextarea from "../../../../utils/DebouncedTextarea";
import FontAndSizeEditor from "../../../../utils/FontAndSizeEditor";
import InlineColorPicker from "../../../../utils/InlineColorPicker";
import MediaLibraryPopup from "../../../../utils/MediaLibraryPopup";
import { v4 as uuidv4 } from 'uuid';
import { saveMediaEvent, getAllMediaDisplayGroups } from "../../../../../services/api";
import { Portal } from "../../../../../context/PortalContext";
import { Button, Modal, ModalHeader, ModalTitle } from "../../../../../designSystem";

const HeaderActions = styled.div`
    display: flex;
    gap: 8px;
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
        background: ${tokens.color.bg.surface};
    }

    &::-webkit-scrollbar-thumb {
        background: #444;
        border-radius: ${tokens.radius.sm};
    }

    &::-webkit-scrollbar-thumb:hover {
        background: #555;
    }
`;

const Section = styled.div`
    background: rgba(40, 40, 40, 0.5);
    border: 1px solid ${tokens.color.border.subtle};
    border-radius: ${tokens.radius.xl};
    flex-shrink: 0;
`;

const SectionHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    background: rgba(30, 30, 30, 0.5);
    border-bottom: 1px solid ${tokens.color.border.subtle};

    svg {
        width: 16px;
        height: 16px;
        color: ${props => props.$color || '#ec4899'};
    }

    h4 {
        margin: 0;
        font-size: 0.9rem;
        font-weight: 600;
        color: ${tokens.color.text.secondary};
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
    border: 1px solid ${tokens.color.border.default};
    border-radius: ${tokens.radius.lg};
    background: ${tokens.color.bg.surface};
    color: ${tokens.color.text.primary};
    font-size: 14px;
    transition: ${tokens.transition.base};
    box-sizing: border-box;

    &::placeholder {
        color: ${tokens.color.text.disabled};
    }

    &:focus {
        outline: none;
        border-color: ${tokens.color.feature.media.base};
        background: #252525;
    }
`;

const Select = styled.select`
    width: 100%;
    padding: 10px 12px;
    border: 1px solid ${tokens.color.border.default};
    border-radius: ${tokens.radius.lg};
    background: ${tokens.color.bg.surface};
    color: ${tokens.color.text.primary};
    font-size: 14px;
    transition: ${tokens.transition.base};
    box-sizing: border-box;
    cursor: pointer;

    &:focus {
        outline: none;
        border-color: ${tokens.color.feature.media.base};
        background: #252525;
    }

    option {
        background: ${tokens.color.bg.surface};
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
    border: 1px solid ${props => props.$selected ? tokens.color.feature.media.base : '#333'};
    border-radius: ${tokens.radius.lg};
    background: ${props => props.$selected ? 'rgba(236, 72, 153, 0.15)' : 'rgba(30, 30, 30, 0.5)'};
    color: ${props => props.$selected ? '#fff' : '#888'};
    cursor: pointer;
    font-size: 0.85rem;
    transition: ${tokens.transition.base};

    &:hover {
        border-color: ${tokens.color.feature.media.base};
        background: rgba(236, 72, 153, 0.1);
        color: ${tokens.color.text.tertiary};
    }

    svg {
        width: 16px;
        height: 16px;
        color: ${props => props.$selected ? tokens.color.feature.media.base : '#666'};
    }
`;

const MediaUrlRow = styled.div`
    display: flex;
    gap: 8px;
    align-items: flex-start;
`;

const MediaUrlInput = styled(Input)`
    flex: 1;
`;

const LibraryButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px 14px;
    border: 1px solid ${tokens.color.border.default};
    border-radius: ${tokens.radius.lg};
    background: ${tokens.color.bg.raised};
    color: ${tokens.color.text.faint};
    cursor: pointer;
    transition: ${tokens.transition.base};
    flex-shrink: 0;

    &:hover {
        border-color: ${tokens.color.feature.media.base};
        background: rgba(236, 72, 153, 0.1);
        color: ${tokens.color.feature.media.base};
    }

    svg {
        width: 18px;
        height: 18px;
    }
`;

const MediaPreview = styled.div`
    margin-top: 10px;
    border: 1px solid ${tokens.color.border.subtle};
    border-radius: ${tokens.radius.lg};
    overflow: hidden;
    background: ${tokens.color.bg.base};
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
    border-radius: ${tokens.radius.md};
    font-size: 0.75rem;
    color: ${tokens.color.text.faint};

    .title {
        color: #aaa;
        margin-bottom: 4px;
    }
`;

const VariableItem = styled.button`
    display: inline-block;
    margin-right: 8px;
    margin-bottom: 4px;
    padding: 4px 8px;
    color: ${tokens.color.feature.media.base};
    font-weight: 500;
    font-family: monospace;
    font-size: 0.8rem;
    background: rgba(236, 72, 153, 0.1);
    border: 1px solid rgba(236, 72, 153, 0.3);
    border-radius: ${tokens.radius.sm};
    cursor: pointer;
    transition: ${tokens.transition.fast};

    &:hover {
        background: rgba(236, 72, 153, 0.2);
        border-color: rgba(236, 72, 153, 0.5);
    }

    &:active {
        transform: scale(0.95);
    }
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
    groupId: '',
    style: DEFAULT_STYLE
};

// Default variables for triggers (backwards compatibility)
const DEFAULT_TRIGGER_VARIABLES = [
    { name: 'user', description: 'Username who triggered' },
    { name: 'target', description: 'Target user' },
    { name: 'reward', description: 'Reward name' },
    { name: 'reward_cost', description: 'Reward cost' },
    { name: 'raider', description: 'Raider channel' },
    { name: 'viewers', description: 'Viewer count' },
];

export default function MediaEventEditorPopup({ mediaEvent, onSave, onClose, availableVariables = DEFAULT_TRIGGER_VARIABLES }) {
    const { t } = useTranslation();
    const [saving, setSaving] = useState(false);
    const [groups, setGroups] = useState([]);
    const [showLibrary, setShowLibrary] = useState(false);
    const captionRef = useRef(null);
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

    const insertVariable = (varName) => {
        const variableText = `\${${varName}}`;
        captionRef.current?.insertText(variableText);
    };

    // Load groups on mount
    useEffect(() => {
        const loadGroups = async () => {
            try {
                const groupsData = await getAllMediaDisplayGroups();
                setGroups(groupsData || []);
                // If no group is set and there are groups available, set the first one
                if (!edited.groupId && groupsData?.length > 0) {
                    setEdited(prev => ({ ...prev, groupId: groupsData[0].id }));
                }
            } catch (error) {
                console.error('Failed to load groups:', error);
            }
        };
        loadGroups();
    }, []);

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

    const handleLibrarySelect = (file) => {
        updateField('mediaUrl', file.httpUrl);
        // Auto-detect type from file
        if (file.type === 'audio') {
            updateField('mediaType', 'audio');
        } else if (file.type === 'video') {
            updateField('mediaType', 'video');
        } else {
            updateField('mediaType', 'image');
        }
        setShowLibrary(false);
    };

    const getAllowedLibraryTypes = () => {
        // Allow all types for media overlay
        return ['image', 'video', 'audio'];
    };

    const portalId = useId();

    return (
        <Portal
            id={`media-editor-${portalId}`}
            onClose={onClose}
            overlayBackground="rgba(0, 0, 0, 0.8)"
            padding="20px"
        >
            <Modal $maxWidth="700px" $maxHeight="90vh">
                <ModalHeader $feature="media">
                    <ModalTitle $feature="media">
                        <FiImage />
                        {mediaEvent ? t('settings.bot.triggers.mediaEvent.editTitle') : t('settings.bot.triggers.mediaEvent.createTitle')}
                    </ModalTitle>
                    <HeaderActions>
                        <Button $variant="ghost" $size="sm" onClick={onClose}>
                            <FiX />
                            {t('common.cancel')}
                        </Button>
                        <Button $variant="primary" $size="sm" onClick={handleSave} disabled={!isValid()}>
                            <FiSave />
                            {saving ? t('common.saving') : t('common.save')}
                        </Button>
                    </HeaderActions>
                </ModalHeader>

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
                                        <MediaTypeButton
                                            $selected={edited.mediaType === 'audio'}
                                            onClick={() => updateField('mediaType', 'audio')}
                                        >
                                            <FiMusic />
                                            {t('settings.bot.triggers.mediaEvent.audio')}
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
                                <Label>{t('settings.bot.triggers.mediaEvent.displayGroup')}</Label>
                                <Select
                                    value={edited.groupId}
                                    onChange={(e) => updateField('groupId', e.target.value)}
                                >
                                    {groups.length === 0 ? (
                                        <option value="">{t('settings.bot.triggers.mediaEvent.noGroups')}</option>
                                    ) : (
                                        groups.map(group => (
                                            <option key={group.id} value={group.id}>
                                                {group.name}
                                            </option>
                                        ))
                                    )}
                                </Select>
                            </FormGroup>

                            <FormGroup>
                                <Label>{t('settings.bot.triggers.mediaEvent.mediaUrl')}</Label>
                                <MediaUrlRow>
                                    <MediaUrlInput
                                        value={edited.mediaUrl}
                                        onChange={(e) => updateField('mediaUrl', e.target.value)}
                                        placeholder={t('settings.bot.triggers.mediaEvent.mediaUrlPlaceholder')}
                                    />
                                    <LibraryButton
                                        type="button"
                                        onClick={() => setShowLibrary(true)}
                                        title={t('mediaLibrary.chooseFromLibrary')}
                                    >
                                        <FiFolder />
                                    </LibraryButton>
                                </MediaUrlRow>
                                {edited.mediaUrl && (
                                    <MediaPreview>
                                        {edited.mediaType === 'image' ? (
                                            <img src={edited.mediaUrl} alt="Preview" onError={(e) => e.target.style.display = 'none'} />
                                        ) : edited.mediaType === 'video' ? (
                                            <video src={edited.mediaUrl} controls muted onError={(e) => e.target.style.display = 'none'} />
                                        ) : (
                                            <audio src={edited.mediaUrl} controls onError={(e) => e.target.style.display = 'none'} />
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
                                    ref={captionRef}
                                    value={edited.caption}
                                    onChange={(value) => updateField('caption', value)}
                                    placeholder={t('settings.bot.triggers.mediaEvent.captionPlaceholder')}
                                    maxLength={500}
                                    minHeight="60px"
                                />
                            </FormGroup>
                            {availableVariables.length > 0 && (
                                <VariablesHint>
                                    <div className="title">{t('settings.bot.triggers.availableVariables')} ({t('settings.bot.triggers.clickToInsert', 'click to insert')}):</div>
                                    {availableVariables.map(v => (
                                        <VariableItem
                                            key={v.name}
                                            type="button"
                                            title={v.description}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                insertVariable(v.name);
                                            }}
                                        >
                                            ${`{${v.name}}`}
                                        </VariableItem>
                                    ))}
                                </VariablesHint>
                            )}
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
            </Modal>

            {showLibrary && (
                <MediaLibraryPopup
                    mode="picker"
                    allowedTypes={getAllowedLibraryTypes()}
                    onSelect={handleLibrarySelect}
                    onClose={() => setShowLibrary(false)}
                />
            )}
        </Portal>
    );
}
