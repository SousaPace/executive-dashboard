"use client";

import {
  Children,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";

/**
 * Rotates the dashboard views. Auto-advances every `intervalMs` (progress under the active tab);
 * pauses on hover, on keyboard focus inside, or with the pause button (WCAG 2.2.2).
 * ← / → change view. Every slide stays mounted so charts keep their size and state.
 */
export function Carousel({
  views,
  intervalMs = 20_000,
  children,
}: {
  views: { title: string; subtitle: string }[];
  intervalMs?: number;
  children: ReactNode;
}) {
  const slides = Children.toArray(children);
  const count = slides.length;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const [cycle, setCycle] = useState(0);

  const go = useCallback(
    (i: number) => {
      setActive(((i % count) + count) % count);
      setCycle((c) => c + 1); // restart the timer and the progress bar
    },
    [count],
  );

  const running = !paused && !hovering && !focused && count > 1;

  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => go(active + 1), intervalMs);
    return () => clearTimeout(t);
  }, [running, active, cycle, intervalMs, go]);

  const square =
    "grid w-13 shrink-0 place-items-center rounded-xl border border-line bg-panel text-xl font-bold text-ink hover:bg-panel-2";

  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-4"
      onFocus={(e) => {
        // Keyboard focus only: a mouse click on a tab should not stop the rotation.
        if ((e.target as HTMLElement).matches(":focus-visible"))
          setFocused(true);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
      }}
      onPointerEnter={() => setHovering(true)}
      onPointerLeave={() => setHovering(false)}
      onKeyDown={(e) => {
        if (e.defaultPrevented) return;
        if (e.key === "ArrowRight") go(active + 1);
        if (e.key === "ArrowLeft") go(active - 1);
      }}
    >
      <div className="flex gap-3">
        <div
          role="tablist"
          aria-label="Vistas del dashboard"
          className="grid flex-1 grid-cols-3 gap-3"
        >
          {views.map((v, i) => {
            const on = i === active;
            return (
              <button
                key={v.title}
                role="tab"
                id={`tab-${i}`}
                aria-selected={on}
                aria-controls={`slide-${i}`}
                onClick={() => go(i)}
                className={`relative overflow-hidden rounded-xl border px-4 py-3 text-left transition-colors ${
                  on
                    ? "border-accent bg-panel-2 ring-2 ring-accent/40"
                    : "border-line bg-panel hover:bg-panel-2"
                }`}
              >
                <div
                  className={`text-lg font-bold ${on ? "text-accent" : "text-ink"}`}
                >
                  {v.title}
                </div>
                <div className="truncate text-sm text-ink-2">{v.subtitle}</div>
                {on && (
                  <span
                    className="absolute inset-x-0 bottom-0 h-1 bg-bg/60"
                    aria-hidden
                  >
                    <span
                      key={cycle}
                      className="block h-full bg-accent"
                      style={{
                        animation: `tab-progress ${intervalMs}ms linear forwards`,
                        animationPlayState: running ? "running" : "paused",
                      }}
                    />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => go(active - 1)}
          aria-label="Vista anterior"
          className={square}
        >
          ‹
        </button>
        <button
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? "Reanudar rotación" : "Pausar rotación"}
          aria-pressed={paused}
          className={square}
        >
          <svg width="14" height="16" viewBox="0 0 14 16" aria-hidden>
            {paused ? (
              <path d="M1 1 L13 8 L1 15 Z" fill="currentColor" />
            ) : (
              <>
                <rect
                  x="1"
                  y="1"
                  width="4"
                  height="14"
                  rx="1"
                  fill="currentColor"
                />
                <rect
                  x="9"
                  y="1"
                  width="4"
                  height="14"
                  rx="1"
                  fill="currentColor"
                />
              </>
            )}
          </svg>
        </button>
        <button
          onClick={() => go(active + 1)}
          aria-label="Vista siguiente"
          className={square}
        >
          ›
        </button>
      </div>

      {/* The clip box is 4px wider on every side and each slide pads 4px back in, so card
          borders at any edge are never cut and the neighbour slide never peeks in. */}
      <div className="-m-1 min-h-0 flex-1 overflow-hidden">
        <div
          className="flex h-full transition-transform duration-500 ease-out motion-reduce:transition-none"
          style={{ transform: `translateX(-${active * 100}%)` }}
        >
          {slides.map((s, i) => (
            <div
              key={views[i]?.title ?? i}
              id={`slide-${i}`}
              role="tabpanel"
              aria-labelledby={`tab-${i}`}
              inert={i !== active}
              className="h-full w-full shrink-0 p-1"
            >
              {s}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
