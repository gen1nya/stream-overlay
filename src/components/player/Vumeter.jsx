import React, { useEffect, useRef } from "react";
import styled from "styled-components";

/*  ===============================
    VUMeter — Soviet-style luminescent VU indicator
    Two-channel horizontal bar meter with glow effect
    =============================== */

const Canvas = styled.canvas`
    width: 100%;
    height: 100%;
    display: block;
    background: #1a1a1a;
`;

const VUMeter = ({
                     wsUrl             = "ws://localhost:5001",
                     barColor          = "#00ff88",      // Luminescent cyan-green
                     glowColor         = "#00ff88",
                     backgroundColor   = "#0a0a0a",
                     labelColor        = "#00ff88",
                     smoothDuration    = 10,             // ms, smoothing duration
                     reconnectInterval = 2000,           // ms, socket reconnect interval
                     peakHold          = 1000,           // ms, peak hold duration
                     peakFall          = 500,            // ms, peak fall duration
                     amplitude         = 1,            // scale factor for sensitivity
                     falloff           = 0.92,           // decay factor per frame
                 }) => {

    /* ========= data ========= */
    const current  = useRef([0, 0]);        // [left, right] current levels
    const start    = useRef([0, 0]);
    const target   = useRef([0, 0]);
    const peak     = useRef([0, 0]);
    const peakTime = useRef([0, 0]);

    /* ========= canvas and animations ========= */
    const canvasRef  = useRef(null);
    const animStart  = useRef(performance.now());
    const frameRef   = useRef();
    const runningRef = useRef(true);

    const optsRef = useRef({
        barColor,
        glowColor,
        backgroundColor,
        labelColor,
        peakHold,
        peakFall,
        amplitude,
        falloff,
    });

    useEffect(() => {
        optsRef.current = {
            barColor,
            glowColor,
            backgroundColor,
            labelColor,
            peakHold,
            peakFall,
            amplitude,
            falloff,
        };
    }, [barColor, glowColor, backgroundColor, labelColor, peakHold, peakFall, amplitude, falloff]);

    const handleResize = () => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
    };

    /* ---------- drawing functions ---------- */
    const drawScale = (ctx, x, y, width, height) => {
        const { labelColor: lc } = optsRef.current;

        // Scale marks matching the VFD layout
        // Adding proper spacing after "dB-"
        const marks = [
            { pos: 0, label: "dB-" },
            { pos: 0.13, label: "20" },
            { pos: 0.27, label: "12" },
            { pos: 0.40, label: "10" },
            { pos: 0.58, label: "6" },
            { pos: 0.73, label: "0" },
            { pos: 0.86, label: "+3" },
            { pos: 0.95, label: "5" },
        ];

        ctx.font = "10px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        marks.forEach(mark => {
            const markX = x + mark.pos * width;
            ctx.fillStyle = lc;

            // Special alignment for first label
            if (mark.pos === 0) {
                ctx.textAlign = "left";
                ctx.fillText(mark.label, markX, y + height / 2);
                ctx.textAlign = "center";
            } else {
                ctx.fillText(mark.label, markX, y + height / 2);
            }
        });
    };

    const drawChannel = (ctx, x, y, width, height, level, peakLevel, label) => {
        const { barColor: bc, glowColor: gc, labelColor: lc } = optsRef.current;

        // Draw label (ЛЕВЫЙ/ПРАВЫЙ)
        ctx.font = "bold 11px monospace";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillStyle = lc;
        ctx.fillText(label, x - 10, y + height / 2);

        // VFD segment structure:
        // 11 groups × 2 green segments = 22 green
        // 4 groups red: 3-2-2-3 = 10 red
        // Total: 32 segments in 15 groups

        const segmentGroups = [
            // Green groups (11 groups × 2 segments each)
            { count: 2, color: bc }, { count: 2, color: bc }, { count: 2, color: bc },
            { count: 2, color: bc }, { count: 2, color: bc }, { count: 2, color: bc },
            { count: 2, color: bc }, { count: 2, color: bc }, { count: 2, color: bc },
            { count: 2, color: bc }, { count: 2, color: bc },
            // Red/orange groups (3-2-2-3)
            { count: 3, color: "#ff0000" },
            { count: 2, color: "#ff0000" },
            { count: 2, color: "#ff0000" },
            { count: 3, color: "#ff0000" },
        ];

        const totalGroups = segmentGroups.length;

        // Fixed segment size and gaps
        const segmentWidth = 4.25;  // Фиксированный размер каждого сегмента
        const segmentGap = 1;    // Зазор между сегментами внутри группы
        const groupGap = 3;      // Зазор между группами

        // Calculate how many groups should be lit
        const litGroups = Math.floor(level * totalGroups);

        let groupX = x;
        segmentGroups.forEach((group, groupIdx) => {
            const isLit = groupIdx < litGroups;

            // Динамическая ширина группы на основе количества сегментов
            const groupWidth = (group.count * segmentWidth) + ((group.count - 1) * segmentGap);

            if (isLit) {
                // Draw all segments in the group
                for (let seg = 0; seg < group.count; seg++) {
                    const segX = groupX + seg * (segmentWidth + segmentGap);

                    // Glow effect - subtle like real VFD
                    ctx.shadowBlur = 8;
                    ctx.shadowColor = group.color;

                    ctx.fillStyle = group.color;
                    ctx.fillRect(segX, y + 3, segmentWidth, height - 6);
                }

                ctx.shadowBlur = 0;
            } else {
                // Draw dim segments (unlit anodes)
                for (let seg = 0; seg < group.count; seg++) {
                    const segX = groupX + seg * (segmentWidth + segmentGap);
                    ctx.fillStyle = "#151515";
                    ctx.fillRect(segX, y + 3, segmentWidth, height - 6);
                }
            }

            groupX += groupWidth + groupGap;
        });

        // Draw peak indicator
        /*if (peakLevel > 0) {
            const peakGroup = Math.floor(peakLevel * totalGroups);
            if (peakGroup < totalGroups) {
                const peakX = x + peakGroup * groupWidth + groupWidth / 2;
                ctx.shadowBlur = 8;
                ctx.shadowColor = peakGroup >= 11 ? "#ff0000" : gc;

                const peakColor = peakGroup >= 11 ? "#ff0000" : bc;
                ctx.fillStyle = peakColor;
                ctx.fillRect(peakX - 1, y + 1, 2, height - 2);
                ctx.shadowBlur = 0;
            }
        }*/

        // Draw border
        ctx.strokeStyle = "#444";
        ctx.lineWidth = 1;
        ctx.strokeRect(x - 1, y - 1, width + 2, height + 2);
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        /* init */
        handleResize();
        const resizeHandler = () => handleResize();
        window.addEventListener("resize", resizeHandler);

        /* visibility pause/resume */
        const onVis = () => {
            runningRef.current = !document.hidden;
            if (runningRef.current) frameRef.current = requestAnimationFrame(draw);
        };
        document.addEventListener("visibilitychange", onVis);

        /* ---- rAF loop ---- */
        const draw = () => {
            if (!runningRef.current) return;

            const now = performance.now();

            /* smooth interpolation */
            const lerpT = Math.min(1, (now - animStart.current) / smoothDuration);
            for (let ch = 0; ch < 2; ch++) {
                current.current[ch] =
                    start.current[ch] + (target.current[ch] - start.current[ch]) * lerpT;
            }

            /* peak hold */
            const { peakHold: pH, peakFall: pF } = optsRef.current;
            for (let ch = 0; ch < 2; ch++) {
                const v = current.current[ch];
                if (v >= peak.current[ch]) {
                    peak.current[ch] = v;
                    peakTime.current[ch] = now;
                } else if (now - peakTime.current[ch] > pH) {
                    const elapsed = now - peakTime.current[ch] - pH;
                    const fallRatio = Math.min(1, elapsed / pF);
                    peak.current[ch] = v + (peak.current[ch] - v) * (1 - fallRatio);
                }
            }

            /* ---- render ---- */
            const { width: W, height: H } = canvas;
            const { backgroundColor: bgColor } = optsRef.current;

            ctx.clearRect(0, 0, W, H);
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, W, H);

            // Layout
            const padding = 8;
            const paddingVertical = 8;  // Vertical padding
            const labelWidth = 50;
            const meterWidth = W - padding * 2 - labelWidth;
            const meterHeight = 22;
            const spacing = 20; // Space for scale between channels
            const startX = padding + labelWidth;

            // Center the entire meter assembly vertically with padding
            const totalHeight = meterHeight * 2 + spacing;
            const availableHeight = H - paddingVertical * 2;
            const startY = paddingVertical //+ (availableHeight - totalHeight) / 2;

            // Draw first channel
            drawChannel(
                ctx,
                startX,
                startY,
                meterWidth,
                meterHeight,
                current.current[0],
                peak.current[0],
                "ЛЕВЫЙ"
            );

            // Draw scale between channels (centered in the gap)
            const scaleXOffset = 25;
            const scaleY = startY + meterHeight + spacing / 2;
            drawScale(ctx, startX - scaleXOffset, scaleY - 6, meterWidth + scaleXOffset, 12);

            // Draw second channel
            drawChannel(
                ctx,
                startX,
                startY + meterHeight + spacing,
                meterWidth,
                meterHeight,
                current.current[1],
                peak.current[1],
                "ПРАВЫЙ"
            );

            frameRef.current = requestAnimationFrame(draw);
        };

        frameRef.current = requestAnimationFrame(draw);

        /* ---- WebSocket ---- */
        const wsRef = { current: null };
        const timerRef = { current: null };
        const manualCloseRef = { current: false };

        const connect = () => {
            wsRef.current = new WebSocket(wsUrl);
            wsRef.current.binaryType = 'arraybuffer';

            wsRef.current.onmessage = (e) => {
                try {
                    if (e.data instanceof ArrayBuffer) {
                        const view = new DataView(e.data);
                        const type = view.getUint16(0, true);

                        let rmsL = 0;
                        let rmsR = 0;

                        if (type === 2) {
                            // Direct VU level
                            const float32Data = new Uint8Array(e.data, 2);
                            rmsL = float32Data[0] / 256.0; // single level value
                            rmsR = float32Data[1] / 256.0; // single level value
                        } else {
                            return;
                        }

                        // Apply amplitude scaling
                        const amp = optsRef.current.amplitude;
                        let levelL = Math.min(1, rmsL * amp);
                        let levelR = Math.min(1, rmsR * amp);

                        // Apply falloff if new level is lower
                        const { falloff } = optsRef.current;
                        if (levelL < target.current[0]) {
                            levelL = target.current[0] * falloff;
                        }
                        if (levelR < target.current[1]) {
                            levelR = target.current[1] * falloff;
                        }

                        start.current = [...current.current];
                        // Both channels get same data for now
                        target.current = [levelL, levelR];

                        animStart.current = performance.now();
                    }
                } catch (err) {
                    console.error("WS parse error", err);
                }
            };

            wsRef.current.onclose = () => {
                if (!manualCloseRef.current && reconnectInterval > 0) {
                    timerRef.current = setTimeout(connect, reconnectInterval);
                }
            };

            wsRef.current.onerror = (err) => {
                console.error("WebSocket error:", err);
            };
        };

        connect();

        /* ---- cleanup ---- */
        return () => {
            manualCloseRef.current = true;
            cancelAnimationFrame(frameRef.current);
            clearTimeout(timerRef.current);
            wsRef.current && wsRef.current.close();
            document.removeEventListener("visibilitychange", onVis);
            window.removeEventListener("resize", resizeHandler);
        };
    }, [
        wsUrl,
        reconnectInterval,
        smoothDuration,
    ]);

    return <Canvas ref={canvasRef} />;
};

export default VUMeter;