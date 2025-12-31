import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled, { createGlobalStyle, keyframes, css } from 'styled-components';
import useReconnectingWebSocket from '../../hooks/useReconnectingWebSocket';

// Animation keyframes
const fadeIn = keyframes`from { opacity: 0; } to { opacity: 1; }`;
const fadeOut = keyframes`from { opacity: 1; } to { opacity: 0; }`;
const slideUp = keyframes`from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; }`;
const slideDown = keyframes`from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; }`;
const slideLeft = keyframes`from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; }`;
const slideRight = keyframes`from { transform: translateX(-100%); opacity: 0; } to { transform: translateX(0); opacity: 1; }`;
const scaleIn = keyframes`from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; }`;
const scaleOut = keyframes`from { transform: scale(1); opacity: 1; } to { transform: scale(0); opacity: 0; }`;
const bounceIn = keyframes`
    0% { transform: scale(0); opacity: 0; }
    50% { transform: scale(1.1); }
    70% { transform: scale(0.95); }
    100% { transform: scale(1); opacity: 1; }
`;

const slideUpOut = keyframes`from { transform: translateY(0); opacity: 1; } to { transform: translateY(-100%); opacity: 0; }`;
const slideDownOut = keyframes`from { transform: translateY(0); opacity: 1; } to { transform: translateY(100%); opacity: 0; }`;
const slideLeftOut = keyframes`from { transform: translateX(0); opacity: 1; } to { transform: translateX(-100%); opacity: 0; }`;
const slideRightOut = keyframes`from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; }`;
const bounceOut = keyframes`
    0% { transform: scale(1); opacity: 1; }
    25% { transform: scale(1.1); }
    100% { transform: scale(0); opacity: 0; }
`;

const getAnimationIn = (type) => {
    switch (type) {
        case 'fade': return fadeIn;
        case 'slide-up': return slideUp;
        case 'slide-down': return slideDown;
        case 'slide-left': return slideLeft;
        case 'slide-right': return slideRight;
        case 'scale': return scaleIn;
        case 'bounce': return bounceIn;
        default: return fadeIn;
    }
};

const getAnimationOut = (type) => {
    switch (type) {
        case 'fade': return fadeOut;
        case 'slide-up': return slideUpOut;
        case 'slide-down': return slideDownOut;
        case 'slide-left': return slideLeftOut;
        case 'slide-right': return slideRightOut;
        case 'scale': return scaleOut;
        case 'bounce': return bounceOut;
        default: return fadeOut;
    }
};

const GlobalStyle = createGlobalStyle`
    html, body, #root {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        background: transparent !important;
        overflow: hidden;
    }
`;

const Container = styled.div`
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    pointer-events: none;
`;

// Connection status indicator
const ConnectionIndicator = styled.div`
    position: fixed;
    top: 8px;
    right: 8px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${({ $connected }) => $connected ? '#22c55e' : '#ef4444'};
    box-shadow: 0 0 4px ${({ $connected }) => $connected ? '#22c55e' : '#ef4444'};
    opacity: ${({ $connected }) => $connected ? 0 : 1};
    transition: opacity 0.3s ease;
    pointer-events: none;
    z-index: 9999;
`;

// Debug mode styles
const ResolutionGuide = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    border: 2px dashed ${props => props.$color || '#666'};
    pointer-events: none;
    box-sizing: border-box;

    &::after {
        content: '${props => props.$label}';
        position: absolute;
        top: 4px;
        right: 8px;
        font-size: 14px;
        font-family: monospace;
        color: ${props => props.$color || '#666'};
        background: rgba(0, 0, 0, 0.7);
        padding: 2px 8px;
        border-radius: 4px;
    }
`;

const DebugGroupBorder = styled.div`
    position: absolute;
    border: 2px dashed rgba(100, 108, 255, 0.8);
    background: rgba(100, 108, 255, 0.1);
    pointer-events: none;
    box-sizing: border-box;

    &::before {
        content: '${props => props.$name}';
        position: absolute;
        top: -24px;
        left: 0;
        font-size: 12px;
        font-family: monospace;
        color: #646cff;
        background: rgba(0, 0, 0, 0.8);
        padding: 2px 8px;
        border-radius: 4px;
        white-space: nowrap;
    }

    &::after {
        content: '${props => props.$coords}';
        position: absolute;
        bottom: 4px;
        right: 4px;
        font-size: 10px;
        font-family: monospace;
        color: #888;
        background: rgba(0, 0, 0, 0.8);
        padding: 2px 6px;
        border-radius: 3px;
    }
