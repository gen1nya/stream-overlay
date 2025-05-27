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

export default function RadioGroupComponent(
    { title, options, selected, onChange }) {

    const [selectedValue, setSelectedValue] = useState(selected);

    // если selected меняется снаружи — синхронизируем
    useEffect(() => {
        setSelectedValue(selected);
    }, [selected]);

    return (
        <Container>
            <Title dangerouslySetInnerHTML={{ __html: title }} />
            <div style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem' }}>
                {options.map(option => (
                    <label key={option.value}>
                        <input
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
                    </label>
                ))}
            </div>
        </Container>
    );
}
