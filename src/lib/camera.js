export const CAMERA_ERRORS = {
  unsupported: {
    code: 'unsupported',
    title: 'Camera API unavailable',
    message:
      'This browser does not expose camera access. Use a modern browser, or explore the app in Demo Mode.',
  },
  insecure: {
    code: 'insecure',
    title: 'Secure connection required',
    message:
      'Browsers only allow camera access on HTTPS or localhost. Open BlinkSync over HTTPS or use Demo Mode.',
  },
  denied: {
    code: 'denied',
    title: 'Camera permission denied',
    message:
      'BlinkSync cannot monitor blinks without camera access. Allow the camera in your browser settings and try again, or continue in Demo Mode.',
  },
  notfound: {
    code: 'notfound',
    title: 'No camera found',
    message: 'No camera is connected to this device. Connect one and retry, or continue in Demo Mode.',
  },
  busy: {
    code: 'busy',
    title: 'Camera is in use',
    message:
      'Another application is using the camera. Close it (video call, screen recorder) and try again.',
  },
  generic: {
    code: 'generic',
    title: 'Could not start the camera',
    message: 'Something went wrong while starting the camera. Check permissions and try again.',
  },
};

export function normalizeCameraError(error) {
  if (!error) return CAMERA_ERRORS.generic;
  const name = error.name ?? '';
  if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') {
    return CAMERA_ERRORS.denied;
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return CAMERA_ERRORS.notfound;
  if (name === 'NotReadableError' || name === 'TrackStartError') return CAMERA_ERRORS.busy;
  if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
    return {
      ...CAMERA_ERRORS.generic,
      code: 'constraint',
      message: 'The selected camera could not provide a suitable video stream. Try a different camera.',
    };
  }
  return { ...CAMERA_ERRORS.generic, detail: error.message ?? '' };
}

export function isCameraSupported() {
  return (
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices) &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  );
}

export function isSecureCameraContext() {
  if (typeof window === 'undefined') return false;
  return window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}

export async function listCameras() {
  if (!isCameraSupported() || typeof navigator.mediaDevices.enumerateDevices !== 'function') return [];
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((device) => device.kind === 'videoinput')
      .map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `Camera ${index + 1}`,
      }));
  } catch {
    return [];
  }
}

/**
 * Opens the camera with the requested device, falling back to the default
 * camera when a previously chosen device disappeared.
 */
export async function requestCameraStream({ deviceId = '', width = 640, height = 480 } = {}) {
  if (!isCameraSupported()) throw Object.assign(new Error('unsupported'), { name: 'NotSupportedError' });
  if (!isSecureCameraContext()) throw Object.assign(new Error('insecure'), { name: 'SecurityError' });

  const base = {
    width: { ideal: width },
    height: { ideal: height },
    frameRate: { ideal: 24, max: 30 },
    facingMode: 'user',
  };

  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: deviceId ? { ...base, deviceId: { exact: deviceId } } : base,
    });
  } catch (error) {
    if (deviceId && (error?.name === 'OverconstrainedError' || error?.name === 'NotFoundError')) {
      return navigator.mediaDevices.getUserMedia({ audio: false, video: base });
    }
    throw error;
  }
}

export function stopStream(stream) {
  if (!stream || typeof stream.getTracks !== 'function') return;
  stream.getTracks().forEach((track) => {
    try {
      track.stop();
    } catch {
      /* ignore */
    }
  });
}
