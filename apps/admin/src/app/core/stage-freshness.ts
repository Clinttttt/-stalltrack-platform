import { DestroyRef } from '@angular/core';

/** Refresh operator queues after external stage changes without introducing a realtime transport. */
export function installStageFreshness(
  destroyRef: DestroyRef,
  refresh: () => Promise<void>,
  intervalMs = 60_000,
): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  let running = false;
  const run = (): void => {
    if (running) return;
    running = true;
    void refresh().finally(() => { running = false; });
  };
  const onVisible = (): void => {
    if (document.visibilityState === 'visible') run();
  };

  window.addEventListener('focus', run);
  document.addEventListener('visibilitychange', onVisible);
  const timer = window.setInterval(run, intervalMs);

  destroyRef.onDestroy(() => {
    window.removeEventListener('focus', run);
    document.removeEventListener('visibilitychange', onVisible);
    window.clearInterval(timer);
  });
}
