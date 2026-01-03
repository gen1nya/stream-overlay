import React, { useState, useEffect, useCallback, useRef } from "react";
import styled from "styled-components";
import { useTranslation } from 'react-i18next';
import {
    FiPlus, FiTrash2, FiLayers, FiImage, FiPlay,
    FiExternalLink, FiCopy, FiMove, FiBox, FiZap, FiList, FiSettings,
    FiAlertTriangle, FiVideo
} from 'react-icons/fi';
import {
    getAllMediaDisplayGroups,
    saveMediaDisplayGroup,
    deleteMediaDisplayGroup,
    getAllMediaEvents,
    saveMediaEvent,
    testMediaGroup,
    openExternalLink
} from "../../services/api";
import { useWebSocket } from "../../context/WebSocketContext";
import { v4 as uuidv4 } from 'uuid';
import NumericEditorComponent from "../utils/NumericEditorComponent";
import Switch from "../utils/Switch";

// Layout
const Container = styled.div`
    display: flex;
    height: 100vh;
    background: #1a1a1a;
    color: #e0e0e0;
    font-family: 'Segoe UI', system-ui, sans-serif;
`;

const Sidebar = styled.div`
    width: ${props => props.$collapsed ? '0' : '280px'};
    min-width: ${props => props.$collapsed ? '0' : '280px'};
    background: #242424;
    border-right: 1px solid #333;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: all 0.2s ease;
`;

const SidebarHeader = styled.div`
    padding: 14px 16px;
    border-bottom: 1px solid #333;
    background: linear-gradient(135deg, rgba(100, 108, 255, 0.1) 0%, transparent 100%);

    h2 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;

        svg { color: #646cff; width: 18px; height: 18px; }
    }
`;

const SidebarContent = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 12px;

    &::-webkit-scrollbar { width: 6px; }
    &::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }
`;

const PreviewArea = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    background: #1a1a1a;
    min-width: 400px;
`;

const PreviewHeader = styled.div`
    padding: 10px 16px;
    border-bottom: 1px solid #333;
    display: flex;
    align-items: center;
    gap: 12px;
    background: #242424;

    h3 { margin: 0; font-size: 0.95rem; font-weight: 500; }
    .preview-controls { margin-left: auto; display: flex; gap: 8px; }
`;

const PreviewCanvas = styled.div`
    flex: 1;
    position: relative;
    background:
        linear-gradient(45deg, #2a2a2a 25%, transparent 25%),
        linear-gradient(-45deg, #2a2a2a 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #2a2a2a 75%),
        linear-gradient(-45deg, transparent 75%, #2a2a2a 75%);
    background-size: 20px 20px;
    background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
    background-color: #222;
    overflow: hidden;
`;

const CanvasViewport = styled.div`
    position: absolute;
    top: 20px;
    left: 20px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid #444;
`;

const ResolutionGuide = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    border: 1px dashed ${props => props.$color || '#666'};
    pointer-events: none;

    &::after {
        content: '${props => props.$label}';
        position: absolute;
        top: 2px;
        right: 4px;
        font-size: 10px;
        color: ${props => props.$color || '#666'};
        background: rgba(0, 0, 0, 0.5);
        padding: 1px 4px;
        border-radius: 2px;
    }
`;

const CoordinateOrigin = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    width: 12px;
    height: 12px;
    pointer-events: none;

    &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 5px;
        width: 2px;
        height: 12px;
        background: #ef4444;
    }

    &::after {
        content: '';
        position: absolute;
        top: 5px;
        left: 0;
        width: 12px;
        height: 2px;
        background: #22c55e;
    }
`;

const OriginLabel = styled.div`
    position: absolute;
    top: -16px;
    left: 0;
    font-size: 9px;
    color: #888;
    white-space: nowrap;
`;

const EditorPanel = styled.div`
    width: ${props => props.$visible ? '320px' : '0'};
    min-width: ${props => props.$visible ? '320px' : '0'};
    background: #242424;
    border-left: 1px solid #333;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: all 0.2s ease;
`;

const EditorHeader = styled.div`
    padding: 14px 16px;
    border-bottom: 1px solid #333;
    display: flex;
    align-items: center;
    gap: 10px;
    background: linear-gradient(135deg, rgba(100, 108, 255, 0.1) 0%, transparent 100%);

    h3 { margin: 0; font-size: 1rem; font-weight: 600; flex: 1; }
`;

const EditorContent = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 16px;

    &::-webkit-scrollbar { width: 6px; }
    &::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }
