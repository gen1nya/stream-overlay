import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { FiPlus, FiEdit2, FiTrash2, FiImage, FiVideo, FiMusic, FiSearch, FiPlay, FiFilm } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { getAllMediaEvents, deleteMediaEvent, testMediaEvent, getAllMediaDisplayGroups } from '../../../services/api';
import MediaEventEditorPopup from './bot/triggers/MediaEventEditorPopup';
import Popup from '../../utils/PopupComponent';

const Container = styled.div`
    width: 100%;
`;

const Header = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    gap: 16px;
    flex-wrap: wrap;
`;

const SearchWrapper = styled.div`
    position: relative;
    flex: 1;
    min-width: 200px;
    max-width: 400px;
`;

const SearchInput = styled.input`
    width: 100%;
    padding: 10px 12px 10px 40px;
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

const SearchIcon = styled(FiSearch)`
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #666;
    width: 18px;
    height: 18px;
`;

const AddButton = styled.button`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 18px;
    border: 1px solid #ec4899;
    border-radius: 8px;
    background: rgba(236, 72, 153, 0.15);
    color: #ec4899;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    transition: all 0.2s ease;
    white-space: nowrap;

    &:hover {
        background: rgba(236, 72, 153, 0.25);
    }

    svg {
        width: 18px;
        height: 18px;
    }
`;

const FilterBar = styled.div`
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
    flex-wrap: wrap;
`;

const FilterButton = styled.button`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border: 1px solid ${props => props.$active ? '#ec4899' : '#444'};
    border-radius: 8px;
    background: ${props => props.$active ? 'rgba(236, 72, 153, 0.15)' : 'rgba(30, 30, 30, 0.5)'};
    color: ${props => props.$active ? '#fff' : '#888'};
    cursor: pointer;
    font-size: 0.85rem;
    transition: all 0.2s ease;

    &:hover {
        background: ${props => props.$active ? 'rgba(236, 72, 153, 0.2)' : 'rgba(40, 40, 40, 0.8)'};
        border-color: ${props => props.$active ? '#ec4899' : '#555'};
    }

    svg {
        width: 14px;
        height: 14px;
    }
`;

const MediaGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
`;

const MediaCard = styled.div`
    background: linear-gradient(135deg, rgba(40, 40, 40, 0.6) 0%, rgba(30, 30, 30, 0.8) 100%);
    border: 1px solid #333;
    border-radius: 12px;
    overflow: hidden;
    transition: all 0.2s ease;

    &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        border-color: #444;
    }
`;

const MediaPreview = styled.div`
    width: 100%;
    height: 140px;
    background: #1a1a1a;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    position: relative;

    img, video {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
    }
`;

const MediaTypeBadge = styled.div`
    position: absolute;
    top: 8px;
    left: 8px;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.7);
    color: ${props => {
        if (props.$type === 'image') return '#3b82f6';
        if (props.$type === 'video') return '#8b5cf6';
        return '#22c55e';
    }};
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;

    svg {
        width: 12px;
        height: 12px;
    }
`;

const MediaPlaceholder = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: #444;

    svg {
        width: 40px;
        height: 40px;
    }

    span {
        font-size: 0.75rem;
    }
`;

const MediaContent = styled.div`
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const MediaName = styled.h4`
    margin: 0;
    color: #e0e0e0;
    font-size: 1rem;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const MediaInfo = styled.div`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
`;

const InfoBadge = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 0.7rem;
    font-weight: 500;
    background: ${props => props.$bg || 'rgba(107, 114, 128, 0.2)'};
    color: ${props => props.$color || '#9ca3af'};
`;

const MediaActions = styled.div`
    display: flex;
    gap: 8px;
    padding-top: 10px;
    border-top: 1px solid #333;
