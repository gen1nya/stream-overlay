import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled, { createGlobalStyle, keyframes, css } from 'styled-components';
import { useWebSocket } from '../../context/WebSocketContext';
import { getAllMediaDisplayGroups } from '../../services/api';

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

const GroupContainer = styled.div`
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    pointer-events: auto;

    ${({ $position, $size }) => {
        const { anchor, offsetX, offsetY } = $position;
        const width = $size.width || $size.maxWidth || 400;
        const height = $size.height || $size.maxHeight || 300;

        let styles = `
            max-width: ${$size.maxWidth || 400}px;
            max-height: ${$size.maxHeight || 300}px;
        `;

        if (anchor.includes('left')) styles += `left: ${20 + offsetX}px;`;
        else if (anchor.includes('right')) styles += `right: ${20 - offsetX}px;`;
        else styles += `left: calc(50% - ${width / 2}px + ${offsetX}px);`;

        if (anchor.includes('top')) styles += `top: ${20 + offsetY}px;`;
        else if (anchor.includes('bottom')) styles += `bottom: ${20 - offsetY}px;`;
        else styles += `top: calc(50% - ${height / 2}px + ${offsetY}px);`;

        return styles;
    }}
`;

const MediaItem = styled.div`
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;

    ${({ $animation, $phase }) => {
        const animIn = getAnimationIn($animation.in);
        const animOut = getAnimationOut($animation.out);

        if ($phase === 'entering') {
            return css`
                animation: ${animIn} ${$animation.inDuration}ms ${$animation.easing} forwards;
            `;
        } else if ($phase === 'exiting') {
            return css`
                animation: ${animOut} ${$animation.outDuration}ms ${$animation.easing} forwards;
            `;
        }
        return '';
    }}
`;

const MediaContent = styled.div`
    position: relative;
    max-width: 100%;
    max-height: 100%;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);

    img, video {
        max-width: 100%;
        max-height: 100%;
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

export default function MediaOverlay() {
    const { subscribe, isConnected } = useWebSocket();
    const [groups, setGroups] = useState([]);
    const [activeItems, setActiveItems] = useState(new Map()); // groupId -> item[]
    const queuesRef = useRef(new Map()); // groupId -> item[]
    const timersRef = useRef(new Map()); // itemId -> timer

    // Load groups
    useEffect(() => {
        const loadGroups = async () => {
            try {
                const groupsData = await getAllMediaDisplayGroups();
                setGroups(groupsData || []);
            } catch (error) {
                console.error('Failed to load media groups:', error);
            }
        };
        loadGroups();
    }, []);

    // Subscribe to groups update
    useEffect(() => {
        if (!isConnected) return;

        const unsubscribe = subscribe('media-groups:updated', (payload) => {
            setGroups(payload || []);
        });

        return unsubscribe;
    }, [isConnected, subscribe]);

    // Process queue for a group
    const processQueue = useCallback((groupId) => {
        const group = groups.find(g => g.id === groupId);
        if (!group) return;

        const queue = queuesRef.current.get(groupId) || [];
        const active = activeItems.get(groupId) || [];

        // Check if we can show next item based on queue mode
        if (queue.length === 0) return;

        const { mode, maxItems } = group.queue;

        if (mode === 'sequential' && active.some(i => i.phase !== 'exiting')) {
            // Wait for current item to finish
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
            // Max items reached for stack mode
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
        setTimeout(() => {
            setActiveItems(prev => {
                const newMap = new Map(prev);
                const groupItems = (newMap.get(groupId) || []).map(item =>
                    item.id === newItem.id ? { ...item, phase: 'visible' } : item
                );
                newMap.set(groupId, groupItems);
                return newMap;
            });
        }, group.animation.inDuration);

        // Schedule exit
        const duration = nextItem.duration || group.defaultDuration;
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
            }, group.animation.outDuration);
        }, (duration * 1000) + group.animation.inDuration);

        timersRef.current.set(newItem.id, exitTimer);
    }, [groups, activeItems]);

    // Handle media show event
    const handleMediaShow = useCallback((payload) => {
        const { mediaEvent, context } = payload;
        if (!mediaEvent) return;

        const groupId = mediaEvent.groupId;
        if (!groupId) {
            console.warn('Media event has no groupId:', mediaEvent);
            return;
        }

        const group = groups.find(g => g.id === groupId);
        if (!group || !group.enabled) {
            console.warn('Group not found or disabled:', groupId);
            return;
        }

        // Interpolate caption with context
        let caption = mediaEvent.caption || '';
        if (context) {
            Object.entries(context).forEach(([key, value]) => {
                caption = caption.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value || '');
            });
        }

        const queueItem = {
            id: `${mediaEvent.id}-${Date.now()}`,
            mediaEvent: { ...mediaEvent, caption },
            groupId,
            duration: mediaEvent.displayDuration || group.defaultDuration
        };

        // Add to queue
        const queue = queuesRef.current.get(groupId) || [];
        queue.push(queueItem);
        queuesRef.current.set(groupId, queue);

        // Process queue
        processQueue(groupId);
    }, [groups, processQueue]);

    // Subscribe to media show events
    useEffect(() => {
        if (!isConnected) return;

        const unsubscribe = subscribe('media:show', handleMediaShow);
        return unsubscribe;
    }, [isConnected, subscribe, handleMediaShow]);

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
            <Container>
                {groups.filter(g => g.enabled).map(group => {
                    const items = activeItems.get(group.id) || [];
                    if (items.length === 0) return null;

                    return (
                        <GroupContainer
                            key={group.id}
                            $position={group.position}
                            $size={group.size}
                            style={{ zIndex: group.zIndex }}
                        >
                            {items.map(item => (
                                <MediaItem
                                    key={item.id}
                                    $animation={group.animation}
                                    $phase={item.phase}
                                >
                                    <MediaContent>
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
