import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import padoruGif from '../../assets/elli-padoru.gif';

const runRight = keyframes`
    0% {
        left: -50px;
    }
    100% {
        left: calc(100% + 50px);
    }
`;

const runLeft = keyframes`
    0% {
        left: calc(100% + 50px);
    }
    100% {
        left: -50px;
    }
`;

const PadoruContainer = styled.div`
    position: absolute;
    bottom: 0px;
    left: -50px;
    height: 65%;
    z-index: 0;
    pointer-events: none;

    ${props => props.$phase === 'right' && css`
        animation: ${runRight} 5s linear forwards;
    `}

    ${props => props.$phase === 'left' && css`
        animation: ${runLeft} 5s linear forwards;
    `}
`;

const PadoruImage = styled.img`
    height: 100%;
    width: auto;
    transform: scaleX(1);

    ${props => props.$phase === 'left' && css`
        transform: scaleX(-1);
    `}
`;

/**
 * Padoru runner animation component
 * Runs across the header every few minutes
 *
 * @param {Object} props
 * @param {number} [props.interval=120000] - Ms between runs (default 2 min)
 */
export default function PadoruRunner({ interval = 120000 }) {
    const [phase, setPhase] = useState('idle'); // 'idle' | 'right' | 'left'

    const startRun = useCallback(() => {
        setPhase('right');
    }, []);

    // Handle animation end
    const handleAnimationEnd = useCallback(() => {
        setPhase(current => {
            if (current === 'right') return 'left';
            if (current === 'left') return 'idle';
            return current;
        });
    }, []);

    // Set up interval for periodic runs
    useEffect(() => {
        // Start first run after a short delay
        const initialTimeout = setTimeout(() => {
            startRun();
        }, 3000);

        // Set up periodic runs
        const intervalId = setInterval(() => {
            startRun();
        }, interval);

        return () => {
            clearTimeout(initialTimeout);
            clearInterval(intervalId);
        };
    }, [interval, startRun]);

    if (phase === 'idle') {
        return null;
    }

    return (
        <PadoruContainer
            $phase={phase}
            onAnimationEnd={handleAnimationEnd}
        >
            <PadoruImage
                src={padoruGif}
                alt="Padoru"
                $phase={phase}
            />
        </PadoruContainer>
    );
}
