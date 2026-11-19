import { useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { useMonitor } from '../../context/MonitorContext.jsx';
import { Link } from '../../lib/router.jsx';
import Icon from '../ui/Icon.jsx';
import Button from '../ui/Button.jsx';
import { LiveDot } from '../ui/Badge.jsx';
import LandmarkOverlay from './LandmarkOverlay.jsx';

const ACTIVE_STATUSES = ['running', 'demo', 'paused', 'calibrating'];

export default function CameraStage() {
  const { settings, updateSettings } = useApp();
  const {
    stream,
    status,
    error,
    facePresent,
    faceStable,
    modelStage,
    modelProgress,
    cameraSupported,
    start,
    stop,
    pause,
    resume,
    calibration,
    cancelCalibration,
    getLandmarks,
    fps,
    simulated,
    pulseAt,
    paused,
    ear,
    blinkRate,
  } = useMonitor();
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (stream) {
      if (video.srcObject !== stream) video.srcObject = stream;
      video.play().catch(() => {});
    } else if (video.srcObject) {
      video.srcObject = null;
    }
  }, [stream]);

  const active = ACTIVE_STATUSES.includes(status);
  const showVideo = Boolean(stream);
  const showLandmarks = settings.showLandmarks && showVideo && !simulated;

  return (
    <div className={`camera-stage status-${status}`}>
      <video
        ref={videoRef}
        className={`camera-video${showVideo ? ' is-visible' : ''}`}
        muted
        playsInline
        autoPlay
        aria-label="Live camera preview used for on-device blink detection"
      />

      {showVideo ? <div className="camera-vignette" aria-hidden="true" /> : null}
      {showLandmarks ? <LandmarkOverlay getLandmarks={getLandmarks} /> : null}

      {pulseAt > 0 && active && !paused ? <span className="blink-flash" key={pulseAt} aria-hidden="true" /> : null}

      <div className="camera-hud camera-hud-top">
        {active ? (
          <LiveDot tone={simulated ? 'demo' : paused ? 'neutral' : 'success'} label={simulated ? 'DEMO' : paused ? 'PAUSED' : 'LIVE'} />
        ) : (
          <span className="hud-chip">
            <Icon name="CameraOff" size={14} /> Camera off
          </span>
        )}

        {active && cameraSupported ? (
          <span className="hud-chip">
            <Icon name="Gauge" size={14} /> {fps} fps
          </span>
        ) : null}
      </div>

      {active && showVideo ? (
        <div className="camera-hud camera-hud-bottom">
          <span className={`face-chip ${facePresent ? 'is-present' : 'is-missing'}`}>
            <Icon name={facePresent ? 'ScanFace' : 'EyeOff'} size={15} />
            {facePresent ? (faceStable ? 'Face locked' : 'Face detected') : 'No face detected'}
          </span>
          <button
            type="button"
            className="hud-toggle"
            onClick={() => updateSettings({ showLandmarks: !settings.showLandmarks })}
            aria-pressed={settings.showLandmarks}
          >
            <Icon name="SlidersHorizontal" size={14} /> Landmarks {settings.showLandmarks ? 'on' : 'off'}
          </button>
        </div>
      ) : null}

      {simulated && active ? (
        <div className="demo-stage-visual">
          <span className="demo-orbit demo-orbit-a" aria-hidden="true" />
          <span className="demo-orbit demo-orbit-b" aria-hidden="true" />
          <svg className="demo-eye-svg" viewBox="0 0 240 120" aria-hidden="true">
            <path
              d="M12 60c24-34 58-50 108-50s84 16 108 50c-24 34-58 50-108 50S36 94 12 60Z"
              fill="rgba(34, 211, 238, 0.06)"
              stroke="rgba(34, 211, 238, 0.7)"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            <circle cx="120" cy="60" r="27" fill="url(#demo-stage-iris)" />
            <circle cx="120" cy="60" r="11" fill="#04101f" />
            <circle cx="129" cy="50" r="5.5" fill="#eafaff" opacity="0.9" />
            <defs>
              <radialGradient id="demo-stage-iris">
                <stop offset="0%" stopColor="#67e8f9" />
                <stop offset="70%" stopColor="#0e8fa2" />
                <stop offset="100%" stopColor="#0b4a5c" />
              </radialGradient>
            </defs>
          </svg>
          <div className="demo-stage-readout">
            <span className="hud-chip">
              <Icon name="Sparkles" size={14} /> Simulated — no camera in use
            </span>
            <span className="hud-chip">EAR {ear ? ear.toFixed(3) : '—'}</span>
            <span className="hud-chip">{(blinkRate || 0).toFixed(1)}/min</span>
          </div>
        </div>
      ) : null}

      {!showVideo && !active && !error ? (
        <div className="camera-placeholder">
          <span className="camera-placeholder-icon">
            <Icon name="ScanFace" size={40} />
          </span>
          <h3>Camera is off</h3>
          <p>
            {cameraSupported
              ? 'Start monitoring to grant camera access. Nothing is recorded or uploaded.'
              : 'This browser does not expose camera access. Demo Mode works everywhere.'}
          </p>
          <div className="camera-placeholder-actions">
            <Button icon="Camera" onClick={() => start({ mode: 'live' })} disabled={!cameraSupported}>
              Start monitoring
            </Button>
            <Button variant="secondary" icon="Sparkles" onClick={() => start({ mode: 'demo' })}>
              Demo mode
            </Button>
          </div>
        </div>
      ) : null}

      {(status === 'requesting-camera' || status === 'initializing') && !showVideo ? (
        <div className="camera-processing">
          <span className="spinner" aria-hidden="true" />
          <p>{status === 'requesting-camera' ? 'Waiting for camera permission…' : modelStage}</p>
          <div className="progress-bar" aria-hidden="true">
            <span style={{ width: `${Math.round((modelProgress || 0.05) * 100)}%` }} />
          </div>
          <small>All processing happens on this device.</small>
        </div>
      ) : null}

      {status === 'initializing' && showVideo ? (
        <div className="camera-processing camera-processing-overlay">
          <span className="spinner" aria-hidden="true" />
          <p>{modelStage || 'Preparing AI model…'}</p>
          <div className="progress-bar" aria-hidden="true">
            <span style={{ width: `${Math.round((modelProgress || 0.05) * 100)}%` }} />
          </div>
        </div>
      ) : null}

      {calibration.active ? (
        <div className="calibration-layer">
          <div className="calibration-card">
            <p className="eyebrow">Calibration</p>
            <h3>{facePresent ? 'Hold a relaxed, open-eyed gaze' : 'Position your face in the frame'}</h3>
            <p>{calibration.message}</p>
            <div className="progress-bar" aria-hidden="true">
              <span style={{ width: `${Math.round(calibration.progress * 100)}%` }} />
            </div>
            <div className="calibration-footer">
              <span>{Math.ceil(calibration.remainingMs / 1000)}s remaining</span>
              <button type="button" className="link-button" onClick={cancelCalibration}>
                Skip calibration
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {active && !calibration.active && !facePresent ? (
        <div className="face-missing-banner" role="status">
          <Icon name="EyeOff" size={16} />
          <span>Face not detected — blink measurements are paused. Face the camera in even light.</span>
        </div>
      ) : null}

      {error ? (
        <div className="camera-error" role="alert">
          <span className="camera-error-icon">
            <Icon name="CameraOff" size={24} />
          </span>
          <h3>{error.title}</h3>
          <p>{error.message}</p>
          <div className="camera-error-actions">
            <Button icon="RotateCcw" onClick={() => start({ mode: 'live' })} disabled={!cameraSupported}>
              Try again
            </Button>
            <Button variant="secondary" icon="Sparkles" onClick={() => start({ mode: 'demo' })}>
              Use demo mode
            </Button>
            <Link to="/settings" className="btn btn-ghost">
              <Icon name="Settings" size={16} />
              <span>Settings</span>
            </Link>
          </div>
        </div>
      ) : null}

    </div>
  );
}
