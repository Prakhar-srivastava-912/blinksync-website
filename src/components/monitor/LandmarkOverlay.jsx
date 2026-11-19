import { useEffect, useRef } from 'react';

/** MediaPipe face oval indices, in outline order. */
const FACE_OVAL = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150,
  136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
];

const LEFT_EYE = [33, 160, 158, 133, 153, 144];
const RIGHT_EYE = [362, 385, 387, 263, 373, 380];

function eyePath(points) {
  if (points.length < 6) return null;
  return points;
}

/**
 * Draws the latest landmarks from a ref inside its own animation frame, so the
 * 15 fps metric publishing never forces React re-renders for the overlay.
 */
export default function LandmarkOverlay({ getLandmarks }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext('2d');
    if (!context) return undefined;

    let frame = 0;
    let last = null;

    const render = () => {
      frame = requestAnimationFrame(render);
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const width = Math.round(rect.width * dpr);
      const height = Math.round(rect.height * dpr);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      const data = getLandmarks();
      const firstPaint = last === null;
      const stale = data && data.at && Date.now() - data.at > 1200;
      if (!data || stale) {
        if (!firstPaint) context.clearRect(0, 0, canvas.width, canvas.height);
        last = null;
        return;
      }
      last = data;

      context.clearRect(0, 0, canvas.width, canvas.height);
      const points = data.points;
      if (!Array.isArray(points) || !data.width || !data.height) return;

      const videoAspect = data.width / data.height;
      const canvasAspect = width / height;
      let drawWidth;
      let drawHeight;
      let offsetX;
      let offsetY;

      if (videoAspect > canvasAspect) {
        drawHeight = height;
        drawWidth = height * videoAspect;
        offsetX = (width - drawWidth) / 2;
        offsetY = 0;
      } else {
        drawWidth = width;
        drawHeight = width / videoAspect;
        offsetX = 0;
        offsetY = (height - drawHeight) / 2;
      }

      // The preview is mirrored for a natural selfie view; mirror the landmarks too.
      const toCanvas = (point) => [offsetX + (1 - point.x) * drawWidth, offsetY + point.y * drawHeight];

      const oval = FACE_OVAL.map((index) => points[index]).filter(Boolean).map(toCanvas);
      if (oval.length > 2) {
        context.beginPath();
        context.moveTo(oval[0][0], oval[0][1]);
        oval.slice(1).forEach(([x, y]) => context.lineTo(x, y));
        context.closePath();
        context.strokeStyle = 'rgba(56, 189, 248, 0.35)';
        context.lineWidth = Math.max(1, dpr);
        context.setLineDash([6 * dpr, 6 * dpr]);
        context.stroke();
        context.setLineDash([]);
      }

      const drawEye = (indices, color) => {
        const shape = eyePath(indices.map((index) => points[index]).filter(Boolean).map(toCanvas));
        if (!shape || shape.length < 4) return;
        context.beginPath();
        context.moveTo(shape[0][0], shape[0][1]);
        shape.slice(1).forEach(([x, y]) => context.lineTo(x, y));
        context.closePath();
        context.fillStyle = color.fill;
        context.strokeStyle = color.stroke;
        context.lineWidth = 1.8 * dpr;
        context.shadowColor = color.stroke;
        context.shadowBlur = 12 * dpr;
        context.stroke();
        context.shadowBlur = 0;
        context.fill();

        shape.forEach(([x, y]) => {
          context.beginPath();
          context.arc(x, y, 2.1 * dpr, 0, Math.PI * 2);
          context.fillStyle = color.stroke;
          context.fill();
        });
      };

      drawEye(LEFT_EYE, { stroke: 'rgba(34, 211, 238, 0.95)', fill: 'rgba(34, 211, 238, 0.14)' });
      drawEye(RIGHT_EYE, { stroke: 'rgba(45, 212, 191, 0.95)', fill: 'rgba(45, 212, 191, 0.14)' });
    };

    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, [getLandmarks]);

  return <canvas ref={canvasRef} className="landmark-canvas" aria-hidden="true" />;
}
