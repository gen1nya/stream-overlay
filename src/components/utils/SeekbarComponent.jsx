import React from 'react';
import styled from 'styled-components';

const Container = styled.label`
    align-items: flex-start;
    display: flex;
    flex-direction: column;
    padding: 2px 4px;
    height: 50px;
    border-radius: 4px;
    max-width: ${({$width}) => $width || '100%'};
    width: ${({$width}) => $width || '100%'};
    background: #262626;
`;

const Seekbar = styled.input`
    width: calc(100% - 8px);
    height: 24px
`;

const Title = styled.div`
    font-size: 14px;
`;

export default function SeekbarComponent(
    {title, min, max, value, step, onChange, width = '100%'}
) {

    return <Container $width={width}>
        <Title> {title} </Title>
        <Seekbar
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={e => {
                onChange(e.target.value);
            }}
        />

    </Container>;
}