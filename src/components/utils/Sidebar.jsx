import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { FiChevronDown, FiChevronRight } from "react-icons/fi";

const Wrapper = styled.div`
    width: ${(props) => (props.open ? "240px" : "70px")};
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
    border: 1px solid #333;
    display: flex;
    flex-direction: column;
    padding: 8px;
    box-shadow:
            0 4px 20px rgba(0, 0, 0, 0.3),
            0 0 0 1px rgba(255, 255, 255, 0.05);
    overflow-x: hidden;
    overflow-y: auto;

    &::-webkit-scrollbar {
        width: 4px;
    }

    &::-webkit-scrollbar-track {
        background: transparent;
    }

    &::-webkit-scrollbar-thumb {
        background: #444;
        border-radius: 2px;
    }

    &::-webkit-scrollbar-thumb:hover {
        background: #555;
    }
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

const ParentItem = styled(Item)`
    background: ${(props) => {
    if (props.hasActiveChild) {
        return "rgba(100, 108, 255, 0.05)";
    }
    return "transparent";
}};
`;

const ChildItem = styled(Item)`
    padding-left: ${(props) => (props.open ? "36px" : "14px")};
    padding-right: ${(props) => (props.open ? "12px" : "14px")};

    svg {
        width: 18px;
        height: 18px;
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
    flex: 1;

    ${Item}:hover &, ${ParentItem}:hover &, ${ChildItem}:hover & {
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

    ${Item}:hover &, ${ParentItem}:hover &, ${ChildItem}:hover & {
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

const ExpandIcon = styled.div`
    display: flex;
    align-items: center;
    margin-left: auto;
    opacity: ${(props) => (props.open ? 1 : 0)};
    transition: all 0.2s ease;

    svg {
        width: 16px;
        height: 16px;
        margin-right: 0;
        color: #666;
        transition: transform 0.2s ease;
        transform: ${(props) => (props.expanded ? "rotate(0deg)" : "rotate(0deg)")};
    }
`;

const ChildrenWrapper = styled.div`
    display: grid;
    grid-template-rows: ${(props) => (props.expanded ? "1fr" : "0fr")};
    opacity: ${(props) => (props.expanded ? 1 : 0)};
    transition: grid-template-rows 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
`;

const ChildrenInner = styled.div`
    overflow: hidden;
    padding-right: 4px;
`;

// Green dot indicator for enabled items
const EnabledDot = styled.div`
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #44ff44;
    box-shadow: 0 0 4px #44ff44;
    border: 1px solid #33cc33;
    flex-shrink: 0;
    margin-left: auto;
    opacity: ${(props) => (props.$show ? 1 : 0)};
    transition: opacity 0.2s ease;
`;

export const Sidebar = ({ open, active, onSelect, items }) => {
    const { t } = useTranslation();
    const [expandedItems, setExpandedItems] = useState({});

    // Auto-expand parent if child is active
    React.useEffect(() => {
        items.forEach(item => {
            if (item.children) {
                const hasActiveChild = item.children.some(child => child.key === active);
                if (hasActiveChild && !expandedItems[item.key]) {
                    setExpandedItems(prev => ({ ...prev, [item.key]: true }));
                }
            }
        });
    }, [active, items]);

    const toggleExpand = (key) => {
        setExpandedItems(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleItemClick = (item) => {
        if (item.children) {
            toggleExpand(item.key);
        } else {
            onSelect(item.key);
        }
    };

    const renderItem = (item) => {
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = expandedItems[item.key];
        const hasActiveChild = hasChildren && item.children.some(child => child.key === active);

        if (hasChildren) {
            return (
                <React.Fragment key={item.key}>
                    <ParentItem
                        active={false}
                        hasActiveChild={hasActiveChild}
                        open={open}
                        onClick={() => handleItemClick(item)}
                    >
                        {item.icon}
                        <Label open={open} active={hasActiveChild}>
                            {item.label}
                        </Label>
                        <ExpandIcon open={open} expanded={isExpanded}>
                            {isExpanded ? <FiChevronDown /> : <FiChevronRight />}
                        </ExpandIcon>
                        <Tooltip showTooltip={!open}>
                            {item.label}
                        </Tooltip>
                    </ParentItem>
                    <ChildrenWrapper expanded={isExpanded && open}>
                        <ChildrenInner>
                            {item.children.map(child => (
                                <ChildItem
                                    key={child.key}
                                    active={active === child.key}
                                    open={open}
                                    onClick={() => onSelect(child.key)}
                                >
                                    <ActiveIndicator active={active === child.key} />
                                    {child.icon}
                                    <Label open={open} active={active === child.key}>
                                        {child.label}
                                    </Label>
                                    {child.enabled !== undefined && (
                                        <EnabledDot $show={open && child.enabled} />
                                    )}
                                </ChildItem>
                            ))}
                        </ChildrenInner>
                    </ChildrenWrapper>
                </React.Fragment>
            );
        }

        return (
            <Item
                key={item.key}
                active={active === item.key}
                open={open}
                onClick={() => handleItemClick(item)}
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
        );
    };

    return (
        <Wrapper open={open}>
            <SidebarHeader open={open}>
                <HeaderTitle open={open}>{t('sidebar.title')}</HeaderTitle>
            </SidebarHeader>

            <Divider />

            {items.map(item => renderItem(item))}
        </Wrapper>
    );
};
