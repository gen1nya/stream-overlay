import React from "react";
import styled from "styled-components";
import {FiDelete, FiTrash2} from "react-icons/fi";

const Wrapper = styled.div`
    display: flex;
    flex: 1;
    max-width: ${({ maxWidth }) => maxWidth || "100%"};
    flex-direction: row;
    align-items: center;
`;

const Input = styled.textarea`
  flex: 1;
  font-family: monospace;
  font-size: 1rem;
  padding: 0.25rem 0.5rem;
  border: 1px solid #ccc;
  border-radius: 6px;
  resize: vertical;
  min-height: 40px;
`;

export function SmallTemplateEditor({
                                        value,
                                        onChange,
                                        onDelete = () => {},
                                        hideDelete = false,
                                        width = "100%",                                    }) {
    return (
        <Wrapper maxWidth={width}>
            <Input value={value} onChange={(e) => onChange(e.target.value)} />
            {!hideDelete && (
                <FiTrash2
                    size={"24px"}
                    style={{ cursor: "pointer", marginLeft: "8px" }}
                    onClick={onDelete}
                />
            )}
        </Wrapper>
    );
}
