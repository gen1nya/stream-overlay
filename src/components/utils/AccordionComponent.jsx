import React, { useState } from "react";
import styled from "styled-components";
import { FiChevronDown, FiChevronRight } from "react-icons/fi";

const AccordionWrapper = styled.div`
    border: 1px solid #333;
    border-radius: 12px;
    width: 100%;
    background: linear-gradient(135deg, #1a1a1a 0%, #222 100%);
    overflow: hidden;
    transition: border-color 0.2s ease;

    &:hover {
        border-color: #444;
    }
`;

const AccordionHeader = styled.button`
    padding: 12px 16px;
    background: transparent;
    cursor: pointer;
    width: 100%;
    border: none;
    outline: none;
    border-radius: ${props => props.$isOpen ? '11px 11px 0 0' : '11px'};
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 0.95rem;
    font-weight: 500;
    color: ${props => props.$isOpen ? '#fff' : '#ccc'};
    transition: all 0.2s ease;

    &:hover {
        background: rgba(255, 255, 255, 0.03);
        color: #fff;
    }

    &:focus {
        outline: none;
    }

    &:focus-visible {
        box-shadow: inset 0 0 0 2px rgba(100, 108, 255, 0.5);
    }

    &:active {
        background: rgba(255, 255, 255, 0.05);
    }
`;

const IconWrapper = styled.span`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    color: ${props => props.$isOpen ? '#646cff' : '#666'};
    transition: color 0.2s ease;

    ${AccordionHeader}:hover & {
        color: ${props => props.$isOpen ? '#7c7cff' : '#888'};
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;

const TitleWrapper = styled.span`
    flex: 1;
    text-align: left;
    display: flex;
    align-items: center;
`;

const AccordionContent = styled.div`
    display: grid;
    grid-template-rows: ${({ $isOpen }) => ($isOpen ? "1fr" : "0fr")};
    transition: grid-template-rows 0.3s cubic-bezier(0.4, 0, 0.2, 1);
`;

const AccordionInner = styled.div`
    overflow: hidden;
`;

const AccordionDivider = styled.div`
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(100, 108, 255, 0.2), transparent);
    margin: 0 16px;
`;

const AccordionPadding = styled.div`
    padding: 12px 16px 16px 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

export const Accordion = ({ title, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    const toggle = () => {
        setIsOpen(prev => !prev);
    };

    return (
        <AccordionWrapper>
            <AccordionHeader onClick={toggle} $isOpen={isOpen}>
                <IconWrapper $isOpen={isOpen}>
                    {isOpen ? <FiChevronDown /> : <FiChevronRight />}
                </IconWrapper>
                <TitleWrapper>{title}</TitleWrapper>
            </AccordionHeader>
            <AccordionContent $isOpen={isOpen}>
                <AccordionInner>
                    <AccordionDivider />
                    <AccordionPadding>{children}</AccordionPadding>
                </AccordionInner>
            </AccordionContent>
        </AccordionWrapper>
    );
};
