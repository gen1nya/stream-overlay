import React, { useEffect, useRef } from "react";
import styled from "styled-components";

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

    /* ---------- helpers ---------- */
    const buildGradient = (ctx, h) => {
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
            const dt  = now - lastDraw.current;
            lastDraw.current = now;

            /* smooth impl */
            const lerpT = Math.min(1, (now - animStart.current) / smoothDuration);
            for (let i = 0; i < BAR_COUNT; i++) {
                current.current[i] =
                    start.current[i] + (target.current[i] - start.current[i]) * lerpT;
            }

            /* peakhold */
            for (let i = 0; i < BAR_COUNT; i++) {
                const v = current.current[i];
                if (v >= peak.current[i]) {
                    peak.current[i] = v;
                    peakTime.current[i] = now;
                } else if (now - peakTime.current[i] > peakHold) {
                    const r = Math.min(1, (now - peakTime.current[i] - peakHold) / peakFall);
                    const eased = easeQuad(r);
                    peak.current[i] -= (peak.current[i] - v) * eased;
                }
            }

            /* ---- render ---- */
            const { width: W, height: H } = canvas;
            ctx.clearRect(0, 0, W, H);
            if (backgroundColor) {
                ctx.fillStyle = backgroundColor;
                ctx.fillRect(0, 0, W, H);
            }

            const barW = barWRef.current;
            const xs   = barXRef.current;
            const grad = gradientRef.current;

            for (let i = 0; i < BAR_COUNT; i++) {
                const h = current.current[i] * H;
                ctx.fillStyle = barGradient ? grad : barColor;
                ctx.fillRect(xs[i], H - h, barW * 0.88, h);

                const peakH = peak.current[i] * H;
                if (peakH > 0) {
                    ctx.fillStyle = peakColor;
                    ctx.fillRect(
                        xs[i],
                        Math.max(0, H - peakH - peakThickness),
                        barW * 0.88,
                        peakThickness
                    );
                }
            }

            frameRef.current = requestAnimationFrame(draw);
        };
        frameRef.current = requestAnimationFrame(draw);

        /* ---- WebSocket ---- */
        let ws;
        const connect = () => {
            ws = new WebSocket(wsUrl);

            ws.onmessage = (e) => {
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

            ws.onclose = () => {
                if (reconnectInterval > 0) setTimeout(connect, reconnectInterval);
            };
        };
        connect();

        /* ---- cleanup ---- */
        return () => {
            cancelAnimationFrame(frameRef.current);
            ws.close();
            document.removeEventListener("visibilitychange", onVis);
            window.removeEventListener("resize", resizeHandler);
        };
    }, [
        wsUrl,
        barColor,
        barGradient,
        backgroundColor,
        smoothDuration,
        reconnectInterval,
        peakHold,
        peakFall,
        peakColor,
        peakThickness,
        bars,
    ]);

    function downscaleSpectrumWeighted(input, targetSize) {
        const inputSize = input.length;
        const output = new Array(targetSize);
        const curveFactor = 0.8;

        for (let i = 0; i < targetSize; i++) {
            const scaled = Math.pow(i / targetSize, curveFactor);
            const start = Math.floor(inputSize * scaled);
            const end = Math.floor(inputSize * Math.pow((i + 1) / targetSize, curveFactor));

            let sum = 0;
            let weightSum = 0;

            for (let j = start; j < end; j++) {
                const weight = 1 / (j + 1); // можно поиграться с весами
                sum += input[j] * weight;
                weightSum += weight;
            }

            output[i] = weightSum > 0 ? sum / weightSum : 0;
        }

        return output;
    }

    function downscaleSpectrum(input, targetSize, mode = 'avg') {
        const factor = input.length / targetSize;
        const output = new Array(targetSize);

        for (let i = 0; i < targetSize; i++) {
            const start = Math.floor(i * factor);
            const end = Math.floor((i + 1) * factor);

            let val;
            if (mode === 'max') {
                val = -Infinity;
                for (let j = start; j < end; j++) {
                    if (input[j] > val) val = input[j];
                }
            } else if (mode === 'min') {
                val = Infinity;
                for (let j = start; j < end; j++) {
                    if (input[j] < val) val = input[j];
                }
            } else { // 'avg' or default
                let sum = 0;
                for (let j = start; j < end; j++) {
                    sum += input[j];
                }
                val = sum / (end - start);
            }

            output[i] = val;
        }

        return output;
    }

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