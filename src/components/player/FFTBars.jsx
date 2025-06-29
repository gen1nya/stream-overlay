import React, { useEffect, useRef } from "react";
import styled from "styled-components";
import {downscaleSpectrumWeighted} from "../../utils";

/*  ===============================
    FFTBars — N‑channel spectrum visualizer with peaks
    =============================== */

const Canvas = styled.canvas`
    width: 100%;
    height: 100%;
    display: block;
`;

/* квадратичный easing для падения пика */
const easeQuad = (x) => x * x;

const FFTBars = ({
                     wsUrl             = "ws://localhost:5001/ws",
                     barColor          = "#1a9c00",
                     barGradient       = true,
                     backgroundColor   = "rgba(197,89,89,0.06)",
                     smoothDuration    = 60,      // ms, smoothing duration
                     reconnectInterval = 2000,    // ms, socket reconnect interval
                     /* ----- пики ----- */
                     peakHold          = 10,     // ms, peak hold duration
                     peakFall          = 800,     // ms, peak fall duration
                     peakColor         = "#37ff00",
                     peakThickness     = 2,       // px, thickness of peak line
                     /* ----- количество полос ----- */
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
    const runningRef = useRef(true);  // pause on visibility change (tab hidden)
    const optsRef = useRef({
        barColor,
        barGradient,
        backgroundColor,
        peakHold,
        peakFall,
        peakColor,
        peakThickness,
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
        //canvas.width  = canvas.clientWidth;
        //canvas.height = canvas.clientHeight;
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

            wsRef.current.onmessage = (e) => {
                try {
                    const { type, data } = JSON.parse(e.data);
                    if (type !== "fft" || !Array.isArray(data)) return;

                    const input = data.map(x => Math.min(1, Math.max(0, x)));

                    let processed;
                    if (input.length === bars) {
                        processed = input;
                    } else {
                        processed = downscaleSpectrumWeighted(input, bars);
                    }

                    start.current.set(current.current);
                    for (let i = 0; i < bars; i++) {
                        target.current[i] = processed[i];
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


/*
function generateBands(count = 256, fStart = 20, fEnd = 20000, curve = 1) {
    const bands = [];

    for (let i = 0; i < count; i++) {
        const x = i / (count - 1);
        const powered = Math.pow(x, curve);
        const freq = fStart * Math.pow(fEnd / fStart, powered);
        bands.push(Math.round(freq));
    }

    return bands;
}
**/