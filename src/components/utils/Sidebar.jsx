import React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";

const Wrapper = styled.div`
    width: ${(props) => (props.open ? "240px" : "70px")};
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
    border: 1px solid #333;
    display: flex;
    flex-direction: column;
    padding: 8px;
    box-shadow:
            0 4px 20px rgba(0, 0, 0, 0.3),
            0 0 0 1px rgba(255, 255, 255, 0.05);
    overflow: hidden;
`;

const Item = styled.div`
    display: flex;
    align-items: center;
    padding: ${(props) => (props.open ? "14px 16px" : "14px")};
    margin: 2px 0;
    border-radius: 12px;
    cursor: pointer;
    position: relative;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid transparent;
    justify-content: ${(props) => (props.open ? "flex-start" : "center")};
    
    background: ${(props) => {
    if (props.active) {
        return "linear-gradient(135deg, rgba(100, 108, 255, 0.15) 0%, rgba(124, 58, 237, 0.15) 100%)";
    }
    return "transparent";
}};
    
    border-color: ${(props) => {
    if (props.active) {
        return "rgba(100, 108, 255, 0.3)";
    }
    return "transparent";
}};

    &:hover {
        background: ${(props) => {
    if (props.active) {
        return "linear-gradient(135deg, rgba(100, 108, 255, 0.2) 0%, rgba(124, 58, 237, 0.2) 100%)";
    }
    return "rgba(255, 255, 255, 0.05)";
}};
        border-color: ${(props) => (props.active ? "rgba(100, 108, 255, 0.4)" : "rgba(255, 255, 255, 0.1)")};
        transform: translateX(2px);
    }

    &:active {
        transform: translateX(1px) scale(0.98);
    }

    svg {
        width: 20px;
        height: 20px;
        color: ${(props) => (props.active ? "#646cff" : "#999")};
        transition: all 0.2s ease;
        margin-right: ${(props) => (props.open ? "12px" : "0")};
        flex-shrink: 0;
    }

    &:hover svg {
        color: ${(props) => (props.active ? "#7c7cff" : "#ccc")};
        transform: scale(1.05);
    }
`;

const Label = styled.span`
    font-size: 0.95rem;
    font-weight: 500;
    color: ${(props) => (props.active ? "#fff" : "#ccc")};
    opacity: ${(props) => (props.open ? 1 : 0)};
    transform: translateX(${(props) => (props.open ? "0" : "-10px")});
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    white-space: nowrap;
    overflow: hidden;

    ${Item}:hover & {
        color: ${(props) => (props.active ? "#fff" : "#e0e0e0")};
    }
`;

const ActiveIndicator = styled.div`
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: ${(props) => (props.active ? "60%" : "0")};
    background: linear-gradient(135deg, #646cff 0%, #7c3aed 100%);
    border-radius: 0 2px 2px 0;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    opacity: ${(props) => (props.active ? 1 : 0)};
`;

const Tooltip = styled.div`
    position: absolute;
    left: 80px;
    top: 50%;
    transform: translateY(-50%);
    background: #333;
    color: white;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 500;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transform: translateY(-50%) translateX(-10px);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 100;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    border: 1px solid #444;

    &::before {
        content: '';
        position: absolute;
        left: -5px;
        top: 50%;
        transform: translateY(-50%);
        width: 0;
        height: 0;
        border-top: 5px solid transparent;
        border-bottom: 5px solid transparent;
        border-right: 5px solid #333;
    }

    ${Item}:hover & {
        opacity: ${(props) => (props.showTooltip ? 1 : 0)};
        transform: translateY(-50%) translateX(0);
    }
`;

const Divider = styled.div`
    height: 1px;
    background: linear-gradient(90deg, transparent, #333, transparent);
    margin: 8px 12px;
    opacity: 0.6;
`;

const SidebarHeader = styled.div`
    padding: 16px 16px 8px;
    display: flex;
    align-items: center;
    justify-content: ${(props) => (props.open ? "flex-start" : "center")};
    margin-bottom: 8px;
`;

const HeaderTitle = styled.h3`
    margin: 0;
    font-size: 0.9rem;
    font-weight: 600;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    opacity: ${(props) => (props.open ? 1 : 0)};
    transition: opacity 0.2s ease;
`;

export const Sidebar = ({ open, active, onSelect, items }) => {
    // Группируем элементы (можно добавить логику группировки)
    const { t } = useTranslation();
    const mainItems = items || [];

    return (
        <Wrapper open={open}>
            <SidebarHeader open={open}>
                <HeaderTitle open={open}>{t('sidebar.title')}</HeaderTitle>
            </SidebarHeader>

            <Divider />

            {mainItems.map((item, index) => (
                <Item
                    key={item.key}
                    active={active === item.key}
                    open={open}
                    onClick={() => onSelect(item.key)}
                >
                    <ActiveIndicator active={active === item.key} />
                    {item.icon}
                    <Label open={open} active={active === item.key}>
                        {item.label}
                    </Label>
                    <Tooltip showTooltip={!open}>
                        {item.label}
                    </Tooltip>
                </Item>
            ))}
        </Wrapper>
    );
};