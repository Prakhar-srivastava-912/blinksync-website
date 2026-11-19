import { describe, expect, it } from 'vitest';
import {
  FaceStabilityFilter,
  eyeAspectRatio,
  eyeOpenness,
  faceScale,
  landmarkDistance,
  measureEyes,
  median,
} from './eyeMetrics.js';
import { EYE_LANDMARKS } from './constants.js';

const fill = (points) => {
  const base = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 }));
  Object.entries(points).forEach(([index, point]) => {
    base[Number(index)] = { x: point[0], y: point[1] };
  });
  return base;
};

/** Builds an eye whose EAR equals `ear` exactly, with a 0.1 unit width. */
function setEye(points, eye, { x0, y = 0.5, ear = 0.3 }) {
  const x1 = x0 + 0.1;
  const halfHeight = (ear * 0.1) / 2;
  points[eye.outer] = [x0, y];
  points[eye.inner] = [x1, y];
  points[eye.upper[0]] = [x0 + 0.033, y - halfHeight];
  points[eye.upper[1]] = [x0 + 0.066, y - halfHeight];
  points[eye.lower[0]] = [x0 + 0.033, y + halfHeight];
  points[eye.lower[1]] = [x0 + 0.066, y + halfHeight];
  return points;
}

function makeFace(leftEar = 0.3, rightEar = 0.3) {
  const points = {};
  setEye(points, EYE_LANDMARKS.left, { x0: 0.3, ear: leftEar });
  setEye(points, EYE_LANDMARKS.right, { x0: 0.6, ear: rightEar });
  return fill(points);
}

describe('landmarkDistance', () => {
  it('is isotropic when the frame aspect ratio is applied', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 0.5, y: 0 };
    expect(landmarkDistance(a, b, 1)).toBeCloseTo(0.5);
    expect(landmarkDistance(a, b, 2)).toBeCloseTo(1);
  });

  it('returns zero for missing points', () => {
    expect(landmarkDistance(null, { x: 1, y: 1 })).toBe(0);
  });
});

describe('eyeAspectRatio', () => {
  it('equals the geometric ratio of lid height to eye width', () => {
    const landmarks = makeFace(0.32, 0.28);
    expect(eyeAspectRatio(landmarks, EYE_LANDMARKS.left)).toBeCloseTo(0.32, 5);
    expect(eyeAspectRatio(landmarks, EYE_LANDMARKS.right)).toBeCloseTo(0.28, 5);
  });

  it('measures eyes correctly with a non-square frame aspect', () => {
    const points = {};
    setEye(points, EYE_LANDMARKS.left, { x0: 0.3, ear: 0.3 });
    const landmarks = fill(points);
    // Horizontal distances are scaled by the aspect ratio, vertical ones are not.
    expect(eyeAspectRatio(landmarks, EYE_LANDMARKS.left, 2)).toBeCloseTo(0.15, 5);
  });

  it('returns null when landmarks are missing or degenerate', () => {
    expect(eyeAspectRatio(null, EYE_LANDMARKS.left)).toBeNull();
    const degenerate = makeFace();
    degenerate[EYE_LANDMARKS.left.inner] = { x: degenerate[EYE_LANDMARKS.left.outer].x, y: 0.5 };
    expect(eyeAspectRatio(degenerate, EYE_LANDMARKS.left)).toBeNull();
  });
});

describe('measureEyes', () => {
  it('averages both eyes', () => {
    const result = measureEyes(makeFace(0.3, 0.2));
    expect(result.left).toBeCloseTo(0.3, 5);
    expect(result.right).toBeCloseTo(0.2, 5);
    expect(result.average).toBeCloseTo(0.25, 5);
  });

  it('falls back to a single measured eye', () => {
    const landmarks = makeFace(0.3, 0.3);
    landmarks[EYE_LANDMARKS.right.upper[0]] = { x: Number.NaN, y: 0.5 };
    const result = measureEyes(landmarks);
    expect(result.right).toBeNull();
    expect(result.average).toBeCloseTo(0.3, 5);
  });

  it('returns nulls when nothing is measurable', () => {
    const result = measureEyes([]);
    expect(result).toEqual({ left: null, right: null, average: null });
  });
});

describe('faceScale and eyeOpenness', () => {
  it('derives face scale from the outer eye corners', () => {
    const scale = faceScale(makeFace());
    expect(scale).toBeCloseTo(0.3, 5); // 0.6 - 0.3
  });

  it('clamps openness to a 0..1 display range', () => {
    expect(eyeOpenness(0.15, 0.3)).toBeCloseTo(0.463, 3);
    expect(eyeOpenness(0.9, 0.3)).toBe(1);
    expect(eyeOpenness(-1, 0.3)).toBe(0);
    expect(eyeOpenness(0.2, 0)).toBeNull();
  });
});

describe('median', () => {
  it('handles odd, even and invalid input', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBeNull();
    expect(median([Number.NaN, 2])).toBe(2);
  });
});

describe('FaceStabilityFilter', () => {
  it('accepts steady face sizes and rejects sudden movement', () => {
    const filter = new FaceStabilityFilter({ tolerance: 0.2 });
    expect(filter.update(0.3).stable).toBe(true);
    expect(filter.update(0.305).stable).toBe(true);
    expect(filter.update(0.302).stable).toBe(true);
    const moved = filter.update(0.45);
    expect(moved.stable).toBe(false);
  });

  it('treats a missing scale as unstable', () => {
    const filter = new FaceStabilityFilter();
    expect(filter.update(null).stable).toBe(false);
  });
});
