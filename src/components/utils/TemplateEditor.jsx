import React from "react";
import styled from "styled-components";

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: 1rem;
`;

const Label = styled.label`
  font-weight: bold;
  margin-bottom: 0.25rem;
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
                                   hint = "Доступные плейсхолдеры: {userName}, {rewardTitle}, {rewardCost}"
                               }) {
    return (
        <Wrapper>
            <Label>{label}</Label>
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
