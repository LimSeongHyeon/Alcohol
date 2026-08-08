import { count, elapsed } from "../format";

/**
 * The status bar exists to make the architecture legible. "Context warm" is the
 * whole performance argument for this tool in two words: the image was parsed
 * once and the layer stack is still resident, so the next plugin does not pay
 * for automagic or symbol loading again.
 */
export function StatusBar({
  pluginsRun,
  contextAgeMs,
  symbolTable,
  totalRows,
}: {
  pluginsRun: number;
  contextAgeMs: number;
  symbolTable: string;
  totalRows: number;
}) {
  return (
    <footer className="status">
      <span className="status-group">
        <span className="status-dot" />
        <span className="status-strong">Daemon ready</span>
      </span>
      <span className="status-group">
        Context warm · <span className="status-strong">{elapsed(contextAgeMs)}</span> since open ·{" "}
        <span className="status-strong">{pluginsRun}</span> plugins on this layer stack
      </span>
      <span className="status-group">Symbols {symbolTable}</span>

      <span className="status-right">
        <span>{count(totalRows)} rows held</span>
        <span>1 worker idle · 3 free</span>
      </span>
    </footer>
  );
}
