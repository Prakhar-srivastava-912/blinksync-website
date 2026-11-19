import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from './AppContext.jsx';
import { DEFAULT_EAR_BASELINE } from '../lib/constants.js';
import { BlinkDetector, DETECTOR_EVENTS } from '../lib/blinkDetector.js';
import { BlinkRateTracker } from '../lib/blinkRate.js';
import { BlinkReminderEngine, reminderConfigFor } from '../lib/reminderEngine.js';
import { SessionTracker } from '../lib/sessionTracker.js';
import { CalibrationCollector } from '../lib/calibration.js';
import { FaceStabilityFilter, eyeOpenness, faceScale, measureEyes } from '../lib/eyeMetrics.js';
import {
  CAMERA_ERRORS,
  isCameraSupported,
  listCameras,
  normalizeCameraError,
  requestCameraStream,
  stopStream,
} from '../lib/camera.js';
import { getFaceLandmarker } from '../lib/faceLandmarker.js';
import { DemoSimulator } from '../lib/demoSimulator.js';
import { playChime, unlockAudio } from '../lib/audio.js';

const MonitorContext = createContext(null);

function createInitialMonitor() {
  return {
    status: 'idle',
    error: null,
    mode: 'live',
    simulated: false,
    facePresent: false,
    faceStable: false,
    ear: null,
    eyes: { left: null, right: null },
    openness: null,
    blinkCount: 0,
    blinkRate: 0,
    durationMs: 0,
    monitoredMs: 0,
    fps: 0,
    modelProgress: 0,
    modelStage: '',
    calibration: { active: false, progress: 0, remainingMs: 0, result: null, message: '' },
    nudge: null,
    pulseAt: 0,
    paused: false,
    sessionId: null,
    baseline: DEFAULT_EAR_BASELINE,
    cameraLabel: '',
  };
}

function createEngine() {
  return {
    running: false,
    starting: false,
    paused: false,
    mode: 'live',
    raf: null,
    lastDetectionAt: 0,
    frameIntervalMs: 1000 / 15,
    detector: null,
    rate: null,
    reminder: null,
    session: null,
    stability: null,
    calibrator: null,
    demo: null,
    landmarker: null,
    stream: null,
    video: null,
    landmarks: null,
    lastFaceAt: 0,
    lastPublishAt: 0,
    lastAutosaveAt: 0,
    blinkPulseAt: 0,
    lastNudge: null,
    detectionErrors: 0,
    fpsFrames: 0,
    fpsWindowStart: 0,
    fps: 0,
    lastBaseline: null,
    lastVideoTimestamp: 0,
    processFrame: null,
  };
}

const STAGE_LABELS = {
  runtime: 'Loading vision runtime…',
  model: 'Loading face landmark model…',
  ready: 'Model ready',
};

async function attachStreamToVideo(stream) {
  const video = document.createElement('video');
  video.muted = true;
  video.autoplay = true;
  video.playsInline = true;
  video.setAttribute('playsinline', 'true');
  video.srcObject = stream;
  video.style.cssText =
    'position:fixed;left:-10000px;top:0;width:2px;height:2px;opacity:0;pointer-events:none;';
  document.body.appendChild(video);

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Camera stream did not start in time')), 12000);
    const finish = () => {
      clearTimeout(timeout);
      resolve();
    };
    if (video.readyState >= 2) finish();
    else video.addEventListener('loadeddata', finish, { once: true });
  });

  try {
    await video.play();
  } catch {
    /* Autoplay of a muted stream is normally allowed; detection retries on the next frame. */
  }
  return video;
}

