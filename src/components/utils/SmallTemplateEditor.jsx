import React from "react";
import styled from "styled-components";
import {FiTrash2} from "react-icons/fi";
import DebouncedTextarea from "./DebouncedTextarea";

const Wrapper = styled.div`
    display: flex;
    flex: 1;
    max-width: ${({ maxWidth }) => maxWidth || "100%"};
    flex-direction: row;
    align-items: center;
    gap: 8px;
`;

export function SmallTemplateEditor({
                                        value,
                                        onChange,
                                        onDelete = () => {},
                                        onBlur = () => {},
                                        hideDelete = false,
                                        width = "100%",
                                    }) {
    return (
        <Wrapper maxWidth={width}>
            <DebouncedTextarea
                value={value}
                onChange={onChange}
                maxLength={500}
                minHeight="40px"
            />
            {!hideDelete && (
                <FiTrash2
                    size={"24px"}
                    style={{ cursor: "pointer", flexShrink: 0 }}
                    onClick={onDelete}
                />
            )}
        </Wrapper>
    );
}
