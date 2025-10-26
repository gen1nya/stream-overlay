import React, { useState, useRef, useEffect } from 'react';
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
    overflow: visible;
    transition: all 0.2s ease;
    pointer-events: none;

    ${SliderContainer}:hover & {
        background: ${props => props.disabled ? '#333' : '#3a3a3a'};
    }
`;

const TickMarks = styled.div`
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 100%;
    transform: translateY(-50%);
    pointer-events: none;
`;

const Tick = styled.div`
    position: absolute;
    left: ${props => props.position}%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 2px;
    height: ${props => props.major ? '12px' : '8px'};
    background: ${props => props.disabled ? '#444' : '#555'};
    opacity: ${props => props.major ? 0.8 : 0.5};
    transition: all 0.2s ease;
    pointer-events: none;

    ${SliderContainer}:hover & {
        background: ${props => props.disabled ? '#444' : '#666'};
    }
`;

const TickLabel = styled.div`
    position: absolute;
    left: ${props => props.position}%;
    top: 100%;
    transform: translateX(-50%);
    font-size: 0.65rem;
    color: ${props => props.disabled ? '#555' : '#777'};
    margin-top: 4px;
    white-space: nowrap;
    pointer-events: none;
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
    pointer-events: none;

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
    z-index: 2;
    pointer-events: none;

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
    top: 0;
    left: 0;
    margin: 0;
    cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
    z-index: 10;
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
                                             formatValue = (val) => val,
                                             logarithmic = false,
                                             showTicks = true,
                                             showTickLabels = false,
                                             throttleMs = 100,
                                             roundTo = null
                                         }) {
    const [isDragging, setIsDragging] = useState(false);
    const [showTooltipState, setShowTooltipState] = useState(false);
    const containerRef = useRef(null);
    const throttleTimerRef = useRef(null);
    const lastCallTimeRef = useRef(0);

    // Cleanup throttle timer on unmount
    useEffect(() => {
        return () => {
            if (throttleTimerRef.current) {
                clearTimeout(throttleTimerRef.current);
            }
        };
    }, []);

    // Приводим все к числам и обеспечиваем валидные значения
    const numericValue = isNaN(Number(value)) ? 0 : Number(value);
    const numericMin = isNaN(Number(min)) ? 0 : Number(min);
    const numericMax = isNaN(Number(max)) ? 100 : Number(max);

    // Функция округления
    const roundValue = (val) => {
        if (roundTo === null) return val;
        if (roundTo === 0) return Math.round(val);
        const multiplier = Math.pow(10, roundTo);
        return Math.round(val * multiplier) / multiplier;
    };

    // Логарифмические преобразования
    const valueToPosition = (val) => {
        if (!logarithmic) {
            const range = numericMax - numericMin;
            return range > 0 ? ((val - numericMin) / range) * 100 : 0;
        }

        // Для логарифмической шкалы
        const minLog = Math.log(numericMin || 1);
        const maxLog = Math.log(numericMax);
        const valueLog = Math.log(val || 1);
        const range = maxLog - minLog;
        return range > 0 ? ((valueLog - minLog) / range) * 100 : 0;
    };

    const positionToValue = (position) => {
        if (!logarithmic) {
            const range = numericMax - numericMin;
            return numericMin + (position / 100) * range;
        }

        // Для логарифмической шкалы
        const minLog = Math.log(numericMin || 1);
        const maxLog = Math.log(numericMax);
        const range = maxLog - minLog;
        const rawValue = Math.exp(minLog + (position / 100) * range);
        return roundValue(rawValue);
    };

    // Убеждаемся, что значение находится в допустимом диапазоне
    const clampedValue = Math.max(numericMin, Math.min(numericMax, numericValue));

    // Вычисляем прогресс
    const finalProgress = Math.max(0, Math.min(100, valueToPosition(clampedValue)));

    // Генерация насечек для логарифмической шкалы
    const generateTicks = () => {
        if (!showTicks || !logarithmic) return [];

        const ticks = [];
        const minLog = Math.log10(numericMin || 1);
        const maxLog = Math.log10(numericMax);

        // Определяем порядки величин
        const minOrder = Math.floor(minLog);
        const maxOrder = Math.ceil(maxLog);

        for (let order = minOrder; order <= maxOrder; order++) {
            const baseValue = Math.pow(10, order);

            // Основные деления (1, 10, 100, 1000 и т.д.)
            if (baseValue >= numericMin && baseValue <= numericMax) {
                ticks.push({
                    value: baseValue,
                    position: valueToPosition(baseValue),
                    major: true,
                    label: formatTickLabel(baseValue)
                });
            }

            // Промежуточные деления (2, 3, 4, 5, 6, 7, 8, 9 для каждого порядка)
            for (let i = 2; i <= 9; i++) {
                const tickValue = baseValue * i;
                if (tickValue >= numericMin && tickValue <= numericMax && tickValue < Math.pow(10, order + 1)) {
                    ticks.push({
                        value: tickValue,
                        position: valueToPosition(tickValue),
                        major: false
                    });
                }
            }
        }

        return ticks;
    };

    const formatTickLabel = (val) => {
        if (val >= 1000000) return `${val / 1000000}M`;
        if (val >= 1000) return `${val / 1000}k`;
        return val.toString();
    };

    const handleChange = (newValue) => {
        if (disabled || !onChange) return;

        const numValue = Number(newValue);
        if (isNaN(numValue)) return;

        const now = Date.now();
        const timeSinceLastCall = now - lastCallTimeRef.current;

        // Если прошло достаточно времени с последнего вызова, вызываем сразу
        if (timeSinceLastCall >= throttleMs) {
            lastCallTimeRef.current = now;
            onChange(numValue);

            // Очищаем отложенный вызов если он был
            if (throttleTimerRef.current) {
                clearTimeout(throttleTimerRef.current);
                throttleTimerRef.current = null;
            }
        } else {
            // Иначе откладываем вызов
            if (throttleTimerRef.current) {
                clearTimeout(throttleTimerRef.current);
            }

            throttleTimerRef.current = setTimeout(() => {
                lastCallTimeRef.current = Date.now();
                onChange(numValue);
                throttleTimerRef.current = null;
            }, throttleMs - timeSinceLastCall);
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

    const handleInputChange = (e) => {
        if (logarithmic) {
            // Для логарифмической шкалы: input работает от 0 до 100 (позиция)
            const position = Number(e.target.value);
            const actualValue = positionToValue(position);
            handleChange(actualValue);
        } else {
            // Для линейной шкалы: стандартная обработка
            handleChange(e.target.value);
        }
    };

    const displayValue = formatValue(clampedValue);
    const ticks = generateTicks();

    // Для логарифмической шкалы используем позицию (0-100), для линейной - реальное значение
    const inputValue = logarithmic ? finalProgress : clampedValue;
    const inputMin = logarithmic ? 0 : numericMin;
    const inputMax = logarithmic ? 100 : numericMax;
    const inputStep = logarithmic ? 0.01 : step;

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
                    {logarithmic && showTicks && (
                        <TickMarks>
                            {ticks.map((tick, idx) => (
                                <React.Fragment key={idx}>
                                    <Tick
                                        position={tick.position}
                                        major={tick.major}
                                        disabled={disabled}
                                    />
                                    {tick.major && showTickLabels && tick.label && (
                                        <TickLabel
                                            position={tick.position}
                                            disabled={disabled}
                                        >
                                            {tick.label}
                                        </TickLabel>
                                    )}
                                </React.Fragment>
                            ))}
                        </TickMarks>
                    )}

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
                    min={inputMin}
                    max={inputMax}
                    step={inputStep}
                    value={inputValue}
                    disabled={disabled}
                    onChange={handleInputChange}
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}
                />
            </SliderContainer>
        </Container>
    );
}