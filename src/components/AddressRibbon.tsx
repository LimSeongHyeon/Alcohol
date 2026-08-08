import { useMemo } from "react";
import { hex } from "../format";
import type { Verdict } from "../types";

const TICKS = 9;
const GRIDLINES = [0.25, 0.5, 0.75];

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
 * looked like a barcode and said nothing. Log scaling flattened every bucket
 * to the same height, and the marks that mattered were lost in the grey. One
 * mark per row is less ink and far more information: the unlinked process
 * sitting alone at 0x11f000000, far from every other allocation, is visible
 * immediately.
 *
 * It is also the piece of the interface people will remember, so it is given
 * the room to look like an instrument: a measured field with gridlines, a
 * baseline with real ticks, and a second scale in gibibytes because that is the
 * unit analysts actually hold in their heads.
 */
export function AddressRibbon({
  maxAddress,
  marks,
  context,
  selected,
  caption,
}: {
  maxAddress: number;
  marks: RibbonMark[];
  /**
   * Every offset the session has recovered, from any plugin. Drawn faintly
   * behind the active result so the bright marks are read against where memory
   * structures actually live, instead of against nothing. Without it the field
   * is mostly empty air: sixteen connections cluster into three pixels and the
   * instrument looks broken rather than sparse.
   */
  context: number[];
  selected: number | null;
  caption: string;
}) {
  const ticks = useMemo(
    () =>
      Array.from({ length: TICKS }, (_, i) => {
        const value = Math.round((maxAddress * i) / (TICKS - 1));
        return { value, pct: (i / (TICKS - 1)) * 100, gib: value / 1024 ** 3 };
      }),
    [maxAddress],
  );

  // Alerts paint last so they are never covered by a neighbouring plain mark.
  const ordered = useMemo(
    () => [...marks].sort((a, b) => Number(a.verdict === "alert") - Number(b.verdict === "alert")),
    [marks],
  );

  const cursorPct = selected === null ? null : (selected / maxAddress) * 100;

  return (
    <div className="ribbon">
      <div className="ribbon-head">
        <span className="ribbon-title">Physical address space</span>
        <span className="ribbon-caption">{caption}</span>
      </div>

      <div className="ribbon-track" role="img" aria-label={`${marks.length} results across the physical address space`}>
        {GRIDLINES.map((g) => (
          <div key={g} className="ribbon-grid" style={{ bottom: `${g * 100}%` }} />
        ))}

        {context.map((offset, i) => (
          <div key={`c${i}`} className="ribbon-context" style={{ left: `${(offset / maxAddress) * 100}%` }} />
        ))}

        {ordered.map((m, i) => (
          <div
            key={`${m.offset}-${i}`}
            className={`ribbon-mark ribbon-mark-${m.verdict}`}
            style={{ left: `${(m.offset / maxAddress) * 100}%` }}
            title={`${m.label} · ${hex(m.offset)}`}
          />
        ))}

        {cursorPct !== null && <div className="ribbon-cursor" style={{ left: `${cursorPct}%` }} />}
      </div>

      <div className="ribbon-axis">
        <div className="ribbon-baseline" />
        {ticks.map((t) => (
          <div key={t.value} className="ribbon-tick" style={{ left: `${t.pct}%` }} />
        ))}

        <div className="ribbon-scale">
          {ticks.map((t, i) => (
            <span className="ribbon-scaleitem" key={t.value}>
              <span className="ribbon-hex">{hex(t.value)}</span>
              <span className="ribbon-gib">{i === 0 ? "0" : `${t.gib.toFixed(t.gib % 1 === 0 ? 0 : 1)} GiB`}</span>
            </span>
          ))}
        </div>

        {/* The readout sits in the scale row rather than the field: at the top
            it collided with the marks it is meant to be pointing at. */}
        {cursorPct !== null && selected !== null && (
          <span
            className={`ribbon-readout${cursorPct > 82 ? " ribbon-readout-flip" : ""}`}
            style={{ left: `${cursorPct}%` }}
          >
            {hex(selected)}
          </span>
        )}
      </div>
    </div>
  );
}
