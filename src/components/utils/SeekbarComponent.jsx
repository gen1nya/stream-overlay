import React, { useState, useRef } from 'react';
import styled from 'styled-components';

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: ${({$width}) => $width || 'auto'};
    min-width: 120px;
`;

const Label = styled.label`
    font-size: 0.8rem;
    font-weight: 500;
    color: ${props => props.disabled ? '#666' : '#e0e0e0'};
    margin-bottom: 2px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
`;

const ValueDisplay = styled.span`
    font-size: 0.75rem;
    color: ${props => props.disabled ? '#555' : '#999'};
    font-weight: 400;
    min-width: fit-content;
`;

const SliderContainer = styled.div`
    position: relative;
    height: 20px;
    display: flex;
    align-items: center;
    cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
`;

const SliderTrack = styled.div`
    width: 100%;
    height: 4px;
    background: #333;
    border-radius: 2px;
    position: relative;
    overflow: hidden;
    transition: all 0.2s ease;

    ${SliderContainer}:hover & {
        background: ${props => props.disabled ? '#333' : '#3a3a3a'};
    }
`;

const SliderProgress = styled.div`
    height: 100%;
    background: ${props => {
        if (props.disabled) return '#555';
        return 'linear-gradient(90deg, #646cff 0%, #7c3aed 100%)';
    }};
    border-radius: 2px;
    width: ${props => props.progress}%;
    transition: all 0.2s ease;
    position: absolute;
    left: 0;
    top: 0;

    &::after {
        content: '';
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        width: 2px;
        background: rgba(255, 255, 255, 0.3);
        opacity: ${props => props.disabled ? 0 : 1};
    }
`;

const SliderThumb = styled.div`
    position: absolute;
    top: 50%;
    left: ${props => props.position}%;
    transform: translate(-50%, -50%);
    width: 16px;
    height: 16px;
    background: ${props => {
        if (props.disabled) return '#555';
        if (props.isDragging) return '#7c7cff';
        return '#646cff';
    }};
    border: 2px solid ${props => props.disabled ? '#444' : '#1e1e1e'};
    border-radius: 50%;
    cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
    transition: all 0.2s ease;
    box-shadow: ${props => {
        if (props.disabled) return 'none';
        if (props.isDragging) return '0 0 0 4px rgba(100, 108, 255, 0.2)';
        return '0 2px 4px rgba(0, 0, 0, 0.3)';
    }};

    &:hover {
        transform: translate(-50%, -50%) ${props => props.disabled ? 'scale(1)' : 'scale(1.1)'};
        background: ${props => props.disabled ? '#555' : '#7c7cff'};
    }
`;

const TooltipContainer = styled.div`
    position: absolute;
    top: -32px;
    left: ${props => props.position}%;
    transform: translateX(-50%);
    background: #333;
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.75rem;
    white-space: nowrap;
    opacity: ${props => props.show ? 1 : 0};
    visibility: ${props => props.show ? 'visible' : 'hidden'};
    transition: all 0.2s ease;
    pointer-events: none;
    z-index: 10;
    border: 1px solid #444;

    &::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 4px solid transparent;
        border-right: 4px solid transparent;
        border-top: 4px solid #333;
    }
`;

const HiddenInput = styled.input`
    position: absolute;
    opacity: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
`;

export default function SeekbarComponent({
                                             title,
                                             min = 0,
                                             max = 100,
                                             value = 0,
                                             step = 1,
                                             onChange,
                                             width = '100%',
                                             disabled = false,
                                             tooltip = '',
                                             showValue = true,
                                             showTooltip = true,
                                             formatValue = (val) => val
                                         }) {
    const [isDragging, setIsDragging] = useState(false);
    const [showTooltipState, setShowTooltipState] = useState(false);
    const containerRef = useRef(null);

    // Приводим все к числам и обеспечиваем валидные значения
    const numericValue = isNaN(Number(value)) ? 0 : Number(value);
    const numericMin = isNaN(Number(min)) ? 0 : Number(min);
    const numericMax = isNaN(Number(max)) ? 100 : Number(max);

    // Убеждаемся, что значение находится в допустимом диапазоне
    const clampedValue = Math.max(numericMin, Math.min(numericMax, numericValue));

    // Вычисляем прогресс более надежно
    const range = numericMax - numericMin;
    const progress = range > 0 ? ((clampedValue - numericMin) / range) * 100 : 0;
    const finalProgress = Math.max(0, Math.min(100, progress));

    const handleChange = (newValue) => {
        if (disabled) return;
        const numValue = Number(newValue);
        // Дополнительная проверка на валидность
        if (!isNaN(numValue)) {
            onChange?.(numValue);
        }
    };

    const handleMouseDown = () => {
        if (disabled) return;
        setIsDragging(true);
        setShowTooltipState(true);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        setShowTooltipState(false);
    };

    const handleMouseEnter = () => {
        if (!disabled && showTooltip) {
            setShowTooltipState(true);
        }
    };

    const handleMouseLeave = () => {
        if (!isDragging) {
            setShowTooltipState(false);
        }
    };

    const displayValue = formatValue(clampedValue);

    return (
        <Container
            $width={width}
            title={disabled ? tooltip : undefined}
            ref={containerRef}
        >
            <Label disabled={disabled}>
                <span>{title}</span>
                {showValue && <ValueDisplay disabled={disabled}>{displayValue}</ValueDisplay>}
            </Label>

            <SliderContainer
                disabled={disabled}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <SliderTrack disabled={disabled}>
                    <SliderProgress
                        progress={finalProgress}
                        disabled={disabled}
                    />
                </SliderTrack>

                <SliderThumb
                    position={finalProgress}
                    disabled={disabled}
                    isDragging={isDragging}
                />

                {showTooltip && (
                    <TooltipContainer
                        show={showTooltipState && !disabled}
                        position={finalProgress}
                    >
                        {displayValue}
                    </TooltipContainer>
                )}

                <HiddenInput
                    type="range"
                    min={numericMin}
                    max={numericMax}
                    step={step}
                    value={clampedValue}
                    disabled={disabled}
                    onChange={(e) => handleChange(e.target.value)}
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}
                />
            </SliderContainer>
        </Container>
    );
}