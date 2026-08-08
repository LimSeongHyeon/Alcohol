import type { ProcessRow } from "../types";
import { clock, decodePowerShellEnc, hex } from "../format";

const PIVOTS = ["cmdline", "dlllist", "handles", "malfind", "vadinfo", "privileges", "netscan"];

function Field({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="fact">
      <span className="eyebrow">{label}</span>
      <span className={mono ? "fact-value" : "fact-value"}>{value}</span>
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

        <div className="inspector-grid">
          <Field label="Threads" value={String(row.threads)} />
          <Field label="Handles" value={row.handles === null ? "—" : String(row.handles)} />
          <Field label="Session" value={row.sessionId === null ? "—" : String(row.sessionId)} />
          <Field label="Started" value={clock(row.createTime)} />
          <Field label="Exited" value={row.exitTime ? clock(row.exitTime) : "—"} />
          <Field label="Wow64" value={row.wow64 ? "yes" : "no"} />
          <Field label="List walk" value={row.listWalkVisible ? "present" : "absent"} />
          <Field label="Pool scan" value={row.poolScanVisible ? "present" : "absent"} />
        </div>

        <span className="eyebrow">Command line</span>
        <div className="inspector-cmd">{row.cmdline ?? "—"}</div>

        {decoded && (
          <div className="inspector-decoded">
            <span className="eyebrow">Decoded</span>
            <div>{decoded}</div>
          </div>
        )}

        <div className="pivot-row">
          {PIVOTS.map((p) => (
            <button key={p} className="pivot" onClick={() => onPivot(p, row.pid)}>
              {p} --pid {row.pid}
            </button>
          ))}
        </div>
      </div>

      <aside className="inspector-side">
        <span className="eyebrow">
          Findings {row.findings.length > 0 ? `(${row.findings.length})` : ""}
        </span>
        {row.findings.length === 0 ? (
          <p className="finding-detail" style={{ marginTop: 8 }}>
            Nothing flagged. Absence of a finding is not evidence of absence — it means no check that ran had
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
