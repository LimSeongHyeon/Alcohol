import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { HIGHLIGHTS, type HighlightId } from "../highlights";

export interface MenuAction {
  kind: "action";
  label: string;
  hint?: string;
  onSelect: () => void;
  disabled?: boolean;
}

export interface MenuSeparator {
  kind: "separator";
}

export interface MenuHighlights {
  kind: "highlights";
  active: HighlightId | null;
  onPick: (id: HighlightId | null) => void;
}

export type MenuItem = MenuAction | MenuSeparator | MenuHighlights;

export interface MenuState {
  x: number;
  y: number;
  title: string;
  items: MenuItem[];
}

export function ContextMenu({ state, onClose }: { state: MenuState | null; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  // Flip against the viewport edges before the first paint, so the menu never
  // appears off-screen and then jumps.
  useLayoutEffect(() => {
    if (!state || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setPos({
      x: state.x + r.width > window.innerWidth - 8 ? Math.max(8, state.x - r.width) : state.x,
      y: state.y + r.height > window.innerHeight - 8 ? Math.max(8, state.y - r.height) : state.y,
    });
  }, [state]);

  useEffect(() => {
    if (!state) return;
    const close = () => onClose();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [state, onClose]);

  if (!state) return null;

  return (
    <div
      className="menu"
      ref={ref}
      role="menu"
      style={{ left: pos.x, top: pos.y }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="menu-title">{state.title}</div>
      {state.items.map((item, i) => {
        if (item.kind === "separator") return <div className="menu-sep" key={i} />;
        if (item.kind === "highlights") {
          return (
            <div className="menu-swatches" key={i}>
              {HIGHLIGHTS.map((h) => (
                <button
                  key={h.id}
                  className={`swatch${item.active === h.id ? " swatch-on" : ""}`}
                  style={{ background: `var(${h.solidVar})` }}
                  title={h.label}
                  aria-label={`Highlight ${h.label}`}
                  onClick={() => {
                    item.onPick(item.active === h.id ? null : h.id);
                    onClose();
                  }}
                />
              ))}
              <button
                className="swatch swatch-clear"
                title="Clear highlight"
                aria-label="Clear highlight"
                onClick={() => {
                  item.onPick(null);
                  onClose();
                }}
              />
            </div>
          );
        }
        return (
          <button
            key={i}
            className="menu-item"
            role="menuitem"
            disabled={item.disabled ?? false}
            onClick={() => {
              item.onSelect();
              onClose();
            }}
          >
            <span>{item.label}</span>
            {item.hint && <span className="menu-hint">{item.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}
