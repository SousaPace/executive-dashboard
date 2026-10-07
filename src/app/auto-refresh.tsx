"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Wall screens stay open for days: check every minute whether a new Excel was uploaded and
 * re-render with it (no full reload, the carousel keeps running). Also refreshes once an hour so
 * the mock date and "Corte" never go stale.
 */
export function AutoRefresh({ version }: { version: string | null }) {
  const router = useRouter();
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        const { version: latest } = (await res.json()) as {
          version: string | null;
        };
        if (latest !== version) router.refresh();
      } catch {
        // Network hiccup: try again next minute.
      }
    };
    const poll = setInterval(check, 60_000);
    const hourly = setInterval(() => router.refresh(), 3_600_000);
    return () => {
      clearInterval(poll);
      clearInterval(hourly);
    };
  }, [version, router]);
  return null;
}
