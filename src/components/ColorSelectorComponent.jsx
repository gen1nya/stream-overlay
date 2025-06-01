import React, {useEffect, useState} from 'react';
import styled from 'styled-components';
import SeekbarComponent from "./SeekbarComponent";

const Container = styled.label`
    display: flex;
    width: 100%;
    flex-direction: column;
    padding: 2px 4px;
    border-radius: 4px;
    background: #1e1e1e;
`;

const ColorBox = styled.input`

`

const Title = styled.div`
    font-size: 14px;
`

export default function ColorSelectorComponent(
    { title, valueOpacity, valueColor, onChange }
) {

    const [values, setValues] = useState({
        color: valueColor,
        o: valueOpacity
    });

    useEffect(() => {
        setValues({
            color: valueColor,
            o: valueOpacity
        });
    }, [/*{valueColor, valueOpacity},*/ onChange]);

    const handleChange = (newValues) => {
        setValues(newValues);
        onChange(newValues);
    }

    return <Container>
        <Title> {title} </Title>
        <ColorBox
            type="color"
            value={valueColor}
            onChange={e => handleChange({ ...values, color: e.target.value })}
        />
        <SeekbarComponent
            min={0}
            max={1}
            step={.01}
            value={valueOpacity}
            onChange={o => handleChange({ ...values, o }) }
        />
    </Container>;
}

