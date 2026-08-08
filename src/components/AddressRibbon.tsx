import { useMemo } from "react";
import { hex } from "../format";

const BUCKETS = 240;
const TICKS = 9;

export interface RibbonMark {
  offset: number;
  kind: "alert" | "selected";
}

/**
 * The signature element.
 *
 * An offset in a forensics tool is not an abstract number — it is a place. This
 * strip is the whole physical address space of the image, left to right, with a
 * density plot of every object the session has recovered so far. When a row is
 * selected its offset is marked here, so "where in the image did this come
 * from" is answered without the analyst doing hex arithmetic in their head.
 *
 * Density is on a log scale: pool allocations cluster hard, and a linear scale
 * would render everything outside the clusters as nothing at all.
 */
export function AddressRibbon({
  maxAddress,
  offsets,
  marks,
}: {
  maxAddress: number;
  offsets: number[];
  marks: RibbonMark[];
}) {
  const buckets = useMemo(() => {
    const counts = new Array<number>(BUCKETS).fill(0);
    for (const off of offsets) {
      const i = Math.min(BUCKETS - 1, Math.floor((off / maxAddress) * BUCKETS));
      if (i >= 0) counts[i] = (counts[i] ?? 0) + 1;
    }
    const peak = Math.max(...counts, 1);
    return counts.map((c) => (c === 0 ? 0 : Math.log1p(c) / Math.log1p(peak)));
  }, [offsets, maxAddress]);

  const ticks = useMemo(
    () => Array.from({ length: TICKS }, (_, i) => Math.round((maxAddress * i) / (TICKS - 1))),
    [maxAddress],
  );

  return (
    <div className="ribbon" role="img" aria-label="Physical address space density">
      <div className="ribbon-plot">
        {buckets.map((h, i) => (
          <div
            key={i}
            className="ribbon-bucket"
            style={{ height: h === 0 ? 1 : `${Math.max(8, h * 100)}%` }}
          />
        ))}

        <div className="ribbon-overlay">
          {marks.map((m, i) => (
            <div
              key={`${m.kind}-${m.offset}-${i}`}
              className={m.kind === "selected" ? "ribbon-mark ribbon-mark-selected" : "ribbon-mark"}
              style={{ left: `${(m.offset / maxAddress) * 100}%` }}
            />
          ))}
        </div>
      </div>

      <div className="ribbon-scale">
        {ticks.map((t, i) => (
          <span key={i}>{hex(t)}</span>
        ))}
      </div>

      <div className="ribbon-legend">
        <span>Address space</span>
      </div>
    </div>
  );
}
