import React, { useRef, useCallback, useState } from 'react';
import styled from 'styled-components';

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const Label = styled.label`
    font-size: 0.9rem;
    font-weight: 500;
    color: #e0e0e0;
`;

const PadWrapper = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
`;

const Pad = styled.div`
    position: relative;
    width: ${({ $size }) => $size}px;
    height: ${({ $size }) => $size}px;
    background: rgba(30, 30, 30, 0.8);
    border: 1px solid #444;
    border-radius: 8px;
    cursor: crosshair;
    overflow: hidden;

    /* Grid lines */
    &::before, &::after {
        content: '';
        position: absolute;
        background: rgba(255, 255, 255, 0.1);
    }

    /* Vertical center line */
    &::before {
        left: 50%;
        top: 0;
        width: 1px;
        height: 100%;
        transform: translateX(-50%);
    }

    /* Horizontal center line */
    &::after {
        top: 50%;
        left: 0;
        width: 100%;
        height: 1px;
        transform: translateY(-50%);
    }
`;

const Point = styled.div`
    position: absolute;
    width: 14px;
    height: 14px;
    background: #9b74ff;
    border: 2px solid #fff;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
    box-shadow: 0 0 8px rgba(155, 116, 255, 0.5);
    transition: ${({ $isDragging }) => $isDragging ? 'none' : 'box-shadow 0.2s'};

    &:hover {
        box-shadow: 0 0 12px rgba(155, 116, 255, 0.8);
    }
`;

const ValuesDisplay = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 0.8rem;
    color: #999;
    min-width: 70px;
`;

const ValueRow = styled.div`
    display: flex;
    justify-content: space-between;
    gap: 8px;

    span:first-child {
        color: #777;
    }

    span:last-child {
        color: #e0e0e0;
        font-family: monospace;
    }
`;

const ResetButton = styled.button`
    padding: 4px 8px;
    font-size: 0.75rem;
    background: rgba(60, 60, 60, 0.8);
    border: 1px solid #555;
    border-radius: 4px;
    color: #aaa;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        background: rgba(80, 80, 80, 0.8);
        color: #fff;
    }
`;

export default function XYPad({
    title,
    valueX = 0,
    valueY = 0,
    min = -50,
    max = 50,
    size = 120,
    onChange,
}) {
    const padRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);

    // Convert value to pixel position
    const valueToPosition = useCallback((value) => {
        const range = max - min;
        const normalized = (value - min) / range;
        return normalized * size;
    }, [min, max, size]);

    // Convert pixel position to value
    const positionToValue = useCallback((position) => {
        const range = max - min;
        const normalized = Math.max(0, Math.min(1, position / size));
        return Math.round(normalized * range + min);
    }, [min, max, size]);

    // Get position from mouse/touch event
    const getPositionFromEvent = useCallback((e) => {
        if (!padRef.current) return { x: 0, y: 0 };

        const rect = padRef.current.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        return {
            x: clientX - rect.left,
            y: clientY - rect.top,
        };
    }, []);

    // Handle position update
    const updatePosition = useCallback((e) => {
        const pos = getPositionFromEvent(e);
        const newX = positionToValue(pos.x);
        const newY = positionToValue(pos.y);

        if (onChange) {
            onChange({ x: newX, y: newY });
        }
    }, [getPositionFromEvent, positionToValue, onChange]);

    // Mouse/touch handlers
    const handleMouseDown = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
        updatePosition(e);

        const handleMouseMove = (moveEvent) => {
            moveEvent.preventDefault();
            updatePosition(moveEvent);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('touchmove', handleMouseMove);
            document.removeEventListener('touchend', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('touchmove', handleMouseMove, { passive: false });
        document.addEventListener('touchend', handleMouseUp);
    }, [updatePosition]);

    // Double click to reset
    const handleDoubleClick = useCallback(() => {
        if (onChange) {
            onChange({ x: 0, y: 0 });
        }
    }, [onChange]);

    // Reset button handler
    const handleReset = useCallback(() => {
        if (onChange) {
            onChange({ x: 0, y: 0 });
        }
    }, [onChange]);

    const pointX = valueToPosition(valueX);
    const pointY = valueToPosition(valueY);

    return (
        <Container>
            {title && <Label>{title}</Label>}
            <PadWrapper>
                <Pad
                    ref={padRef}
                    $size={size}
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleMouseDown}
                    onDoubleClick={handleDoubleClick}
                >
                    <Point
                        $isDragging={isDragging}
                        style={{
                            left: `${pointX}px`,
                            top: `${pointY}px`,
                        }}
                    />
                </Pad>
                <ValuesDisplay>
                    <ValueRow>
                        <span>X:</span>
                        <span>{valueX}px</span>
                    </ValueRow>
                    <ValueRow>
                        <span>Y:</span>
                        <span>{valueY}px</span>
                    </ValueRow>
                    <ResetButton onClick={handleReset}>
                        Reset
                    </ResetButton>
                </ValuesDisplay>
            </PadWrapper>
        </Container>
    );
}
