import React, {useEffect, useState} from 'react';
import styled from 'styled-components';

const Container = styled.label`
    align-items: flex-start;
    display: flex;
    width: ${({$width}) => $width || '100%'};
    height: 50px;
    flex-direction: column;
    padding: 4px 4px;
    justify-content: center;
    border-radius: 4px;
    background: #262626;
`;

const Title = styled.div`
    font-size: 14px;
`;

const Input = styled.input`
    margin-top: 4px;
    width: 60px;
    height: 24px;
`;

export default function NumericEditorComponent({
                                                   title,
                                                   value,
                                                   onChange,
                                                   min = 1,
                                                   max = 100,
                                                   width,
                                               }) {
    const [currentValue, setCurrentValue] = useState(value);

    useEffect(() => {
        setCurrentValue(value);
    }, [value]);

    const handleChange = (newValue) => {
        if (newValue < min || newValue > max) return;
        setCurrentValue(newValue);
        onChange(newValue);
    };

    return (
        <Container $width={width}>
            <Title>{title}</Title>
            <Input
                type="number"
                value={currentValue}
                onChange={(e) => handleChange(Number(e.target.value))}
                min={min}
                max={max}
            />
        </Container>
    );
}
