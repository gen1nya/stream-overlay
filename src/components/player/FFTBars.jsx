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
                     smoothDuration    = 16,      // ms, smoothing duration
                     reconnectInterval = 2000,    // ms, socket reconnect interval
                     peakHold          = 10,      // ms, peak hold duration
                     peakFall          = 800,     // ms, peak fall duration
                     peakColor         = "#ce00ff",
                     peakThickness     = 2,       // px, thickness of peak line
                     amplitude         = 1,       // vertical scale factor (0-1)
                     bars              = 256,     // number of frequency bands
                     targetFps         = 60,      // render cap; draws every N-th vsync (N=floor(refresh/targetFps))
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

    /* ========= fps cap + idle-skip ========= */
    const prevNow    = useRef(performance.now()); // last rAF timestamp (for refresh estimate)
    const emaRaf     = useRef(0);                 // smoothed vsync interval (ms)
    const tickRef    = useRef(0);                 // vsync counter for the cap
    const dirtyRef   = useRef(true);              // force a redraw (resize / opts change)

    const optsRef = useRef({
        barColor,
        barGradient,
        backgroundColor,
        peakHold,
        peakFall,
        peakColor,
        peakThickness,
        amplitude,
        targetFps,
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
            targetFps,
        };
        dirtyRef.current = true; // visual config changed → repaint even while idle
        const ctx = canvasRef.current?.getContext("2d");
        if (ctx) buildGradient(ctx, canvasRef.current.height);
    }, [barColor, barGradient, backgroundColor, peakHold, peakFall, peakColor, peakThickness, amplitude, targetFps]);

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
        dirtyRef.current = true; // canvas was cleared by resize → repaint
    };

/*    useEffect(() => {
        const interval = setInterval(() => {
            const values = current.current;
            const blocks = "▁▂▃▄▅▆▇█";
            const step = Math.ceil(values.length / 16);
            const chars = [];

            for (let i = 0; i < values.length; i += step) {
                const slice = values.slice(i, i + step);
                const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
                const level = Math.min(blocks.length - 1, Math.floor(avg * blocks.length));
                chars.push(blocks[level]);
            }

            const spectrumStr = chars.join("");

            document.title = (spectrumStr);
        }, 32);
        return () => clearInterval(interval);
    }, []);
*/
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx    = canvas.getContext("2d");

        /* init */
        handleResize(ctx);
        const resizeHandler = () => handleResize(ctx);
        window.addEventListener("resize", resizeHandler);

        /* Per-effect liveness flag. The rAF loop reschedules itself, so on an effect
           re-run (HMR / deps change) the previous closure would keep looping forever —
           cancelAnimationFrame only holds the last frame id and can't kill an orphan.
           Checking `alive` lets the old loop self-terminate. */
        let alive = true;

        /* visibility pause/resume */
        const onVis = () => {
            runningRef.current = !document.hidden;
            if (alive && runningRef.current) {
                cancelAnimationFrame(frameRef.current); // avoid double-scheduling a loop
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

            /* fps cap: estimate the display interval, then draw every N-th vsync.
               N = floor(targetInterval / refreshInterval) → effective fps stays >= target
               (rounds fps UP when target doesn't divide the refresh, e.g. 144Hz→72). */
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

            /* smooth impl (time-based lerp → independent of the render rate) */
            const lerpT = Math.min(1, (now - animStart.current) / smoothDuration);
            const lerpActive = now - animStart.current < smoothDuration;
            for (let i = 0; i < BAR_COUNT; i++) {
                current.current[i] =
                    start.current[i] + (target.current[i] - start.current[i]) * lerpT;
            }

            /* peakhold */
            const { width: W, height: H } = canvas;
            const eps = 0.5 / (H || 1); // sub-pixel: peaks moving less than this are "settled"
            const { peakHold: pHold, peakFall: pFall } = optsRef.current;
            let peakFalling = false;
            for (let i = 0; i < BAR_COUNT; i++) {
                const v = current.current[i];
                if (v >= peak.current[i]) {
                    peak.current[i] = v;
                    peakTime.current[i] = now;
                } else if (now - peakTime.current[i] > pHold) {
                    const r = Math.min(1, (now - peakTime.current[i] - pHold) / pFall);
                    const eased = easeQuad(r);
                    peak.current[i] -= (peak.current[i] - v) * eased;
                    if (peak.current[i] - v > eps) peakFalling = true;
                }
            }

            /* idle-skip: nothing is animating and no pending change → keep the last frame
               (skips clear + fills + the GPU raster/commit, the dominant cost). */
            if (!dirtyRef.current && !lerpActive && !peakFalling) {
                frameRef.current = requestAnimationFrame(draw);
                return;
            }
            dirtyRef.current = false;

            /* ---- render ---- */
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

            const xs = barXRef.current;
            const bw = barWRef.current * 0.88;

            /* bars: one path, one fill (gradient is x-independent, so a single fill works) */
            ctx.beginPath();
            for (let i = 0; i < BAR_COUNT; i++) {
                const h = current.current[i] * H;
                if (h > 0) ctx.rect(xs[i], H - h, bw, h);
            }
            ctx.fillStyle = gradientEnabled ? gradientRef.current : bc;
            ctx.fill();

            /* peaks: one path, one fill */
            ctx.beginPath();
            for (let i = 0; i < BAR_COUNT; i++) {
                const peakH = peak.current[i] * H;
                if (peakH > 0) ctx.rect(xs[i], Math.max(0, H - peakH - pt), bw, pt);
            }
            ctx.fillStyle = pc;
            ctx.fill();

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
                    if (!(e.data instanceof ArrayBuffer)) return;

                    const view = new DataView(e.data);
                    const type = view.getUint16(0, true); // 2-byte header, little-endian
                    if (type !== 1) return;                // not FFT spectrum

                    // Raw Uint8 (0-255) view over the payload, no copy. downscale is a
                    // weighted average (linear), so dividing by 255 afterwards is equivalent
                    // to normalizing first — lets us skip the per-message Array.from().map().
                    const raw = new Uint8Array(e.data, 2);
                    const processed =
                        raw.length === bars ? raw : downscaleSpectrumWeighted(raw, bars);

                    start.current.set(current.current);
                    const k = (optsRef.current.amplitude || 1.0) / 255.0;
                    for (let i = 0; i < bars; i++) {
                        target.current[i] = processed[i] * k;
                    }

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
        bars,
        smoothDuration,
    ]);

    return <Canvas ref={canvasRef} />;
};

export default FFTBars;
