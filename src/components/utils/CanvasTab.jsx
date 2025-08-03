import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';

// Styled компонент с canvas
const TabContainer = styled.div`
  position: relative;
  min-height: 100px;
  width: 100%;
  
  canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none; /* чтобы canvas не блокировал клики */
  }
  
  .content {
    position: relative;
    z-index: 1;
    padding: 15px 16px 16px; /* отступы для контента */
  }
`;
const drawTabOnCanvas = (canvas, options = {}) => {
    const {
        strokeColor = 'white',
        strokeWidth = 3,
        tabWidth = 120,
        tabHeight = 40,
        tabPosition = 0,
        cornerRadius = 12
    } = options;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;

    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const halfStroke = strokeWidth / 2;
    const tabLeft = Math.max(halfStroke, tabPosition + halfStroke);
    const tabRight = tabLeft + tabWidth;

    // Исправляем координаты, чтобы линии не выходили за границы канваса
    const bottom = height - halfStroke;
    const top = halfStroke;
    const left = halfStroke;
    const right = width - halfStroke;

    ctx.beginPath();

    // Начинаем с левого нижнего угла
    ctx.moveTo(left, bottom - cornerRadius);
    ctx.quadraticCurveTo(left, bottom, cornerRadius + left, bottom);

    // Нижняя линия до правого угла
    ctx.lineTo(right - cornerRadius, bottom);
    ctx.quadraticCurveTo(right, bottom, right, bottom - cornerRadius);

    // Правая линия вверх до начала вкладки
    ctx.lineTo(right, tabHeight + cornerRadius);
    ctx.quadraticCurveTo(right, tabHeight, right - cornerRadius, tabHeight);

    // Линия до правого края вкладки
    ctx.lineTo(tabRight + cornerRadius, tabHeight);
    ctx.quadraticCurveTo(tabRight, tabHeight, tabRight, tabHeight - cornerRadius);

    // Правая сторона вкладки
    ctx.lineTo(tabRight, top + cornerRadius);
    ctx.quadraticCurveTo(tabRight, top, tabRight - cornerRadius, top);

    // Верх вкладки
    ctx.lineTo(tabLeft + cornerRadius, top);
    ctx.quadraticCurveTo(tabLeft, top, tabLeft, top + cornerRadius);

    // Левая сторона вкладки
    ctx.lineTo(tabLeft, tabHeight - cornerRadius);

    // Соединение с левой стороной (зависит от позиции вкладки)
    if (tabPosition > 0) {
        ctx.quadraticCurveTo(tabLeft, tabHeight, tabLeft - cornerRadius, tabHeight);
        ctx.lineTo(left + cornerRadius, tabHeight);
        ctx.quadraticCurveTo(left, tabHeight, left, tabHeight + cornerRadius);
    } else {
        ctx.quadraticCurveTo(left, tabHeight, left, tabHeight + cornerRadius);
    }

    // Левая линия вниз до начальной точки
    ctx.lineTo(left, bottom - cornerRadius);

    ctx.stroke();
};

export const CanvasTab = ({
                       children,
                       style = {},
                       strokeColor = 'white',
                       strokeWidth = 1,
                       tabWidth = 80,
                       tabPosition = 0
                   }) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    const redrawCanvas = () => {
        if (canvasRef.current) {
            drawTabOnCanvas(canvasRef.current, {
                strokeColor,
                strokeWidth,
                tabWidth,
                tabPosition
            });
        }
    };

    useEffect(() => {
        redrawCanvas();

        // Перерисовываем при изменении размера
        const handleResize = () => {
            setTimeout(redrawCanvas, 10); // небольшая задержка для корректного измерения
        };

        window.addEventListener('resize', handleResize);

        // Наблюдатель за изменением размеров контейнера
        const resizeObserver = new ResizeObserver(handleResize);
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => {
            window.removeEventListener('resize', handleResize);
            resizeObserver.disconnect();
        };
    }, [strokeColor, strokeWidth, tabWidth, tabPosition]);

    return (
        <TabContainer ref={containerRef} style={style}>
            <canvas ref={canvasRef} />
            <div className="content">
                {children}
            </div>
        </TabContainer>
    );
};