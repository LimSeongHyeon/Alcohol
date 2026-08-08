import type { ProcessRow } from "../types";
import { clock, decodePowerShellEnc, hex } from "../format";

const PIVOTS = ["cmdline", "dlllist", "handles", "malfind", "vadinfo", "privileges", "netscan"];

/** Reference metadata, set on one line. It matters, but never as much as the
 *  command line or the findings, so it is the part that yields vertical space. */
function Meta({ items }: { items: [string, string][] }) {
  return (
    <div className="inspector-meta">
      {items.map(([label, value], i) => (
        <span className="inspector-metaitem" key={label}>
          {i > 0 && <span className="inspector-metasep">·</span>}
          <span className="inspector-metalabel">{label}</span>
          <span className="inspector-metavalue">{value}</span>
        </span>
      ))}
    </div>
  );
}

export function Inspector({
  row,
  onPivot,
}: {
  row: ProcessRow | null;
  onPivot: (plugin: string, pid: number) => void;
}) {
  if (!row) {
    return (
      <div className="inspector-empty">
        Select a row to inspect it. Plugins that accept a PID can be launched from the selection.
      </div>
    );
  }

  const decoded = row.cmdline ? decodePowerShellEnc(row.cmdline) : null;

  return (
    <section className="inspector" aria-label={`Details for ${row.name}`}>
      <div className="inspector-main">
        <div className="inspector-head">
          <h2 className="inspector-title">{row.name}</h2>
          <span className="inspector-pid">
            pid {row.pid} · ppid {row.ppid} · {hex(row.offset)}
          </span>
        </div>

        <span className="eyebrow">Command line</span>
        <div className="inspector-cmd">{row.cmdline ?? "-"}</div>

        {decoded && (
          <div className="inspector-decoded">
            <span className="eyebrow">Decoded</span>
            <div className="inspector-decodedtext">{decoded}</div>
          </div>
        )}

        <div className="pivot-row">
          {PIVOTS.map((p) => (
            <button key={p} className="pivot" onClick={() => onPivot(p, row.pid)}>
              {p} --pid {row.pid}
            </button>
          ))}
        </div>

        {/* Reference detail sits last. On a short screen the inspector scrolls,
            and what must survive above the fold is the evidence, the command
            line and whatever it decodes to, not the thread count. */}
        <Meta
          items={[
            ["threads", String(row.threads)],
            ["handles", row.handles === null ? "-" : String(row.handles)],
            ["session", row.sessionId === null ? "-" : String(row.sessionId)],
            ["started", clock(row.createTime)],
            ["exited", row.exitTime ? clock(row.exitTime) : "-"],
            ["wow64", row.wow64 ? "yes" : "no"],
            ["list walk", row.listWalkVisible ? "present" : "absent"],
            ["pool scan", row.poolScanVisible ? "present" : "absent"],
          ]}
        />
      </div>

      <aside className="inspector-side">
        <span className="eyebrow">
          Findings {row.findings.length > 0 ? `(${row.findings.length})` : ""}
        </span>
        {row.findings.length === 0 ? (
          <p className="finding-detail" style={{ marginTop: 8 }}>
            Nothing flagged. Absence of a finding is not evidence of absence. It means no check that ran had
            an opinion about this row.
          </p>
        ) : (
          row.findings.map((f, i) => (
            <div className="finding" key={i}>
              <div className="finding-head">
                <span className={`tag tag-${f.verdict}`}>{f.verdict}</span>
                <span className="finding-label">{f.label}</span>
              </div>
              <p className="finding-detail">{f.detail}</p>
            </div>
          ))
        )}
      </aside>
    </section>
  );
}