`;

const ActionButton = styled.button`
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 12px;
    border: 1px solid ${props => props.$color || '#444'};
    border-radius: 6px;
    background: transparent;
    color: ${props => props.$color || '#888'};
    cursor: pointer;
    font-size: 0.8rem;
    transition: all 0.2s ease;

    &:hover {
        background: ${props => props.$color ? `${props.$color}15` : 'rgba(255, 255, 255, 0.05)'};
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

const EmptyState = styled.div`
    text-align: center;
    padding: 60px 20px;
    color: #666;

    svg {
        width: 64px;
        height: 64px;
        margin-bottom: 16px;
        color: #444;
    }

    h3 {
        margin: 0 0 8px;
        color: #888;
        font-size: 1.1rem;
    }

    p {
        margin: 0;
        font-size: 0.9rem;
    }
`;

// Popup styles
const PopupContent = styled.div`
    display: flex;
    padding: 20px;
    flex-direction: column;
    gap: 20px;
    min-width: 400px;
`;

const PopupTitle = styled.h2`
    font-size: 1.3rem;
    font-weight: bold;
    color: #d6d6d6;
    margin: 0;
`;

const PopupButtons = styled.div`
    display: flex;
    gap: 12px;
    justify-content: flex-end;
`;

const PopupButton = styled.button`
    padding: 10px 20px;
    border: 1px solid ${props => props.$primary ? '#ec4899' : '#555'};
    border-radius: 8px;
    background: ${props => props.$primary ? '#ec4899' : 'rgba(30, 30, 30, 0.8)'};
    color: ${props => props.$danger ? '#dc2626' : '#d6d6d6'};
    cursor: pointer;
    font-size: 0.95rem;
    font-weight: 500;
    transition: all 0.2s ease;

    &:hover {
        background: ${props => {
            if (props.$primary) return '#db2777';
            if (props.$danger) return 'rgba(220, 38, 38, 0.1)';
            return 'rgba(40, 40, 40, 0.9)';
        }};
        border-color: ${props => props.$danger ? '#dc2626' : (props.$primary ? '#db2777' : '#777')};
    }
`;

const ConfirmText = styled.p`
    color: #ccc;
    font-size: 1rem;
    margin: 0;
    line-height: 1.5;
`;

// Generic variables for standalone media editing
const GENERIC_VARIABLES = [
    { name: 'user', description: 'Username' },
    { name: 'target', description: 'Target user' },
    { name: 'item', description: 'Item name' },
    { name: 'reward', description: 'Reward name' },
    { name: 'reward_cost', description: 'Reward cost' },
];

function ConfirmDeletePopup({ mediaName, onClose, onConfirm }) {
    const { t } = useTranslation();
    return (
        <Popup onClose={onClose}>
            <PopupContent>
                <PopupTitle>{t('settings.mediaEvents.confirmDelete.title')}</PopupTitle>
                <ConfirmText>
                    {t('settings.mediaEvents.confirmDelete.message', { name: mediaName })}
                    <br />
                    {t('settings.mediaEvents.confirmDelete.warning')}
                </ConfirmText>
                <PopupButtons>
                    <PopupButton onClick={onClose}>
                        {t('common.cancel')}
                    </PopupButton>
                    <PopupButton $danger onClick={onConfirm}>
                        {t('common.delete')}
                    </PopupButton>
                </PopupButtons>
            </PopupContent>
        </Popup>
    );
}

export default function MediaEventsManager() {
    const { t } = useTranslation();
    const [mediaEvents, setMediaEvents] = useState([]);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [activePopup, setActivePopup] = useState(null); // 'add', 'edit', 'delete'
    const [selectedMedia, setSelectedMedia] = useState(null);

    // Load media events and groups
    const loadData = async () => {
        try {
            const [events, groupsData] = await Promise.all([
                getAllMediaEvents(),
                getAllMediaDisplayGroups()
            ]);
            setMediaEvents(events || []);
            setGroups(groupsData || []);
        } catch (error) {
            console.error('Failed to load media events:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Filter media events
    const filteredMedia = useMemo(() => {
        return mediaEvents.filter(media => {
            // Type filter
            if (typeFilter !== 'all' && media.mediaType !== typeFilter) {
                return false;
            }
            // Search filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                return media.name.toLowerCase().includes(query) ||
                       media.caption?.toLowerCase().includes(query);
            }
            return true;
        });
    }, [mediaEvents, typeFilter, searchQuery]);

    // Get group name by id
    const getGroupName = (groupId) => {
        const group = groups.find(g => g.id === groupId);
        return group?.name || t('settings.mediaEvents.noGroup');
    };

    // Get media type icon
    const getTypeIcon = (type) => {
        switch (type) {
            case 'image': return <FiImage />;
            case 'video': return <FiVideo />;
            case 'audio': return <FiMusic />;
            default: return <FiImage />;
        }
    };

    // Handle save (create or update)
    const handleSave = (savedEvent) => {
        setMediaEvents(prev => {
            const exists = prev.find(m => m.id === savedEvent.id);
            if (exists) {
                return prev.map(m => m.id === savedEvent.id ? savedEvent : m);
            }
            return [...prev, savedEvent];
        });
        setActivePopup(null);
        setSelectedMedia(null);
    };

    // Handle delete
    const handleDelete = async () => {
        if (!selectedMedia) return;
        try {
            await deleteMediaEvent(selectedMedia.id);
            setMediaEvents(prev => prev.filter(m => m.id !== selectedMedia.id));
        } catch (error) {
            console.error('Failed to delete media event:', error);
        }
        setActivePopup(null);
        setSelectedMedia(null);
    };

    // Handle test
    const handleTest = async (mediaId) => {
        try {
            await testMediaEvent(mediaId);
        } catch (error) {
            console.error('Failed to test media event:', error);
        }
    };

    // Counts by type
    const counts = useMemo(() => ({
        all: mediaEvents.length,
        image: mediaEvents.filter(m => m.mediaType === 'image').length,
        video: mediaEvents.filter(m => m.mediaType === 'video').length,
        audio: mediaEvents.filter(m => m.mediaType === 'audio').length,
    }), [mediaEvents]);

    if (loading) {
        return (
            <Container>
                <EmptyState>
                    <FiFilm />
                    <p>{t('common.loading')}</p>
                </EmptyState>
            </Container>
        );
    }

    return (
        <Container>
            <Header>
                <SearchWrapper>
                    <SearchIcon />
                    <SearchInput
                        type="text"
                        placeholder={t('settings.mediaEvents.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </SearchWrapper>
                <AddButton onClick={() => setActivePopup('add')}>
                    <FiPlus />
                    {t('settings.mediaEvents.addMedia')}
                </AddButton>
            </Header>

            <FilterBar>
                <FilterButton
                    $active={typeFilter === 'all'}
                    onClick={() => setTypeFilter('all')}
                >
                    {t('settings.mediaEvents.filters.all', { count: counts.all })}
                </FilterButton>
                <FilterButton
                    $active={typeFilter === 'image'}
                    onClick={() => setTypeFilter('image')}
                >
                    <FiImage />
                    {t('settings.mediaEvents.filters.images', { count: counts.image })}
                </FilterButton>
                <FilterButton
                    $active={typeFilter === 'video'}
                    onClick={() => setTypeFilter('video')}
                >
                    <FiVideo />
                    {t('settings.mediaEvents.filters.videos', { count: counts.video })}
                </FilterButton>
                <FilterButton
                    $active={typeFilter === 'audio'}
                    onClick={() => setTypeFilter('audio')}
                >
                    <FiMusic />
                    {t('settings.mediaEvents.filters.audio', { count: counts.audio })}
                </FilterButton>
            </FilterBar>

            {filteredMedia.length === 0 ? (
                <EmptyState>
                    <FiFilm />
                    <h3>{mediaEvents.length === 0
                        ? t('settings.mediaEvents.empty.title')
                        : t('settings.mediaEvents.empty.noResults')
                    }</h3>
                    <p>{mediaEvents.length === 0
                        ? t('settings.mediaEvents.empty.description')
                        : t('settings.mediaEvents.empty.tryDifferent')
                    }</p>
                </EmptyState>
            ) : (
                <MediaGrid>
                    {filteredMedia.map(media => (
                        <MediaCard key={media.id}>
                            <MediaPreview>
                                <MediaTypeBadge $type={media.mediaType}>
                                    {getTypeIcon(media.mediaType)}
                                    {media.mediaType}
                                </MediaTypeBadge>
                                {media.mediaUrl ? (
                                    media.mediaType === 'image' ? (
                                        <img
                                            src={media.mediaUrl}
                                            alt={media.name}
                                            onError={(e) => e.target.style.display = 'none'}
                                        />
                                    ) : media.mediaType === 'video' ? (
                                        <video
                                            src={media.mediaUrl}
                                            muted
                                            onError={(e) => e.target.style.display = 'none'}
                                        />
                                    ) : (
                                        <MediaPlaceholder>
                                            <FiMusic />
                                            <span>Audio</span>
                                        </MediaPlaceholder>
                                    )
                                ) : (
                                    <MediaPlaceholder>
                                        {getTypeIcon(media.mediaType)}
                                        <span>{t('settings.mediaEvents.noPreview')}</span>
                                    </MediaPlaceholder>
                                )}
                            </MediaPreview>
                            <MediaContent>
                                <MediaName title={media.name}>{media.name}</MediaName>
                                <MediaInfo>
                                    <InfoBadge $bg="rgba(236, 72, 153, 0.15)" $color="#ec4899">
                                        {getGroupName(media.groupId)}
                                    </InfoBadge>
                                    <InfoBadge>
                                        {media.displayDuration}s
                                    </InfoBadge>
                                </MediaInfo>
                                <MediaActions>
                                    <ActionButton
                                        $color="#22c55e"
                                        onClick={() => handleTest(media.id)}
                                        title={t('settings.mediaEvents.actions.test')}
                                    >
                                        <FiPlay />
                                    </ActionButton>
                                    <ActionButton
                                        $color="#3b82f6"
                                        onClick={() => {
                                            setSelectedMedia(media);
                                            setActivePopup('edit');
                                        }}
                                        title={t('settings.mediaEvents.actions.edit')}
                                    >
                                        <FiEdit2 />
                                        {t('settings.mediaEvents.actions.edit')}
                                    </ActionButton>
                                    <ActionButton
                                        $color="#dc2626"
                                        onClick={() => {
                                            setSelectedMedia(media);
                                            setActivePopup('delete');
                                        }}
                                        title={t('settings.mediaEvents.actions.delete')}
                                    >
                                        <FiTrash2 />
                                    </ActionButton>
                                </MediaActions>
                            </MediaContent>
                        </MediaCard>
                    ))}
                </MediaGrid>
            )}

            {/* Add/Edit Popup */}
            {(activePopup === 'add' || activePopup === 'edit') && (
                <MediaEventEditorPopup
                    mediaEvent={selectedMedia}
                    onSave={handleSave}
                    onClose={() => {
                        setActivePopup(null);
                        setSelectedMedia(null);
                    }}
                    availableVariables={GENERIC_VARIABLES}
                />
            )}

            {/* Delete Confirmation */}
            {activePopup === 'delete' && selectedMedia && (
                <ConfirmDeletePopup
                    mediaName={selectedMedia.name}
                    onClose={() => {
                        setActivePopup(null);
                        setSelectedMedia(null);
                    }}
                    onConfirm={handleDelete}
                />
            )}
        </Container>
    );
}