`;

// Audio player component with fade-out support
const AudioPlayer = ({ src, phase, fadeOutDuration = 300 }) => {
    const audioRef = React.useRef(null);
    const fadeIntervalRef = React.useRef(null);

    React.useEffect(() => {
        // When phase changes to 'exiting', start fade-out
        if (phase === 'exiting' && audioRef.current) {
            const audio = audioRef.current;
            const steps = 20;
            const stepTime = fadeOutDuration / steps;
            const volumeStep = audio.volume / steps;

            fadeIntervalRef.current = setInterval(() => {
                if (audio.volume > volumeStep) {
                    audio.volume = Math.max(0, audio.volume - volumeStep);
                } else {
                    audio.volume = 0;
                    clearInterval(fadeIntervalRef.current);
                }
            }, stepTime);
        }

        return () => {
            if (fadeIntervalRef.current) {
                clearInterval(fadeIntervalRef.current);
            }
        };
    }, [phase, fadeOutDuration]);

    return (
        <audio
            ref={audioRef}
            src={src}
            autoPlay
            style={{ display: 'none' }}
            onError={(e) => console.error('[MediaOverlay] Audio error:', e.target.error, src)}
        />
    );
};

// Helper to get anchor alignment styles
const getAnchorStyles = (anchor) => {
    const alignMap = {
        'top-left': { alignItems: 'flex-start', justifyContent: 'flex-start' },
        'top-center': { alignItems: 'center', justifyContent: 'flex-start' },
        'top-right': { alignItems: 'flex-end', justifyContent: 'flex-start' },
        'center-left': { alignItems: 'flex-start', justifyContent: 'center' },
        'center': { alignItems: 'center', justifyContent: 'center' },
        'center-right': { alignItems: 'flex-end', justifyContent: 'center' },
        'bottom-left': { alignItems: 'flex-start', justifyContent: 'flex-end' },
        'bottom-center': { alignItems: 'center', justifyContent: 'flex-end' },
        'bottom-right': { alignItems: 'flex-end', justifyContent: 'flex-end' },
    };
    return alignMap[anchor] || alignMap['center'];
};

// Helper to get stack start position from anchor
const getStackStartFromAnchor = (anchor, direction) => {
    // For horizontal stack: anchor affects justify-content (start position)
    // For vertical stack: anchor affects align-items (cross-axis alignment)
    const startMap = {
        'top-left': { justify: 'flex-start', align: 'flex-start' },
        'top-center': { justify: 'center', align: 'flex-start' },
        'top-right': { justify: 'flex-end', align: 'flex-start' },
        'center-left': { justify: 'flex-start', align: 'center' },
        'center': { justify: 'center', align: 'center' },
        'center-right': { justify: 'flex-end', align: 'center' },
        'bottom-left': { justify: 'flex-start', align: 'flex-end' },
        'bottom-center': { justify: 'center', align: 'flex-end' },
        'bottom-right': { justify: 'flex-end', align: 'flex-end' },
    };
    return startMap[anchor] || startMap['center'];
};

const GroupContainer = styled.div`
    position: absolute;
    pointer-events: auto;

    ${({ $position, $size, $placement, $anchor, $stackSettings }) => {
        const anchorStyles = getAnchorStyles($anchor);

        // Base positioning
        let styles = `
            left: ${$position?.x || 0}px;
            top: ${$position?.y || 0}px;
            width: ${$size?.width || $size?.maxWidth || 400}px;
            height: ${$size?.height || $size?.maxHeight || 300}px;
        `;

        // Placement-specific styles
        switch ($placement) {
            case 'random':
                // Random placement: items positioned absolutely within, hide overflow
                styles += `
                    overflow: hidden;
                `;
                break;
            case 'stack':
                const stackStart = getStackStartFromAnchor($anchor, $stackSettings?.direction);
                const direction = $stackSettings?.direction || 'horizontal';
                const gap = $stackSettings?.gap || 10;
                const wrap = $stackSettings?.wrap ? 'wrap' : 'nowrap';

                if (direction === 'horizontal') {
                    // Horizontal: main axis = row (left-right), cross axis = column (top-bottom)
                    // justify-content: horizontal alignment (start/center/end)
                    // align-items: vertical alignment for single line
                    // align-content: vertical alignment for wrapped lines
                    styles += `
                        display: flex;
                        flex-direction: row;
                        flex-wrap: ${wrap};
                        justify-content: ${stackStart.justify};
                        align-items: ${stackStart.align};
                        align-content: ${stackStart.align};
                        gap: ${gap}px;
                        overflow: hidden;
                    `;
                } else {
                    // Vertical: main axis = column (top-bottom), cross axis = row (left-right)
                    // justify-content: vertical alignment
                    // align-items: horizontal alignment for single column
                    // align-content: horizontal alignment for wrapped columns
                    styles += `
                        display: flex;
                        flex-direction: column;
                        flex-wrap: ${wrap};
                        justify-content: ${stackStart.align};
                        align-items: ${stackStart.justify};
                        align-content: ${stackStart.justify};
                        gap: ${gap}px;
                        overflow: hidden;
                    `;
                }
                break;
            case 'fixed':
            default:
                // Fixed mode: use grid with place-items for perfect centering
                // All items will occupy the same cell and stack on top of each other
                styles += `
                    display: grid;
                    grid-template-columns: 1fr;
                    grid-template-rows: 1fr;
                    place-items: ${anchorStyles.justifyContent} ${anchorStyles.alignItems};
                    overflow: hidden;
                `;
                break;
        }

        return styles;
    }}
