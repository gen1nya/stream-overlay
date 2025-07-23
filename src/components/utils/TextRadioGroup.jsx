import React, { useState, useRef, useEffect, Suspense } from 'react';
import styled from 'styled-components';
import * as AiIcons from "react-icons/ai";

const Container = styled.div`
    display: flex;
    flex-direction: ${({ direction }) => direction === 'vertical' ? 'column' : 'row'};
    position: relative;
    background: rgba(136, 83, 242, 0.11);
    border-radius: 8px;
    padding: 4px;
    overflow: hidden;
`;

const Option = styled.div`
    position: relative;
    z-index: 1;
    padding: 4px 8px;
    cursor: pointer;
    user-select: none;
    text-align: center;
    flex: 1;
    width: ${({ width }) => width || 'none'};
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
`;

const Highlight = styled.div`
    position: absolute;
    top: ${({ top }) => top}px;
    left: ${({ left }) => left}px;
    width: ${({ width }) => width}px;
    height: ${({ height }) => height}px;
    background: rgba(136, 83, 242, 0.29);
    border: rgba(136, 83, 242, 0.64) 2px solid;
    border-radius: 8px;
    transition: all 0.3s ease;
    z-index: 0;
`;

const Text = styled.div`
    color: ${({ active }) => (active ? 'white' : '#d9d9d9')};
    font-weight: ${({ active }) => (active ? 'bold' : 'normal')};
`;

const RadioGroup = ({
                        items,
                        onChange,
                        defaultSelected,
                        direction = 'horizontal',
                        itemWidth = '200px',
                    }) => {
    const getInitialKey = () => {
        const found = items.find((item) => item.key === defaultSelected);
        return found ? defaultSelected : items[0]?.key;
    };

    const [selectedKey, setSelectedKey] = useState(getInitialKey);
    const [highlightStyle, setHighlightStyle] = useState({ top: 0, left: 0, width: 0, height: 0 });
    const containerRef = useRef(null);
    const optionRefs = useRef({});

    useEffect(() => {
        updateHighlight(selectedKey);
    }, [selectedKey]);

    useEffect(() => {
        const found = items.find((item) => item.key === defaultSelected);
        const nextKey = found ? defaultSelected : items[0]?.key;
        if (nextKey !== selectedKey) {
            setSelectedKey(nextKey);
        }
    }, [defaultSelected, items]);

    const updateHighlight = (key) => {
        const el = optionRefs.current[key];
        const container = containerRef.current;
        if (el && container) {
            const rect = el.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            setHighlightStyle({
                left: rect.left - containerRect.left,
                top: rect.top - containerRect.top,
                width: rect.width,
                height: rect.height,
            });
        }
    };

    const handleClick = (key) => {
        setSelectedKey(key);
        if (onChange) {
            onChange(key);
        }
    };

    const renderIcon = (name, active) => {
        const IconComponent = AiIcons[name];
        if (!IconComponent) return null;
        return <IconComponent size={18} color={active ? 'white' : '#d9d9d9'} />;
    };

    return (
        <Container ref={containerRef} direction={direction}>
            <Highlight {...highlightStyle} />
            {items.map((item) => {
                const isActive = item.key === selectedKey;
                return (
                    <Option
                        key={item.key}
                        ref={(el) => optionRefs.current[item.key] = el}
                        onClick={() => handleClick(item.key)}
                        width={itemWidth}
                    >
                        {item.aiIcon && renderIcon(item.aiIcon, isActive)}
                        {item.text && <Text active={isActive}>{item.text}</Text>}
                    </Option>
                );
            })}
        </Container>
    );
};

export default RadioGroup;
