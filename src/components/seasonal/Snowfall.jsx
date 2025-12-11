import React, { useRef, useEffect, useCallback } from 'react';
import styled from 'styled-components';

const Canvas = styled.canvas`
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 0;
`;

/**
 * Snowflake states
 */
const State = {
    FALLING: 'falling',
    RESTING: 'resting',
    FADING: 'fading',
};

/**
 * Generate a unique snowflake pattern with 6-fold symmetry
 * Returns an offscreen canvas with the pre-rendered snowflake
 */
function generateSnowflakePattern(size) {
    const canvas = document.createElement('canvas');
    const padding = 2;
    canvas.width = size + padding * 2;
    canvas.height = size + padding * 2;

    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = size / 2;

    ctx.strokeStyle = 'white';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Random parameters for this snowflake
    const branchCount = 2 + Math.floor(Math.random() * 3); // 2-4 branches per arm
    const mainLineWidth = 0.8 + Math.random() * 0.8;
    const hasCenter = Math.random() > 0.5;
    const hasDots = Math.random() > 0.6;
    const curvedBranches = Math.random() > 0.7;

    // Generate branch positions (sorted by distance from center)
    const branches = [];
    for (let i = 0; i < branchCount; i++) {
        branches.push({
            pos: 0.25 + Math.random() * 0.6, // Position along the arm (25%-85%)
            length: 0.2 + Math.random() * 0.4, // Branch length relative to remaining arm
            angle: 30 + Math.random() * 30, // Angle in degrees (30-60)
            hasSub: Math.random() > 0.6, // Sub-branches
        });
    }
    branches.sort((a, b) => a.pos - b.pos);

    // Draw 6 arms
    for (let arm = 0; arm < 6; arm++) {
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate((arm * Math.PI) / 3); // 60 degrees

        // Main arm line
        ctx.lineWidth = mainLineWidth;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(radius, 0);
        ctx.stroke();

        // Draw branches
        for (const branch of branches) {
            const branchX = radius * branch.pos;
            const branchLen = radius * (1 - branch.pos) * branch.length;
            const branchAngle = (branch.angle * Math.PI) / 180;

            ctx.lineWidth = mainLineWidth * 0.7;

            // Upper branch
            ctx.beginPath();
            ctx.moveTo(branchX, 0);
            if (curvedBranches) {
                const endX = branchX + Math.cos(branchAngle) * branchLen;
                const endY = -Math.sin(branchAngle) * branchLen;
                const cpX = branchX + branchLen * 0.3;
                const cpY = -branchLen * 0.1;
                ctx.quadraticCurveTo(cpX, cpY, endX, endY);
            } else {
                ctx.lineTo(
                    branchX + Math.cos(branchAngle) * branchLen,
                    -Math.sin(branchAngle) * branchLen
                );
            }
            ctx.stroke();

            // Lower branch (mirror)
            ctx.beginPath();
            ctx.moveTo(branchX, 0);
            if (curvedBranches) {
                const endX = branchX + Math.cos(branchAngle) * branchLen;
                const endY = Math.sin(branchAngle) * branchLen;
                const cpX = branchX + branchLen * 0.3;
                const cpY = branchLen * 0.1;
                ctx.quadraticCurveTo(cpX, cpY, endX, endY);
            } else {
                ctx.lineTo(
                    branchX + Math.cos(branchAngle) * branchLen,
                    Math.sin(branchAngle) * branchLen
                );
            }
            ctx.stroke();

            // Sub-branches
            if (branch.hasSub && branchLen > 3) {
                const subLen = branchLen * 0.4;
                const subAngle = branchAngle + (20 * Math.PI) / 180;
                const subX = branchX + Math.cos(branchAngle) * branchLen * 0.6;
                const subY = -Math.sin(branchAngle) * branchLen * 0.6;

                ctx.lineWidth = mainLineWidth * 0.5;
                ctx.beginPath();
                ctx.moveTo(subX, subY);
                ctx.lineTo(
                    subX + Math.cos(subAngle) * subLen,
                    subY - Math.sin(subAngle) * subLen
                );
                ctx.stroke();

                // Mirror for lower
                ctx.beginPath();
                ctx.moveTo(subX, -subY);
                ctx.lineTo(
                    subX + Math.cos(subAngle) * subLen,
                    -subY + Math.sin(subAngle) * subLen
                );
                ctx.stroke();
            }
        }

        // Dots at branch ends
        if (hasDots) {
            ctx.fillStyle = 'white';
            for (const branch of branches) {
                if (Math.random() > 0.5) {
                    const branchX = radius * branch.pos;
                    const branchLen = radius * (1 - branch.pos) * branch.length;
                    const branchAngle = (branch.angle * Math.PI) / 180;
                    const dotX = branchX + Math.cos(branchAngle) * branchLen;
                    const dotY = Math.sin(branchAngle) * branchLen;
                    const dotSize = mainLineWidth * 0.8;

                    ctx.beginPath();
                    ctx.arc(dotX, -dotY, dotSize, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(dotX, dotY, dotSize, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        ctx.restore();
    }

    // Center decoration
    if (hasCenter) {
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(centerX, centerY, mainLineWidth * 1.5, 0, Math.PI * 2);
        ctx.fill();
    }

    return canvas;
}

/**
 * Create a pool of pre-generated snowflake patterns
 */
function createPatternPool(count, minSize, maxSize) {
    const patterns = [];
    for (let i = 0; i < count; i++) {
        const size = minSize + Math.random() * (maxSize - minSize);
        patterns.push({
            canvas: generateSnowflakePattern(size),
            size: size,
        });
    }
    return patterns;
}

/**
 * Create a new snowflake
 */
function createSnowflake(canvasWidth, patternPool) {
    const pattern = patternPool[Math.floor(Math.random() * patternPool.length)];
    return {
        x: Math.random() * canvasWidth,
        y: -pattern.size,
        pattern: pattern,
        speed: 0.3 + Math.random() * 0.7,
        wobbleSpeed: 0.015 + Math.random() * 0.015,
        wobbleAmount: 10 + Math.random() * 15,
        wobbleOffset: Math.random() * Math.PI * 2,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
        opacity: 0.7 + Math.random() * 0.3,
        state: State.FALLING,
        restY: 0,
        restTime: 0,
        maxRestTime: 2000 + Math.random() * 2000,
    };
}

/**
 * Snowfall effect component using Canvas
 * Snowflakes fall, rest on the bottom, then fade away
 *
 * @param {Object} props
 * @param {number} [props.maxSnowflakes=25] - Maximum number of snowflakes
 * @param {number} [props.spawnRate=300] - Ms between spawning new snowflakes
 * @param {number} [props.patternCount=15] - Number of unique snowflake patterns
 * @param {string} [props.className] - Additional CSS class
 */
export default function Snowfall({
    maxSnowflakes = 25,
    spawnRate = 300,
    patternCount = 15,
    className
}) {
    const canvasRef = useRef(null);
    const snowflakesRef = useRef([]);
    const groundRef = useRef([]);
    const patternsRef = useRef(null);
    const animationRef = useRef(null);
    const lastSpawnRef = useRef(0);

    const init = useCallback((canvas) => {
        const height = canvas.height;
        groundRef.current = new Array(Math.ceil(canvas.width)).fill(height);

        // Generate pattern pool once
        if (!patternsRef.current) {
            patternsRef.current = createPatternPool(patternCount, 8, 20);
        }
    }, [patternCount]);

    const update = useCallback((canvas, deltaTime) => {
        const snowflakes = snowflakesRef.current;
        const ground = groundRef.current;
        const patterns = patternsRef.current;
        const width = canvas.width;
        const height = canvas.height;

        if (!patterns) return;

        // Spawn new snowflakes
        lastSpawnRef.current += deltaTime;
        if (lastSpawnRef.current > spawnRate && snowflakes.length < maxSnowflakes) {
            snowflakes.push(createSnowflake(width, patterns));
            lastSpawnRef.current = 0;
        }

        // Update each snowflake
        for (let i = snowflakes.length - 1; i >= 0; i--) {
            const flake = snowflakes[i];
            const size = flake.pattern.size;

            switch (flake.state) {
                case State.FALLING: {
                    // Apply wobble
                    flake.wobbleOffset += flake.wobbleSpeed;
                    flake.x += Math.sin(flake.wobbleOffset) * 0.5;

                    // Rotate
                    flake.rotation += flake.rotationSpeed;

                    // Fall down
                    flake.y += flake.speed;

                    // Check collision with ground
                    const groundX = Math.floor(flake.x);
                    if (groundX >= 0 && groundX < ground.length) {
                        const groundLevel = ground[groundX];
                        if (flake.y + size / 2 >= groundLevel) {
                            flake.state = State.RESTING;
                            flake.restY = groundLevel - size / 2;
                            flake.y = flake.restY;
                            flake.restTime = 0;

                            // Accumulation
                            const raiseAmount = size * 0.15;
                            const spreadRadius = Math.ceil(size / 2);
                            for (let dx = -spreadRadius; dx <= spreadRadius; dx++) {
                                const gx = groundX + dx;
                                if (gx >= 0 && gx < ground.length) {
                                    const factor = 1 - Math.abs(dx) / (spreadRadius + 1);
                                    ground[gx] = Math.max(
                                        ground[gx] - raiseAmount * factor,
                                        height * 0.7
                                    );
                                }
                            }
                        }
                    }

                    if (flake.x < -30 || flake.x > width + 30) {
                        snowflakes.splice(i, 1);
                    }
                    break;
                }

                case State.RESTING: {
                    flake.restTime += deltaTime;
                    if (flake.restTime >= flake.maxRestTime) {
                        flake.state = State.FADING;
                    }
                    break;
                }

                case State.FADING: {
                    flake.opacity -= deltaTime * 0.001;
                    if (flake.opacity <= 0) {
                        snowflakes.splice(i, 1);
                    }
                    break;
                }
            }
        }

        // Melting
        for (let i = 0; i < ground.length; i++) {
            if (ground[i] < height) {
                ground[i] += deltaTime * 0.002;
                if (ground[i] > height) ground[i] = height;
            }
        }
    }, [maxSnowflakes, spawnRate]);

    const draw = useCallback((ctx, canvas) => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (const flake of snowflakesRef.current) {
            const { x, y, pattern, rotation, opacity } = flake;
            const halfSize = pattern.canvas.width / 2;

            ctx.save();
            ctx.globalAlpha = opacity;
            ctx.translate(x, y);
            ctx.rotate(rotation);
            ctx.drawImage(
                pattern.canvas,
                -halfSize,
                -halfSize
            );
            ctx.restore();
        }
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        let lastTime = performance.now();

        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
            init(canvas);
        };

        resize();
        window.addEventListener('resize', resize);

        const animate = (currentTime) => {
            const deltaTime = currentTime - lastTime;
            lastTime = currentTime;

            update(canvas, deltaTime);
            draw(ctx, canvas);

            animationRef.current = requestAnimationFrame(animate);
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener('resize', resize);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [init, update, draw]);

    return <Canvas ref={canvasRef} className={className} />;
}
