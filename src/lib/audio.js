let audioContext = null;

function getContext() {
  if (typeof window === 'undefined') return null;
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return null;
  if (!audioContext) {
    try {
      audioContext = new AudioCtor();
    } catch {
      return null;
    }
  }
  return audioContext;
}

/** Call from a user gesture so the browser allows later reminder sounds. */
export async function unlockAudio() {
  const context = getContext();
  if (!context) return false;
  try {
    if (context.state === 'suspended') await context.resume();
    return context.state === 'running';
  } catch {
    return false;
  }
}

/**
 * Short, gentle two- or three-note chime generated with the Web Audio API.
 * No audio files are bundled and nothing is loaded from the network.
 */
export function playChime({ volume = 0.6, kind = 'reminder' } = {}) {
  const context = getContext();
  if (!context) return false;

  try {
    if (context.state === 'suspended') context.resume();
    const start = context.currentTime + 0.02;
    const notes = kind === 'break' ? [523.25, 659.25, 783.99] : [659.25, 987.77];
    const peak = Math.min(0.24, Math.max(0.01, volume * 0.22));

    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      const noteStart = start + index * 0.16;
      gain.gain.setValueAtTime(0, noteStart);
      gain.gain.linearRampToValueAtTime(peak, noteStart + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.5);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(noteStart);
      oscillator.stop(noteStart + 0.55);
    });
    return true;
  } catch {
    return false;
  }
}
