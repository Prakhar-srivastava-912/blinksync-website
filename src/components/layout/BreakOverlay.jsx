import { useApp } from '../../context/AppContext.jsx';
import { formatClock, formatDuration } from '../../lib/format.js';
import Icon from '../ui/Icon.jsx';
import ProgressRing from '../ui/ProgressRing.jsx';
import Button from '../ui/Button.jsx';

export default function BreakOverlay() {
  const {
    breakPrompt,
    breakStatus,
    settings,
    startBreak,
    snoozeBreak,
    skipBreak,
    endBreakEarly,
  } = useApp();

  if (!breakPrompt) return null;

  const running = breakStatus.phase === 'break';
  const secondsLeft = Math.ceil(breakStatus.breakRemainingMs / 1000);
  const totalSeconds = Math.max(1, settings.breakDurationSec);
  const progress = running ? 1 - breakStatus.breakRemainingMs / (totalSeconds * 1000) : 0;

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal break-modal" role="dialog" aria-modal="true" aria-labelledby="break-modal-title">
        <div className="break-modal-glow" aria-hidden="true" />

        {running ? (
          <>
            <p className="eyebrow">20-20-20 break</p>
            <h2 id="break-modal-title" className="modal-title break-modal-title">
              Look about 20 feet away
            </h2>
            <p className="modal-description">
              Let your eyes focus on something distant and blink softly. The countdown finishes on its own.
            </p>

            <ProgressRing
              progress={progress}
              size={210}
              stroke={12}
              label={`${secondsLeft} seconds of break remaining`}
              trackClassName="break-ring"
            >
              <span className="ring-seconds">{formatClock(secondsLeft)}</span>
              <span className="ring-caption">relax your focus</span>
            </ProgressRing>

            <div className="break-tips">
              <span>
                <Icon name="Eye" size={15} /> Soft, slow blinks
              </span>
              <span>
                <Icon name="Wind" size={15} /> Drop your shoulders
              </span>
              <span>
                <Icon name="Sun" size={15} /> Let your eyes refocus far away
              </span>
            </div>

            <div className="modal-footer modal-footer-center">
              <Button variant="ghost" onClick={endBreakEarly}>
                End break early
              </Button>
            </div>
          </>
        ) : (
          <>
            <span className="break-icon">
              <Icon name="Coffee" size={26} />
            </span>
            <p className="eyebrow">Screen time reached {settings.breakIntervalMin} min</p>
            <h2 id="break-modal-title" className="modal-title break-modal-title">
              Time to rest your eyes
            </h2>
            <p className="modal-description">
              Look roughly 20 feet (about 6 metres) away for {totalSeconds} seconds. Blinking fully a few times helps
              too. Next break in about {formatDuration(breakStatus.snoozeMs)} if you postpone.
            </p>

            <div className="break-options">
              <Button icon="Play" onClick={startBreak} data-autofocus>
                Start {totalSeconds}-second break
              </Button>
              <Button icon="Clock" variant="secondary" onClick={snoozeBreak}>
                Remind me in {settings.snoozeMin} min
              </Button>
            </div>
            <button type="button" className="link-button" onClick={skipBreak}>
              Skip this break
            </button>
          </>
        )}
      </div>
    </div>
  );
}
