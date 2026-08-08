/** A finding's severity. Drives the only colour the interface is allowed to use. */
export type Verdict = "alert" | "notice" | "clean";

/** Why a row was flagged. Shown on the row and expanded in the inspector. */
export interface Finding {
  verdict: Verdict;
  /** Short label, e.g. "Unexpected parent". Sentence case, no trailing period. */
  label: string;
  /** One sentence of evidence. States the observation, not a conclusion. */
  detail: string;
}

export interface ProcessRow {
  pid: number;
  ppid: number;
  name: string;
  /** Physical offset of the _EPROCESS structure. */
  offset: number;
  threads: number;
  handles: number | null;
  sessionId: number | null;
  wow64: boolean;
  createTime: string;
  exitTime: string | null;
  /** Indentation level for the tree view. */
  depth: number;
  cmdline: string | null;
  path: string | null;
  findings: Finding[];
  /** True when the process was recovered by scanning but is absent from the
   *  active process list, the classic unlinking signal. */
  listWalkVisible: boolean;
  poolScanVisible: boolean;
}

export interface NetRow {
  offset: number;
  proto: string;
  localAddr: string;
  localPort: number;
  foreignAddr: string;
  foreignPort: number;
  state: string;
  pid: number;
  owner: string;
  created: string | null;
  findings: Finding[];
}

export interface MalfindRow {
  pid: number;
  process: string;
  start: number;
  end: number;
  tag: string;
  protection: string;
  commitCharge: number;
  privateMemory: boolean;
  disasm: string[];
  hexdump: string[];
  findings: Finding[];
}

export interface HandleRow {
  pid: number;
  process: string;
  offset: number;
  handleValue: number;
  type: string;
  grantedAccess: number;
  name: string;
}

/** The six numbered phases are the SANS memory-forensics methodology, which is
 *  a genuine sequence: an analyst works down it. The unnumbered groups below
 *  are supplementary and have no inherent order. */
export type PhaseId =
  | "identify"
  | "objects"
  | "network"
  | "injection"
  | "rootkit"
  | "extract"
  | "registry"
  | "timeline"
  | "credentials"
  | "scan";

export interface Phase {
  id: PhaseId;
  /** Present only for the six methodology steps. */
  step: number | null;
  title: string;
  blurb: string;
}

export interface PluginEntry {
  /** Fully-qualified Volatility 3 plugin name. */
  id: string;
  /** Leaf name as an analyst says it out loud. */
  name: string;
  summary: string;
  phase: PhaseId;
  /** Accepts --pid, so it can be launched from a selected process. */
  processScoped: boolean;
  /** Set when the plugin could not be loaded. The entry stays visible and
   *  disabled, never hidden. A missing plugin must not read as an empty result. */
  unavailable: { reason: string; missingModule: string } | null;
  /** Populated once the plugin has been run in this session. */
  run: { rows: number; elapsedMs: number; alerts: number } | null;
}

export type RunState = "idle" | "running" | "streaming" | "done" | "cancelled";

export interface ResultTab {
  key: string;
  pluginId: string;
  label: string;
  state: RunState;
  rowCount: number;
  elapsedMs: number;
  /** 0 to 1, or null when the plugin cannot report determinate progress. */
  progress: number | null;
  alerts: number;
}

export interface ImageInfo {
  fileName: string;
  fullPath: string;
  sizeBytes: number;
  sha256: string;
  os: string;
  build: string;
  arch: string;
  kernelBase: number;
  dtb: number;
  processorCount: number;
  systemTime: string;
  layerName: string;
  maxAddress: number;
  symbolTable: string;
}
