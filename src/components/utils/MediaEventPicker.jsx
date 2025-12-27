import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { FiPlus, FiTrash2, FiImage, FiVideo, FiMusic, FiEdit2 } from 'react-icons/fi';
import { getAllMediaEvents } from '../../services/api';
import MediaEventEditorPopup from '../app/settings/bot/triggers/MediaEventEditorPopup';
import Popup from './PopupComponent';

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const SelectedList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const SelectedItem = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: rgba(40, 40, 40, 0.5);
    border: 1px solid #444;
    border-radius: 8px;
`;

const MediaIcon = styled.div`
    width: 32px;
    height: 32px;
    border-radius: 6px;
    background: rgba(100, 108, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #646cff;
    flex-shrink: 0;

    svg {
        width: 16px;
        height: 16px;
    }
`;

const MediaInfo = styled.div`
    flex: 1;
    min-width: 0;
`;

const MediaName = styled.div`
    font-size: 0.9rem;
    color: #e0e0e0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const MediaCaption = styled.div`
    font-size: 0.75rem;
    color: #888;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const IconButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: ${props => props.$danger ? '#dc2626' : '#888'};
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        background: ${props => props.$danger ? 'rgba(220, 38, 38, 0.1)' : 'rgba(100, 108, 255, 0.1)'};
        color: ${props => props.$danger ? '#dc2626' : '#646cff'};
    }

    svg {
        width: 14px;
        height: 14px;
    }
`;

const AddButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px;
    border: 1px dashed #444;
    border-radius: 8px;
    background: transparent;
    color: #888;
    cursor: pointer;
    font-size: 0.85rem;
    transition: all 0.2s ease;

    &:hover {
        border-color: #646cff;
        color: #646cff;
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;

// Selector popup
const SelectorContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 20px;
    min-width: 400px;
    max-height: 60vh;
`;

const SelectorTitle = styled.h3`
    margin: 0;
    font-size: 1.1rem;
    color: #e0e0e0;
`;

const EventsList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 300px;
    overflow-y: auto;
    padding-right: 8px;

    &::-webkit-scrollbar {
        width: 6px;
    }
    &::-webkit-scrollbar-track {
        background: #1e1e1e;
    }
    &::-webkit-scrollbar-thumb {
        background: #444;
        border-radius: 3px;
    }
