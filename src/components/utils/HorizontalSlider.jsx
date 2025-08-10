import React, { useCallback, useRef } from 'react';
import styled from 'styled-components';

const SliderContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
    user-select: none;
    min-width: 0;
    flex-shrink: 0;
`;

const SliderLabel = styled.span`
    font-size: 12px;
    color: #ffffff;
    white-space: nowrap;
    min-width: fit-content;
`;

const SliderWrapper = styled.div`
    position: relative;
    flex: 1;
    min-width: 60px;
    height: 20px;
    display: flex;
    align-items: center;
`;

const SliderTrack = styled.div`
    width: 100%;
    height: 4px;
    background-color: #e0e0e0;
    border-radius: 2px;
    position: relative;
    cursor: pointer;

    &:hover {
        background-color: #d0d0d0;
    }
`;

const SliderFill = styled.div`
    height: 100%;
    background-color: #a380fe;
    border-radius: 2px;
    transition: width 0.1s ease;
    pointer-events: none;
`;

const SliderThumb = styled.div`
    position: absolute;
    width: 16px;
    height: 16px;
    background-color: #652bff;
    border: 2px solid #fff;
    border-radius: 50%;
    cursor: pointer;
    top: 50%;
    transform: translate(-50%, -50%);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    transition: transform 0.1s ease, box-shadow 0.1s ease;

    &:hover {
        transform: translate(-50%, -50%) scale(1.1);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    }

    &:active {
        transform: translate(-50%, -50%) scale(1.05);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
    }
`;

const SliderValue = styled.span`
    font-size: 11px;
    color: #ffffff;
    min-width: 30px;
    text-align: right;
`;

const HorizontalSlider = ({
                              label,
                              min = 0,
                              max = 100,
                              value,
                              onChange,
                              throttleMs = 75,
                              style,
                              className
                          }) => {
    const throttleRef = useRef(null);
    const sliderRef = useRef(null);
    const isDragging = useRef(false);

    // Функция тротлинга
    const throttledOnChange = useCallback((newValue) => {
        if (throttleRef.current) {
            clearTimeout(throttleRef.current);
        }

        throttleRef.current = setTimeout(() => {
            onChange(newValue);
        }, throttleMs);
    }, [onChange, throttleMs]);

    // Вычисление значения из позиции мыши
    const getValueFromPosition = useCallback((clientX) => {
        if (!sliderRef.current) return value;

        const rect = sliderRef.current.getBoundingClientRect();
        const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        return Math.round(min + percentage * (max - min));
    }, [min, max, value]);

    // Обработка клика по треку
    const handleTrackClick = useCallback((e) => {
        if (isDragging.current) return;

        const newValue = getValueFromPosition(e.clientX);
        throttledOnChange(newValue);
    }, [getValueFromPosition, throttledOnChange]);

    // Начало перетаскивания
    const handleMouseDown = useCallback((e) => {
        e.preventDefault();
        isDragging.current = true;

        const handleMouseMove = (moveEvent) => {
            const newValue = getValueFromPosition(moveEvent.clientX);
            throttledOnChange(newValue);
        };

        const handleMouseUp = () => {
            isDragging.current = false;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [getValueFromPosition, throttledOnChange]);

    // Обработка клавиатуры
    const handleKeyDown = useCallback((e) => {
        let newValue = value;
        const step = (max - min) / 20; // 5% шаг

        switch (e.key) {
            case 'ArrowLeft':
            case 'ArrowDown':
                newValue = Math.max(min, value - step);
                break;
            case 'ArrowRight':
            case 'ArrowUp':
                newValue = Math.min(max, value + step);
                break;
            case 'Home':
                newValue = min;
                break;
            case 'End':
                newValue = max;
                break;
            default:
                return;
        }

        e.preventDefault();
        throttledOnChange(Math.round(newValue));
    }, [value, min, max, throttledOnChange]);

    // Вычисление позиции и заполнения
    const percentage = ((value - min) / (max - min)) * 100;
    const thumbPosition = `${percentage}%`;

    return (
        <SliderContainer style={style} className={className}>
            {label && <SliderLabel>{label}:</SliderLabel>}

            <SliderWrapper>
                <SliderTrack
                    ref={sliderRef}
                    onClick={handleTrackClick}
                >
                    <SliderFill style={{ width: thumbPosition }} />
                </SliderTrack>

                <SliderThumb
                    style={{ left: thumbPosition }}
                    onMouseDown={handleMouseDown}
                    onKeyDown={handleKeyDown}
                    tabIndex={0}
                    role="slider"
                    aria-label={label}
                    aria-valuemin={min}
                    aria-valuemax={max}
                    aria-valuenow={value}
                />
            </SliderWrapper>

            <SliderValue>{Math.round(value)}</SliderValue>
        </SliderContainer>
    );
};

export default HorizontalSlider;