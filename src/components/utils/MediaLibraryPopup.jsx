import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { FiX, FiUpload, FiImage, FiVideo, FiMusic, FiTrash2, FiCheck, FiFolder } from 'react-icons/fi';
import { getAllMediaFiles, saveMediaFile, deleteMediaFile } from '../../services/api';

const ALLOWED_TYPES = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    video: ['video/mp4', 'video/webm', 'video/quicktime'],
    audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/aac', 'audio/x-m4a'],
};

const ALL_ALLOWED_MIMES = [...ALLOWED_TYPES.image, ...ALLOWED_TYPES.video, ...ALLOWED_TYPES.audio];

const Overlay = styled.div`
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10003;
`;

const PopupContainer = styled.div`
    background: #1a1a1a;
    border-radius: 12px;
    width: 90%;
    max-width: 900px;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
    overflow: hidden;
`;

const Header = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid #333;
    background: #222;
`;

const Title = styled.h2`
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #fff;
    display: flex;
    align-items: center;
    gap: 8px;
`;

const CloseButton = styled.button`
    background: none;
    border: none;
    color: #888;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s;

    &:hover {
        color: #fff;
        background: #333;
    }
`;

const ControlsRow = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 20px;
    border-bottom: 1px solid #333;
    flex-wrap: wrap;
`;

const FilterTabs = styled.div`
    display: flex;
    gap: 4px;
    background: #2a2a2a;
    padding: 4px;
    border-radius: 8px;
`;

const FilterTab = styled.button`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border: none;
    border-radius: 6px;
    background: ${props => props.$active ? '#646cff' : 'transparent'};
    color: ${props => props.$active ? '#fff' : '#888'};
    cursor: pointer;
    font-size: 13px;
    transition: all 0.2s;

    &:hover {
        color: #fff;
        background: ${props => props.$active ? '#646cff' : '#333'};
    }
`;

const SortSelect = styled.select`
    padding: 8px 12px;
    border: 1px solid #444;
    border-radius: 6px;
    background: #2a2a2a;
    color: #fff;
    font-size: 13px;
    cursor: pointer;
    outline: none;

    &:focus {
        border-color: #646cff;
    }
`;

const Content = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
    min-height: 300px;
`;

const MediaGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 12px;
`;

const MediaItem = styled.div`
    position: relative;
    background: #2a2a2a;
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.2s;
    border: 2px solid ${props => props.$selected ? '#646cff' : 'transparent'};

    &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    &:hover .actions {
        opacity: 1;
    }
`;

const MediaPreview = styled.div`
    width: 100%;
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #1a1a1a;
    overflow: hidden;

    img, video {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
`;

const AudioPlaceholder = styled.div`
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
    color: #646cff;

    svg {
        width: 48px;
        height: 48px;
    }
`;

const TypeBadge = styled.div`
    position: absolute;
    top: 8px;
    left: 8px;
    padding: 4px 8px;
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.7);
    color: #fff;
    font-size: 10px;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: 4px;
`;

const MediaInfo = styled.div`
    padding: 10px;
`;

const FileName = styled.div`
    font-size: 12px;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 4px;
`;

const FileMeta = styled.div`
    font-size: 11px;
    color: #888;
`;

const ItemActions = styled.div`
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.2s;
`;

const ActionButton = styled.div`
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 6px;
    background: ${props => props.$danger ? 'rgba(239, 68, 68, 0.9)' : 'rgba(100, 108, 255, 0.9)'};
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;

    svg {
        width: 14px;
        height: 14px;
        color: #fff;
    }

    &:hover {
        transform: scale(1.1);
    }
`;

const SelectOverlay = styled.div`
    position: absolute;
    inset: 0;
    background: rgba(100, 108, 255, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;

    svg {
        width: 32px;
        height: 32px;
        color: #fff;
        background: #646cff;
        border-radius: 50%;
        padding: 6px;
    }
`;

