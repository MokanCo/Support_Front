/**
 * Short notification tone for incoming chat (Web Audio API — no asset files).
 * Respects browser autoplay: may stay silent until the user has interacted with the page.
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
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(740, t0);
    osc.frequency.exponentialRampToValueAtTime(520, t0 + 0.1);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.11, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
    osc.start(t0);
    osc.stop(t0 + 0.2);
  } catch {
    /* autoplay / privacy mode */
  }
}
