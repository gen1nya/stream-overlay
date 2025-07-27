import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import GradientSliderFixed from "./GradientSlider";
import ColorPicker from "react-pick-color";
import {hexToRgba} from "../../utils";
import { v4 as uuid } from 'uuid';
import GradientSlider from "./GradientSlider";

const MAX_STOPS = 10;

const EditorContainer = styled.div`
    display: flex;
    box-sizing: border-box;
    flex-direction: column;
    background: #1e1e1e;
    padding: 16px;
    border-radius: 8px;
    width: 100%;
    color: #fff;
`;

const Row = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 12px;
    align-items: flex-start;
`;

const Input = styled.input`
    background: #262626;
    color: #fff;
    border: 1px solid #444;
    padding: 4px 8px;
    border-radius: 4px;
    width: 50px;
`;

const Select = styled.select`
    background: #262626;
    color: #fff;
    border: 1px solid #444;
    padding: 4px 8px;
    border-radius: 4px;
`;

const SettingsElementWrapper = styled.div`
    height: 50px;
    border: 1px solid #444;
    margin-top: 8px;
    border-radius: 6px;
    padding: 2px 8px;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
`;

export default function GradientEditor({ value, onChange }) {
    const [type, setType] = useState(value?.type || 'linear');
    const [angle, setAngle] = useState(value?.angle || 90);
    const [center, setCenter] = useState(value?.center || { x: 50, y: 50 });
    const [stops, setStops] = useState(() => {
        // Инициализируем stops с уникальными ID, если их нет
        return (value?.stops || []).map(stop => ({
            ...stop,
            id: stop.id || uuid()
        }));
    });
    const [selectedId, setSelectedId] = useState(stops[0]?.id || null);

    useEffect(() => {
        // Всегда сортируем stops по position перед отправкой наверх
        const sortedStops = [...stops].sort((a, b) => a.position - b.position);
        onChange({ type, angle, center, stops: sortedStops });
    }, [type, angle, center, stops]);

    const updateStop = (id, updates) => {
        setStops(prev => {
            return prev.map(stop =>
                stop.id === id
                    ? { ...stop, ...updates }
                    : stop
            );
        });
    };

    const removeStop = id => {
        setStops(prev => prev.filter(stop => stop.id !== id));
        // Выбираем первую доступную точку после удаления
        const remainingStops = stops.filter(stop => stop.id !== id);
        if (remainingStops.length > 0) {
            setSelectedId(remainingStops[0].id);
        } else {
            setSelectedId(null);
        }
    };

    const addStop = pos => {
        if (stops.length >= MAX_STOPS) return;
        const newStop = {
            id: uuid(),
            color: '#ffffff',
            alpha: 1,
            position: pos
        };
        setStops(prev => [...prev, newStop]);
        setSelectedId(newStop.id);
    };

    const selectedStop = stops.find(stop => stop.id === selectedId) || {};

    return (
        <EditorContainer>
            <GradientSlider
                stops={stops}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onChange={updateStop}
                onAdd={addStop}
            />

            <Row>
                <ColorPicker
                    color={hexToRgba(selectedStop.color || '#ffffff', selectedStop.alpha || 1)}
                    onChange={(colorObj) => {
                        updateStop(selectedId, {
                            color: colorObj.hex,
                            alpha: colorObj.alpha
                        });
                    }}
                    theme={{
                        color: "#b6b6b6",
                        inputBackground: '#262626',
                        background: 'transparent',
                        boxShadow: '0 0 0 rgba(0, 0, 0, 0.0)',
                        borderColor: 'transparent',
                    }}
                    hideInput={false}
                />

                <SettingsElementWrapper>
                    <Input
                        type="number"
                        min={0}
                        max={100}
                        value={selectedStop.position ?? 0}
                        onChange={e => updateStop(selectedId, { position: Number(e.target.value) })}
                    />

                    <button onClick={() => removeStop(selectedId)}>✕</button>
                </SettingsElementWrapper>

                <SettingsElementWrapper>
                    <label>Type:</label>
                    <Select value={type} onChange={e => setType(e.target.value)}>
                        <option value="linear">Linear</option>
                        <option value="radial">Radial</option>
                    </Select>

                    {type === 'linear' && (
                        <>
                            <label>Angle:</label>
                            <Input
                                type="number"
                                value={angle}
                                onChange={e => setAngle(Number(e.target.value))}
                            />
                        </>
                    )}
                </SettingsElementWrapper>

                {type === 'radial' && (
                    <SettingsElementWrapper>
                        <label>Center X:</label>
                        <Input
                            type="number"
                            value={center.x}
                            onChange={e => setCenter({ ...center, x: Number(e.target.value) })}
                        />
                        <label>Y:</label>
                        <Input
                            type="number"
                            value={center.y}
                            onChange={e => setCenter({ ...center, y: Number(e.target.value) })}
                        />
                    </SettingsElementWrapper>
                )}
            </Row>
        </EditorContainer>
    );
}