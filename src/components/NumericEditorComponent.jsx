import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

const Container = styled.label`
    display: flex;
    flex-direction: column;
    padding: 2px 4px;
    border-radius: 4px;
    background: #1e1e1e;
`;

const Title = styled.div`
    font-size: 14px;
`;

const Input = styled.input`
    margin-top: 4px;
    width: 60px;
    height: 24px;
`;

export default function NumericEditorComponent(
    { title, value, onChange, min = 1, max = 100 }
) {

    const [currentValue, setCurrentValue] = useState(value);

    useEffect(() => {
        setCurrentValue(value);
    }, [value]);

    const handleChange = (newValue) => {
        if (newValue < min || newValue > max) {
            return; // Ignore out-of-bounds values
        }
        setCurrentValue(newValue);
        onChange(newValue);
    }

    return (
        <Container>
            <Title>{title}</Title>
            <Input
                type="number"
                value={currentValue}
                onChange={e => handleChange(Number(e.target.value))}
                min={min}
                max={max}
            />
        </Container>
    );
}

