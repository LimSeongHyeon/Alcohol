import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Verdict } from "../types";

export interface Column<T> {
  key: string;
  header: string;
  /** Fixed pixel width. 0 means "take the remaining space". */
  width: number;
  align?: "right";
  render: (row: T) => ReactNode;
}

const ROW_H = 24;

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  selectedKey,
  onSelect,
  verdictOf,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  selectedKey: string | null;
  onSelect: (row: T) => void;
  verdictOf: (row: T) => Verdict;
}) {
  // Held in state, not a ref: the virtualizer only measures the viewport once it
  // has the element, and a ref assignment does not trigger the re-render that
  // makes it look again.
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollEl,
    estimateSize: () => ROW_H,
    overscan: 16,
  });

  const style = (c: Column<T>) => (c.width === 0 ? { flex: 1, minWidth: 0 } : { width: c.width });

  const selectedIndex = selectedKey === null ? -1 : rows.findIndex((r) => rowKey(r) === selectedKey);

  // Key events can arrive faster than React re-renders, and several will then
  // share one render's `selectedIndex` — hold an arrow key and the extra
  // presses vanish. The anchor advances synchronously so each event moves from
  // where the last one landed, and resyncs whenever selection changes elsewhere.
  const anchor = useRef(selectedIndex);
  useEffect(() => {
    anchor.current = selectedIndex;
  }, [selectedIndex]);

  // A selection that exists but sits below the fold reads as no selection at
  // all. Reveal it once, when the table first has somewhere to scroll.
  const revealed = useRef(false);
  useEffect(() => {
    if (revealed.current || !scrollEl || selectedIndex < 0) return;
    revealed.current = true;
    virtualizer.scrollToIndex(selectedIndex, { align: "center" });
  }, [scrollEl, selectedIndex, virtualizer]);

  /** Analysts drive dense tables from the keyboard. Arrow keys move the
   *  selection and keep it in view; the mouse is the fallback, not the path. */
  function onKeyDown(e: KeyboardEvent) {
    const page = Math.max(1, Math.floor((scrollEl?.clientHeight ?? ROW_H * 10) / ROW_H) - 1);
    const step =
      e.key === "ArrowDown" ? 1
      : e.key === "ArrowUp" ? -1
      : e.key === "PageDown" ? page
      : e.key === "PageUp" ? -page
      : 0;

    let next: number | null = null;
    if (step !== 0) next = Math.min(rows.length - 1, Math.max(0, (anchor.current < 0 ? 0 : anchor.current) + step));
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = rows.length - 1;

    if (next === null || rows.length === 0) return;
    e.preventDefault();
    const row = rows[next];
    if (!row) return;
    anchor.current = next;
    onSelect(row);
    virtualizer.scrollToIndex(next, { align: "auto" });
  }

  return (
    <div className="table">
      <div className="thead" role="row">
        <div className="verdict" aria-hidden />
        {columns.map((c) => (
          <div key={c.key} className={`th${c.align === "right" ? " th-right" : ""}`} style={style(c)} role="columnheader">
            {c.header}
          </div>
        ))}
      </div>

      <div
        className="tbody"
        ref={setScrollEl}
        tabIndex={0}
        role="grid"
        aria-rowcount={rows.length}
        onKeyDown={onKeyDown}
      >
        <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
          {virtualizer.getVirtualItems().map((v) => {
            const row = rows[v.index];
            if (!row) return null;
            const key = rowKey(row);
            const verdict = verdictOf(row);
            return (
              <div
                key={key}
                className={`tr${selectedKey === key ? " tr-selected" : ""}`}
                style={{ transform: `translateY(${v.start}px)` }}
                onClick={() => onSelect(row)}
                role="row"
                aria-rowindex={v.index + 1}
                aria-selected={selectedKey === key}
              >
                <span className={`verdict verdict-${verdict}`} aria-label={verdict === "clean" ? undefined : verdict} />
                {columns.map((c) => (
                  <div key={c.key} className={`td${c.align === "right" ? " td-right" : ""}`} style={style(c)} role="cell">
                    {c.render(row)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
