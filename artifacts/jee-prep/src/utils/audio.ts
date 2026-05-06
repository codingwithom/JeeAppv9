let audioCtx: AudioContext | null = null;
let _volume = 0.7;

export function setBeepVolume(v: number) {
  _volume = Math.max(0, Math.min(1, v));
}

export function getBeepVolume(): number {
  return _volume;
}

function getCtx(): AudioContext {
  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function beep(freq: number, startTime: number, duration: number, gain = 0.4) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.connect(g);
  g.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, startTime);
  const scaledGain = gain * _volume;
  g.gain.setValueAtTime(0, startTime);
  g.gain.linearRampToValueAtTime(scaledGain, startTime + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

export function playTimerDone() {
  try {
    if (_volume === 0) return;
    const ctx = getCtx();
    const t = ctx.currentTime;
    beep(880, t, 0.18);
    beep(880, t + 0.22, 0.18);
    beep(1100, t + 0.44, 0.35, 0.5);
  } catch {}
}

export function playAlarmRing() {
  try {
    if (_volume === 0) return;
    const ctx = getCtx();
    const t = ctx.currentTime;
    for (let i = 0; i < 5; i++) {
      beep(960, t + i * 0.28, 0.18);
      beep(760, t + i * 0.28 + 0.12, 0.1, 0.3);
    }
  } catch {}
}
