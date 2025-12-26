import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import { createPortal } from 'react-dom';
import { ColorPicker } from 'react-pick-color';
import throttle from 'lodash.throttle';
import { hexToRgba } from "../../utils";
import { useTranslation } from "react-i18next";

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const Label = styled.div`
    font-size: 0.8rem;
    color: #aaa;
`;

const ColorButton = styled.button`
    width: 100%;
    height: 32px;
    padding: 0;
    border: 1px solid #444;
    border-radius: 6px;
    cursor: pointer;
    overflow: hidden;
    display: flex;
    flex-direction: row;
    transition: border-color 0.2s ease;

    &:hover {
        border-color: #666;
    }

    &:focus {
        outline: none;
        border-color: #646cff;
    }
`;

const Half = styled.div`
    flex: 1;
    position: relative;
`;

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
    background-color: ${({ $color }) => $color || 'transparent'};
    pointer-events: none;
`;

const SolidLayer = styled(Half)`
    background-color: ${({ $color }) => $color || '#000'};
`;

const PickerOverlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10001;
`;

const PickerContainer = styled.div`
    background: #2e2e2e;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 280px;
`;

const Title = styled.h3`
    font-size: 1.1rem;
    font-weight: 600;
    color: #e0e0e0;
    margin: 0;
`;

const CloseButton = styled.button`
    align-self: flex-end;
    padding: 6px 16px;
    background: #3a3a3a;
    color: #d6d6d6;
    border-radius: 6px;
    border: 1px solid #444;
    cursor: pointer;
    font-size: 0.85rem;
    transition: all 0.2s ease;

    &:hover {
        background: #4a4a4a;
        border-color: #646cff;
    }
`;

export default function InlineColorPicker({
    title,
    color,
    alpha = 1,
    onChange
}) {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [localColor, setLocalColor] = useState(color);
    const [localAlpha, setLocalAlpha] = useState(alpha);

    const resolvedTitle = title ?? t('settings.colorPicker.title');
    const rgbaStr = hexToRgba(color, alpha);
    const solidStr = hexToRgba(color, 1);

    const throttledCallback = useMemo(() => {
        return throttle((c, a) => {
            if (onChange) {
                onChange({ color: c, alpha: a });
            }
        }, 100);
    }, [onChange]);

    const handleColorChange = (colorObj) => {
        setLocalColor(colorObj.hex);
        setLocalAlpha(colorObj.alpha);
        throttledCallback(colorObj.hex, colorObj.alpha);
    };

    const handleOpen = () => {
        setLocalColor(color);
        setLocalAlpha(alpha);
        setIsOpen(true);
    };

    const popupRoot = document.getElementById('popup-root');

    return (
        <Container>
            {title && <Label>{title}</Label>}
            <ColorButton onClick={handleOpen} title={rgbaStr}>
                <AlphaLayer>
                    <Overlay $color={rgbaStr} />
                </AlphaLayer>
                <SolidLayer $color={solidStr} />
            </ColorButton>

            {isOpen && popupRoot && createPortal(
                <PickerOverlay onClick={() => setIsOpen(false)}>
                    <PickerContainer onClick={(e) => e.stopPropagation()}>
                        <Title>{resolvedTitle}</Title>
                        <ColorPicker
                            color={hexToRgba(localColor, localAlpha)}
                            onChange={handleColorChange}
                            theme={{
                                color: "#b6b6b6",
                                inputBackground: '#262626',
                                background: 'transparent',
                                boxShadow: '0 0 0 rgba(0, 0, 0, 0.0)',
                                borderColor: 'transparent',
                            }}
                            hideInputs={false}
                        />
                        <CloseButton onClick={() => setIsOpen(false)}>
                            {t('common.close')}
                        </CloseButton>
                    </PickerContainer>
                </PickerOverlay>,
                popupRoot
            )}
        </Container>
    );
}
