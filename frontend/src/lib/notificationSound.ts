let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;
let lastPlayedAt = 0;
let audioUnlocked = false;
let unlockRegistered = false;

const MASTER_VOLUME = 1.0;

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

  // Ascending 3-note bell chime: C5 → E5 → G5
  playTone(context, start,        523.25, 0.40, 0.50, "sine");
  playTone(context, start,        1046.5, 0.28, 0.14, "sine");
  playNoiseClick(context, start,  0.03, 0.045);

  playTone(context, start + 0.15, 659.25, 0.38, 0.48, "sine");
  playTone(context, start + 0.15, 1318.5, 0.26, 0.12, "sine");
  playNoiseClick(context, start + 0.15, 0.03, 0.04);

  playTone(context, start + 0.30, 783.99, 0.44, 0.55, "sine");
  playTone(context, start + 0.30, 1567.98, 0.30, 0.15, "sine");
  playNoiseClick(context, start + 0.30, 0.03, 0.05);
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
