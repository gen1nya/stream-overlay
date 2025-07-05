// components/popups/ColorPickerPopup.js
import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import Popup from '../../utils/PopupComponent';
import { ColorPicker } from 'react-pick-color';
import throttle from 'lodash.throttle';
import {hexToRgba} from "../../../utils";

const PopupContent = styled.div`
    display: flex;
    padding: 16px 12px 12px 12px;
    flex-direction: column;
    gap: 16px;
`;

const Title = styled.h2`
    font-size: 1.5rem;
    font-weight: bold;
    color: #d6d6d6;
    margin: 0;
`;

const CloseButton = styled.button`
    align-self: flex-end;
    padding: 4px 8px;
    background: #3a3a3a;
    color: #d6d6d6;
    border-radius: 4px;
    border: 1px solid transparent;
    cursor: pointer;
    &:hover {
        background: #4a4a4a;
        border-color: #646cff;
    }
`;

export default function ColorPickerPopup({
                                             title = "Выбор цвета",
                                             initialColor = "#ffffff",
                                             initialAlpha = 1,
                                             onClose,
                                             onColorChange
}) {
    const [color, setColor] = useState(initialColor);
    const [alpha, setAlpha] = useState(initialAlpha || 1);

    // Мемоизированный throttled-коллбек
    const throttledCallback = useMemo(() => {
        return throttle((color, alpha) => {
            if (onColorChange) {
                console.log('Color changed:', color, 'Alpha:', alpha);
                onColorChange({color, alpha});
            }
        }, 300);
    }, [onColorChange]);

    useEffect(() => {
        throttledCallback(color, alpha);
    }, [color, alpha, throttledCallback]);

    return (
        <Popup>
            <PopupContent>
                <Title>{title}</Title>
                <ColorPicker
                    color={hexToRgba(color, alpha)}
                    onChange={ (colorObj) => {
                        setColor(colorObj.hex);
                        setAlpha(colorObj.alpha);
                    }}
                    theme={
                        {
                            color: "#b6b6b6",
                            inputBackground: '#262626',
                            background: 'transparent',
                            boxShadow: '0 0 0 rgba(0, 0, 0, 0.0)',
                            borderColor: 'transparent',
                        }
                    }
                    hideInput={false}
                />
                <CloseButton onClick={onClose}>Закрыть</CloseButton>
            </PopupContent>
        </Popup>
    );
}