export function MonitorProvider({ children }) {
  const { settings, updateSettings, saveSession, notify } = useApp();
  const [monitor, setMonitor] = useState(createInitialMonitor);
  const [stream, setStream] = useState(null);
  const [cameras, setCameras] = useState([]);

  const engineRef = useRef(null);
  if (!engineRef.current) engineRef.current = createEngine();

  const settingsRef = useRef(settings);
  const mountedRef = useRef(true);
  const stopRef = useRef(null);

  const publish = useCallback((patch) => {
    if (!mountedRef.current) return;
    setMonitor((previous) => ({ ...previous, ...patch }));
  }, []);

  const refreshCameras = useCallback(async () => {
    const devices = await listCameras();
    setCameras(devices);
    return devices;
  }, []);

  const releaseCamera = useCallback(() => {
    const engine = engineRef.current;
    if (engine.video) {
      try {
        engine.video.pause();
        engine.video.srcObject = null;
      } catch {
        /* ignore */
      }
      engine.video.remove();
      engine.video = null;
    }
    if (engine.stream) {
      stopStream(engine.stream);
      engine.stream = null;
    }
    if (mountedRef.current) setStream(null);
  }, []);

  const stop = useCallback(
    ({ silent = false } = {}) => {
      const engine = engineRef.current;
      const wasRunning = engine.running;
      engine.running = false;
      engine.paused = false;

      if (engine.raf !== null) {
        cancelAnimationFrame(engine.raf);
        engine.raf = null;
      }

      if (engine.calibrator) {
        engine.calibrator.cancel();
        engine.calibrator = null;
      }

      if (engine.session && wasRunning) {
        const record = engine.session.toRecord(Date.now());
        if (record.monitoredMs >= 1500 || record.blinkCount > 0) saveSession(record);
      }

      releaseCamera();
      engine.session = null;
      engine.detector = null;
      engine.rate = null;
      engine.reminder = null;
      engine.demo = null;
      engine.stability = null;
      engine.landmarks = null;
      engine.lastNudge = null;
      engine.processFrame = null;
      engine.detectionErrors = 0;

      if (mountedRef.current) {
        setMonitor(createInitialMonitor());
        if (!silent) notify('Monitoring stopped. Camera released.', { tone: 'info', icon: 'CameraOff' });
      }
    },
    [notify, releaseCamera, saveSession],
  );

  stopRef.current = stop;

  const buildCalibrationPatch = useCallback((engine, now) => {
    if (!engine.calibrator?.active) {
      return { calibration: { active: false, progress: 0, remainingMs: 0, result: null, message: '' } };
    }
    const progress = engine.calibrator.progress(now);
    return {
      calibration: {
        active: true,
        progress,
        remainingMs: Math.max(0, engine.calibrator.durationMs - (now - engine.calibrator.startedAt)),
        result: null,
        message:
          progress < 0.15
            ? 'Look straight at the camera and relax your face.'
            : 'Keep your eyes naturally open — blink freely.',
      },
    };
  }, []);

  const finishCalibration = useCallback(
    (autoStarted) => {
      const engine = engineRef.current;
      const now = Date.now();
      const result = engine.calibrator?.result(now) ?? null;
      engine.calibrator?.cancel();
      engine.calibrator = null;

      if (result) {
        engine.detector?.setBaseline(result.openBaseline);
        engine.lastBaseline = result.openBaseline;
        if (engine.session) {
          engine.session.calibration = {
            openBaseline: result.openBaseline,
            source: 'guided',
            updatedAt: now,
          };
        }
        updateSettings({ calibration: result });
        publish({
          status: engine.mode === 'demo' ? 'demo' : 'running',
          baseline: result.openBaseline,
          calibration: { active: false, progress: 1, remainingMs: 0, result, message: 'Calibration complete' },
        });
        notify(`Calibration saved — open-eye baseline EAR ${result.openBaseline.toFixed(3)}.`, {
          tone: 'success',
          icon: 'Focus',
          duration: 6000,
        });
      } else {
        publish({
          status: engine.mode === 'demo' ? 'demo' : 'running',
          calibration: {
            active: false,
            progress: 0,
            remainingMs: 0,
            result: null,
            message: 'Calibration skipped',
          },
        });
        notify(
          autoStarted
            ? 'Calibration could not get a clear view — continuing with the default baseline.'
            : 'Calibration could not collect enough samples. Please try again with more light.',
          { tone: 'warning', icon: 'Info', duration: 7000 },
        );
      }
    },
    [notify, publish, updateSettings],
  );

  const start = useCallback(
    async ({ mode = 'live' } = {}) => {
      const engine = engineRef.current;
      if (engine.running || engine.starting) return true;
      engine.starting = true;
      const config = settingsRef.current;
      try {

      if (mode === 'live' && !config.monitoringEnabled) {
        publish({
          status: 'error',
          error: {
            code: 'disabled',
            title: 'Monitoring is disabled',
            message: 'Enable monitoring in Settings to use the live camera.',
          },
        });
        return false;
      }

      engine.mode = mode;
      engine.paused = false;
      engine.detectionErrors = 0;
      engine.blinkPulseAt = 0;
      engine.lastNudge = null;
      engine.landmarks = null;
      engine.lastPublishAt = 0;
      engine.lastAutosaveAt = Date.now();
      engine.fpsFrames = 0;
      engine.fpsWindowStart = Date.now();
      engine.fps = 0;

      const now = Date.now();
      engine.rate = new BlinkRateTracker();
      engine.reminder = new BlinkReminderEngine(reminderConfigFor(config.reminderSensitivity));
      engine.session = new SessionTracker(now, {
        mode,
        calibration: mode === 'demo' ? { openBaseline: DEFAULT_EAR_BASELINE, source: 'guided', updatedAt: now } : config.calibration,
      });

      if (mode === 'demo') {
        engine.demo = new DemoSimulator({ now });
        engine.detector = null;
        engine.lastFaceAt = now;
        engine.running = true;
        publish({
          ...createInitialMonitor(),
          status: 'demo',
          mode: 'demo',
          simulated: true,
          modelProgress: 1,
          modelStage: 'Simulated data — no camera in use',
          sessionId: engine.session.id,
          calibration: { active: false, progress: 0, remainingMs: 0, result: null, message: 'Not required in Demo Mode' },
        });
        stopRef.current = stop;
        // Loop is attached below, after processFrame is assigned.
      }

      if (mode === 'live') {
        if (!isCameraSupported()) {
          publish({ status: 'error', error: CAMERA_ERRORS.unsupported });
          notify(CAMERA_ERRORS.unsupported.message, { tone: 'danger', icon: 'CameraOff', duration: 8000 });
          return false;
        }

        publish({ status: 'requesting-camera', modelStage: 'Waiting for camera permission…', error: null });

        let cameraStream;
        try {
          cameraStream = await requestCameraStream({ deviceId: config.cameraId });
          engine.stream = cameraStream;
          if (mountedRef.current) setStream(cameraStream);
        } catch (error) {
          const friendly = normalizeCameraError(error);
          publish({ status: 'error', error: friendly });
          notify(friendly.message, { tone: 'danger', icon: 'CameraOff', duration: 9000 });
          return false;
        }

        try {
          engine.video = await attachStreamToVideo(cameraStream);
        } catch {
          releaseCamera();
          publish({ status: 'error', error: CAMERA_ERRORS.busy });
          notify('The camera started but no video frames arrived.', { tone: 'danger', icon: 'CameraOff' });
          return false;
        }

        refreshCameras();

        publish({ status: 'initializing', modelStage: 'Loading vision runtime…', modelProgress: 0.2 });

        try {
          engine.landmarker = await getFaceLandmarker({
            onProgress: ({ stage }) => {
              publish({
                status: 'initializing',
                modelStage: STAGE_LABELS[stage] ?? 'Preparing AI model…',
                modelProgress: stage === 'runtime' ? 0.25 : stage === 'model' ? 0.6 : 1,
              });
            },
          });
        } catch (error) {
          console.error('[blinksync] FaceLandmarker failed', error);
          releaseCamera();
          publish({
            status: 'error',
            error: {
              code: 'model',
              title: 'AI model could not be loaded',
              message:
                'The MediaPipe face landmark model failed to initialise. Reload the page and try again, or use Demo Mode.',
            },
          });
          notify('The face landmark model failed to load.', { tone: 'danger', icon: 'Info' });
          return false;
        }

        const baseline = config.calibration?.openBaseline ?? DEFAULT_EAR_BASELINE;
        engine.detector = new BlinkDetector({
          sensitivity: config.blinkSensitivity,
          baseline,
        });
        engine.lastBaseline = baseline;
        engine.stability = new FaceStabilityFilter();
        engine.lastFaceAt = now;
        engine.running = true;

        publish({
          ...createInitialMonitor(),
          status: 'running',
          mode: 'live',
          modelProgress: 1,
          modelStage: 'Model ready',
          baseline,
          sessionId: engine.session.id,
          cameraLabel: cameraStream.getVideoTracks?.()[0]?.label ?? '',
        });

        if (!config.calibration) {
          engine.calibrator = new CalibrationCollector({ durationMs: 4000 });
          engine.calibrator.start(Date.now());
          publish({
            status: 'calibrating',
            calibration: {
              active: true,
              progress: 0,
              remainingMs: 4000,
              result: null,
              message: 'Look straight at the camera and relax your face.',
            },
          });
        }
      }

      // --- detection loop -------------------------------------------------
      // Counts frames that were actually analysed, not UI publish ticks.
      const trackAnalysisFrame = (nowMs) => {
        const current = engineRef.current;
        current.fpsFrames += 1;
        if (nowMs - current.fpsWindowStart >= 1000) {
          current.fps = Math.round((current.fpsFrames * 1000) / Math.max(1, nowMs - current.fpsWindowStart));
          current.fpsFrames = 0;
          current.fpsWindowStart = nowMs;
        }
      };

      const publishStats = (nowMs, data) => {
        if (nowMs - engine.lastPublishAt < 300) return;
        engine.lastPublishAt = nowMs;

        const session = engine.session;
        if (!session) return;
        const rate = engine.rate.rate(nowMs, session.monitoredMs);

        if (nowMs - engine.lastAutosaveAt >= 20000) {
          engine.lastAutosaveAt = nowMs;
          const record = session.toRecord(nowMs);
          if (record.monitoredMs >= 5000) saveSession(record);
        }

        publish({
          status: engine.mode === 'demo' ? 'demo' : engine.calibrator?.active ? 'calibrating' : 'running',
          sessionId: session.id,
          facePresent: Boolean(data.facePresent),
          faceStable: Boolean(data.stable),
          ear: data.ear,
          eyes: data.eyes,
          openness: data.ear ? eyeOpenness(data.ear, data.baseline) : null,
          blinkCount: session.blinkCount,
          blinkRate: rate,
          durationMs: nowMs - session.startedAt,
          monitoredMs: session.monitoredMs,
          baseline: data.baseline,
          fps: engine.fps,
          nudge: engine.lastNudge,
          pulseAt: engine.blinkPulseAt,
          simulated: engine.mode === 'demo',
          ...buildCalibrationPatch(engine, nowMs),
        });
      };

      const processLiveFrame = () => {
        const current = engineRef.current;
        const video = current.video;
        const landmarker = current.landmarker;
        if (!video || !landmarker || video.readyState < 2) return;

        const nowMs = Date.now();
        if (current.detectionErrors > 12) {
          stopRef.current?.();
          notify('Face tracking stopped after repeated detection errors.', { tone: 'danger', icon: 'Info' });
          return;
        }

        let result;
        try {
          current.lastVideoTimestamp = Math.max(performance.now(), current.lastVideoTimestamp + 1);
          result = landmarker.detectForVideo(video, current.lastVideoTimestamp);
          current.detectionErrors = 0;
        } catch (error) {
          current.detectionErrors += 1;
          console.warn('[blinksync] Detection frame skipped:', error?.message ?? error);
          return;
        }

        trackAnalysisFrame(nowMs);

        const landmarks = result?.faceLandmarks?.[0] ?? null;
        const aspect =
          video.videoWidth > 0 && video.videoHeight > 0 ? video.videoWidth / video.videoHeight : 1;

        let facePresent = false;
        let stable = false;
        let ear = null;
        let eyes = { left: null, right: null };
        let baseline = current.detector?.baseline ?? DEFAULT_EAR_BASELINE;

        if (landmarks) {
          const measured = measureEyes(landmarks, aspect);
          const scale = faceScale(landmarks, aspect);
          const stability = current.stability.update(scale);
          eyes = { left: measured.left, right: measured.right };
          ear = measured.average;
          facePresent = Number.isFinite(ear);
          stable = facePresent && stability.stable;

          if (facePresent) {
            current.lastFaceAt = nowMs;
            current.landmarks = {
              points: landmarks,
              width: video.videoWidth,
              height: video.videoHeight,
              at: nowMs,
            };
          }
        }

        if (!facePresent && nowMs - current.lastFaceAt > 700) {
          current.landmarks = null;
          current.detector?.markMissed(nowMs);
        }

        if (current.calibrator?.active) {
          if (facePresent) current.calibrator.add(ear, nowMs);
          const elapsed = nowMs - current.calibrator.startedAt;
          if (current.calibrator.isComplete(nowMs)) {
            finishCalibration(true);
          } else if (elapsed > current.calibrator.durationMs + 5000) {
            finishCalibration(true);
          }
        } else if (facePresent && stable && current.detector) {
          const detection = current.detector.feed(ear, nowMs);
          if (detection.event === DETECTOR_EVENTS.BLINK) {
            current.rate.add(nowMs);
            current.session.recordBlink(nowMs);
            current.blinkPulseAt = nowMs;
          } else if (detection.event === DETECTOR_EVENTS.PROLONGED) {
            current.lastNudge = {
              message: 'Your eyes stayed closed for a while — blink softly and take a breath.',
              at: nowMs,
              kind: 'rest',
            };
          }
        }

        const rateNow = current.rate.rate(nowMs, current.session.monitoredMs);
        current.session.tick(nowMs, { facePresent, blinkRate: rateNow });

        const nudge = current.reminder.evaluate({
          now: nowMs,
          rate: rateNow,
          facePresent,
          enabled: settingsRef.current.blinkReminders && !current.calibrator?.active,
          sessionStartedAt: current.session.startedAt,
          observedMs: current.session.monitoredMs,
        });
        if (nudge) {
          current.lastNudge = { ...nudge, kind: 'blink' };
          notify(nudge.message, { tone: 'break', icon: 'Eye', duration: 6000 });
          if (settingsRef.current.reminderSound) {
            playChime({ volume: settingsRef.current.soundVolume, kind: 'reminder' });
          }
        }

        publishStats(nowMs, { facePresent, stable, ear, eyes, baseline });
      };

      const processDemoFrame = () => {
        const current = engineRef.current;
        const nowMs = Date.now();
        trackAnalysisFrame(nowMs);
        const simulation = current.demo.advance(nowMs);

        if (simulation.blink) {
          current.rate.add(nowMs);
          current.session.recordBlink(nowMs);
          current.blinkPulseAt = nowMs;
        }

        const rateNow = current.rate.rate(nowMs, current.session.monitoredMs);
        current.session.tick(nowMs, { facePresent: simulation.facePresent, blinkRate: rateNow });

        publishStats(nowMs, {
          facePresent: simulation.facePresent,
          stable: simulation.facePresent,
          ear: simulation.ear,
          eyes: { left: simulation.ear, right: simulation.ear },
          baseline: DEFAULT_EAR_BASELINE,
        });
      };

      engine.processFrame = mode === 'demo' ? processDemoFrame : processLiveFrame;
      engine.running = true;

      if (engine.raf === null) {
        const step = () => {
          const current = engineRef.current;
          if (!current.running) {
            current.raf = null;
            return;
          }
          current.raf = requestAnimationFrame(step);
          if (current.paused) return;
          const now = performance.now();
          if (now - current.lastDetectionAt < current.frameIntervalMs) return;
          current.lastDetectionAt = now;
          current.processFrame?.();
        };
        engine.raf = requestAnimationFrame(step);
      }

      return true;
      } finally {
        engineRef.current.starting = false;
      }
    },
    [
      buildCalibrationPatch,
      finishCalibration,
      notify,
      publish,
      refreshCameras,
      releaseCamera,
      saveSession,
    ],
  );

  const pause = useCallback(() => {
    const engine = engineRef.current;
    if (!engine.running || engine.paused) return;
    engine.paused = true;
    if (engine.session) {
      const record = engine.session.toRecord(Date.now());
      if (record.monitoredMs >= 3000) saveSession(record);
    }
    publish({ status: 'paused', paused: true });
    notify('Monitoring paused. The camera preview stays on.', { tone: 'info', icon: 'Pause' });
  }, [notify, publish, saveSession]);

  const resume = useCallback(() => {
    const engine = engineRef.current;
    if (!engine.running || !engine.paused) return;
    engine.paused = false;
    engine.lastPublishAt = 0;
    engine.lastFaceAt = Date.now();
    engine.lastDetectionAt = 0;
    engine.stability?.reset();
    engine.detector?.reset();
    publish({ status: engine.mode === 'demo' ? 'demo' : 'running', paused: false });
  }, [publish]);

  const startCalibration = useCallback(() => {
    const engine = engineRef.current;
    if (!engine.running || engine.mode !== 'live' || engine.calibrator) return false;
    engine.calibrator = new CalibrationCollector({ durationMs: 4000 });
    engine.calibrator.start(Date.now());
    publish({
      status: 'calibrating',
      calibration: {
        active: true,
        progress: 0,
        remainingMs: 4000,
        result: null,
        message: 'Look straight at the camera and relax your face.',
      },
    });
    return true;
  }, [publish]);

  const cancelCalibration = useCallback(() => {
    const engine = engineRef.current;
    if (!engine.calibrator) return;
    engine.calibrator.cancel();
    engine.calibrator = null;
    publish({
      status: engine.mode === 'demo' ? 'demo' : 'running',
      calibration: { active: false, progress: 0, remainingMs: 0, result: null, message: 'Calibration skipped' },
    });
    notify('Calibration skipped — using the current baseline.', { tone: 'info', icon: 'Info' });
  }, [notify, publish]);

  const getLandmarks = useCallback(() => engineRef.current.landmarks, []);

  useEffect(() => {
    settingsRef.current = settings;
    const engine = engineRef.current;
    engine.frameIntervalMs = 1000 / Math.max(5, Math.min(30, settings.targetFps));
    if (engine.reminder) {
      engine.reminder.configure(reminderConfigFor(settings.reminderSensitivity));
    }
    if (engine.detector) {
      engine.detector.setSensitivity(settings.blinkSensitivity);
      const baseline = settings.calibration?.openBaseline ?? DEFAULT_EAR_BASELINE;
      if (engine.lastBaseline !== baseline) {
        engine.detector.setBaseline(baseline);
        engine.lastBaseline = baseline;
      }
    }
  }, [settings]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopRef.current?.({ silent: true });
    };
  }, []);

  useEffect(() => {
    const handlePageHide = () => {
      const engine = engineRef.current;
      if (engine.running) stopRef.current?.({ silent: true });
    };
    window.addEventListener('pagehide', handlePageHide);
    return () => window.removeEventListener('pagehide', handlePageHide);
  }, []);

  const value = useMemo(
    () => ({
      ...monitor,
      stream,
      cameras,
      cameraSupported: isCameraSupported(),
      start,
      stop,
      pause,
      resume,
      startCalibration,
      cancelCalibration,
      refreshCameras,
      getLandmarks,
      isActive: ['running', 'demo', 'calibrating', 'paused', 'initializing', 'requesting-camera'].includes(
        monitor.status,
      ),
      isMonitoring: monitor.status === 'running' || monitor.status === 'demo' || monitor.status === 'calibrating',
    }),
    [
      monitor,
      stream,
      cameras,
      start,
      stop,
      pause,
      resume,
      startCalibration,
      cancelCalibration,
      refreshCameras,
      getLandmarks,
    ],
  );

  return <MonitorContext.Provider value={value}>{children}</MonitorContext.Provider>;
}

export function useMonitor() {
  const context = useContext(MonitorContext);
  if (!context) throw new Error('useMonitor must be used inside <MonitorProvider>');
  return context;
}
