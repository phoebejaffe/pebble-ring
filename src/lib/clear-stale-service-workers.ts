/** Pebble Ring does not register a service worker; stale ones break Google sign-in. */
export async function clearStaleServiceWorkers(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  if (registrations.length === 0) return;

  await Promise.all(registrations.map((registration) => registration.unregister()));
}
