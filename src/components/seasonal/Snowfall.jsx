import React, { useMemo } from 'react';
import styled, { keyframes } from 'styled-components';

const fall = keyframes`
    0% {
        transform: translateY(-10px) rotate(0deg);
        opacity: 1;
    }
    100% {
        transform: translateY(100px) rotate(360deg);
        opacity: 0.3;
    }
`;

const sway = keyframes`
    0%, 100% {
        margin-left: 0;
    }
    25% {
        margin-left: 15px;
    }
    50% {
        margin-left: -10px;
    }
    75% {
        margin-left: 5px;
    }
`;

const SnowContainer = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    overflow: hidden;
    pointer-events: none;
    z-index: 0;
`;

const Snowflake = styled.div`
    position: absolute;
    top: -10px;
    color: #fff;
    font-size: ${props => props.$size}px;
    opacity: ${props => props.$opacity};
    left: ${props => props.$left}%;
    animation:
        ${fall} ${props => props.$duration}s linear infinite,
        ${sway} ${props => props.$swayDuration}s ease-in-out infinite;
    animation-delay: ${props => props.$delay}s;
    text-shadow: 0 0 3px rgba(255, 255, 255, 0.3);
    filter: blur(${props => props.$blur}px);
`;

/**
 * Snowfall effect component
 * Renders animated falling snowflakes
 *
 * @param {Object} props
 * @param {number} [props.count=15] - Number of snowflakes
 * @param {string} [props.className] - Additional CSS class
 */
export default function Snowfall({ count = 15, className }) {
    const snowflakes = useMemo(() => {
        return Array.from({ length: count }, (_, i) => ({
            id: i,
            left: Math.random() * 100,
            size: 8 + Math.random() * 8,
            opacity: 0.4 + Math.random() * 0.5,
            duration: 3 + Math.random() * 4,
            delay: Math.random() * 5,
            swayDuration: 2 + Math.random() * 3,
            blur: Math.random() > 0.7 ? 1 : 0,
        }));
    }, [count]);

    return (
        <SnowContainer className={className}>
            {snowflakes.map(flake => (
                <Snowflake
                    key={flake.id}
                    $left={flake.left}
                    $size={flake.size}
                    $opacity={flake.opacity}
                    $duration={flake.duration}
                    $delay={flake.delay}
                    $swayDuration={flake.swayDuration}
                    $blur={flake.blur}
                >
                    *
                </Snowflake>
            ))}
        </SnowContainer>
    );
}
