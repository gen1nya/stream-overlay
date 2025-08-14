import React, { useEffect, useRef } from "react";
import styled from "styled-components";
import {downscaleSpectrumWeighted} from "../../utils";

/*  ==========================================================
    FFTDonut — N-channel spectrum visualizer rendered as ring
    sectors with independent, animated radii and peaks.

    v1.1 — June 2025
    -------------------------------------------
    • inactiveSector / inactiveSectorUnit — allow reserving a “silent” arc (no bars drawn).
    • startAngle / startAngleUnit         — allow shifting the origin where bars start.
    Both angles can be specified either in radians (default) or degrees.
    ========================================================== */

const Canvas = styled.canvas`
    width: 100%;
    height: 100%;
    display: block;
`;

/* ----- helpers ----- */
const easeQuad = (x) => x * x;
const toRad = (v, unit = "rad") => unit === "deg" ? (v * Math.PI) / 180 : v;

const FFTDonut = ({
                      /* ---- WebSocket ---- */
                      wsUrl             = "ws://localhost:5001",
                      reconnectInterval = 2000,    // ms, socket reconnect interval

                      /* ---- полосы ---- */
                      bars              = 256,     // number of frequency bands
                      smoothDuration    = 60,      // ms, smoothing duration

                      /* ---- цвета ---- */
                      barColor          = "#ce00ff",
                      barGradient       = true,
                      backgroundColor   = "rgba(197,89,89,0.06)",

                      /* ---- пики ---- */
                      peakHold          = 10,      // ms, peak hold duration
                      peakFall          = 800,     // ms, peak fall duration
                      peakThickness     = 2,       // px, толщина линии пика
                      peakColor         = "#57fe04",

                      /* ---- геометрия кольца ---- */
                      innerRadiusRatio  = 0.8,     // относительный внутренний радиус (0..1)
                      sectorGap         = 0.01,    // разрыв между секторами, рад

                      /* ---- новые угловые опции ---- */
                      startAngle        = Math.PI / 2,       // точка отсчёта (0 → +X ось). Еденицы в startAngleUnit
                      startAngleUnit    = "rad",  // "rad" | "deg"
                      inactiveSector    = 0,       // размер неактивного сегмента, где спектр не рисуется
                      inactiveSectorUnit= "rad",  // "rad" | "deg"
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
    const angleStartRef = useRef(new Float32Array(BAR_COUNT));
    const angleEndRef   = useRef(new Float32Array(BAR_COUNT));
    const outerRRef     = useRef(0); // максимальный внешний радиус
    const innerRRef     = useRef(0); // внутренний радиус кольца
    const gradientRef   = useRef(null);

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
        peakColor,
        peakHold,
        peakFall,
        peakThickness,
    });

    useEffect(() => {
        optsRef.current = {
            barColor,
            barGradient,
            backgroundColor,
            peakColor,
            peakHold,
            peakFall,
            peakThickness,
        };
        const ctx = canvasRef.current?.getContext("2d");
        if (ctx) buildGradient(ctx, innerRRef.current, outerRRef.current);
    }, [barColor, barGradient, backgroundColor, peakColor, peakHold, peakFall, peakThickness]);

    /* ---------- helpers ---------- */
    const buildGradient = (ctx, r0, rMax) => {
        // Радиальный градиент: от внутреннего к внешнему
        const { barColor } = optsRef.current;
        const g = ctx.createRadialGradient(0, 0, r0, 0, 0, rMax);
        g.addColorStop(0, barColor);
        g.addColorStop(1, barColor);
        gradientRef.current = g;
    };

    const precomputeAngles = () => {
        const full = Math.PI * 2;
        const inactive = Math.min(full, Math.max(0, toRad(inactiveSector, inactiveSectorUnit)));
        const activeArc = full - inactive;
        const anglePer = activeArc / BAR_COUNT;
        const gap = sectorGap;
        const offset = toRad(startAngle, startAngleUnit);

        if (angleStartRef.current.length !== BAR_COUNT) {
            angleStartRef.current = new Float32Array(BAR_COUNT);
            angleEndRef.current   = new Float32Array(BAR_COUNT);
        }
        for (let i = 0; i < BAR_COUNT; i++) {
            const baseStart = offset + i * anglePer;
            angleStartRef.current[i] = baseStart + gap * 0.5;
            angleEndRef.current[i]   = baseStart + anglePer - gap * 0.5;
        }
    };

    const handleResize = (ctx) => {
        const canvas = canvasRef.current;
        const rect   = canvas.getBoundingClientRect();
        canvas.width  = rect.width;
        canvas.height = rect.height;

        // Геометрия круга
        const size = Math.min(canvas.width, canvas.height);
        outerRRef.current = size * 0.5;
        innerRRef.current = outerRRef.current * innerRadiusRatio;

        precomputeAngles();
        buildGradient(ctx, innerRRef.current, outerRRef.current);
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
            ctx.save();
            ctx.translate(W * 0.5, H * 0.5); // (0,0) теперь в центре
            ctx.clearRect(-W * 0.5, -H * 0.5, W, H);
            const { barGradient: gradientEnabled, barColor: bc, peakColor: pc, peakThickness: pt, backgroundColor: bgColor } = optsRef.current;
            if (bgColor) {
                ctx.fillStyle = bgColor;
                ctx.fillRect(-W * 0.5, -H * 0.5, W, H);
            }

            const r0   = innerRRef.current;
            const rMax = outerRRef.current;
            const grad = gradientRef.current;
            const aS   = angleStartRef.current;
            const aE   = angleEndRef.current;

            for (let i = 0; i < BAR_COUNT; i++) {
                const val = current.current[i];
                const rOut = r0 + val * (rMax - r0);
                if (rOut <= r0) continue; // пропуск нулевых

                // Сектор (кольцевой сегмент)
                ctx.beginPath();
                ctx.moveTo(r0 * Math.cos(aS[i]), r0 * Math.sin(aS[i]));
                ctx.lineTo(rOut * Math.cos(aS[i]), rOut * Math.sin(aS[i]));
                ctx.arc(0, 0, rOut, aS[i], aE[i]);
                ctx.lineTo(r0 * Math.cos(aE[i]), r0 * Math.sin(aE[i]));
                ctx.arc(0, 0, r0, aE[i], aS[i], true);
                ctx.closePath();

                ctx.fillStyle = gradientEnabled ? grad : bc;
                ctx.fill();

                /* peak arc */
                const pVal = peak.current[i];
                if (pVal > 0) {
                    const rPeak = r0 + pVal * (rMax - r0);
                    ctx.strokeStyle = pc;
                    ctx.lineWidth   = pt;
                    ctx.beginPath();
                    ctx.arc(0, 0, rPeak, aS[i], aE[i]);
                    ctx.stroke();
                }
            }
            ctx.restore();

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        wsUrl,
        reconnectInterval,
        bars,
        smoothDuration,
        innerRadiusRatio,
        sectorGap,
        startAngle,
        startAngleUnit,
        inactiveSector,
        inactiveSectorUnit,
    ]);


    return <Canvas ref={canvasRef} />;
};

export default FFTDonut;