const DropZone = styled.div`
    border: 2px dashed ${props => props.$isDragging ? '#646cff' : '#444'};
    border-radius: 12px;
    padding: 40px;
    text-align: center;
    color: ${props => props.$isDragging ? '#646cff' : '#888'};
    transition: all 0.2s;
    background: ${props => props.$isDragging ? 'rgba(100, 108, 255, 0.1)' : 'transparent'};
    margin-bottom: 16px;
    cursor: pointer;

    &:hover {
        border-color: #646cff;
        color: #646cff;
    }
`;

const DropIcon = styled.div`
    margin-bottom: 12px;
    svg {
        width: 48px;
        height: 48px;
    }
`;

const EmptyState = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    color: #666;
    text-align: center;

    svg {
        width: 64px;
        height: 64px;
        margin-bottom: 16px;
        opacity: 0.5;
    }
`;

const Footer = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    border-top: 1px solid #333;
    background: #222;
`;

const SelectedCount = styled.div`
    font-size: 13px;
    color: #888;
`;

const FooterActions = styled.div`
    display: flex;
    gap: 8px;
`;

const FooterButton = styled.button`
    padding: 8px 20px;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;

    &.primary {
        background: #646cff;
        color: #fff;

        &:hover {
            background: #7c3aed;
        }

        &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    }

    &.secondary {
        background: #333;
        color: #fff;

        &:hover {
            background: #444;
        }
    }
`;

const HiddenInput = styled.input`
    display: none;
`;

