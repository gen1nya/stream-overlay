import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { tokens } from '../../designSystem/tokens';
import * as AiIcons from "react-icons/ai";

const Wrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${tokens.space.sm};
`;

const Title = styled.div`
    color: ${tokens.color.text.secondary};
    font-size: ${tokens.font.size.base};
    font-weight: ${tokens.font.weight.medium};
`;

const Container = styled.div`
    display: flex;
    flex-direction: ${({ direction }) => direction === 'vertical' ? 'column' : 'row'};
    position: relative;
    background: ${tokens.color.bg.raised};
    border: 1px solid ${tokens.color.border.default};
    border-radius: 9px;
    padding: ${tokens.space.xs};
    overflow: hidden;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
`;

const Option = styled.div`
    position: relative;
    z-index: 1;
    padding: ${tokens.space.sm} ${tokens.space.md};
    cursor: pointer;
    user-select: none;
    text-align: center;
    flex: 1;
    width: ${({ width }) => width || 'auto'};
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    transition: ${tokens.transition.base};
    border-radius: ${tokens.radius.md};

    &:hover {
        background: ${tokens.color.accent.soft};
    }
`;

const Highlight = styled.div`
    position: absolute;
    top: ${({top}) => top}px;
    left: ${({left}) => left}px;
    width: ${({width}) => width}px;
    height: ${({height}) => height}px;
    box-sizing: border-box;
    background: linear-gradient(135deg, rgba(100, 108, 255, 0.3), rgba(124, 58, 237, 0.3));
    border: 1px solid ${tokens.color.accent.primary};
    border-radius: ${tokens.radius.md};
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 0;
    box-shadow:
            0 0 20px rgba(100, 108, 255, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
`;

const Text = styled.div`
    color: ${({ active }) => (active ? tokens.color.text.primary : '#aaa')};
    font-weight: ${({ active }) => (active ? tokens.font.weight.semibold : tokens.font.weight.medium)};
    font-size: ${tokens.font.size.base};
    transition: ${tokens.transition.base};
    white-space: nowrap;
`;

const RadioGroup = ({
                        items,
                        onChange,
                        defaultSelected,
                        direction = 'horizontal',
                        itemWidth,
                        title,
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

    useEffect(() => {
        // Update highlight on window resize
        const handleResize = () => {
            updateHighlight(selectedKey);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [selectedKey]);

    const updateHighlight = (key) => {
        const el = optionRefs.current[key];
        const container = containerRef.current;
        if (el && container) {
            const rect = el.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            setHighlightStyle({
                left: rect.left - containerRect.left - 1,
                top: rect.top - containerRect.top - 1,
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
        return (
            <IconComponent
                size={18}
                color={active ? '#fff' : '#aaa'}
                style={{ transition: 'color 0.2s ease' }}
            />
        );
    };

    const containerContent = (
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

    // Если заголовок не передан, возвращаем только контейнер
    if (!title) {
        return containerContent;
    }

    // Если заголовок передан, оборачиваем в Wrapper с заголовком
    return (
        <Wrapper>
            <Title>{title}</Title>
            {containerContent}
        </Wrapper>
    );
};

export default RadioGroup;