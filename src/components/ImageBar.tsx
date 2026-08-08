import type { ImageInfo } from "../types";
import { bytes } from "../format";

function Fact({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div className="fact" title={title ?? value}>
      <span className="eyebrow">{label}</span>
      <span className="fact-value">{value}</span>
    </div>
  );
}

/**
 * Image identity, always on screen.
 *
 * Everything below this bar is an assertion about one specific file. If an
 * analyst cannot see which image, which build and which hash without leaving
 * the workspace, every screenshot they paste into a report is ambiguous.
 */
export function ImageBar({
  image,
  caseName,
  dirty,
  onSave,
  onClose,
}: {
  image: ImageInfo;
  caseName: string;
  dirty: boolean;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <header className="imagebar">
      <div className="imagebar-mark">
        <span className="imagebar-wordmark">ALCOHOL</span>
      </div>

      <div className="imagebar-file">
        <span className="imagebar-name">{image.fileName}</span>
        <span className="imagebar-path" title={image.fullPath}>
          {image.fullPath}
        </span>
      </div>

      {/* Five facts, not nine. Eight of them squeezed the file name out of the
          bar entirely at 1280px, which is the one thing here that must never
          disappear. DTB, kernel base and processor count are internals. They
          live in the windows.info result, a click away. What stays is what
          identifies the evidence. */}
      <div className="imagebar-facts">
        <Fact label="Profile" value={`${image.os} ${image.build}`} />
        <Fact label="Arch" value={image.arch} />
        <Fact label="Size" value={bytes(image.sizeBytes)} />
        <Fact label="Captured" value={image.systemTime.replace(" UTC", "")} />
        <Fact label="SHA-256" value={`${image.sha256.slice(0, 10)}…`} title={image.sha256} />
      </div>

      <div className="imagebar-case">
        <span className="case-chip" title="Open case file">
          <span className={dirty ? "case-dot case-dot-dirty" : "case-dot"} />
          {caseName}
        </span>
        <button className="btn btn-small" onClick={onSave} disabled={!dirty}>
          {dirty ? "Save case" : "Saved"}
        </button>
        <button className="btn btn-small" onClick={onClose}>
          Close
        </button>
      </div>
    </header>
  );
}
