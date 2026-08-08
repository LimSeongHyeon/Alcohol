import { useState, type ReactNode } from "react";
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

      <div className="tbody" ref={setScrollEl} tabIndex={0}>
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
