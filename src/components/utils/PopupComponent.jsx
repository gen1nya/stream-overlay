import React, { useId } from 'react';
import styled from "styled-components";
import { Portal } from "../../context/PortalContext";

const PopupContainer = styled.div`
    background: #2e2e2e;
    border-radius: 12px;
    min-width: 300px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
`;

export default function Popup({ children, onClose }) {
    const id = useId();

    return (
        <Portal id={`popup-${id}`} onClose={onClose}>
            <PopupContainer>
                {children}
            </PopupContainer>
        </Portal>
    );
}
