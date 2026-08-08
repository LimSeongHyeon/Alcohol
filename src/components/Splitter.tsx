import { useCallback, useEffect, useRef } from "react";

const MIN = 96;
const MAX_FRACTION = 0.75;

/** Shared by the initial mount and the double-click reset, so "reset" returns
 *  to the same size on a laptop as it does on a workstation. A hardcoded
 *  constant made the reset *grow* the panel at 720p. */
export const defaultInspectorHeight = () =>
  Math.round(Math.max(MIN, Math.min(272, window.innerHeight * 0.24)));

/**
 * Horizontal splitter between the results table and the inspector.
 *
 * A process with fifteen findings and a 900-character command line does not fit
 * a fixed panel, and a fixed panel is also the wrong default when the analyst
 * is scanning rows and wants the table. Keyboard resizing is included because
 * the whole table is already keyboard-drivable and a mouse-only splitter would
 * be the one thing that is not.
 */
export function Splitter({ height, onResize }: { height: number; onResize: (next: number) => void }) {
  const dragging = useRef(false);
  const latest = useRef(onResize);
  latest.current = onResize;

  const clamp = (v: number) => Math.max(MIN, Math.min(window.innerHeight * MAX_FRACTION, v));

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!dragging.current) return;
      e.preventDefault();
      // The inspector is anchored to the bottom, so its height is whatever is
      // left below the pointer.
      latest.current(clamp(window.innerHeight - e.clientY));
    };
    const up = () => {
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const step = e.shiftKey ? 48 : 12;
      if (e.key === "ArrowUp") onResize(clamp(height + step));
      else if (e.key === "ArrowDown") onResize(clamp(height - step));
      else return;
      e.preventDefault();
    },
    [height, onResize],
  );

  return (
    <div
      className="splitter"
      role="separator"
      aria-orientation="horizontal"
      aria-label="Resize inspector"
      aria-valuenow={Math.round(height)}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onDoubleClick={() => onResize(defaultInspectorHeight())}
      onPointerDown={(e) => {
        e.preventDefault();
        dragging.current = true;
        document.body.style.cursor = "row-resize";
        document.body.style.userSelect = "none";
      }}
    >
      <span className="splitter-grip" />
    </div>
  );
}
