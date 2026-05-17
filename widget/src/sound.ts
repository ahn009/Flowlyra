/** Lightweight beep using WebAudio + persisted mute pref. */

const PREF_KEY = "cf_sound_muted";

let audioContext: AudioContext | null = null;

function ensureContext(): AudioContext | null {
  if (audioContext) return audioContext;
  const Ctx = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  audioContext = new Ctx();
  return audioContext;
}

export function isMuted(): boolean {
  try {
    return localStorage.getItem(PREF_KEY) === "1";
  } catch {
    return false;
  }
}

export function setMuted(value: boolean): void {
  try {
    localStorage.setItem(PREF_KEY, value ? "1" : "0");
  } catch {
    // ignore quota errors
  }
}

export function play(frequency = 660, duration = 0.18): void {
  if (isMuted()) return;
  const ctx = ensureContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.02);
  } catch {
    // ignore audio failures
  }
}