`;

const MediaItem = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;

    /* Fixed placement: all items occupy the same cell (row 1, col 1) */
    ${({ $placement }) => $placement === 'fixed' && css`
        grid-row: 1;
        grid-column: 1;
    `}

    /* Random placement: position absolutely with random coords and rotation */
    ${({ $placement, $randomPos }) => $placement === 'random' && $randomPos && css`
        position: absolute;
        left: ${$randomPos.x}px;
        top: ${$randomPos.y}px;
        transform: rotate(${$randomPos.rotation || 0}deg);
    `}

    ${({ $animation, $phase }) => {
        const animIn = getAnimationIn($animation?.in || 'fade');
        const animOut = getAnimationOut($animation?.out || 'fade');
        const inDuration = $animation?.inDuration || 300;
        const outDuration = $animation?.outDuration || 300;
        const easing = $animation?.easing || 'ease-out';

        if ($phase === 'entering') {
            return css`
                animation: ${animIn} ${inDuration}ms ${easing} forwards;
            `;
        } else if ($phase === 'exiting') {
            return css`
                animation: ${animOut} ${outDuration}ms ${easing} forwards;
            `;
        }
        return '';
    }}
`;

const MediaContent = styled.div`
    position: relative;
    overflow: hidden;

    ${({ $scale, $mediaWidth, $mediaHeight, $maxWidth, $maxHeight }) => {
        // Use media size if specified, otherwise fall back to max size
        const effectiveWidth = $mediaWidth > 0 ? $mediaWidth : $maxWidth;
        const effectiveHeight = $mediaHeight > 0 ? $mediaHeight : $maxHeight;
        const scale = $scale || 1;

        return css`
            ${effectiveWidth ? `width: ${effectiveWidth * scale}px;` : ''}
            ${effectiveHeight ? `height: ${effectiveHeight * scale}px;` : ''}
            max-width: ${$maxWidth ? `${$maxWidth * scale}px` : '100%'};
            max-height: ${$maxHeight ? `${$maxHeight * scale}px` : '100%'};
        `;
    }}

    img, video {
        width: 100%;
        height: 100%;
        display: block;
        object-fit: contain;
    }
`;

