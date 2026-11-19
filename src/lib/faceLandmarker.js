let landmarkerPromise = null;
let landmarkerInstance = null;

const WASM_PATH = `${import.meta.env.BASE_URL}mediapipe/wasm`;
const MODEL_PATH = `${import.meta.env.BASE_URL}models/face_landmarker.task`;

/**
 * Loads MediaPipe Face Landmarker lazily so the landing page never downloads the
 * vision runtime. The WASM binaries and the model are served from our own origin
 * (public/mediapipe/wasm and public/models) — no image ever leaves the device.
 */
export async function getFaceLandmarker({ onProgress } = {}) {
  if (landmarkerInstance) return landmarkerInstance;
  if (landmarkerPromise) return landmarkerPromise;

  landmarkerPromise = (async () => {
    onProgress?.({ stage: 'runtime', progress: 0.2 });
    const { FilesetResolver, FaceLandmarker } = await import('@mediapipe/tasks-vision');

    const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
    onProgress?.({ stage: 'model', progress: 0.55 });

    const options = (delegate) => ({
      baseOptions: {
        modelAssetPath: MODEL_PATH,
        delegate,
      },
      runningMode: 'VIDEO',
      numFaces: 1,
      minFaceDetectionConfidence: 0.5,
      minFacePresenceConfidence: 0.5,
      minTrackingConfidence: 0.45,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
    });

    let instance;
    try {
      instance = await FaceLandmarker.createFromOptions(fileset, options('GPU'));
    } catch (gpuError) {
      console.warn('[blinksync] GPU delegate unavailable, falling back to CPU.', gpuError?.message ?? gpuError);
      instance = await FaceLandmarker.createFromOptions(fileset, options('CPU'));
    }

    onProgress?.({ stage: 'ready', progress: 1 });
    landmarkerInstance = instance;
    return instance;
  })();

  try {
    return await landmarkerPromise;
  } catch (error) {
    landmarkerPromise = null;
    throw error;
  }
}

export function isLandmarkerReady() {
  return landmarkerInstance !== null;
}

export function resetLandmarkerForTests() {
  landmarkerPromise = null;
  landmarkerInstance = null;
}
