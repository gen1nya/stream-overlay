import React, {useRef} from 'react';
import styled from 'styled-components';
import {hexToRgba} from "../../utils";
import {FiXCircle} from "react-icons/fi";

const SliderWrapper = styled.div`
    position: relative;
    height: 32px;
    width: auto;
    background: #333;
    border-radius: 4px;
    margin-bottom: 24px;
    margin-top: 10px;
    cursor: pointer;
`;

const GradientBar = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 4px;
`;

const StopContainer = styled.div`
    position: absolute;
    top: 0;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    z-index: ${({ selected }) => (selected ? 2 : 1)};
`;

const PositionLabel = styled.div`
    position: absolute;
    top: -24px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 11px;
    font-weight: 500;
    white-space: nowrap;
    pointer-events: none;
    
    &::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        border: 4px solid transparent;
        border-top-color: rgba(0, 0, 0, 0.8);
    }
`;

const StopHandle = styled.div`
    width: 10px;
    height: 32px;
    border-radius: 3px;
    border: ${({selected}) => (selected ? '2px solid #fff' : '1px solid #999')};
    background-color: ${({color}) => color};
    cursor: grab;
    box-shadow: ${({ selected }) => (selected ? '0 0 6px #fff' : 'none')};
    
    &:active {
        cursor: grabbing;
    }
`;

const RemoveButton = styled.button`
    position: absolute;
    top: 36px;
    background: none;
    border: none;
    color: #ff7f7f;
    cursor: pointer;
    padding: 2px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;

    &:hover {
        color: #ff6666;
        transform: scale(1.1);
        background: rgba(255, 68, 68, 0.1);
    }

    &:active {
        transform: scale(0.95);
    }
`;

export default function GradientSlider({ stops, selectedId, onSelect, onChange, onAdd, onRemove }) {
    const wrapperRef = useRef(null);

    const handleClick = e => {
        const rect = wrapperRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = Math.round((x / rect.width) * 100);
        const nearExisting = stops.some(s => Math.abs(s.position - percent) < 2);
        if (!nearExisting) onAdd(percent);
    };

    const handleDrag = (e, stopId) => {
        const rect = wrapperRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        let percent = Math.round((x / rect.width) * 100);
        percent = Math.max(0, Math.min(100, percent));
        onChange(stopId, {position: percent});
    };

    const handleRemove = (e, stopId) => {
        e.stopPropagation();
        onRemove(stopId);
    };

    // Сортируем stops по position для корректного отображения градиента
    const sortedStops = [...stops].sort((a, b) => a.position - b.position);

    const gradientCSS = `linear-gradient(90deg, ${sortedStops
        .map(s => `${hexToRgba(s.color, s.alpha)} ${s.position}%`)
        .join(', ')})`;

    return (
        <SliderWrapper ref={wrapperRef} onClick={handleClick}>
            <GradientBar style={{ background: gradientCSS }} />

            {stops.map((stop) => {
                const isSelected = stop.id === selectedId;

                return (
                    <StopContainer
                        key={stop.id}
                        selected={isSelected}
                        style={{ left: `${stop.position}%` }}
                    >
                        {isSelected && (
                            <PositionLabel>
                                {stop.position}%
                            </PositionLabel>
                        )}

                        <StopHandle
                            color={stop.color}
                            selected={isSelected}
                            onMouseDown={e => {
                                e.stopPropagation();
                                onSelect(stop.id);

                                const onMove = evt => handleDrag(evt, stop.id);
                                const onUp = () => {
                                    window.removeEventListener('mousemove', onMove);
                                    window.removeEventListener('mouseup', onUp);
                                };

                                window.addEventListener('mousemove', onMove);
                                window.addEventListener('mouseup', onUp);
                            }}
                        />

                        {isSelected && (
                            <RemoveButton
                                onClick={(e) => handleRemove(e, stop.id)}
                                title="Удалить точку"
                            >
                                <FiXCircle size={20} />
                            </RemoveButton>
                        )}
                    </StopContainer>
                );
            })}
        </SliderWrapper>
    );
}