function formatFileSize(bytes, t) {
    if (bytes < 1024) return `${bytes} ${t('mediaLibrary.fileSize.b')}`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ${t('mediaLibrary.fileSize.kb')}`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} ${t('mediaLibrary.fileSize.mb')}`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} ${t('mediaLibrary.fileSize.gb')}`;
}

function formatDate(timestamp) {
    return new Date(timestamp).toLocaleDateString();
}

function getTypeIcon(type) {
    switch (type) {
        case 'image': return <FiImage size={12} />;
        case 'video': return <FiVideo size={12} />;
        case 'audio': return <FiMusic size={12} />;
        default: return null;
    }
}

function getMediaUrl(file) {
    // Add cache-buster based on dateAdded to force reload after upload
    const cacheBuster = file.dateAdded ? `?t=${file.dateAdded}` : '';
    let url;
    if (file.filename === file.originalName && file.type === 'image') {
        url = `/images/${encodeURIComponent(file.filename)}${cacheBuster}`;
    } else {
        const typeDir = file.type === 'image' ? 'images' : file.type === 'video' ? 'videos' : 'audio';
        url = `/media/${typeDir}/${encodeURIComponent(file.filename)}${cacheBuster}`;
    }
    console.log(`[MediaLibrary] getMediaUrl for ${file.originalName}: ${url}`);
    return url;
}

export default function MediaLibraryPopup({
    mode = 'manager',
    allowedTypes = null,
    multiple = false,
    onSelect,
    onClose,
}) {
    const { t } = useTranslation();
    const fileInputRef = useRef(null);
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [filter, setFilter] = useState('all');
    const [sortBy, setSortBy] = useState('dateAdded');
    const [isDragging, setIsDragging] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());

    const isPicker = mode === 'picker';

    const loadFiles = useCallback(async () => {
        try {
            const result = await getAllMediaFiles();
            setFiles(result || []);
        } catch (error) {
            console.error('Failed to load media files:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadFiles();
    }, [loadFiles]);

    const filteredFiles = useMemo(() => {
        let result = [...files];

        if (filter !== 'all') {
            const typeMap = { images: 'image', videos: 'video', audio: 'audio' };
            result = result.filter(f => f.type === typeMap[filter]);
        }

        if (allowedTypes && allowedTypes.length > 0) {
            result = result.filter(f => allowedTypes.includes(f.type));
        }

        result.sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.originalName.localeCompare(b.originalName);
                case 'type':
                    return a.type.localeCompare(b.type);
                case 'size':
                    return b.size - a.size;
                case 'dateAdded':
                default:
                    return b.dateAdded - a.dateAdded;
            }
        });

        return result;
    }, [files, filter, sortBy, allowedTypes]);

    const handleFileSelect = useCallback(async (fileList, source = 'unknown') => {
        console.log(`[MediaLibrary] handleFileSelect from ${source}, files:`, fileList.length);

        const validFiles = Array.from(fileList).filter(file => {
            const isAllowed = ALL_ALLOWED_MIMES.includes(file.type);
            console.log(`[MediaLibrary] File: ${file.name}, type: ${file.type}, size: ${file.size}, allowed: ${isAllowed}`);
            if (!isAllowed) {
                console.warn(`Skipping unsupported file type: ${file.type}`);
            }
            return isAllowed;
        });

        if (validFiles.length === 0) return;

        setUploading(true);

        // Process files sequentially using FileReader (same approach as BackgroundImageEditorComponent)
        const processFile = (file) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = async () => {
                    try {
                        console.log(`[MediaLibrary] FileReader loaded: ${file.name}, result type: ${typeof reader.result}, byteLength: ${reader.result?.byteLength}`);
                        await saveMediaFile(file.name, reader.result, file.type);
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                };
                reader.onerror = (err) => {
                    console.error(`[MediaLibrary] FileReader error for ${file.name}:`, err);
                    reject(err);
                };
                reader.readAsArrayBuffer(file);
            });
        };

        for (const file of validFiles) {
            try {
                await processFile(file);
            } catch (error) {
                console.error(`Failed to upload ${file.name}:`, error);
            }
        }

        await loadFiles();
        setUploading(false);
    }, [loadFiles]);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFileSelect(e.dataTransfer.files, 'drop');
    }, [handleFileSelect]);

    const handleDelete = useCallback(async (e, id) => {
        e.stopPropagation();
        if (!window.confirm(t('mediaLibrary.deleteConfirm'))) return;

        try {
            await deleteMediaFile(id);
            setFiles(prev => prev.filter(f => f.id !== id));
            setSelectedIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        } catch (error) {
            console.error('Failed to delete file:', error);
        }
    }, [t]);

    const handleItemClick = useCallback((file) => {
        if (isPicker) {
            if (multiple) {
                setSelectedIds(prev => {
                    const next = new Set(prev);
                    if (next.has(file.id)) {
                        next.delete(file.id);
                    } else {
                        next.add(file.id);
                    }
                    return next;
                });
            } else {
                setSelectedIds(new Set([file.id]));
            }
        }
    }, [isPicker, multiple]);

    const handleConfirmSelection = useCallback(() => {
        const selectedFiles = files.filter(f => selectedIds.has(f.id)).map(f => ({
            ...f,
            httpUrl: getMediaUrl(f),
        }));

        if (selectedFiles.length > 0) {
            onSelect?.(multiple ? selectedFiles : selectedFiles[0]);
        }
        onClose();
    }, [files, selectedIds, multiple, onSelect, onClose]);

    const getAcceptString = () => {
        if (allowedTypes) {
            return allowedTypes.flatMap(type => ALLOWED_TYPES[type] || []).join(',');
        }
        return ALL_ALLOWED_MIMES.join(',');
    };

    return ReactDOM.createPortal(
        <Overlay onClick={onClose}>
            <PopupContainer onClick={(e) => e.stopPropagation()}>
                <Header>
                    <Title>
                        <FiFolder size={20} />
                        {t('mediaLibrary.title')}
                    </Title>
                    <CloseButton onClick={onClose}>
                        <FiX size={20} />
                    </CloseButton>
                </Header>

                <ControlsRow>
                    <FilterTabs>
                        <FilterTab $active={filter === 'all'} onClick={() => setFilter('all')}>
                            {t('mediaLibrary.filters.all')}
                        </FilterTab>
                        {(!allowedTypes || allowedTypes.includes('image')) && (
                            <FilterTab $active={filter === 'images'} onClick={() => setFilter('images')}>
                                <FiImage size={14} />
                                {t('mediaLibrary.filters.images')}
                            </FilterTab>
                        )}
                        {(!allowedTypes || allowedTypes.includes('video')) && (
                            <FilterTab $active={filter === 'videos'} onClick={() => setFilter('videos')}>
                                <FiVideo size={14} />
                                {t('mediaLibrary.filters.videos')}
                            </FilterTab>
                        )}
                        {(!allowedTypes || allowedTypes.includes('audio')) && (
                            <FilterTab $active={filter === 'audio'} onClick={() => setFilter('audio')}>
                                <FiMusic size={14} />
                                {t('mediaLibrary.filters.audio')}
                            </FilterTab>
                        )}
                    </FilterTabs>

                    <SortSelect value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                        <option value="dateAdded">{t('mediaLibrary.sort.dateAdded')}</option>
                        <option value="name">{t('mediaLibrary.sort.name')}</option>
                        <option value="type">{t('mediaLibrary.sort.type')}</option>
                        <option value="size">{t('mediaLibrary.sort.size')}</option>
                    </SortSelect>

                    <HiddenInput
                        ref={fileInputRef}
                        type="file"
                        accept={getAcceptString()}
                        multiple
                        onChange={(e) => handleFileSelect(e.target.files, 'input')}
                    />
                </ControlsRow>

                <Content>
                    <DropZone
                        $isDragging={isDragging}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <DropIcon>
                            <FiUpload />
                        </DropIcon>
                        {t('mediaLibrary.dropHere')}
                    </DropZone>

                    {loading ? (
                        <EmptyState>
                            <FiFolder />
                            {t('common.loading')}
                        </EmptyState>
                    ) : filteredFiles.length === 0 ? (
                        <EmptyState>
                            <FiFolder />
                            {t('mediaLibrary.empty')}
                        </EmptyState>
                    ) : (
                        <MediaGrid>
                            {filteredFiles.map(file => (
                                <MediaItem
                                    key={file.id}
                                    $selected={selectedIds.has(file.id)}
                                    onClick={() => handleItemClick(file)}
                                >
                                    <MediaPreview>
                                        {file.type === 'image' && (
                                            <img src={getMediaUrl(file)} alt={file.originalName} loading="lazy" />
                                        )}
                                        {file.type === 'video' && (
                                            <video src={getMediaUrl(file)} muted preload="metadata" />
                                        )}
                                        {file.type === 'audio' && (
                                            <AudioPlaceholder>
                                                <FiMusic />
                                            </AudioPlaceholder>
                                        )}
                                    </MediaPreview>

                                    <TypeBadge>
                                        {getTypeIcon(file.type)}
                                        {file.type}
                                    </TypeBadge>

                                    <ItemActions className="actions">
                                        <ActionButton $danger onClick={(e) => handleDelete(e, file.id)} title="Delete">
                                            <FiTrash2 />
                                        </ActionButton>
                                    </ItemActions>

                                    {isPicker && selectedIds.has(file.id) && (
                                        <SelectOverlay>
                                            <FiCheck />
                                        </SelectOverlay>
                                    )}

                                    <MediaInfo>
                                        <FileName title={file.originalName}>{file.originalName}</FileName>
                                        <FileMeta>
                                            {formatFileSize(file.size, t)} &bull; {formatDate(file.dateAdded)}
                                        </FileMeta>
                                    </MediaInfo>
                                </MediaItem>
                            ))}
                        </MediaGrid>
                    )}
                </Content>

                {isPicker && (
                    <Footer>
                        <SelectedCount>
                            {t('mediaLibrary.selected', { count: selectedIds.size })}
                        </SelectedCount>
                        <FooterActions>
                            <FooterButton className="secondary" onClick={onClose}>
                                {t('mediaLibrary.cancel')}
                            </FooterButton>
                            <FooterButton
                                className="primary"
                                onClick={handleConfirmSelection}
                                disabled={selectedIds.size === 0}
                            >
                                {t('mediaLibrary.confirm')}
                            </FooterButton>
                        </FooterActions>
                    </Footer>
                )}
            </PopupContainer>
        </Overlay>,
        document.getElementById('popup-root')
    );
}
