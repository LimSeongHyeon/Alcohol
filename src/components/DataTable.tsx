import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Verdict } from "../types";
import { highlightFill, type HighlightMap } from "../highlights";
import { selectionFromClick, selectionFromKeys, singleSelection, type Selection } from "../selection";

export interface Column<T> {
  key: string;
  header: string;
  /** Fixed pixel width. 0 means "take the remaining space". */
  width: number;
  align?: "right";
  render: (row: T) => ReactNode;
  /** Plain text for copy-to-clipboard and filter-by-value. */
  text?: (row: T) => string;
}

/** Must match --row-h in tokens.css. */
const ROW_H = 28;

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  selection,
  onSelectionChange,
  onPrimaryRow,
  verdictOf,
  highlights,
  onRowContextMenu,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  selection: Selection;
  onSelectionChange: (next: Selection) => void;
  /** Fires whenever the focused row changes, so the inspector can follow it. */
  onPrimaryRow: (row: T) => void;
  verdictOf: (row: T) => Verdict;
  highlights: HighlightMap;
  /** `targetKeys` is what the menu should act on: the whole selection when the
   *  clicked row is part of it, otherwise just that row. Passed explicitly
   *  because collapsing the selection is a state update the caller cannot see
   *  yet when it builds the menu. */
  onRowContextMenu: (row: T, column: Column<T> | null, event: MouseEvent, targetKeys: string[]) => void;
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

  const orderedKeys = useMemo(() => rows.map(rowKey), [rows, rowKey]);
  const primaryIndex = selection.primary === null ? -1 : orderedKeys.indexOf(selection.primary);

  // Key events can arrive faster than React re-renders, and several will then
  // share one render's index: hold an arrow key and the extra presses vanish.
  // The anchor advances synchronously so each event moves from where the last
  // one landed, and resyncs whenever selection changes elsewhere.
  const cursor = useRef(primaryIndex);
  useEffect(() => {
    cursor.current = primaryIndex;
  }, [primaryIndex]);

  // A selection that exists but sits below the fold reads as no selection at
  // all. Reveal it once, when the table first has somewhere to scroll.
  const revealed = useRef(false);
  useEffect(() => {
    if (revealed.current || !scrollEl || primaryIndex < 0) return;
    revealed.current = true;
    virtualizer.scrollToIndex(primaryIndex, { align: "center" });
  }, [scrollEl, primaryIndex, virtualizer]);

  function commit(next: Selection, index: number) {
    cursor.current = index;
    onSelectionChange(next);
    const row = rows[index];
    if (row) onPrimaryRow(row);
  }

  function onRowClick(row: T, index: number, e: MouseEvent) {
    commit(
      selectionFromClick(selection, orderedKeys, rowKey(row), {
        shift: e.shiftKey,
        additive: e.ctrlKey || e.metaKey,
      }),
      index,
    );
  }

  /** Analysts drive dense tables from the keyboard. Arrows move, Shift extends,
   *  Ctrl+A takes everything, Escape collapses back to one row. */
  function onKeyDown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
      e.preventDefault();
      onSelectionChange({ keys: new Set(orderedKeys), primary: selection.primary, anchor: selection.anchor });
      return;
    }
    if (e.key === "Escape" && selection.primary) {
      e.preventDefault();
      onSelectionChange(singleSelection(selection.primary));
      return;
    }

    const page = Math.max(1, Math.floor((scrollEl?.clientHeight ?? ROW_H * 10) / ROW_H) - 1);
    const step =
      e.key === "ArrowDown" ? 1
      : e.key === "ArrowUp" ? -1
      : e.key === "PageDown" ? page
      : e.key === "PageUp" ? -page
      : 0;

    let next: number | null = null;
    if (step !== 0) next = Math.min(rows.length - 1, Math.max(0, (cursor.current < 0 ? 0 : cursor.current) + step));
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = rows.length - 1;

    if (next === null || rows.length === 0) return;
    e.preventDefault();
    const key = orderedKeys[next];
    if (key === undefined) return;
    commit(selectionFromKeys(selection, orderedKeys, key, e.shiftKey), next);
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
        aria-multiselectable
        aria-rowcount={rows.length}
        onKeyDown={onKeyDown}
      >
        <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
          {virtualizer.getVirtualItems().map((v) => {
            const row = rows[v.index];
            if (!row) return null;
            const key = rowKey(row);
            const verdict = verdictOf(row);
            const fill = highlightFill(highlights[key]);
            const isSelected = selection.keys.has(key);
            const isPrimary = selection.primary === key;
            const cls =
              "tr" + (isSelected ? " tr-selected" : "") + (isPrimary ? " tr-primary" : "") + (fill ? " tr-highlighted" : "");
            return (
              <div
                key={key}
                className={cls}
                style={fill ? { transform: `translateY(${v.start}px)`, background: fill } : { transform: `translateY(${v.start}px)` }}
                onClick={(e) => onRowClick(row, v.index, e)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  // Right-clicking outside the selection collapses to that row;
                  // inside it, the whole selection is the target.
                  if (!isSelected) commit(singleSelection(key), v.index);
                  const cell = (e.target as HTMLElement).closest<HTMLElement>("[data-col]");
                  const col = columns.find((c) => c.key === cell?.dataset["col"]) ?? null;
                  onRowContextMenu(row, col, e, isSelected ? [...selection.keys] : [key]);
                }}
                role="row"
                aria-rowindex={v.index + 1}
                aria-selected={isSelected}
              >
                <span className={`verdict verdict-${verdict}`} aria-label={verdict === "clean" ? undefined : verdict} />
                {columns.map((c) => (
                  <div
                    key={c.key}
                    data-col={c.key}
                    className={`td${c.align === "right" ? " td-right" : ""}`}
                    style={style(c)}
                    role="cell"
                  >
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
