import React, { useState, useRef } from "react";
import styled from "styled-components";

const AccordionWrapper = styled.div`
  border: 1px solid #ccc;
  border-radius: 8px;
`;

const AccordionHeader = styled.button`
    padding: 8px 12px 8px 8px;
    background: #252525;
    cursor: pointer;
    font-weight: bold;
    width: 100%;
    border: none;
    text-align: left;
    display: flex;
    justify-content: space-between;
    font-size: 1rem;
`;

const AccordionContent = styled.div`
  overflow: hidden;
  transition: max-height 0.3s ease;
  max-height: ${({ isOpen, height }) => (isOpen ? `${height}px` : "0")};
`;

const AccordionInner = styled.div`
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

export const Accordion = ({ title, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [height, setHeight] = useState(0);
    const contentRef = useRef(null);

    const toggle = () => {
        if (!isOpen && contentRef.current) {
            setHeight(contentRef.current.scrollHeight);
        }
        setIsOpen((prev) => !prev);
    };

    return (
        <AccordionWrapper>
            <AccordionHeader onClick={toggle}>
                {title}
                <span>{isOpen ? "▲" : "▼"}</span>
            </AccordionHeader>
            <AccordionContent isOpen={isOpen} height={height}>
                <AccordionInner ref={contentRef}>{children}</AccordionInner>
            </AccordionContent>
        </AccordionWrapper>
    );
};
