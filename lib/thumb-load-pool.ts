/**
 * Caps how many asset-card thumbnails decode/fetch at once so a folder of
 * images cannot freeze scrolling by saturating the network and main thread.
 */

const MAX_PARALLEL = 4;

let inflight = 0;
const waiters: Array<() => void> = [];

export function acquireThumbSlot(): Promise<() => void> {
  return new Promise((resolve) => {
    const grant = () => {
      inflight += 1;
      let released = false;
      resolve(() => {
        if (released) return;
        released = true;
        inflight = Math.max(0, inflight - 1);
        const next = waiters.shift();
        if (next) next();
      });
    };
    if (inflight < MAX_PARALLEL) grant();
    else waiters.push(grant);
  });
}
