import React, {useEffect, useState} from 'react';
import styled from 'styled-components';
import ColorPicker from 'react-pick-color';

const Container = styled.label`
    display: flex;
    width: 100%;
    flex-direction: column;
    padding: 2px 4px;
    border-radius: 4px;
    background: #1e1e1e;
`;

const Seekbar = styled.input`
    width: calc(100% - 8px);
    height: 24px
`

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

        {/*<ColorPicker
            color={values.color}
            onChange={ e => {
                console.log(e.alpha)
                handleChange({ ...values, color: e.hex, o: e.alpha });
            } }
        />*/}
        <ColorBox
            type="color"
            value={valueColor}
            onChange={ e => {
                console.log(e.target.value)
                handleChange({ ...values, color: e.target.value })
            } }
        />
        <Seekbar
            type="range"
            min={0}
            max={1}
            step={.01}
            value={valueOpacity}
            onChange={ event => {
                handleChange({ ...values, o: event.target.value })
            } }
        />
    </Container>;
}

