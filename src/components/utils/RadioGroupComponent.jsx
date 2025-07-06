import React, {useEffect, useState} from 'react';
import styled from 'styled-components';
import {input} from "framer-motion/m";

const Container = styled.label`
    display: flex;
    flex-direction: column;
    padding: 2px 4px;
    border-radius: 4px;
    background: #262626;
    height: 50px;
    max-width: ${({$width}) => $width || '100%'};
    width: ${({$width}) => $width || '100%'};
`;

const Title = styled.div`
    font-size: 14px;
`;

const Radio = styled.input`
    
`;

const RadioLabel = styled.label`
    margin-top: 5px;
    font-size: 13px;
`;

export default function RadioGroupComponent(
    {title, options, selected, onChange, width = '100%'}) {

    const [selectedValue, setSelectedValue] = useState(selected);

    // если selected меняется снаружи — синхронизируем
    useEffect(() => {
        setSelectedValue(selected);
    }, [selected]);

    return (
        <Container $width={width}>
            <Title dangerouslySetInnerHTML={{__html: title}}/>
            <div style={{display: 'flex', flexDirection: 'row', gap: '0.5rem'}}>
                {options.map(option => (
                    <RadioLabel key={option.value}>
                        <Radio
                            type="radio"
                            name={title}             // группируем радиокнопки одним именем
                            value={option.value}
                            checked={selectedValue === option.value}
                            onChange={() => {
                                setSelectedValue(option.value);
                                onChange(option.value);
                            }}
                        />
                        {option.label}
                    </RadioLabel>
                ))}
            </div>
        </Container>
    );
}
