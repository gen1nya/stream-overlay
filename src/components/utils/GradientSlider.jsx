import React, { useRef } from 'react';
import styled from 'styled-components';
import {hexToRgba} from "../../utils";

const SliderWrapper = styled.div`
    position: relative;
    height: 32px;
    width: auto;
    background: #333;
    border-radius: 4px;
    margin-bottom: 16px;
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

const StopHandle = styled.div`
    position: absolute;
    top: -4px;
    width: 10px;
    height: 40px;
    border-radius: 3px;
    border: 2px solid #fff;
    background-color: ${({ color }) => color};
    transform: translateX(-50%);
    cursor: grab;
    z-index: ${({ selected }) => (selected ? 2 : 1)};
    box-shadow: ${({ selected }) => (selected ? '0 0 6px #fff' : 'none')};
`;

export default function GradientSlider({ stops, selectedId, onSelect, onChange, onAdd }) {
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
        onChange(stopId, { position: percent });
    };

    // Сортируем stops по position для корректного отображения градиента
    const sortedStops = [...stops].sort((a, b) => a.position - b.position);

    const gradientCSS = `linear-gradient(90deg, ${sortedStops
        .map(s => `${hexToRgba(s.color, s.alpha)} ${s.position}%`)
        .join(', ')})`;

    return (
        <SliderWrapper ref={wrapperRef} onClick={handleClick}>
            <GradientBar style={{ background: gradientCSS }} />

            {stops.map((stop) => (
                <StopHandle
                    key={stop.id}
                    color={stop.color}
                    selected={stop.id === selectedId}
                    style={{ left: `${stop.position}%` }}
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
            ))}
        </SliderWrapper>
    );
}