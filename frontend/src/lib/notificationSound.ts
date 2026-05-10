let audioContext: AudioContext | null = null;
let lastPlayedAt = 0;
let audioUnlocked = false;
let unlockRegistered = false;

type BrowserWindowWithWebkitAudio = Window & {
  webkitAudioContext?: typeof AudioContext;
};

function getAudioContext(): AudioContext | null {
  const browserWindow = window as BrowserWindowWithWebkitAudio;
  const AudioContextCtor = window.AudioContext ?? browserWindow.webkitAudioContext;
  if (!AudioContextCtor) return null;
  audioContext = audioContext ?? new AudioContextCtor();
  return audioContext;
}

/**
 * Browsers block autoplay audio until the user interacts with the page.
 * Call this once from the app shell so the agent hears future chat alerts.
 */
export function registerNotificationSoundUnlock(): void {
  if (typeof window === "undefined" || unlockRegistered) return;
  unlockRegistered = true;

  const unlock = (): void => {
    void unlockNotificationSound();
  };

  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("keydown", unlock);
  window.addEventListener("touchstart", unlock, { passive: true });
}

export async function unlockNotificationSound(): Promise<void> {
  const context = getAudioContext();
  if (!context || audioUnlocked) return;

  if (context.state === "suspended") {
    try {
      await context.resume();
    } catch {
      return;
    }
  }

  // Silent unlock pulse, required by some browsers to allow later scheduled tones.
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.01);
  audioUnlocked = true;
}

export function playIncomingChatSound(): void {
  const now = Date.now();
  if (now - lastPlayedAt < 750) return;
  lastPlayedAt = now;

  void playIncomingChatSoundAsync();
}

async function playIncomingChatSoundAsync(): Promise<void> {
  const context = getAudioContext();
  if (!context) return;

  if (context.state === "suspended") {
    try {
      await context.resume();
    } catch {
      return;
    }
  }

  const start = context.currentTime + 0.015;

  // A bright LiveChat-style new visitor chime: quick ascending triad with a soft bell tail.
  playTone(context, start, 659.25, 0.12, 0.085, "sine");
  playTone(context, start + 0.105, 880, 0.13, 0.095, "triangle");
  playTone(context, start + 0.225, 1174.66, 0.18, 0.08, "sine");
  playTone(context, start + 0.24, 1760, 0.12, 0.026, "sine");
}

function playTone(
  context: AudioContext,
  start: number,
  frequency: number,
  duration: number,
  gainValue: number,
  oscillatorType: OscillatorType
): void {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = oscillatorType;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.985, start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.04);
}
