// components/ui/PhotoshopStyleColorButton.js
import React from 'react';
import styled from 'styled-components';
import {hexToRgba} from "../../../utils";
import { useTranslation } from "react-i18next";

const Container = styled.div`
    width: 150px;
    max-width: 150px;
    height: auto;
    display: flex;
    flex-direction: column;
    justify-content: center;
`;

const Title = styled.h5`
    font-size: 0.9rem;
    font-weight: 500;
    color: #d6d6d6;
    margin: 0;
    padding: 0 0 4px 0;
    text-align: center;
    user-select: none;
    pointer-events: none;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    width: 100%;
    letter-spacing: 0.05rem;
`;

const Button = styled.button`
    width: 150px;
    height: 32px;
    padding: 0;
    border: 1px solid #666;
    border-radius: 4px;
    cursor: pointer;
    overflow: hidden;
    display: flex;
    flex-direction: row;
`;

const Half = styled.div`
    flex: 1;
    position: relative;
`;

// Левая половина — прозрачный фон + цвет с альфой
const AlphaLayer = styled(Half)`
    background-image:
        linear-gradient(45deg, #ccc 25%, transparent 25%),
        linear-gradient(-45deg, #ccc 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #ccc 75%),
        linear-gradient(-45deg, transparent 75%, #ccc 75%);
    background-size: 8px 8px;
    background-position: 0 0, 0 4px, 4px -4px, -4px 0;
`;

const Overlay = styled.div`
    position: absolute;
    inset: 0;
    background-color: ${({ color }) => color || 'transparent'};
    pointer-events: none;
`;

const SolidLayer = styled(Half)`
    background-color: ${({ color }) => color || '#000'};
`;

export default function ColorSelectorButton({
                                                hex,
                                                alpha,
                                                title,
                                                onColorChange,
                                                getInitial = () => ({ color: hex, alpha }),
                                                openColorPopup
                                            }) {
    const { t } = useTranslation();
    const resolvedTitle = title ?? t('settings.colorPicker.title');
    const rgbaStr = hexToRgba(hex, alpha);
    const solidStr = hexToRgba(hex, 1);


    const handleClick = () => {
        openColorPopup({
            initialColor: getInitial().color,
            initialAlpha: getInitial().alpha,
            title: resolvedTitle,
            onChange: (e) => {
                if (onColorChange) {
                    onColorChange(e);
                }
            }
        });
    };


    return (
        <Container>
            <Title>{resolvedTitle}</Title>
            <Button onClick={handleClick} title={rgbaStr}>
                <AlphaLayer>
                    <Overlay color={rgbaStr} />
                </AlphaLayer>
                <SolidLayer color={solidStr} />
            </Button>
        </Container>
    );
}
