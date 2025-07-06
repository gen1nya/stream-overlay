import React from "react";
import styled from "styled-components";

const Wrapper = styled.div`
    display: flex;
    flex: 1;
    flex-direction: column;
    margin-bottom: 1rem;
`;

const Header = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1em;
`;

const Label = styled.label`
    font-weight: bold;
    margin-bottom: 0.25rem;
`;

const FontSizeControl = styled.div`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
`;

const FontSizeInput = styled.input`
  width: 60px;
  padding: 0.25rem;
  font-size: 0.9rem;
`;

const Input = styled.textarea`
  font-family: monospace;
  font-size: 1rem;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 6px;
  resize: vertical;
  min-height: 60px;
`;

const Hint = styled.div`
  font-size: 0.85rem;
  color: #888;
  margin-top: 4px;
`;

export function TemplateEditor({
                                   label,
                                   value,
                                   onChange,
                                   placeholders,
                                   hint = "Доступные плейсхолдеры: {userName}, {rewardTitle}, {rewardCost}",
                                   fontSize = "1rem",
                                   onFontSizeChange,
                               }) {
    return (
        <Wrapper>
            <Header>
                <Label>{label}</Label>
                <FontSizeControl>
                    <span>Размер:</span>
                    <FontSizeInput
                        type="number"
                        min="10"
                        max="48"
                        value={parseInt(fontSize)}
                        onChange={(e) => onFontSizeChange?.(Number(e.target.value))}
                    />
                </FontSizeControl>
            </Header>

            <Input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={hint}
            />

            <Hint>
                Доступные плейсхолдеры:{" "}
                {placeholders.map((p) => (
                    <code key={p}>{`{${p}} `}</code>
                ))}
            </Hint>
        </Wrapper>
    );
}
