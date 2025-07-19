import React, {useState, useRef, useEffect} from 'react';
import styled from 'styled-components';

const Container = styled.div`
    display: flex;
    flex-direction: ${({direction}) => direction === 'vertical' ? 'column' : 'row'};
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
    width: ${({width}) => width || 'none'};
    box-sizing: border-box;
`;

const Highlight = styled.div`
    position: absolute;
    top: ${({top}) => top}px;
    left: ${({left}) => left}px;
    width: ${({width}) => width}px;
    height: ${({height}) => height}px;
    background: rgba(136, 83, 242, 0.29);
    border: rgba(136, 83, 242, 0.64) 2px solid;
    border-radius: 8px;
    transition: all 0.3s ease;
    z-index: 0;
`;

const Text = styled.div`
    color: ${({active}) => (active ? 'white' : '#d9d9d9')};
    font-weight: ${({active}) => (active ? 'bold' : 'normal')};
`;

const RadioGroup = ({
                        items,
                        onChange,
                        defaultSelected,
                        direction = 'horizontal',
                        itemWidth = '200px',
}) => {
    const [selectedKey, setSelectedKey] = useState(defaultSelected || items[0]?.key);
    const [highlightStyle, setHighlightStyle] = useState({top: 0, left: 0, width: 0, height: 0});
    const containerRef = useRef(null);
    const optionRefs = useRef({});

    useEffect(() => {
        updateHighlight(selectedKey);
    }, [selectedKey]);

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

    return (
        <Container ref={containerRef} direction={direction}>
            <Highlight {...highlightStyle} />
            {items.map((item) => (
                <Option
                    key={item.key}
                    ref={(el) => optionRefs.current[item.key] = el}
                    onClick={() => handleClick(item.key)}
                    width={itemWidth}
                >
                    <Text active={item.key === selectedKey}>{item.text}</Text>
                </Option>
            ))}
        </Container>
    );
};

export default RadioGroup;
