/**
 * Short notification chime for incoming chat (Web Audio API — no asset files).
 * Two-tone pattern reads clearly on laptop speakers; respects browser autoplay policy.
 */
export function playIncomingMessageSound(): void {
  if (typeof window === "undefined") return;
  try {
    const AnyWindow = window as unknown as {
      AudioContext: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const Ctx = AnyWindow.AudioContext ?? AnyWindow.webkitAudioContext;
    if (!Ctx) return;

    type GlobalCtx = { __msgToneCtx?: AudioContext };
    const g = window as unknown as GlobalCtx;
    if (!g.__msgToneCtx) g.__msgToneCtx = new Ctx();
    const ctx = g.__msgToneCtx;
    if (ctx.state === "suspended") void ctx.resume();

    const t0 = ctx.currentTime;
    const out = ctx.destination;

    function note(
      start: number,
      freqHz: number,
      durationSec: number,
      peakLinear: number
    ): void {
      const osc = ctx.createOscillator();
      const gn = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freqHz, start);
      osc.connect(gn);
      gn.connect(out);
      const end = start + durationSec;
      gn.gain.setValueAtTime(0.0001, start);
      gn.gain.exponentialRampToValueAtTime(peakLinear, start + 0.022);
      gn.gain.setValueAtTime(peakLinear * 0.72, start + durationSec * 0.35);
      gn.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.start(start);
      osc.stop(end + 0.025);
    }

    // Brighter “ding” then slightly lower “dong” — louder than the old single sine sweep.
    note(t0, 1050, 0.11, 0.4);
    note(t0 + 0.095, 784, 0.14, 0.36);
  } catch {
    /* autoplay / privacy mode */
  }
}
