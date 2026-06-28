import React, { useEffect, useRef } from "react";
import styled from "styled-components";

/*  ===============================
    WaveForm – Oscilloscope-style waveform visualizer
    Updated for Int16Array data (1024 samples at 60Hz)
    =============================== */

const Canvas = styled.canvas`
    width: 100%;
    height: 100%;
    display: block;
`;

const WaveForm = ({
                      wsUrl             = "ws://localhost:5001",
                      lineColor         = "#37ff00",
                      lineWidth         = 2,
                      backgroundColor   = "rgba(197,89,89,0.06)",
                      gridColor         = "rgba(255,255,255,0.1)",
                      centerLineColor   = "rgba(255,255,255,0.3)",
                      showGrid          = true,
                      showCenterLine    = true,
                      smoothDuration    = 16,      // ms, smoothing duration (matches 60Hz update rate)
                      reconnectInterval = 2000,    // ms, socket reconnect interval
                      amplitude         = 1,       // vertical scale factor (0-1)
                      samples           = 1024,    // expected number of samples (downsampled from 2048)
                      targetFps         = 60,      // draws every N-th vsync (N=floor(refresh/targetFps))
                  }) => {

    /* ========= utils ========= */
    const makeF32 = (fill) => new Float32Array(samples).fill(fill);

    /* ========= data ========= */
    const current  = useRef(makeF32(0));
    const start    = useRef(makeF32(0));
    const target   = useRef(makeF32(0));
    const useBinary         = true;

    /* ========= canvas and animations ========= */
    const canvasRef  = useRef(null);
    const animStart  = useRef(performance.now());
    const lastDraw   = useRef(animStart.current);
    const frameRef   = useRef();
    const runningRef = useRef(true);

    /* ========= fps cap + idle-skip ========= */
    const prevNow    = useRef(performance.now());
    const emaRaf     = useRef(0);
    const tickRef    = useRef(0);
    const dirtyRef   = useRef(true);

    const optsRef = useRef({
        lineColor,
        lineWidth,
        backgroundColor,
        gridColor,
        centerLineColor,
        showGrid,
        showCenterLine,
        amplitude,
        targetFps,
    });

    useEffect(() => {
        optsRef.current = {
            lineColor,
            lineWidth,
            backgroundColor,
            gridColor,
            centerLineColor,
            showGrid,
            showCenterLine,
            amplitude,
            targetFps,
        };
        dirtyRef.current = true;
    }, [lineColor, lineWidth, backgroundColor, gridColor, centerLineColor, showGrid, showCenterLine, amplitude, targetFps]);

    /* ---------- helpers ---------- */
    const handleResize = () => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        dirtyRef.current = true; // canvas cleared by resize → repaint
    };

    const drawGrid = (ctx, width, height) => {
        if (!optsRef.current.showGrid) return;

        ctx.strokeStyle = optsRef.current.gridColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);

        // Horizontal grid lines
        const gridLines = 8;
        for (let i = 0; i <= gridLines; i++) {
            const y = (height / gridLines) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Vertical grid lines
        const vLines = 16;
        for (let i = 0; i <= vLines; i++) {
            const x = (width / vLines) * i;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        ctx.setLineDash([]);
    };

    const drawCenterLine = (ctx, width, height) => {
        if (!optsRef.current.showCenterLine) return;

        ctx.strokeStyle = optsRef.current.centerLineColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);

        const centerY = height / 2;
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();

        ctx.setLineDash([]);
    };

    const drawWaveform = (ctx, width, height, data) => {
        if (data.length === 0) return;

        const centerY = height / 2;
        const scaleY = (height / 2) * optsRef.current.amplitude;

        ctx.strokeStyle = optsRef.current.lineColor;
        ctx.lineWidth = optsRef.current.lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();

        for (let i = 0; i < data.length; i++) {
            const x = (i / (data.length - 1)) * width;
            const y = centerY - (data[i] * scaleY);

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }

        ctx.stroke();
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        /* init */
        handleResize();
        const resizeHandler = () => handleResize();
        window.addEventListener("resize", resizeHandler);

        /* Per-effect liveness flag — lets the old rAF loop self-terminate on an effect
           re-run instead of becoming an unkillable orphan (see FFTBars). */
        let alive = true;

        /* visibility pause/resume */
        const onVis = () => {
            runningRef.current = !document.hidden;
            if (alive && runningRef.current) {
                cancelAnimationFrame(frameRef.current);
                frameRef.current = requestAnimationFrame(draw);
            }
        };
        document.addEventListener("visibilitychange", onVis);

        /* ---- rAF loop ---- */
        const draw = () => {
            if (!alive || !runningRef.current) return;

            const now = performance.now();
            const dt = now - prevNow.current;
            prevNow.current = now;

            /* fps cap: draw every N-th vsync (N = floor(refresh/targetFps)) */
            if (dt > 0 && dt < 100) {
                emaRaf.current = emaRaf.current ? emaRaf.current * 0.9 + dt * 0.1 : dt;
            }
            const targetInterval = 1000 / (optsRef.current.targetFps || 60);
            const ema = emaRaf.current || dt || 16.7;
            const step = Math.max(1, Math.floor(targetInterval / ema + 0.1));
            if (++tickRef.current < step) {
                frameRef.current = requestAnimationFrame(draw);
                return;
            }
            tickRef.current = 0;
            lastDraw.current = now;

            /* smooth interpolation (time-based) */
            const lerpT = Math.min(1, (now - animStart.current) / smoothDuration);
            const lerpActive = now - animStart.current < smoothDuration;
            for (let i = 0; i < current.current.length; i++) {
                current.current[i] =
                    start.current[i] + (target.current[i] - start.current[i]) * lerpT;
            }

            /* idle-skip: no pending change and lerp settled → keep last frame */
            if (!dirtyRef.current && !lerpActive) {
                frameRef.current = requestAnimationFrame(draw);
                return;
            }
            dirtyRef.current = false;

            /* ---- render ---- */
            const { width, height } = canvas;
            ctx.clearRect(0, 0, width, height);

            // Background
            if (optsRef.current.backgroundColor) {
                ctx.fillStyle = optsRef.current.backgroundColor;
                ctx.fillRect(0, 0, width, height);
            }

            // Grid
            drawGrid(ctx, width, height);

            // Center line (zero level)
            drawCenterLine(ctx, width, height);

            // Waveform
            drawWaveform(ctx, width, height, current.current);

            frameRef.current = requestAnimationFrame(draw);
        };

        frameRef.current = requestAnimationFrame(draw);

        /* ---- WebSocket ---- */
        const wsRef = { current: null };
        const timerRef = { current: null };
        const manualCloseRef = { current: false };

        const connect = () => {
            wsRef.current = new WebSocket(wsUrl);

            // Set binary mode if enabled
            if (useBinary) {
                wsRef.current.binaryType = 'arraybuffer';
            }

            wsRef.current.onmessage = (e) => {
                try {
                    let normalizedData;

                    if (useBinary && e.data instanceof ArrayBuffer) {
                        const view = new DataView(e.data);
                        const type = view.getUint16(0, true); // little-endian
                        if (type !== 0) return;
                        // Int16 view over the payload; write straight into target below (no Array.from copy).
                        const int16Data = new Int16Array(e.data, 2); // offset = 2 байта
                        if (int16Data.length !== current.current.length) {
                            current.current = new Float32Array(int16Data.length);
                            start.current = new Float32Array(int16Data.length);
                            target.current = new Float32Array(int16Data.length);
                        }
                        start.current.set(current.current);
                        for (let i = 0; i < int16Data.length; i++) {
                            target.current[i] = int16Data[i] / 32768.0;
                        }
                        animStart.current = performance.now();
                        return;
                    } else {
                        // JSON mode: parse and normalize
                        const { type, data } = JSON.parse(e.data);
                        if (type !== "waveform" || !Array.isArray(data)) return;

                        // Normalize int16 values to float range
                        normalizedData = data.map(x => x / 32768.0);
                    }

                    // Resize arrays if needed
                    if (normalizedData.length !== current.current.length) {
                        current.current = new Float32Array(normalizedData.length);
                        start.current = new Float32Array(normalizedData.length);
                        target.current = new Float32Array(normalizedData.length);
                    }

                    // Setup smooth transition
                    start.current.set(current.current);
                    target.current.set(normalizedData);

                    animStart.current = performance.now();
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
            alive = false; // stop this effect's rAF loop even if it reschedules
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
        samples,
        smoothDuration,
        useBinary,
    ]);

    return <Canvas ref={canvasRef} />;
};

export default WaveForm;