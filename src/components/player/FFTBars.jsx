import React, { useEffect, useRef } from "react";
import styled from "styled-components";
import {downscaleSpectrumWeighted} from "../../utils";

/*  ===============================
    FFTBars – N‑channel spectrum visualizer with peaks
    Updated for Uint8Array binary protocol
    =============================== */

const Canvas = styled.canvas`
    width: 100%;
    height: 100%;
    display: block;
`;

const easeQuad = (x) => x * x;

const FFTBars = ({
                     wsUrl             = "ws://localhost:5001",
                     barColor          = "#37ff00",
                     barGradient       = true,
                     backgroundColor   = "rgba(197,89,89,0.06)",
                     smoothDuration    = 33,      // ms, smoothing duration
                     reconnectInterval = 2000,    // ms, socket reconnect interval
                     peakHold          = 10,      // ms, peak hold duration
                     peakFall          = 800,     // ms, peak fall duration
                     peakColor         = "#ce00ff",
                     peakThickness     = 2,       // px, thickness of peak line
                     amplitude         = 1,       // vertical scale factor (0-1)
                     bars              = 256,     // number of frequency bands
                 }) => {
    const BAR_COUNT = bars;

    /* ========= utils ========= */
    const makeF32 = (fill) => new Float32Array(BAR_COUNT).fill(fill);
    const makeF64 = (fill) => new Float64Array(BAR_COUNT).fill(fill);

    /* ========= data ========= */
    const current  = useRef(makeF32(0));
    const start    = useRef(makeF32(0));
    const target   = useRef(makeF32(0));

    const peak     = useRef(makeF32(0));
    const peakTime = useRef(makeF64(0));

    /* ========= geometry ========= */
    const gradientRef = useRef(null);
    const barXRef     = useRef(new Float32Array(BAR_COUNT));
    const barWRef     = useRef(0);

    /* ========= canvas and animations ========= */
    const canvasRef  = useRef(null);
    const animStart  = useRef(performance.now());
    const lastDraw   = useRef(animStart.current);
    const frameRef   = useRef();
    const runningRef = useRef(true);
    const optsRef = useRef({
        barColor,
        barGradient,
        backgroundColor,
        peakHold,
        peakFall,
        peakColor,
        peakThickness,
        amplitude,
    });

    useEffect(() => {
        optsRef.current = {
            barColor,
            barGradient,
            backgroundColor,
            peakHold,
            peakFall,
            peakColor,
            peakThickness,
            amplitude,
        };
        const ctx = canvasRef.current?.getContext("2d");
        if (ctx) buildGradient(ctx, canvasRef.current.height);
    }, [barColor, barGradient, backgroundColor, peakHold, peakFall, peakColor, peakThickness]);

    /* ---------- helpers ---------- */
    const buildGradient = (ctx, h) => {
        const { barColor } = optsRef.current;
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, barColor);
        g.addColorStop(1, `${barColor}`);
        gradientRef.current = g;
    };

    const handleResize = (ctx) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        const W = canvas.width;
        const barW = W / BAR_COUNT;
        barWRef.current = barW;

        if (barXRef.current.length !== BAR_COUNT) {
            barXRef.current = new Float32Array(BAR_COUNT);
        }
        for (let i = 0; i < BAR_COUNT; i++) barXRef.current[i] = i * barW;

        buildGradient(ctx, canvas.height);
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx    = canvas.getContext("2d");

        /* init */
        handleResize(ctx);
        const resizeHandler = () => handleResize(ctx);
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
            lastDraw.current = now;

            /* smooth impl */
            const lerpT = Math.min(1, (now - animStart.current) / smoothDuration);
            for (let i = 0; i < BAR_COUNT; i++) {
                current.current[i] =
                    start.current[i] + (target.current[i] - start.current[i]) * lerpT;
            }

            /* peakhold */
            const { peakHold: pHold, peakFall: pFall } = optsRef.current;
            for (let i = 0; i < BAR_COUNT; i++) {
                const v = current.current[i];
                if (v >= peak.current[i]) {
                    peak.current[i] = v;
                    peakTime.current[i] = now;
                } else if (now - peakTime.current[i] > pHold) {
                    const r = Math.min(1, (now - peakTime.current[i] - pHold) / pFall);
                    const eased = easeQuad(r);
                    peak.current[i] -= (peak.current[i] - v) * eased;
                }
            }

            /* ---- render ---- */
            const { width: W, height: H } = canvas;
            ctx.clearRect(0, 0, W, H);
            const {
                backgroundColor: bgColor,
                barColor: bc,
                barGradient: gradientEnabled,
                peakColor: pc,
                peakThickness: pt,
            } = optsRef.current;
            if (bgColor) {
                ctx.fillStyle = bgColor;
                ctx.fillRect(0, 0, W, H);
            }

            const barW = barWRef.current;
            const xs   = barXRef.current;
            const grad = gradientRef.current;

            for (let i = 0; i < BAR_COUNT; i++) {
                const h = current.current[i] * H;
                ctx.fillStyle = gradientEnabled ? grad : bc;
                ctx.fillRect(xs[i], H - h, barW * 0.88, h);

                const peakH = peak.current[i] * H;
                if (peakH > 0) {
                    ctx.fillStyle = pc;
                    ctx.fillRect(
                        xs[i],
                        Math.max(0, H - peakH - pt),
                        barW * 0.88,
                        pt
                    );
                }
            }

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
                        let normalizedData;
                        // Binary mode: check message type
                        const view = new DataView(e.data);
                        const type = view.getUint16(0, true); // 2-byte header, little-endian

                        if (type === 1) { // FFT spectrum
                            const uint8Data = new Uint8Array(e.data, 2); // skip 2-byte header
                            //console.log("Received FFT data (binary)", uint8Data);
                            normalizedData = Array.from(uint8Data).map(x => x / 255.0);
                        } else {
                            return; // Not FFT data
                        }

                        let processed;
                        if (normalizedData.length === bars) {
                            processed = normalizedData;
                        } else {
                            processed = downscaleSpectrumWeighted(normalizedData, bars);
                        }

                        start.current.set(current.current);
                        const amp = optsRef.current.amplitude || 1.0;
                        for (let i = 0; i < bars; i++) {
                            target.current[i] = processed[i] * amp;
                        }

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
        bars,
        smoothDuration,
    ]);

    return <Canvas ref={canvasRef} />;
};

export default FFTBars;