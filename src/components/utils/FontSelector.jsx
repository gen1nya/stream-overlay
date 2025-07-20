import React, { useEffect, useState, useRef } from 'react';
import styled from 'styled-components';
import fonts from './cyrillic_fonts_minimal.json';
import { createPortal } from 'react-dom';
import Popup from "./PopupComponent";

const SelectorWrapper = styled.div`
    position: relative;
    display: inline-block;
`;

const SelectedFontButton = styled.button`
    padding: 10px 14px;
    border-radius: 8px;
    border: 1px solid #ccc;
    background: #2c2c2c;
    color: white;
    font-size: 16px;
    cursor: pointer;
`;

const Container = styled.div`
    display: flex;
    padding: 8px 16px 16px 16px;
    flex-direction: column;
    height: 500px;
    max-height: 500px;
    gap: 8px;
    overflow-y: auto;
`;

const OptionPreview = styled.div`
    padding: 8px;
    border-radius: 6px;
    background: #2a2a2a;
    color: white;
    font-size: 16px;
    cursor: pointer;
    margin-bottom: 4px;

    &:hover {
        background: #3c3c3c;
    }
`;

const loadFont = (family, url) => {
    if (document.getElementById(`font-${family}`)) return;
    const style = document.createElement('style');
    style.id = `font-${family}`;
    style.innerHTML = `
    @font-face {
      font-family: '${family}';
      src: url('${url}') format('woff2');
      font-weight: normal;
      font-style: normal;
    }
  `;
    document.head.appendChild(style);
};

const FontSelectorPopup = ({ onClose, onSelectFont }) => {
    useEffect(() => {
        fonts.forEach((font) => {
            const url = font.files.regular || Object.values(font.files)[0];
            if (url) loadFont(font.family, url);
        });
    }, []);

    return (
        <Popup onClose={onClose}>
            <Container>
                {fonts.map((font) => (
                    <OptionPreview
                        key={font.family}
                        onClick={() => {
                            onSelectFont(font);
                            onClose();
                        }}
                        style={{ fontFamily: `'${font.family}', sans-serif` }}
                    >
                        {font.family} — Пример: Привет, мир!
                    </OptionPreview>
                ))}
            </Container>
        </Popup>
    );
};

const FontSelector = ({ onSelect }) => {
    const [selectedFont, setSelectedFont] = useState(fonts[0]);
    const [isOpen, setIsOpen] = useState(false);
    const popupRoot = document.getElementById('popup-root');

    useEffect(() => {
        const previewUrl = selectedFont.files.regular || Object.values(selectedFont.files)[0];
        if (previewUrl) loadFont(selectedFont.family, previewUrl);
    }, [selectedFont]);

    const handleSelectFont = (font) => {
        setSelectedFont(font);
        onSelect?.(font);
    };

    const togglePopup = () => {
        setIsOpen((prev) => !prev);
    };

    return (
        <SelectorWrapper>
            <SelectedFontButton
                onClick={togglePopup}
                style={{ fontFamily: `'${selectedFont.family}', sans-serif` }}
            >
                {selectedFont.family}
            </SelectedFontButton>
            {isOpen && popupRoot && createPortal(
                <FontSelectorPopup
                    onClose={() => setIsOpen(false)}
                    onSelectFont={handleSelectFont}
                />,
                popupRoot
            )}
        </SelectorWrapper>
    );
};

export default FontSelector;
