import { afterEach, describe, expect, it, vi } from "vitest";
import { clearStaleServiceWorkers } from "./clear-stale-service-workers";

describe("clearStaleServiceWorkers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("unregisters existing service workers", async () => {
    const unregister = vi.fn().mockResolvedValue(true);
    const getRegistrations = vi.fn().mockResolvedValue([{ unregister }, { unregister }]);

    vi.stubGlobal("navigator", { serviceWorker: { getRegistrations } });

    await clearStaleServiceWorkers();

    expect(getRegistrations).toHaveBeenCalledOnce();
    expect(unregister).toHaveBeenCalledTimes(2);
  });

  it("no-ops when service workers are unavailable", async () => {
    vi.stubGlobal("navigator", {});

    await expect(clearStaleServiceWorkers()).resolves.toBeUndefined();
  });
});
