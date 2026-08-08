import { useState } from "react";
import { bytes } from "../format";

export interface RecentCase {
  caseFile: string;
  imageName: string;
  imagePath: string;
  sizeBytes: number;
  profile: string;
  openedAt: string;
  pluginRuns: number;
  alerts: number;
  imageMissing: boolean;
}

/**
 * The entry screen. Deliberately not called "upload".
 *
 * A memory image is evidence: eight gigabytes that must not be copied, moved,
 * or altered. The tool records a path and a hash and reads in place. That rules
 * out the browser's file input, which hands over bytes and hides the path —
 * Tauri's native dialog returns the path, and this screen is built for that.
 * In the browser demo the two buttons below are theatre.
 */
export function OpenImage({
  recents,
  onOpenImage,
  onOpenCase,
}: {
  recents: RecentCase[];
  onOpenImage: () => void;
  onOpenCase: (c: RecentCase) => void;
}) {
  const [dragging, setDragging] = useState(false);

  return (
    <div className="open">
      <div className="open-inner">
        <header className="open-head">
          <span className="open-wordmark">ALCOHOL</span>
          <p className="open-tagline">Memory forensics for Volatility 3</p>
        </header>

        <div
          className={`open-drop${dragging ? " open-drop-active" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            onOpenImage();
          }}
        >
          <p className="open-dropline">Drop a memory image here</p>
          <p className="open-dropnote">
            raw · lime · dmp · vmem · core · E01 — read in place, never copied
          </p>
          <div className="open-actions">
            <button className="btn btn-primary" onClick={onOpenImage}>
              Open image…
            </button>
            <button className="btn" onClick={onOpenImage}>
              Open case (.alcohol)…
            </button>
          </div>
        </div>

        <section className="open-recents">
          <span className="eyebrow">Recent cases</span>
          <ul className="open-list">
            {recents.map((c) => (
              <li key={c.caseFile}>
                <button className="open-row" onClick={() => onOpenCase(c)} disabled={c.imageMissing}>
                  <span className="open-rowmain">
                    <span className="open-rowname">{c.imageName}</span>
                    <span className="open-rowpath">{c.imagePath}</span>
                  </span>
                  <span className="open-rowfacts">
                    <span>{c.profile}</span>
                    <span>{bytes(c.sizeBytes)}</span>
                    <span>{c.pluginRuns} plugins cached</span>
                    {c.alerts > 0 && <span className="open-rowalerts">{c.alerts} flagged</span>}
                    <span className="open-rowwhen">{c.openedAt}</span>
                  </span>
                  {c.imageMissing && <span className="tag tag-notice">image not found</span>}
                </button>
              </li>
            ))}
          </ul>
          <p className="open-note">
            A case stores results, highlights and notes — not the image. Reopening one skips the
            plugins that have already run.
          </p>
        </section>
      </div>
    </div>
  );
}
