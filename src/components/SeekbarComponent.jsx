import React from 'react';
import styled from 'styled-components';

const Container = styled.label`
    display: flex;
    flex-direction: column;
    padding: 2px 4px;
    border-radius: 4px;
    background: #1e1e1e;
`

const Seekbar = styled.input`
    width: 100px;
    height: 24px
`

const Title = styled.div`
    font-size: 14px;
`

export default function SeekbarComponent(
    { title, min, max, value, step, onChange }
) {

    return <Container>
        <Title> {title} </Title>
        <Seekbar
            type="range"
            min= {min}
            max= {max}
            step= {step}
            value= {value}
            onChange={e => {onChange(e.target.value);}}
        />

    </Container>;
}