import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import FontSelector from './FontSelector';

const Container = styled.div`
    align-items: flex-start;
    display: flex;
    flex-direction: column;
    justify-content: center;
    border-radius: 4px;
    background: #262626;
    padding: 4px;
    width: ${({ $width }) => $width || 'auto'};
`;

const Title = styled.div`
    font-size: 14px;
    margin-bottom: 6px;
`;

const Row = styled.div`
    display: flex;
    align-items: baseline;
    gap: 8px;
`;

const FontButtonWrapper = styled.div`
    width: auto;
    height: 34px;
    font-family: ${({ $fontFamily }) => $fontFamily}, sans-serif;
`;

const Input = styled.input`
    width: 60px;
    height: 28px;
    padding: 2px 6px;
    font-size: 14px;
    background: #1a1a1a;
    color: white;
    border: 1px solid #444;
    border-radius: 4px;
`;

export default function FontAndSizeEditor({
                                              title = "Шрифт:",
                                              fontFamily,
                                              fontSize,
                                              onFontChange,
                                              onFontSizeChange,
                                              min = 9,
                                              max = 82,
                                              width,
                                          }) {
    const [localSize, setLocalSize] = useState(fontSize);

    useEffect(() => {
        setLocalSize(fontSize);
    }, [fontSize]);

    const handleSizeChange = (value) => {
        if (value < min || value > max) return;
        setLocalSize(value);
        onFontSizeChange(value);
    };

    return (
        <Container $width={width}>
            <Title>{title}</Title>
            <Row>
                <FontButtonWrapper $fontFamily={fontFamily}>
                    <FontSelector
                        onSelect={(selectedFont) => {
                            const fontUrl = selectedFont.files.regular || Object.values(selectedFont.files)[0];
                            onFontChange({
                                family: selectedFont.family,
                                url: fontUrl,
                            });
                        }}
                        initialFontName={fontFamily}
                    />
                </FontButtonWrapper>
                <Input
                    type="number"
                    min={min}
                    max={max}
                    value={localSize}
                    onChange={(e) => handleSizeChange(Number(e.target.value))}
                />
            </Row>
        </Container>
    );
}