const Caption = styled.div`
    margin-top: 10px;
    padding: 8px 16px;
    border-radius: 6px;
    text-align: center;
    max-width: 100%;

    ${({ $style }) => {
        if (!$style) return '';

        return css`
            font-family: ${$style.fontFamily || 'system-ui'};
            font-size: ${$style.fontSize || 16}px;
            color: ${$style.fontColor || '#ffffff'};
            opacity: ${$style.fontOpacity ?? 1};
            background-color: ${$style.backgroundColor || 'transparent'};
            text-shadow: ${$style.shadowOffsetX || 0}px ${$style.shadowOffsetY || 0}px ${$style.shadowRadius || 0}px ${$style.shadowColor || 'transparent'};
        `;
    }}
`;

// Queue item structure
// { id, mediaEvent, groupId, phase: 'entering' | 'visible' | 'exiting', startTime, duration }

// Resolution presets for debug mode
const RESOLUTIONS = {
    '1080p': { width: 1920, height: 1080, color: '#646cff', label: '1920×1080' },
    '720p': { width: 1280, height: 720, color: '#22c55e', label: '1280×720' }
};

export default function MediaOverlay() {
    const [groups, setGroups] = useState([]);
    const [activeItems, setActiveItems] = useState(new Map()); // groupId -> item[]
    const queuesRef = useRef(new Map()); // groupId -> item[]
    const timersRef = useRef(new Map()); // itemId -> timer
    const groupsRef = useRef([]); // Keep groups in ref for callbacks
    const activeItemsRef = useRef(new Map()); // Ref for active items to avoid stale closure

    // Debug mode state (controlled via WebSocket)
    const [debugMode, setDebugMode] = useState(false);
    const [overlaySettings, setOverlaySettings] = useState(null);

    // Update refs when state changes
    useEffect(() => {
        groupsRef.current = groups;
    }, [groups]);

    useEffect(() => {
        activeItemsRef.current = activeItems;
    }, [activeItems]);

    const { isConnected } = useReconnectingWebSocket('ws://localhost:42001', {
        onOpen: (_, socket) => {
            console.log('[MediaOverlay] WebSocket connected');
            // Request initial state
            socket.send(JSON.stringify({ channel: 'media-groups:get-all' }));
            socket.send(JSON.stringify({ channel: 'media-overlay:get-debug' }));
            socket.send(JSON.stringify({ channel: 'media-overlay:get-settings' }));
        },
        onMessage: (event) => {
            const { channel, payload } = JSON.parse(event.data);

            if (channel === 'media-groups:updated') {
                setGroups(payload || []);
                return;
            }

            if (channel === 'media-overlay:settings-updated') {
                setOverlaySettings(payload);
                return;
            }

            if (channel === 'media-overlay:debug') {
                setDebugMode(payload?.enabled ?? false);
                return;
            }

            if (channel === 'media:show') {
                handleMediaShowEvent(payload);
                return;
            }
        },
        onClose: () => {
            console.log('[MediaOverlay] WebSocket disconnected');
        }
    });

    // Process queue for a group
    const processQueue = useCallback((groupId) => {
        // Use refs to avoid stale closures
        const group = groupsRef.current.find(g => g.id === groupId);
        if (!group) return;

        const queue = queuesRef.current.get(groupId) || [];
        const active = activeItemsRef.current.get(groupId) || [];

        if (queue.length === 0) return;

        const { mode, maxItems } = group.queue || { mode: 'sequential', maxItems: 1 };

        if (mode === 'sequential' && active.some(i => i.phase !== 'exiting')) {
            return;
        }

        if (mode === 'replace' && active.length > 0) {
            // Start exiting current items
            setActiveItems(prev => {
                const newMap = new Map(prev);
                const groupItems = (newMap.get(groupId) || []).map(item => {
                    if (item.phase !== 'exiting') {
                        // Clear any existing timers
                        if (timersRef.current.has(item.id)) {
                            clearTimeout(timersRef.current.get(item.id));
                            timersRef.current.delete(item.id);
                        }
                        return { ...item, phase: 'exiting' };
                    }
                    return item;
                });
                newMap.set(groupId, groupItems);
                return newMap;
            });
        }

        if (mode === 'stack' && active.length >= maxItems) {
            return;
        }

        // Get next item from queue
        const nextItem = queue.shift();
        queuesRef.current.set(groupId, queue);

        if (!nextItem) return;

        // Add to active items
        const newItem = {
            ...nextItem,
            phase: 'entering',
            startTime: Date.now()
        };

        setActiveItems(prev => {
            const newMap = new Map(prev);
            const groupItems = newMap.get(groupId) || [];
            newMap.set(groupId, [...groupItems, newItem]);
            return newMap;
        });

        // Schedule transition to visible
        const inDuration = group.animation?.inDuration || 300;
        setTimeout(() => {
            setActiveItems(prev => {
                const newMap = new Map(prev);
                const groupItems = (newMap.get(groupId) || []).map(item =>
                    item.id === newItem.id ? { ...item, phase: 'visible' } : item
                );
                newMap.set(groupId, groupItems);
                return newMap;
            });
        }, inDuration);

        // Schedule exit
        const duration = nextItem.duration || group.defaultDuration || 5;
        const outDuration = group.animation?.outDuration || 300;
        const exitTimer = setTimeout(() => {
            setActiveItems(prev => {
                const newMap = new Map(prev);
                const groupItems = (newMap.get(groupId) || []).map(item =>
                    item.id === newItem.id ? { ...item, phase: 'exiting' } : item
                );
                newMap.set(groupId, groupItems);
                return newMap;
            });

            // Schedule removal
            setTimeout(() => {
                setActiveItems(prev => {
                    const newMap = new Map(prev);
                    const groupItems = (newMap.get(groupId) || []).filter(item => item.id !== newItem.id);
                    newMap.set(groupId, groupItems);
                    return newMap;
                });
                timersRef.current.delete(newItem.id);

                // Process next in queue
                processQueue(groupId);
            }, outDuration);
        }, (duration * 1000) + inDuration);

        timersRef.current.set(newItem.id, exitTimer);
    }, []);

    // Generate random position within group bounds
    const generateRandomPosition = (group) => {
        const groupWidth = group.size?.width || group.size?.maxWidth || 400;
        const groupHeight = group.size?.height || group.size?.maxHeight || 300;

        // Get media size (use mediaWidth/mediaHeight if set, otherwise estimate)
        const mediaWidth = (group.size?.mediaWidth > 0 ? group.size.mediaWidth : group.size?.maxWidth * 0.5) || 100;
        const mediaHeight = (group.size?.mediaHeight > 0 ? group.size.mediaHeight : group.size?.maxHeight * 0.5) || 100;

        // Calculate available space (media shouldn't go outside group bounds)
        const maxX = Math.max(0, groupWidth - mediaWidth);
        const maxY = Math.max(0, groupHeight - mediaHeight);

        // Generate random position
        const x = Math.random() * maxX;
        const y = Math.random() * maxY;

        // Generate random rotation if enabled
        let rotation = 0;
        if (group.randomSettings?.rotationEnabled) {
            const maxRotation = group.randomSettings?.maxRotation || 15;
            rotation = (Math.random() * 2 - 1) * maxRotation; // -maxRotation to +maxRotation
        }

        return { x: Math.round(x), y: Math.round(y), rotation: Math.round(rotation * 10) / 10 };
    };

    // Handle media show event (called from onMessage)
    const handleMediaShowEvent = (payload) => {
        const { mediaEvent, context } = payload;
        if (!mediaEvent) return;

        const groupId = mediaEvent.groupId;
        if (!groupId) return;

        // Use ref to get current groups (avoid stale closure)
        const group = groupsRef.current.find(g => g.id === groupId);
        if (!group || !group.enabled) return;

        // Interpolate caption with context
        let caption = mediaEvent.caption || '';
        if (context) {
            Object.entries(context).forEach(([key, value]) => {
                caption = caption.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value || '');
            });
        }

        // Generate random position for random placement mode
        const placement = group.placement || 'fixed';
        const randomPos = placement === 'random' ? generateRandomPosition(group) : null;

        const queueItem = {
            id: `${mediaEvent.id}-${Date.now()}`,
            mediaEvent: { ...mediaEvent, caption },
            groupId,
            duration: mediaEvent.displayDuration || group.defaultDuration,
            randomPos  // Store random position for this item
        };

        // Add to queue
        const queue = queuesRef.current.get(groupId) || [];
        queue.push(queueItem);
        queuesRef.current.set(groupId, queue);

        // Process queue
        processQueue(groupId);
    };

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            timersRef.current.forEach(timer => clearTimeout(timer));
            timersRef.current.clear();
        };
    }, []);

    return (
        <>
            <GlobalStyle />
            <ConnectionIndicator $connected={isConnected} />
            <Container>
                {/* Debug: Resolution guides */}
                {debugMode && (
                    <>
                        <ResolutionGuide
                            $color={RESOLUTIONS['1080p'].color}
                            $label={RESOLUTIONS['1080p'].label}
                            style={{
                                width: RESOLUTIONS['1080p'].width,
                                height: RESOLUTIONS['1080p'].height
                            }}
                        />
                        <ResolutionGuide
                            $color={RESOLUTIONS['720p'].color}
                            $label={RESOLUTIONS['720p'].label}
                            style={{
                                width: RESOLUTIONS['720p'].width,
                                height: RESOLUTIONS['720p'].height
                            }}
                        />
                        {overlaySettings?.customResolution && (
                            <ResolutionGuide
                                $color={overlaySettings.customResolution.color || '#f59e0b'}
                                $label={`${overlaySettings.customResolution.width || 1600}×${overlaySettings.customResolution.height || 900}`}
                                style={{
                                    width: overlaySettings.customResolution.width || 1600,
                                    height: overlaySettings.customResolution.height || 900
                                }}
                            />
                        )}
                    </>
                )}

                {/* Debug: Group boundaries */}
                {debugMode && groups.filter(g => g.enabled).map(group => (
                    <DebugGroupBorder
                        key={`debug-${group.id}`}
                        $name={group.name}
                        $coords={`${group.position.x}, ${group.position.y}`}
                        style={{
                            left: group.position.x,
                            top: group.position.y,
                            width: group.size.width || group.size.maxWidth || 400,
                            height: group.size.height || group.size.maxHeight || 300,
                            zIndex: group.zIndex - 1
                        }}
                    />
                ))}

                {groups.filter(g => g.enabled).map(group => {
                    const items = activeItems.get(group.id) || [];
                    if (items.length === 0) return null;

                    const placement = group.placement || 'fixed';
                    const anchor = group.anchor || 'center';
                    const contentScale = group.size?.contentScale || 1;

                    return (
                        <GroupContainer
                            key={group.id}
                            $position={group.position}
                            $size={group.size}
                            $placement={placement}
                            $anchor={anchor}
                            $stackSettings={group.stackSettings}
                            style={{ zIndex: group.zIndex }}
                        >
                            {items.map(item => (
                                <MediaItem
                                    key={item.id}
                                    $animation={group.animation}
                                    $phase={item.phase}
                                    $placement={placement}
                                    $randomPos={item.randomPos}
                                >
                                    {item.mediaEvent.mediaType === 'audio' ? (
                                        <AudioPlayer
                                            src={item.mediaEvent.mediaUrl}
                                            phase={item.phase}
                                            fadeOutDuration={group.animation?.outDuration || 300}
                                        />
                                    ) : (
                                        <MediaContent
                                            $scale={contentScale}
                                            $mediaWidth={group.size?.mediaWidth}
                                            $mediaHeight={group.size?.mediaHeight}
                                            $maxWidth={group.size?.maxWidth}
                                            $maxHeight={group.size?.maxHeight}
                                        >
                                            {item.mediaEvent.mediaType === 'video' ? (
                                                <video
                                                    src={item.mediaEvent.mediaUrl}
                                                    autoPlay
                                                    muted={false}
                                                    onEnded={() => {
                                                        // Optionally trigger exit early when video ends
                                                    }}
                                                />
                                            ) : (
                                                <img
                                                    src={item.mediaEvent.mediaUrl}
                                                    alt={item.mediaEvent.name}
                                                />
                                            )}
                                        </MediaContent>
                                    )}
                                    {item.mediaEvent.caption && (
                                        <Caption $style={item.mediaEvent.style}>
                                            {item.mediaEvent.caption}
                                        </Caption>
                                    )}
                                </MediaItem>
                            ))}
                        </GroupContainer>
                    );
                })}
            </Container>
        </>
    );
}