`;

// Groups list
const GroupCard = styled.div`
    background: ${props => props.$dropTarget ? 'rgba(236, 72, 153, 0.15)' : props.$selected ? 'rgba(100, 108, 255, 0.15)' : 'rgba(40, 40, 40, 0.5)'};
    border: 1px solid ${props => props.$dropTarget ? '#ec4899' : props.$selected ? '#646cff' : '#333'};
    border-radius: 8px;
    margin-bottom: 8px;
    padding: 10px 12px;
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    gap: 10px;
    position: relative;

    &:hover { border-color: ${props => props.$dropTarget ? '#ec4899' : props.$selected ? '#646cff' : '#555'}; }

    .group-icon {
        width: 28px; height: 28px;
        border-radius: 6px;
        display: flex; align-items: center; justify-content: center;
        background: ${props => props.$dropTarget ? 'rgba(236, 72, 153, 0.2)' : 'rgba(100, 108, 255, 0.2)'};
        color: ${props => props.$dropTarget ? '#ec4899' : '#646cff'};
        svg { width: 14px; height: 14px; }
    }

    .group-info {
        flex: 1; min-width: 0;
        h4 { margin: 0; font-size: 0.9rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .meta { font-size: 0.7rem; color: #888; margin-top: 2px; }
    }

    .drop-hint {
        position: absolute;
        right: 10px;
        font-size: 0.7rem;
        color: #ec4899;
        font-weight: 500;
    }
`;

const IconButton = styled.button`
    padding: 6px;
    border: 1px solid transparent;
    border-radius: 6px;
    background: transparent;
    color: #888;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s ease;

    &:hover { background: rgba(100, 108, 255, 0.1); border-color: rgba(100, 108, 255, 0.3); color: #646cff; }
    &.delete:hover { background: rgba(220, 38, 38, 0.1); border-color: rgba(220, 38, 38, 0.3); color: #dc2626; }
    svg { width: 14px; height: 14px; }
`;

const AddButton = styled.button`
    display: flex; align-items: center; justify-content: center; gap: 6px;
    width: 100%; padding: 10px;
    border: 2px dashed #444; border-radius: 8px;
    background: transparent; color: #888;
    cursor: pointer; font-size: 0.85rem;
    transition: all 0.15s ease;

    &:hover { border-color: #646cff; color: #646cff; background: rgba(100, 108, 255, 0.05); }
    svg { width: 16px; height: 16px; }
`;

const Button = styled.button`
    display: flex; align-items: center; gap: 6px;
    padding: 7px 12px;
    border: 1px solid ${props => props.$primary ? '#646cff' : '#444'};
    border-radius: 6px;
    background: ${props => props.$primary ? '#646cff' : 'rgba(40, 40, 40, 0.5)'};
    color: ${props => props.$primary ? '#fff' : '#aaa'};
    cursor: pointer; font-size: 0.8rem;
    transition: all 0.15s ease;
    opacity: ${props => props.disabled ? 0.5 : 1};
    pointer-events: ${props => props.disabled ? 'none' : 'auto'};

    &:hover { background: ${props => props.$primary ? '#5a5acf' : 'rgba(60, 60, 60, 0.5)'}; color: #fff; }
    svg { width: 14px; height: 14px; }
`;

// Preview
const PreviewGroup = styled.div`
    position: absolute;
    border: 2px dashed ${props => props.$selected ? '#646cff' : 'rgba(100, 108, 255, 0.3)'};
    background: ${props => props.$dragging ? 'rgba(100, 108, 255, 0.25)' : props.$selected ? 'rgba(100, 108, 255, 0.1)' : 'rgba(100, 108, 255, 0.05)'};
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    color: ${props => props.$selected ? '#fff' : '#888'};
    font-size: 0.8rem; font-weight: 500;
    cursor: ${props => props.$dragging ? 'grabbing' : 'grab'};
    transition: ${props => props.$dragging ? 'none' : 'all 0.15s ease'};
    user-select: none;

    &:hover { border-color: #646cff; background: rgba(100, 108, 255, 0.15); }
    &:active { cursor: grabbing; }
`;

// Editor form elements
const Section = styled.div`
    margin-bottom: 20px;
`;

const SectionTitle = styled.div`
    display: flex; align-items: center; gap: 8px;
    font-size: 0.8rem; font-weight: 600; color: #888;
    text-transform: uppercase; letter-spacing: 0.5px;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid #333;

    svg { width: 14px; height: 14px; color: #646cff; }
`;

const FormRow = styled.div`
    display: flex; gap: 10px; margin-bottom: 10px;
    align-items: ${props => props.$align || 'flex-start'};
`;

const FormGroup = styled.div`
    flex: ${props => props.$flex || 1};
    min-width: 0;
`;

const Label = styled.label`
    display: block;
    font-size: 0.75rem; color: #888;
    margin-bottom: 6px;
`;

const Input = styled.input`
    width: 100%; padding: 8px 10px;
    border: 1px solid #444; border-radius: 6px;
    background: #1e1e1e; color: #fff;
    font-size: 0.85rem;
    box-sizing: border-box;
    transition: all 0.15s ease;

    &:focus { outline: none; border-color: #646cff; background: #252525; }
`;

const Select = styled.select`
    width: 100%; height: 34px; padding: 0 10px;
    border: 1px solid #444; border-radius: 6px;
    background: #1e1e1e; color: #fff;
    font-size: 0.85rem; cursor: pointer;
    box-sizing: border-box;

    &:focus { outline: none; border-color: #646cff; }
    option { background: #1e1e1e; }
`;

const EmptyState = styled.div`
    text-align: center; padding: 40px 20px; color: #666;
    svg { width: 48px; height: 48px; margin-bottom: 16px; opacity: 0.5; }
    h4 { margin: 0 0 8px 0; color: #888; font-weight: 500; }
    p { margin: 0; font-size: 0.85rem; }
`;

// Media item in group preview
const MediaItemChip = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    background: ${props => props.$dragging ? 'rgba(236, 72, 153, 0.3)' : 'rgba(0, 0, 0, 0.6)'};
    border: 1px solid ${props => props.$dragging ? '#ec4899' : 'rgba(255, 255, 255, 0.2)'};
    border-radius: 4px;
    font-size: 0.65rem;
    color: #fff;
    cursor: grab;
    max-width: 90%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: all 0.15s ease;
    user-select: none;
    -webkit-user-select: none;

    &:hover {
        background: rgba(236, 72, 153, 0.2);
        border-color: #ec4899;
    }

    &:active { cursor: grabbing; }

    svg { width: 10px; height: 10px; flex-shrink: 0; }
`;

const GroupMediaList = styled.div`
    position: absolute;
    bottom: 4px;
    left: 4px;
    right: 4px;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    max-height: 60%;
    overflow: hidden;
`;

// Orphaned media section
const OrphanSection = styled.div`
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #444;
`;

const OrphanHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
    font-size: 0.85rem;
    color: #f59e0b;

    svg { width: 14px; height: 14px; }
`;

const OrphanList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const OrphanMediaItem = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    background: rgba(245, 158, 11, 0.1);
    border: 1px solid rgba(245, 158, 11, 0.3);
    border-radius: 6px;
    cursor: grab;
    transition: all 0.15s ease;
    user-select: none;
    -webkit-user-select: none;

    &:hover {
        background: rgba(245, 158, 11, 0.15);
        border-color: rgba(245, 158, 11, 0.5);
    }

    &:active {
        cursor: grabbing;
    }

    .media-icon {
        width: 24px;
        height: 24px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(245, 158, 11, 0.2);
        color: #f59e0b;
        flex-shrink: 0;
        svg { width: 12px; height: 12px; }
    }

    .media-info {
        flex: 1;
        min-width: 0;
        pointer-events: none;
        h5 { margin: 0; font-size: 0.8rem; font-weight: 500; color: #e0e0e0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .hint { font-size: 0.7rem; color: #888; }
    }
`;

// Drop zone indicator
const DropZone = styled.div`
    position: absolute;
    inset: 0;
    border: 2px dashed #ec4899;
    border-radius: 8px;
    background: rgba(236, 72, 153, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ec4899;
    font-size: 0.8rem;
    font-weight: 500;
    opacity: ${props => props.$active ? 1 : 0};
    pointer-events: ${props => props.$active ? 'auto' : 'none'};
    transition: opacity 0.15s ease;
`;

// Drag ghost that follows cursor
const DragGhost = styled.div`
    position: fixed;
    pointer-events: none;
    z-index: 10000;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: rgba(236, 72, 153, 0.9);
    border: 1px solid #ec4899;
    border-radius: 6px;
    color: #fff;
    font-size: 0.8rem;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    transform: translate(-50%, -50%);

    svg { width: 14px; height: 14px; }
`;

// Constants
const ANIMATION_TYPES = ['none', 'fade', 'slide-up', 'slide-down', 'slide-left', 'slide-right', 'scale', 'bounce'];
const QUEUE_MODES = ['sequential', 'replace', 'stack'];
const LAYOUT_MODES = ['overlay', 'stack-vertical', 'stack-horizontal'];
const PLACEMENT_MODES = ['fixed', 'random', 'stack'];
const STACK_DIRECTIONS = ['horizontal', 'vertical'];
const ANCHOR_POINTS = ['top-left', 'top-center', 'top-right', 'center-left', 'center', 'center-right', 'bottom-left', 'bottom-center', 'bottom-right'];
const EASING_TYPES = ['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out'];

const DEFAULT_GROUP = {
    enabled: true,
    position: { x: 100, y: 100 },
    size: { width: 0, height: 0, maxWidth: 400, maxHeight: 300, contentScale: 1, mediaWidth: 400, mediaHeight: 300 },
    layout: 'overlay',
    placement: 'fixed',
    randomSettings: { rotationEnabled: true, maxRotation: 15 },
    stackSettings: { direction: 'horizontal', gap: 10, wrap: true },
    anchor: 'center',
    animation: { in: 'fade', out: 'fade', inDuration: 300, outDuration: 300, easing: 'ease-out' },
    queue: { mode: 'sequential', maxItems: 10, gapBetween: 500 },
    defaultDuration: 5,
    zIndex: 100
};

// Resolution presets
const RESOLUTIONS = {
    '1080p': { width: 1920, height: 1080, color: '#646cff', label: '1080p' },
    '720p': { width: 1280, height: 720, color: '#22c55e', label: '720p' }
};

// Canvas scale factor (to fit resolutions on screen)
const CANVAS_SCALE = 0.5;

// Helper to calculate preview position (scaled for display)
const getPositionStyle = (position, size) => {
    const width = (size.width || size.maxWidth || 200) * CANVAS_SCALE;
    const height = (size.height || size.maxHeight || 150) * CANVAS_SCALE;

    return {
        left: position.x * CANVAS_SCALE,
        top: position.y * CANVAS_SCALE,
        width,
        height
    };
};

export default function MediaOverlayEditor() {
    const { t } = useTranslation();
    const [groups, setGroups] = useState([]);
    const [mediaEvents, setMediaEvents] = useState([]);
    const [selectedGroupId, setSelectedGroupId] = useState(null);
    const [loading, setLoading] = useState(true);

    // Group drag state
    const [dragState, setDragState] = useState(null);
    const canvasRef = useRef(null);

    // Media drag state
    const [mediaDragState, setMediaDragState] = useState(null); // { mediaId, fromGroupId, mediaName, mediaType }
    const [hoverGroupId, setHoverGroupId] = useState(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    // WebSocket for debug mode
    const { send } = useWebSocket();

    // Overlay URL
    const OVERLAY_URL = 'http://localhost:5173/media-overlay';

    // Debug mode state
    const [debugMode, setDebugMode] = useState(false);

    // Overlay settings (custom resolution)
    const [overlaySettings, setOverlaySettings] = useState({
        customResolution: {
            enabled: false,
            width: 1600,
            height: 900,
            color: '#f59e0b',
            label: 'Custom'
        }
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [groupsData, mediaData] = await Promise.all([
                getAllMediaDisplayGroups(),
                getAllMediaEvents()
            ]);
            setGroups(groupsData || []);
            setMediaEvents(mediaData || []);
            if (groupsData?.length > 0 && !selectedGroupId) {
                setSelectedGroupId(groupsData[0].id);
            }

            // Load overlay settings via IPC
            if (window.electron?.ipcRenderer) {
                const settings = await window.electron.ipcRenderer.invoke('media-overlay:get-settings');
                if (settings) {
                    setOverlaySettings(settings);
                }
            }
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Open overlay in external browser
    const handleOpenInBrowser = () => {
        openExternalLink(OVERLAY_URL);
    };

    // Copy overlay URL to clipboard
    const handleCopyUrl = async () => {
        try {
            await navigator.clipboard.writeText(OVERLAY_URL);
        } catch (error) {
            console.error('Failed to copy URL:', error);
        }
    };

    // Toggle debug mode via WebSocket
    const handleDebugToggle = (e) => {
        const enabled = e.target.checked;
        setDebugMode(enabled);
        send({ channel: 'media-overlay:set-debug', payload: { enabled } });
    };

    // Update custom resolution settings
    const updateCustomResolution = (updates) => {
        const newSettings = {
            ...overlaySettings,
            customResolution: {
                ...overlaySettings.customResolution,
                ...updates
            }
        };
        setOverlaySettings(newSettings);
        // Save via WebSocket (broadcasts to overlay)
        send({ channel: 'media-overlay:save-settings', payload: newSettings });
    };

    // Test selected group
    const handleTestGroup = async () => {
        if (!selectedGroupId) return;

        try {
            const result = await testMediaGroup(selectedGroupId);
            if (!result.success) {
                console.warn('Test failed:', result.error);
            }
        } catch (error) {
            console.error('Failed to test group:', error);
        }
    };

    const handleAddGroup = async () => {
        const newGroup = {
            id: uuidv4(),
            name: t('mediaOverlay.newGroup', 'New Group'),
            ...DEFAULT_GROUP
        };

        try {
            await saveMediaDisplayGroup(newGroup);
            setGroups(prev => [...prev, newGroup]);
            setSelectedGroupId(newGroup.id);
        } catch (error) {
            console.error('Failed to create group:', error);
        }
    };

    const handleDeleteGroup = async (groupId, e) => {
        e?.stopPropagation();
        if (groups.length <= 1) return;

        try {
            await deleteMediaDisplayGroup(groupId);
            const remaining = groups.filter(g => g.id !== groupId);
            setGroups(remaining);
            if (selectedGroupId === groupId) {
                setSelectedGroupId(remaining[0]?.id || null);
            }
        } catch (error) {
            console.error('Failed to delete group:', error);
        }
    };

    const updateGroup = useCallback(async (updates) => {
        if (!selectedGroupId) return;

        const updatedGroup = {
            ...groups.find(g => g.id === selectedGroupId),
            ...updates
        };

        // Update local state immediately
        setGroups(prev => prev.map(g => g.id === selectedGroupId ? updatedGroup : g));

        // Save to backend (debounced would be better, but keeping it simple)
        try {
            await saveMediaDisplayGroup(updatedGroup);
        } catch (error) {
            console.error('Failed to save group:', error);
        }
    }, [selectedGroupId, groups]);

    const updateGroupNested = useCallback((path, value) => {
        if (!selectedGroupId) return;

        const group = groups.find(g => g.id === selectedGroupId);
        if (!group) return;

        const keys = path.split('.');
        const updated = { ...group };
        let current = updated;

        for (let i = 0; i < keys.length - 1; i++) {
            current[keys[i]] = { ...current[keys[i]] };
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;

        updateGroup(updated);
    }, [selectedGroupId, groups, updateGroup]);

    // Drag handlers
    const handleDragStart = useCallback((e, group) => {
        e.preventDefault();
        setSelectedGroupId(group.id);
        setDragState({
            groupId: group.id,
            startX: e.clientX,
            startY: e.clientY,
            initialX: group.position.x,
            initialY: group.position.y
        });
    }, []);

    const handleDrag = useCallback((e) => {
        if (!dragState) return;

        // Convert mouse delta to unscaled coordinates
        const deltaX = (e.clientX - dragState.startX) / CANVAS_SCALE;
        const deltaY = (e.clientY - dragState.startY) / CANVAS_SCALE;

        const newX = Math.max(0, Math.round(dragState.initialX + deltaX));
        const newY = Math.max(0, Math.round(dragState.initialY + deltaY));

        // Update local state immediately for smooth dragging
        setGroups(prev => prev.map(g => {
            if (g.id !== dragState.groupId) return g;
            return {
                ...g,
                position: { x: newX, y: newY }
            };
        }));
    }, [dragState]);

    const handleDragEnd = useCallback(async () => {
        if (!dragState) return;

        const group = groups.find(g => g.id === dragState.groupId);
        if (group) {
            // Save to backend
            try {
                await saveMediaDisplayGroup(group);
            } catch (error) {
                console.error('Failed to save group position:', error);
            }
        }

        setDragState(null);
    }, [dragState, groups]);

    // Global mouse event listeners for dragging
    useEffect(() => {
        if (!dragState) return;

        const onMouseMove = (e) => handleDrag(e);
        const onMouseUp = () => handleDragEnd();

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [dragState, handleDrag, handleDragEnd]);

    // Media drag handlers
    const handleMediaDragStart = useCallback((e, media) => {
        e.preventDefault();
        e.stopPropagation();
        setMousePos({ x: e.clientX, y: e.clientY });
        setMediaDragState({
            mediaId: media.id,
            fromGroupId: media.groupId || null,
            mediaName: media.name,
            mediaType: media.mediaType
        });
    }, []);

    const handleMediaDragOver = useCallback((e, groupId) => {
        e.preventDefault();
        if (mediaDragState) {
            setHoverGroupId(groupId);
        }
    }, [mediaDragState]);

    const handleMediaDrop = useCallback(async (groupId) => {
        if (!mediaDragState) return;

        const { mediaId, fromGroupId } = mediaDragState;
        if (fromGroupId === groupId) {
            setMediaDragState(null);
            setHoverGroupId(null);
            return;
        }

        // Find and update the media event
        const media = mediaEvents.find(m => m.id === mediaId);
        if (!media) {
            setMediaDragState(null);
            setHoverGroupId(null);
            return;
        }

        const updatedMedia = { ...media, groupId };

        // Update local state immediately
        setMediaEvents(prev => prev.map(m => m.id === mediaId ? updatedMedia : m));

        // Save to backend
        try {
            await saveMediaEvent(updatedMedia);
        } catch (error) {
            console.error('Failed to update media group:', error);
            // Revert on error
            setMediaEvents(prev => prev.map(m => m.id === mediaId ? media : m));
        }

        setMediaDragState(null);
        setHoverGroupId(null);
    }, [mediaDragState, mediaEvents]);

    // Global mouse events for media drag
    useEffect(() => {
        if (!mediaDragState) return;

        const onMouseMove = (e) => {
            setMousePos({ x: e.clientX, y: e.clientY });
        };

        const onMouseUp = () => {
            setMediaDragState(null);
            setHoverGroupId(null);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [mediaDragState]);

    const getGroupMedia = (groupId) => mediaEvents.filter(m => m.groupId === groupId);
    const getOrphanedMedia = () => mediaEvents.filter(m => !m.groupId || !groups.some(g => g.id === m.groupId));

    const selectedGroup = groups.find(g => g.id === selectedGroupId);

    return (
        <Container>
            {/* Groups List */}
            <Sidebar $collapsed={false}>
                <SidebarHeader>
                    <h2><FiLayers />{t('mediaOverlay.groups', 'Groups')}</h2>
                </SidebarHeader>

                <SidebarContent>
                    {loading ? (
                        <EmptyState><p>{t('common.loading', 'Loading...')}</p></EmptyState>
                    ) : (
                        <>
                            {groups.map(group => {
                                const isDropTarget = mediaDragState && mediaDragState.fromGroupId !== group.id;
                                const isHovered = hoverGroupId === group.id;

                                return (
                                    <GroupCard
                                        key={group.id}
                                        $selected={selectedGroupId === group.id}
                                        $dropTarget={isDropTarget && isHovered}
                                        onClick={() => !mediaDragState && setSelectedGroupId(group.id)}
                                        onMouseEnter={() => isDropTarget && setHoverGroupId(group.id)}
                                        onMouseLeave={() => setHoverGroupId(null)}
                                        onMouseUp={() => isDropTarget && handleMediaDrop(group.id)}
                                    >
                                        <div className="group-icon"><FiLayers /></div>
                                        <div className="group-info">
                                            <h4>{group.name}</h4>
                                            <div className="meta">
                                                {group.position.x}, {group.position.y} | {group.animation.in} | {getGroupMedia(group.id).length} media
                                            </div>
                                        </div>
                                        {isDropTarget && isHovered && (
                                            <span className="drop-hint">{t('mediaOverlay.dropHere', 'Drop here')}</span>
                                        )}
                                        {!mediaDragState && groups.length > 1 && (
                                            <IconButton
                                                className="delete"
                                                onClick={(e) => handleDeleteGroup(group.id, e)}
                                            >
                                                <FiTrash2 />
                                            </IconButton>
                                        )}
                                    </GroupCard>
                                );
                            })}

                            <AddButton onClick={handleAddGroup}>
                                <FiPlus />{t('mediaOverlay.addGroup', 'Add Group')}
                            </AddButton>

                            {/* Orphaned media section */}
                            {getOrphanedMedia().length > 0 && (
                                <OrphanSection>
                                    <OrphanHeader>
                                        <FiAlertTriangle />
                                        {t('mediaOverlay.orphanedMedia', 'Unassigned Media')} ({getOrphanedMedia().length})
                                    </OrphanHeader>
                                    <OrphanList>
                                        {getOrphanedMedia().map(media => (
                                            <OrphanMediaItem
                                                key={media.id}
                                                onMouseDown={(e) => handleMediaDragStart(e, media)}
                                            >
                                                <div className="media-icon">
                                                    {media.mediaType === 'video' ? <FiVideo /> : <FiImage />}
                                                </div>
                                                <div className="media-info">
                                                    <h5>{media.name}</h5>
                                                    <div className="hint">{t('mediaOverlay.dragToGroup', 'Drag to a group')}</div>
                                                </div>
                                            </OrphanMediaItem>
                                        ))}
                                    </OrphanList>
                                </OrphanSection>
                            )}

                            {/* Custom Resolution Section */}
                            <Section style={{ marginTop: '16px' }}>
                                <SectionTitle><FiBox />{t('mediaOverlay.customResolution', 'Custom Resolution')}</SectionTitle>
                                <FormRow>
                                    <FormGroup>
                                        <Label>{t('mediaOverlay.resWidth', 'Width')}</Label>
                                        <NumericEditorComponent
                                            value={overlaySettings.customResolution?.width || 1600}
                                            onChange={(v) => updateCustomResolution({ width: v })}
                                            min={100} max={3840}
                                            width="100%"
                                        />
                                    </FormGroup>
                                    <FormGroup>
                                        <Label>{t('mediaOverlay.resHeight', 'Height')}</Label>
                                        <NumericEditorComponent
                                            value={overlaySettings.customResolution?.height || 900}
                                            onChange={(v) => updateCustomResolution({ height: v })}
                                            min={100} max={2160}
                                            width="100%"
                                        />
                                    </FormGroup>
                                </FormRow>
                                <FormGroup>
                                    <Label>{t('mediaOverlay.resColor', 'Color')}</Label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input
                                            type="color"
                                            value={overlaySettings.customResolution?.color || '#f59e0b'}
                                            onChange={(e) => updateCustomResolution({ color: e.target.value })}
                                            style={{ width: '40px', height: '30px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                        />
                                        <Input
                                            value={overlaySettings.customResolution?.color || '#f59e0b'}
                                            onChange={(e) => updateCustomResolution({ color: e.target.value })}
                                            style={{ flex: 1 }}
                                        />
                                    </div>
                                </FormGroup>
                            </Section>
                        </>
                    )}
                </SidebarContent>
            </Sidebar>

            {/* Preview */}
            <PreviewArea>
                <PreviewHeader>
                    <h3>{t('mediaOverlay.preview', 'Preview')}</h3>
                    <div className="preview-controls">
                        <Button
                            onClick={handleTestGroup}
                            disabled={!selectedGroupId || getGroupMedia(selectedGroupId).length === 0}
                            title={getGroupMedia(selectedGroupId || '').length === 0 ? t('mediaOverlay.noMediaToTest', 'No media in this group') : ''}
                        >
                            <FiPlay />{t('mediaOverlay.test', 'Test')}
                        </Button>
                        <Button onClick={handleOpenInBrowser}>
                            <FiExternalLink />{t('mediaOverlay.openInBrowser', 'Open')}
                        </Button>
                        <Button onClick={handleCopyUrl} title={OVERLAY_URL}>
                            <FiCopy />
                        </Button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '8px' }}>
                            <Switch checked={debugMode} onChange={handleDebugToggle} />
                            <span style={{ fontSize: '0.8rem', color: '#888' }}>{t('mediaOverlay.debug', 'Debug')}</span>
                        </div>
                    </div>
                </PreviewHeader>

                <PreviewCanvas ref={canvasRef}>
                    {/* Viewport with resolution guides */}
                    <CanvasViewport style={{
                        width: RESOLUTIONS['1080p'].width * CANVAS_SCALE,
                        height: RESOLUTIONS['1080p'].height * CANVAS_SCALE
                    }}>
                        {/* Resolution guides */}
                        <ResolutionGuide
                            $color={RESOLUTIONS['1080p'].color}
                            $label="1920×1080"
                            style={{
                                width: RESOLUTIONS['1080p'].width * CANVAS_SCALE,
                                height: RESOLUTIONS['1080p'].height * CANVAS_SCALE
                            }}
                        />
                        <ResolutionGuide
                            $color={RESOLUTIONS['720p'].color}
                            $label="1280×720"
                            style={{
                                width: RESOLUTIONS['720p'].width * CANVAS_SCALE,
                                height: RESOLUTIONS['720p'].height * CANVAS_SCALE
                            }}
                        />
                        {/* Custom resolution guide - always visible in editor */}
                        <ResolutionGuide
                            $color={overlaySettings.customResolution?.color || '#f59e0b'}
                            $label={`${overlaySettings.customResolution?.width || 1600}×${overlaySettings.customResolution?.height || 900}`}
                            style={{
                                width: (overlaySettings.customResolution?.width || 1600) * CANVAS_SCALE,
                                height: (overlaySettings.customResolution?.height || 900) * CANVAS_SCALE
                            }}
                        />

                        {/* Origin marker */}
                        <CoordinateOrigin>
                            <OriginLabel>0,0</OriginLabel>
                        </CoordinateOrigin>

                        {/* Groups */}
                        {groups.map(group => {
                            const groupMedia = getGroupMedia(group.id);
                            const isDropTarget = mediaDragState && mediaDragState.fromGroupId !== group.id;

                            return (
                                <PreviewGroup
                                    key={group.id}
                                    $selected={selectedGroupId === group.id}
                                    $dragging={dragState?.groupId === group.id}
                                    style={getPositionStyle(group.position, group.size)}
                                    onMouseDown={(e) => {
                                        if (!mediaDragState) handleDragStart(e, group);
                                    }}
                                    onMouseEnter={() => isDropTarget && setHoverGroupId(group.id)}
                                    onMouseLeave={() => setHoverGroupId(null)}
                                onMouseUp={() => isDropTarget && handleMediaDrop(group.id)}
                            >
                                <span style={{ position: 'absolute', top: 4, left: 0, right: 0, textAlign: 'center' }}>
                                    {group.name}
                                </span>
                                {groupMedia.length > 0 && (
                                    <GroupMediaList>
                                        {groupMedia.slice(0, 6).map(media => (
                                            <MediaItemChip
                                                key={media.id}
                                                $dragging={mediaDragState?.mediaId === media.id}
                                                onMouseDown={(e) => handleMediaDragStart(e, media)}
                                                title={media.name}
                                            >
                                                {media.mediaType === 'video' ? <FiVideo /> : <FiImage />}
                                                {media.name}
                                            </MediaItemChip>
                                        ))}
                                        {groupMedia.length > 6 && (
                                            <MediaItemChip style={{ cursor: 'default' }}>
                                                +{groupMedia.length - 6}
                                            </MediaItemChip>
                                        )}
                                    </GroupMediaList>
                                )}
                                <DropZone $active={hoverGroupId === group.id}>
                                    {t('mediaOverlay.dropHere', 'Drop here')}
                                </DropZone>
                            </PreviewGroup>
                        );
                    })}

                        {groups.length === 0 && !loading && (
                            <EmptyState style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                                <FiLayers />
                                <h4>{t('mediaOverlay.noGroups', 'No display groups')}</h4>
                                <p>{t('mediaOverlay.noGroupsHint', 'Create a group to start')}</p>
                            </EmptyState>
                        )}
                    </CanvasViewport>
                </PreviewCanvas>
            </PreviewArea>

            {/* Editor Panel */}
            <EditorPanel $visible={!!selectedGroup}>
                {selectedGroup && (
                    <>
                        <EditorHeader>
                            <h3>{t('mediaOverlay.editGroup', 'Edit Group')}</h3>
                        </EditorHeader>

                        <EditorContent>
                            {/* Name */}
                            <Section>
                                <SectionTitle><FiSettings />{t('mediaOverlay.general', 'General')}</SectionTitle>
                                <FormGroup>
                                    <Label>{t('mediaOverlay.name', 'Name')}</Label>
                                    <Input
                                        value={selectedGroup.name}
                                        onChange={(e) => updateGroup({ name: e.target.value })}
                                    />
                                </FormGroup>
                            </Section>

                            {/* Position */}
                            <Section>
                                <SectionTitle><FiMove />{t('mediaOverlay.position', 'Position')}</SectionTitle>
                                <FormRow>
                                    <FormGroup>
                                        <Label>X</Label>
                                        <NumericEditorComponent
                                            value={selectedGroup.position.x}
                                            onChange={(v) => updateGroupNested('position.x', v)}
                                            min={0} max={1920}
                                            width="100%"
                                        />
                                    </FormGroup>
                                    <FormGroup>
                                        <Label>Y</Label>
                                        <NumericEditorComponent
                                            value={selectedGroup.position.y}
                                            onChange={(v) => updateGroupNested('position.y', v)}
                                            min={0} max={1080}
                                            width="100%"
                                        />
                                    </FormGroup>
                                </FormRow>
                            </Section>

                            {/* Size */}
                            <Section>
                                <SectionTitle><FiBox />{t('mediaOverlay.size', 'Size')}</SectionTitle>
                                <FormRow>
                                    <FormGroup>
                                        <Label>{t('mediaOverlay.maxWidth', 'Max Width')}</Label>
                                        <NumericEditorComponent
                                            value={selectedGroup.size.maxWidth}
                                            onChange={(v) => updateGroupNested('size.maxWidth', v)}
                                            min={100} max={1920}
                                            width="100%"
                                        />
                                    </FormGroup>
                                    <FormGroup>
                                        <Label>{t('mediaOverlay.maxHeight', 'Max Height')}</Label>
                                        <NumericEditorComponent
                                            value={selectedGroup.size.maxHeight}
                                            onChange={(v) => updateGroupNested('size.maxHeight', v)}
                                            min={100} max={1080}
                                            width="100%"
                                        />
                                    </FormGroup>
                                </FormRow>
                                <FormRow>
                                    <FormGroup>
                                        <Label>{t('mediaOverlay.mediaWidth', 'Media Width')} {selectedGroup.size?.mediaWidth === 0 && `(${t('mediaOverlay.auto', 'auto')})`}</Label>
                                        <NumericEditorComponent
                                            value={selectedGroup.size?.mediaWidth || 0}
                                            onChange={(v) => updateGroupNested('size.mediaWidth', v)}
                                            min={0} max={1920}
                                            width="100%"
                                        />
                                    </FormGroup>
                                    <FormGroup>
                                        <Label>{t('mediaOverlay.mediaHeight', 'Media Height')} {selectedGroup.size?.mediaHeight === 0 && `(${t('mediaOverlay.auto', 'auto')})`}</Label>
                                        <NumericEditorComponent
                                            value={selectedGroup.size?.mediaHeight || 0}
                                            onChange={(v) => updateGroupNested('size.mediaHeight', v)}
                                            min={0} max={1080}
                                            width="100%"
                                        />
                                    </FormGroup>
                                </FormRow>
                            </Section>

                            {/* Animation */}
                            <Section>
                                <SectionTitle><FiZap />{t('mediaOverlay.animation', 'Animation')}</SectionTitle>
                                <FormRow>
                                    <FormGroup>
                                        <Label>{t('mediaOverlay.animIn', 'In')}</Label>
                                        <Select
                                            value={selectedGroup.animation.in}
                                            onChange={(e) => updateGroupNested('animation.in', e.target.value)}
                                        >
                                            {ANIMATION_TYPES.map(a => <option key={a} value={a}>{a}</option>)}
                                        </Select>
                                    </FormGroup>
                                    <FormGroup>
                                        <Label>{t('mediaOverlay.animOut', 'Out')}</Label>
                                        <Select
                                            value={selectedGroup.animation.out}
                                            onChange={(e) => updateGroupNested('animation.out', e.target.value)}
                                        >
                                            {ANIMATION_TYPES.map(a => <option key={a} value={a}>{a}</option>)}
                                        </Select>
                                    </FormGroup>
                                </FormRow>
                                <FormRow>
                                    <FormGroup>
                                        <Label>{t('mediaOverlay.inDuration', 'In (ms)')}</Label>
                                        <NumericEditorComponent
                                            value={selectedGroup.animation.inDuration}
                                            onChange={(v) => updateGroupNested('animation.inDuration', v)}
                                            min={0} max={2000} step={50}
                                            width="100%"
                                        />
                                    </FormGroup>
                                    <FormGroup>
                                        <Label>{t('mediaOverlay.outDuration', 'Out (ms)')}</Label>
                                        <NumericEditorComponent
                                            value={selectedGroup.animation.outDuration}
                                            onChange={(v) => updateGroupNested('animation.outDuration', v)}
                                            min={0} max={2000} step={50}
                                            width="100%"
                                        />
                                    </FormGroup>
                                </FormRow>
                                <FormGroup>
                                    <Label>{t('mediaOverlay.easing', 'Easing')}</Label>
                                    <Select
                                        value={selectedGroup.animation.easing}
                                        onChange={(e) => updateGroupNested('animation.easing', e.target.value)}
                                    >
                                        {EASING_TYPES.map(e => <option key={e} value={e}>{e}</option>)}
                                    </Select>
                                </FormGroup>
                            </Section>

                            {/* Queue */}
                            <Section>
                                <SectionTitle><FiList />{t('mediaOverlay.queue', 'Queue')}</SectionTitle>
                                <FormGroup>
                                    <Label>{t('mediaOverlay.queueMode', 'Mode')}</Label>
                                    <Select
                                        value={selectedGroup.queue.mode}
                                        onChange={(e) => updateGroupNested('queue.mode', e.target.value)}
                                    >
                                        {QUEUE_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                                    </Select>
                                </FormGroup>
                                <FormRow>
                                    <FormGroup>
                                        <Label>{t('mediaOverlay.maxItems', 'Max Items')}</Label>
                                        <NumericEditorComponent
                                            value={selectedGroup.queue.maxItems}
                                            onChange={(v) => updateGroupNested('queue.maxItems', v)}
                                            min={1} max={50}
                                            width="100%"
                                        />
                                    </FormGroup>
                                    <FormGroup>
                                        <Label>{t('mediaOverlay.gapBetween', 'Gap (ms)')}</Label>
                                        <NumericEditorComponent
                                            value={selectedGroup.queue.gapBetween}
                                            onChange={(v) => updateGroupNested('queue.gapBetween', v)}
                                            min={0} max={5000} step={100}
                                            width="100%"
                                        />
                                    </FormGroup>
                                </FormRow>
                            </Section>

                            {/* Placement */}
                            <Section>
                                <SectionTitle><FiBox />{t('mediaOverlay.placement', 'Placement')}</SectionTitle>
                                <FormRow>
                                    <FormGroup>
                                        <Label>{t('mediaOverlay.placementMode', 'Mode')}</Label>
                                        <Select
                                            value={selectedGroup.placement || 'fixed'}
                                            onChange={(e) => updateGroup({ placement: e.target.value })}
                                        >
                                            {PLACEMENT_MODES.map(m => <option key={m} value={m}>{t(`mediaOverlay.placement_${m}`, m)}</option>)}
                                        </Select>
                                    </FormGroup>
                                    <FormGroup>
                                        <Label>{t('mediaOverlay.anchor', 'Anchor')}</Label>
                                        <Select
                                            value={selectedGroup.anchor || 'center'}
                                            onChange={(e) => updateGroup({ anchor: e.target.value })}
                                        >
                                            {ANCHOR_POINTS.map(a => <option key={a} value={a}>{a}</option>)}
                                        </Select>
                                    </FormGroup>
                                </FormRow>

                                {/* Random placement settings */}
                                {selectedGroup.placement === 'random' && (
                                    <FormRow $align="center">
                                        <FormGroup $flex={2}>
                                            <Label>{t('mediaOverlay.randomRotation', 'Random Rotation')}</Label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <Switch
                                                    checked={selectedGroup.randomSettings?.rotationEnabled ?? true}
                                                    onChange={(e) => updateGroupNested('randomSettings.rotationEnabled', e.target.checked)}
                                                />
                                                <span style={{ fontSize: '0.8rem', color: '#888' }}>
                                                    {selectedGroup.randomSettings?.rotationEnabled ? t('common.enabled', 'On') : t('common.disabled', 'Off')}
                                                </span>
                                            </div>
                                        </FormGroup>
                                        {selectedGroup.randomSettings?.rotationEnabled && (
                                            <FormGroup $flex={1}>
                                                <Label>{t('mediaOverlay.maxRotation', 'Max °')}</Label>
                                                <NumericEditorComponent
                                                    value={selectedGroup.randomSettings?.maxRotation || 15}
                                                    onChange={(v) => updateGroupNested('randomSettings.maxRotation', v)}
                                                    min={0} max={45} step={1}
                                                    width="100%"
                                                />
                                            </FormGroup>
                                        )}
                                    </FormRow>
                                )}

                                {/* Stack placement settings */}
                                {selectedGroup.placement === 'stack' && (
                                    <>
                                        <FormRow>
                                            <FormGroup>
                                                <Label>{t('mediaOverlay.stackDirection', 'Direction')}</Label>
                                                <Select
                                                    value={selectedGroup.stackSettings?.direction || 'horizontal'}
                                                    onChange={(e) => updateGroupNested('stackSettings.direction', e.target.value)}
                                                >
                                                    {STACK_DIRECTIONS.map(d => <option key={d} value={d}>{t(`mediaOverlay.stack_${d}`, d)}</option>)}
                                                </Select>
                                            </FormGroup>
                                            <FormGroup>
                                                <Label>{t('mediaOverlay.stackGap', 'Gap (px)')}</Label>
                                                <NumericEditorComponent
                                                    value={selectedGroup.stackSettings?.gap || 10}
                                                    onChange={(v) => updateGroupNested('stackSettings.gap', v)}
                                                    min={0} max={100} step={1}
                                                    width="100%"
                                                />
                                            </FormGroup>
                                        </FormRow>
                                        <FormRow $align="center">
                                            <FormGroup>
                                                <Label>{t('mediaOverlay.stackWrap', 'Wrap')}</Label>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <Switch
                                                        checked={selectedGroup.stackSettings?.wrap ?? true}
                                                        onChange={(e) => updateGroupNested('stackSettings.wrap', e.target.checked)}
                                                    />
                                                    <span style={{ fontSize: '0.8rem', color: '#888' }}>
                                                        {selectedGroup.stackSettings?.wrap ? t('mediaOverlay.wrapEnabled', 'Wrap to next line') : t('mediaOverlay.wrapDisabled', 'Overflow')}
                                                    </span>
                                                </div>
                                            </FormGroup>
                                        </FormRow>
                                    </>
                                )}

                                <FormGroup>
                                    <Label>{t('mediaOverlay.contentScale', 'Content Scale')} ({Math.round((selectedGroup.size?.contentScale || 1) * 100)}%)</Label>
                                    <NumericEditorComponent
                                        value={selectedGroup.size?.contentScale || 1}
                                        onChange={(v) => updateGroupNested('size.contentScale', v)}
                                        min={0.1} max={2} step={0.1}
                                        width="100%"
                                    />
                                </FormGroup>
                            </Section>

                            {/* Display */}
                            <Section>
                                <SectionTitle><FiSettings />{t('mediaOverlay.display', 'Display')}</SectionTitle>
                                <FormRow>
                                    <FormGroup>
                                        <Label>{t('mediaOverlay.defaultDuration', 'Duration (s)')}</Label>
                                        <NumericEditorComponent
                                            value={selectedGroup.defaultDuration}
                                            onChange={(v) => updateGroup({ defaultDuration: v })}
                                            min={1} max={60}
                                            width="100%"
                                        />
                                    </FormGroup>
                                    <FormGroup>
                                        <Label>{t('mediaOverlay.zIndex', 'Z-Index')}</Label>
                                        <NumericEditorComponent
                                            value={selectedGroup.zIndex}
                                            onChange={(v) => updateGroup({ zIndex: v })}
                                            min={1} max={1000}
                                            width="100%"
                                        />
                                    </FormGroup>
                                </FormRow>
                            </Section>
                        </EditorContent>
                    </>
                )}
            </EditorPanel>

            {/* Drag ghost */}
            {mediaDragState && (
                <DragGhost style={{ left: mousePos.x, top: mousePos.y }}>
                    {mediaDragState.mediaType === 'video' ? <FiVideo /> : <FiImage />}
                    {mediaDragState.mediaName}
                </DragGhost>
            )}
        </Container>
    );
}
