let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;
let lastPlayedAt = 0;
let audioUnlocked = false;
let unlockRegistered = false;

const MASTER_VOLUME = 0.92;

type BrowserWindowWithWebkitAudio = Window & {
  webkitAudioContext?: typeof AudioContext;
};

function getAudioContext(): AudioContext | null {
  const browserWindow = window as BrowserWindowWithWebkitAudio;
  const AudioContextCtor = window.AudioContext ?? browserWindow.webkitAudioContext;
  if (!AudioContextCtor) return null;
  audioContext = audioContext ?? new AudioContextCtor();
  if (!masterGain) {
    masterGain = audioContext.createGain();
    masterGain.gain.setValueAtTime(MASTER_VOLUME, audioContext.currentTime);
    masterGain.connect(audioContext.destination);
  }
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

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  oscillator.connect(gain);
  gain.connect(masterGain ?? context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.01);
  audioUnlocked = true;
}

export function playIncomingChatSound(): void {
  const now = Date.now();
  if (now - lastPlayedAt < 650) return;
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

  // High-intensity new visitor alert: bright double-ping with bell harmonics.
  // Designed to cut through laptop speakers without becoming painfully clipped.
  playTone(context, start, 988, 0.18, 0.28, "square");
  playTone(context, start, 1976, 0.13, 0.08, "sine");
  playTone(context, start + 0.16, 1318.51, 0.2, 0.31, "triangle");
  playTone(context, start + 0.16, 2637.02, 0.14, 0.075, "sine");

  playNoiseClick(context, start, 0.045, 0.055);
  playNoiseClick(context, start + 0.16, 0.045, 0.052);

  playTone(context, start + 0.37, 880, 0.15, 0.2, "square");
  playTone(context, start + 0.37, 1760, 0.1, 0.055, "sine");
  playTone(context, start + 0.5, 1174.66, 0.24, 0.24, "triangle");
  playTone(context, start + 0.5, 2349.32, 0.16, 0.065, "sine");
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
  oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.982, start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(Math.max(gainValue * 0.38, 0.0001), start + duration * 0.42);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(masterGain ?? context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.04);
}

function playNoiseClick(context: AudioContext, start: number, duration: number, gainValue: number): void {
  const sampleRate = context.sampleRate;
  const frameCount = Math.floor(sampleRate * duration);
  const buffer = context.createBuffer(1, frameCount, sampleRate);
  const channelData = buffer.getChannelData(0);
  for (let index = 0; index < frameCount; index += 1) {
    channelData[index] = (Math.random() * 2 - 1) * (1 - index / frameCount);
  }

  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  filter.type = "highpass";
  filter.frequency.setValueAtTime(1800, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.buffer = buffer;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain ?? context.destination);
  source.start(start);
  source.stop(start + duration + 0.02);
}
