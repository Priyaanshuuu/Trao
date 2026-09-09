"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function KitStatusPoller() {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "paused" | "timeout">("checking");

  useEffect(() => {
    const startedAt = Date.now();
    const maxPollingMs = 5 * 60 * 1_000;
    let timeoutId: number | undefined;

    const clearScheduledCheck = () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };

    const scheduleCheck = () => {
      clearScheduledCheck();
      const elapsed = Date.now() - startedAt;
      if (elapsed >= maxPollingMs) {
        setState("timeout");
        return;
      }

      const delay = elapsed < 30_000 ? 3_000 : elapsed < 120_000 ? 10_000 : 20_000;
      timeoutId = window.setTimeout(() => {
        if (document.visibilityState === "visible") {
          router.refresh();
          setState("checking");
        }
        scheduleCheck();
      }, delay);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        clearScheduledCheck();
        setState("paused");
      } else {
        setState("checking");
        scheduleCheck();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    scheduleCheck();
    return () => {
      clearScheduledCheck();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [router]);

  if (state === "timeout") return <p className="mt-8 text-sm text-[var(--muted)]">Generation is taking longer than expected. Refresh this page to check again.</p>;
  if (state === "paused") return <p className="mt-8 text-sm text-[var(--muted)]">Status checks are paused while this tab is inactive.</p>;
  return <p className="mt-8 text-sm text-[var(--muted)]">Checking for updates automatically.</p>;
}