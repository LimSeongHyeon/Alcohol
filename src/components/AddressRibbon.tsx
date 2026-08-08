import { useMemo } from "react";
import { hex } from "../format";
import type { Verdict } from "../types";

const TICKS = 9;

export interface RibbonMark {
  offset: number;
  verdict: Verdict;
  label: string;
}

/**
 * The signature element: a minimap of the open result set laid over the
 * physical address space.
 *
 * An offset in a forensics tool is not an abstract number, it is a place. Every
 * mark here is a row in the active table, positioned where it actually lives in
 * the image, so "where did this come from" is answered without hex arithmetic.
 *
 * An earlier version binned all known offsets into a density histogram. It
 * looked like a barcode and said nothing — log scaling flattened every bucket
 * to the same height, and the marks that mattered were lost in the grey. One
 * mark per row is less ink and far more information: the unlinked process
 * sitting alone at 0x11f000000, far from every other allocation, is visible
 * immediately.
 */
export function AddressRibbon({
  maxAddress,
  marks,
  selected,
  caption,
}: {
  maxAddress: number;
  marks: RibbonMark[];
  selected: number | null;
  caption: string;
}) {
  const ticks = useMemo(
    () => Array.from({ length: TICKS }, (_, i) => Math.round((maxAddress * i) / (TICKS - 1))),
    [maxAddress],
  );

  // Alerts paint last so they are never covered by a neighbouring plain mark.
  const ordered = useMemo(
    () => [...marks].sort((a, b) => Number(a.verdict === "alert") - Number(b.verdict === "alert")),
    [marks],
  );

  return (
    <div className="ribbon">
      <div className="ribbon-track" role="img" aria-label={`${marks.length} results across the physical address space`}>
        <div className="ribbon-baseline" />
        {ordered.map((m, i) => (
          <div
            key={`${m.offset}-${i}`}
            className={`ribbon-mark ribbon-mark-${m.verdict}`}
            style={{ left: `${(m.offset / maxAddress) * 100}%` }}
            title={`${m.label} · ${hex(m.offset)}`}
          />
        ))}
        {/* No offset label here — it would collide with the marks, and the same
            value is already on the selected row and in the inspector header. */}
        {selected !== null && (
          <div
            className="ribbon-cursor"
            style={{ left: `${(selected / maxAddress) * 100}%` }}
            title={hex(selected)}
          />
        )}
      </div>

      <div className="ribbon-scale">
        {ticks.map((t, i) => (
          <span key={i}>{hex(t)}</span>
        ))}
      </div>

      <span className="ribbon-caption">{caption}</span>
    </div>
  );
}
