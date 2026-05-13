const SOUND_FILES = {
  move: "/sounds/move.mp3",
  capture: "/sounds/capture.mp3",
  check: "/sounds/check.mp3",
  castle: "/sounds/castle.mp3",
  gameEnd: "/sounds/game-end.mp3",
} as const;

export type ChessSoundKind = keyof typeof SOUND_FILES;

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) {
    return null;
  }
  if (!audioCtx) {
    audioCtx = new Ctx();
  }
  return audioCtx;
}

const bufferCache = new Map<string, AudioBuffer | "missing">();

async function loadBuffer(ctx: AudioContext, url: string): Promise<AudioBuffer | null> {
  const hit = bufferCache.get(url);
  if (hit === "missing") {
    return null;
  }
  if (hit) {
    return hit;
  }
  try {
    const res = await fetch(url);
    if (!res.ok) {
      bufferCache.set(url, "missing");
      return null;
    }
    const arr = await res.arrayBuffer();
    const buf = await ctx.decodeAudioData(arr.slice(0));
    bufferCache.set(url, buf);
    return buf;
  } catch {
    bufferCache.set(url, "missing");
    return null;
  }
}

function playBeep(ctx: AudioContext, freq: number, duration: number, gain: number): void {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  g.gain.value = gain;
  osc.connect(g);
  g.connect(ctx.destination);
  const t = ctx.currentTime;
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

export async function playChessSound(kind: ChessSoundKind, enabled: boolean): Promise<void> {
  if (!enabled || typeof window === "undefined") {
    return;
  }
  const ctx = getCtx();
  if (!ctx) {
    return;
  }
  if (ctx.state === "suspended") {
    await ctx.resume().catch(() => undefined);
  }
  const url = SOUND_FILES[kind];
  const buf = await loadBuffer(ctx, url);
  if (buf) {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start();
    return;
  }
  const fallback: Record<ChessSoundKind, () => void> = {
    move: () => playBeep(ctx, 440, 0.08, 0.04),
    capture: () => playBeep(ctx, 220, 0.1, 0.06),
    check: () => playBeep(ctx, 880, 0.12, 0.05),
    castle: () => {
      playBeep(ctx, 330, 0.06, 0.04);
      playBeep(ctx, 495, 0.08, 0.04);
    },
    gameEnd: () => playBeep(ctx, 196, 0.35, 0.05),
  };
  fallback[kind]();
}
