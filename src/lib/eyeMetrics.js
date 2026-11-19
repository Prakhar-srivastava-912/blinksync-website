import { EYE_LANDMARKS } from './constants.js';

/** Euclidean distance between two normalised landmarks, corrected for frame aspect. */
export function landmarkDistance(a, b, aspectRatio = 1) {
  if (!a || !b) return 0;
  const dx = (a.x - b.x) * aspectRatio;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function distance(a, b, aspectRatio) {
  return landmarkDistance(a, b, aspectRatio);
}

/**
 * Eye Aspect Ratio (Soukupová & Čech) for a single eye:
 *   EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)
 * The upper/lower pairs are averaged so a single noisy landmark cannot swing
 * the result as much.
 */
export function eyeAspectRatio(landmarks, eye, aspectRatio = 1) {
  if (!Array.isArray(landmarks)) return null;
  const points = [eye.outer, eye.inner, ...eye.upper, ...eye.lower].map((index) => landmarks[index]);
  if (points.some((point) => !point || !Number.isFinite(point.x) || !Number.isFinite(point.y))) {
    return null;
  }

  const [outer, inner, upperA, upperB, lowerA, lowerB] = points;
  const heightA = distance(upperA, lowerA, aspectRatio);
  const heightB = distance(upperB, lowerB, aspectRatio);
  const width = distance(outer, inner, aspectRatio);
  if (width <= 1e-6) return null;

  const ear = (heightA + heightB) / (2 * width);
  return Number.isFinite(ear) ? ear : null;
}

/** Average EAR across both eyes, plus per-eye values for the overlay. */
export function measureEyes(landmarks, aspectRatio = 1) {
  const left = eyeAspectRatio(landmarks, EYE_LANDMARKS.left, aspectRatio);
  const right = eyeAspectRatio(landmarks, EYE_LANDMARKS.right, aspectRatio);

  if (left === null && right === null) return { left: null, right: null, average: null };
  if (left === null) return { left: null, right, average: right };
  if (right === null) return { left, right: null, average: left };
  return { left, right, average: (left + right) / 2 };
}

/** Distance between the outer eye corners, used as a head-distance proxy. */
export function faceScale(landmarks, aspectRatio = 1) {
  if (!Array.isArray(landmarks)) return null;
  const left = landmarks[EYE_LANDMARKS.left.outer];
  const right = landmarks[EYE_LANDMARKS.right.outer];
  if (!left || !right) return null;
  const value = distance(left, right, aspectRatio);
  return value > 0 ? value : null;
}

/** Convert an EAR reading into a 0..1 openness estimate for display. */
export function eyeOpenness(ear, baseline) {
  if (!Number.isFinite(ear) || !Number.isFinite(baseline) || baseline <= 0) return null;
  return Math.min(1, Math.max(0, ear / (baseline * 1.08)));
}

/** Median of a numeric array (does not mutate the input). */
export function median(values) {
  if (!Array.isArray(values) || values.length === 0) return null;
  const sorted = [...values].filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

/**
 * Rejects frames where the face suddenly got larger or smaller — usually head
 * movement that would otherwise look like a blink.
 */
export class FaceStabilityFilter {
  constructor({ tolerance = 0.22, smoothing = 0.15, maxSamples = 45 } = {}) {
    this.tolerance = tolerance;
    this.smoothing = smoothing;
    this.maxSamples = maxSamples;
    this.samples = [];
    this.medianScale = null;
  }

  reset() {
    this.samples = [];
    this.medianScale = null;
  }

  /**
   * @returns {{ stable: boolean, scale: number|null, reference: number|null }}
   */
  update(scale) {
    if (!Number.isFinite(scale) || scale <= 0) {
      return { stable: false, scale: null, reference: this.medianScale };
    }

    if (this.medianScale === null) {
      this.medianScale = scale;
      this.samples = [scale];
      return { stable: true, scale, reference: scale };
    }

    const relativeChange = Math.abs(scale - this.medianScale) / this.medianScale;
    const stable = relativeChange <= this.tolerance;

    if (stable) {
      this.samples.push(scale);
      if (this.samples.length > this.maxSamples) this.samples.shift();
      this.medianScale = this.medianScale * (1 - this.smoothing) + scale * this.smoothing;
    }

    return { stable, scale, reference: this.medianScale };
  }
}
