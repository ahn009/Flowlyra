let audioContext: AudioContext | null = null;
let lastPlayedAt = 0;

function getAudioContext(): AudioContext | null {
  const AudioContextCtor = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextCtor) return null;
  audioContext = audioContext ?? new AudioContextCtor();
  return audioContext;
}

export function playIncomingChatSound(): void {
  const now = Date.now();
  if (now - lastPlayedAt < 900) return;
  lastPlayedAt = now;

  const context = getAudioContext();
  if (!context) return;
  if (context.state === "suspended") void context.resume();

  const start = context.currentTime;
  playTone(context, start, 880, 0.08, 0.055);
  playTone(context, start + 0.105, 1174.66, 0.1, 0.06);
}

function playTone(context: AudioContext, start: number, frequency: number, duration: number, gainValue: number): void {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