`;

const EventOption = styled.button`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: ${props => props.$selected ? 'rgba(100, 108, 255, 0.15)' : 'rgba(30, 30, 30, 0.5)'};
    border: 1px solid ${props => props.$selected ? '#646cff' : '#333'};
    border-radius: 8px;
    cursor: pointer;
    text-align: left;
    transition: all 0.2s ease;

    &:hover {
        background: rgba(100, 108, 255, 0.1);
        border-color: #646cff;
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const CreateNewButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    background: rgba(100, 108, 255, 0.1);
    border: 1px dashed #646cff;
    border-radius: 8px;
    color: #646cff;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s ease;

    &:hover {
        background: rgba(100, 108, 255, 0.2);
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;

const EmptyMessage = styled.div`
    text-align: center;
    padding: 20px;
    color: #666;
    font-size: 0.9rem;
`;

const getMediaIcon = (type) => {
    switch (type) {
        case 'video': return <FiVideo />;
        case 'audio': return <FiMusic />;
        default: return <FiImage />;
    }
};

/**
 * Component for selecting media events to attach
 *
 * @param {string[]} value - Array of selected media event IDs
 * @param {Function} onChange - Callback when selection changes
 * @param {Object[]} availableVariables - Variables available for caption (passed to editor)
 * @param {number} maxItems - Maximum number of items (default: 2)
 * @param {Function} onMediaCreated - Callback when new media is created (to refresh lists)
 */
export default function MediaEventPicker({
    value = [],
    onChange,
    availableVariables = [],
    maxItems = 2,
    onMediaCreated
}) {
    const { t } = useTranslation();
    const [allEvents, setAllEvents] = useState([]);
    const [showSelector, setShowSelector] = useState(false);
    const [showEditor, setShowEditor] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);

    // Load all media events
    useEffect(() => {
        loadEvents();
    }, []);

    const loadEvents = async () => {
        try {
            const events = await getAllMediaEvents();
            setAllEvents(events || []);
        } catch (error) {
            console.error('Failed to load media events:', error);
        }
    };

    // Get full event data for selected IDs
    const selectedEvents = value
        .map(id => allEvents.find(e => e.id === id))
        .filter(Boolean);

    const handleRemove = (id) => {
        onChange(value.filter(v => v !== id));
    };

    const handleSelect = (id) => {
        if (!value.includes(id)) {
            onChange([...value, id]);
        }
        setShowSelector(false);
    };

    const handleEdit = (event) => {
        setEditingEvent(event);
        setShowEditor(true);
    };

    const handleCreateNew = () => {
        setEditingEvent(null);
        setShowEditor(true);
        setShowSelector(false);
    };

    const handleEditorSave = async (savedEvent) => {
        setShowEditor(false);
        setEditingEvent(null);
        await loadEvents();

        // If creating new, auto-select it
        if (!editingEvent && savedEvent?.id) {
            onChange([...value, savedEvent.id]);
        }

        if (onMediaCreated) {
            onMediaCreated(savedEvent);
        }
    };

    const availableToSelect = allEvents.filter(e => !value.includes(e.id));
    const canAddMore = value.length < maxItems;

    return (
        <Container>
            {selectedEvents.length > 0 && (
                <SelectedList>
                    {selectedEvents.map(event => (
                        <SelectedItem key={event.id}>
                            <MediaIcon>
                                {getMediaIcon(event.mediaType)}
                            </MediaIcon>
                            <MediaInfo>
                                <MediaName>{event.name}</MediaName>
                                {event.caption && (
                                    <MediaCaption>{event.caption}</MediaCaption>
                                )}
                            </MediaInfo>
                            <IconButton
                                onClick={() => handleEdit(event)}
                                title={t('common.edit', 'Edit')}
                            >
                                <FiEdit2 />
                            </IconButton>
                            <IconButton
                                $danger
                                onClick={() => handleRemove(event.id)}
                                title={t('common.delete', 'Remove')}
                            >
                                <FiTrash2 />
                            </IconButton>
                        </SelectedItem>
                    ))}
                </SelectedList>
            )}

            {canAddMore && (
                <AddButton onClick={() => setShowSelector(true)}>
                    <FiPlus />
                    {t('mediaEventPicker.addMedia', 'Add Media Event')}
                </AddButton>
            )}

            {/* Selector popup */}
            {showSelector && (
                <Popup onClose={() => setShowSelector(false)}>
                    <SelectorContent>
                        <SelectorTitle>
                            {t('mediaEventPicker.selectMedia', 'Select Media Event')}
                        </SelectorTitle>

                        <CreateNewButton onClick={handleCreateNew}>
                            <FiPlus />
                            {t('mediaEventPicker.createNew', 'Create New Media Event')}
                        </CreateNewButton>

                        {availableToSelect.length > 0 ? (
                            <EventsList>
                                {availableToSelect.map(event => (
                                    <EventOption
                                        key={event.id}
                                        onClick={() => handleSelect(event.id)}
                                    >
                                        <MediaIcon>
                                            {getMediaIcon(event.mediaType)}
                                        </MediaIcon>
                                        <MediaInfo>
                                            <MediaName>{event.name}</MediaName>
                                            {event.caption && (
                                                <MediaCaption>{event.caption}</MediaCaption>
                                            )}
                                        </MediaInfo>
                                    </EventOption>
                                ))}
                            </EventsList>
                        ) : (
                            <EmptyMessage>
                                {t('mediaEventPicker.noEvents', 'No media events available. Create a new one!')}
                            </EmptyMessage>
                        )}
                    </SelectorContent>
                </Popup>
            )}

            {/* Editor popup */}
            {showEditor && (
                <MediaEventEditorPopup
                    mediaEvent={editingEvent}
                    availableVariables={availableVariables}
                    onSave={handleEditorSave}
                    onClose={() => {
                        setShowEditor(false);
                        setEditingEvent(null);
                    }}
                />
            )}
        </Container>
    );
}
