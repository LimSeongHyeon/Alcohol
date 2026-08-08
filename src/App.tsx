import { useEffect, useMemo, useState } from "react";
import { ImageBar } from "./components/ImageBar";
import { AddressRibbon, type RibbonMark } from "./components/AddressRibbon";
import { PluginNav } from "./components/PluginNav";
import { DataTable, type Column } from "./components/DataTable";
import { Inspector } from "./components/Inspector";
import { StatusBar } from "./components/StatusBar";
import { image } from "./data/image";
import { phases, plugins as pluginCatalog } from "./data/phases";
import { processes, verdictOf } from "./data/processes";
import { connections, generateHandles, injections } from "./data/artifacts";
import type { HandleRow, MalfindRow, NetRow, ProcessRow, Verdict } from "./types";
import { clock, count, elapsed, hex } from "./format";
import "./styles/app.css";

const allHandles = generateHandles(processes.map((p) => ({ pid: p.pid, name: p.name, handles: p.handles })));

type TabKey = "pstree" | "netscan" | "malfind" | "handles";

interface TabDef {
  key: TabKey;
  pluginId: string;
  label: string;
  total: number;
  elapsedMs: number;
}

const TABS: TabDef[] = [
  { key: "pstree", pluginId: "windows.pstree.PsTree", label: "pstree", total: processes.length, elapsedMs: 412 },
  { key: "netscan", pluginId: "windows.netscan.NetScan", label: "netscan", total: connections.length, elapsedMs: 2870 },
  { key: "malfind", pluginId: "windows.malware.malfind.Malfind", label: "malfind", total: injections.length, elapsedMs: 6104 },
  { key: "handles", pluginId: "windows.handles.Handles", label: "handles", total: allHandles.length, elapsedMs: 0 },
];

const netVerdict = (r: NetRow): Verdict => verdictOf(r.findings);
const malVerdict = (r: MalfindRow): Verdict => verdictOf(r.findings);

/** Rail glyphs so depth is readable without a connector-line canvas. */
function treeRail(depth: number): string {
  if (depth === 0) return "";
  return "│ ".repeat(Math.max(0, depth - 1)) + "└ ";
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("pstree");
  const [selectedPid, setSelectedPid] = useState<number | null>(3204);
  const [selectedOffset, setSelectedOffset] = useState<number | null>(0xc0d92080);
  const [filter, setFilter] = useState("");
  const [alertsOnly, setAlertsOnly] = useState(false);

  // The handles run streams in, the way a generator-backed plugin actually
  // arrives. Rows are usable while the plugin is still going.
  const [streamed, setStreamed] = useState(0);
  useEffect(() => {
    if (streamed >= allHandles.length) return;
    const id = window.setTimeout(() => setStreamed((n) => Math.min(allHandles.length, n + 1400)), 70);
    return () => window.clearTimeout(id);
  }, [streamed]);

  const streaming = streamed < allHandles.length;

  const catalog = useMemo(
    () =>
      pluginCatalog.map((p) => {
        const tab = TABS.find((t) => t.pluginId === p.id);
        if (!tab) return p;
        const rows = tab.key === "handles" ? streamed : tab.total;
        const alerts =
          tab.key === "pstree"
            ? processes.filter((r) => verdictOf(r.findings) === "alert").length
            : tab.key === "netscan"
              ? connections.filter((r) => netVerdict(r) === "alert").length
              : tab.key === "malfind"
                ? injections.filter((r) => malVerdict(r) === "alert").length
                : 0;
        return { ...p, run: { rows, elapsedMs: tab.elapsedMs, alerts } };
      }),
    [streamed],
  );

  const selectedProcess = useMemo(
    () => (selectedPid === null ? null : (processes.find((p) => p.pid === selectedPid) ?? null)),
    [selectedPid],
  );

  const ribbonOffsets = useMemo(
    () => [
      ...processes.map((p) => p.offset),
      ...connections.map((c) => c.offset),
      ...allHandles.filter((_, i) => i % 3 === 0).map((h) => h.offset),
    ],
    [],
  );

  const ribbonMarks = useMemo<RibbonMark[]>(() => {
    const marks: RibbonMark[] = [
      ...processes.filter((p) => verdictOf(p.findings) === "alert").map((p) => ({ offset: p.offset, kind: "alert" as const })),
      ...connections.filter((c) => netVerdict(c) === "alert").map((c) => ({ offset: c.offset, kind: "alert" as const })),
    ];
    if (selectedOffset !== null) marks.push({ offset: selectedOffset, kind: "selected" });
    return marks;
  }, [selectedOffset]);

  const q = filter.trim().toLowerCase();

  const procRows = useMemo(() => {
    let rows = processes;
    if (q) rows = rows.filter((r) => `${r.pid} ${r.ppid} ${r.name} ${r.cmdline ?? ""}`.toLowerCase().includes(q));
    if (alertsOnly) rows = rows.filter((r) => verdictOf(r.findings) !== "clean");
    return rows;
  }, [q, alertsOnly]);

  const netRows = useMemo(() => {
    let rows = connections;
    if (q) rows = rows.filter((r) => `${r.proto} ${r.localAddr} ${r.foreignAddr} ${r.state} ${r.owner} ${r.pid}`.toLowerCase().includes(q));
    if (alertsOnly) rows = rows.filter((r) => netVerdict(r) !== "clean");
    return rows;
  }, [q, alertsOnly]);

  const malRows = useMemo(() => {
    let rows = injections;
    if (q) rows = rows.filter((r) => `${r.pid} ${r.process} ${r.protection}`.toLowerCase().includes(q));
    if (alertsOnly) rows = rows.filter((r) => malVerdict(r) !== "clean");
    return rows;
  }, [q, alertsOnly]);

  const handleRows = useMemo(() => {
    const live = allHandles.slice(0, streamed);
    if (!q) return live;
    return live.filter((r) => `${r.pid} ${r.process} ${r.type} ${r.name}`.toLowerCase().includes(q));
  }, [streamed, q]);

  const procColumns: Column<ProcessRow>[] = [
    { key: "pid", header: "PID", width: 56, align: "right", render: (r) => <span className="td-mono td-strong">{r.pid}</span> },
    { key: "ppid", header: "PPID", width: 56, align: "right", render: (r) => <span className="td-mono">{r.ppid}</span> },
    {
      key: "name",
      header: "Image",
      width: 0,
      render: (r) => (
        <>
          <span className="tree-rail">{treeRail(r.depth)}</span>
          <span className={verdictOf(r.findings) === "clean" ? "" : "td-strong"}>{r.name}</span>
          {!r.listWalkVisible && <span className="tag tag-alert" style={{ marginLeft: 6 }}>unlinked</span>}
          {r.exitTime && <span className="tag tag-neutral" style={{ marginLeft: 6 }}>exited</span>}
        </>
      ),
    },
    { key: "offset", header: "Offset(P)", width: 106, render: (r) => <span className="td-mono">{hex(r.offset)}</span> },
    { key: "threads", header: "Thr", width: 48, align: "right", render: (r) => <span className="td-mono">{r.threads}</span> },
    { key: "handles", header: "Hnd", width: 56, align: "right", render: (r) => <span className="td-mono">{r.handles ?? "—"}</span> },
    { key: "sess", header: "Sess", width: 48, align: "right", render: (r) => <span className="td-mono">{r.sessionId ?? "—"}</span> },
    { key: "start", header: "Started", width: 74, render: (r) => <span className="td-mono">{clock(r.createTime)}</span> },
    { key: "exit", header: "Exited", width: 74, render: (r) => <span className="td-mono td-dim">{r.exitTime ? clock(r.exitTime) : "—"}</span> },
  ];

  const netColumns: Column<NetRow>[] = [
    { key: "proto", header: "Proto", width: 62, render: (r) => <span className="td-mono">{r.proto}</span> },
    { key: "local", header: "Local address", width: 130, render: (r) => <span className="td-mono">{r.localAddr}</span> },
    { key: "lport", header: "Port", width: 56, align: "right", render: (r) => <span className="td-mono td-strong">{r.localPort}</span> },
    { key: "foreign", header: "Foreign address", width: 130, render: (r) => <span className="td-mono td-strong">{r.foreignAddr}</span> },
    { key: "fport", header: "Port", width: 56, align: "right", render: (r) => <span className="td-mono">{r.foreignPort || "—"}</span> },
    { key: "state", header: "State", width: 106, render: (r) => <span className="td-mono">{r.state || "—"}</span> },
    { key: "pid", header: "PID", width: 56, align: "right", render: (r) => <span className="td-mono">{r.pid}</span> },
    { key: "owner", header: "Owner", width: 0, render: (r) => r.owner },
    { key: "created", header: "Created", width: 74, render: (r) => <span className="td-mono td-dim">{r.created ? clock(r.created) : "—"}</span> },
  ];

  const malColumns: Column<MalfindRow>[] = [
    { key: "pid", header: "PID", width: 56, align: "right", render: (r) => <span className="td-mono td-strong">{r.pid}</span> },
    { key: "process", header: "Process", width: 130, render: (r) => r.process },
    { key: "start", header: "Start VPN", width: 118, render: (r) => <span className="td-mono">{hex(r.start)}</span> },
    { key: "end", header: "End VPN", width: 118, render: (r) => <span className="td-mono">{hex(r.end)}</span> },
    { key: "tag", header: "Tag", width: 52, render: (r) => <span className="td-mono">{r.tag}</span> },
    {
      key: "prot",
      header: "Protection",
      width: 200,
      render: (r) => (
        <span className={r.protection === "PAGE_EXECUTE_READWRITE" ? "td-mono td-strong" : "td-mono"}>{r.protection}</span>
      ),
    },
    { key: "commit", header: "Commit", width: 64, align: "right", render: (r) => <span className="td-mono">{r.commitCharge}</span> },
    { key: "private", header: "Private", width: 62, render: (r) => <span className="td-mono">{r.privateMemory ? "yes" : "no"}</span> },
    { key: "bytes", header: "First bytes", width: 0, render: (r) => <span className="td-mono td-dim">{r.hexdump[0]?.slice(0, 60) ?? ""}</span> },
  ];

  const handleColumns: Column<HandleRow>[] = [
    { key: "pid", header: "PID", width: 56, align: "right", render: (r) => <span className="td-mono">{r.pid}</span> },
    { key: "process", header: "Process", width: 132, render: (r) => r.process },
    { key: "offset", header: "Offset(V)", width: 108, render: (r) => <span className="td-mono td-dim">{hex(r.offset)}</span> },
    { key: "handle", header: "Handle", width: 70, align: "right", render: (r) => <span className="td-mono">{hex(r.handleValue)}</span> },
    { key: "type", header: "Type", width: 116, render: (r) => r.type },
    { key: "access", header: "Access", width: 80, render: (r) => <span className="td-mono td-dim">{hex(r.grantedAccess)}</span> },
    { key: "name", header: "Name", width: 0, render: (r) => <span className="td-mono">{r.name || "—"}</span> },
  ];

  const tabMeta = TABS.find((t) => t.key === activeTab);
  const visibleCount =
    activeTab === "pstree" ? procRows.length : activeTab === "netscan" ? netRows.length : activeTab === "malfind" ? malRows.length : handleRows.length;

  return (
    <div className="app">
      <div className="app-bar">
        <ImageBar image={image} />
      </div>

      <div className="app-ribbon">
        <AddressRibbon maxAddress={image.maxAddress} offsets={ribbonOffsets} marks={ribbonMarks} />
      </div>

      <div className="app-nav">
        <PluginNav
          phases={phases}
          plugins={catalog}
          activeId={tabMeta?.pluginId ?? null}
          onRun={(p) => {
            const tab = TABS.find((t) => t.pluginId === p.id);
            if (tab) setActiveTab(tab.key);
          }}
        />
      </div>

      <main className="app-work">
        <div className="work">
          <div className="tabs" role="tablist">
            {TABS.map((t) => {
              const isStreaming = t.key === "handles" && streaming;
              const alerts = catalog.find((p) => p.id === t.pluginId)?.run?.alerts ?? 0;
              return (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={activeTab === t.key}
                  className={`tab${activeTab === t.key ? " tab-active" : ""}`}
                  onClick={() => setActiveTab(t.key)}
                >
                  {isStreaming && <span className="tab-spinner" />}
                  <span className="tab-name">{t.label}</span>
                  <span className="tab-count">{count(t.key === "handles" ? streamed : t.total)}</span>
                  {alerts > 0 && <span className="tab-alerts">{alerts}</span>}
                </button>
              );
            })}
          </div>

          <div className="toolbar">
            <input
              className="toolbar-filter"
              type="search"
              placeholder="Filter rows"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Filter rows"
            />
            <button
              className={`toolbar-btn${alertsOnly ? " toolbar-btn-on" : ""}`}
              onClick={() => setAlertsOnly((v) => !v)}
              aria-pressed={alertsOnly}
            >
              Flagged only
            </button>
            <button className="toolbar-btn">Columns</button>
            <button className="toolbar-btn">Export</button>
            <button className="toolbar-btn">Compare</button>

            <div className="toolbar-right">
              {activeTab === "handles" && streaming ? (
                <>
                  <span>streaming</span>
                  <div className="toolbar-progress">
                    <div className="toolbar-progress-fill" style={{ width: `${(streamed / allHandles.length) * 100}%` }} />
                  </div>
                  <button className="toolbar-btn">Cancel</button>
                </>
              ) : (
                <span>{elapsed(tabMeta?.elapsedMs ?? 0)}</span>
              )}
              <span>
                {count(visibleCount)}
                {visibleCount !== (tabMeta?.total ?? 0) && activeTab !== "handles" ? ` of ${count(tabMeta?.total ?? 0)}` : ""} rows
              </span>
            </div>
          </div>

          {activeTab === "pstree" && (
            <DataTable
              rows={procRows}
              columns={procColumns}
              rowKey={(r) => `p${r.pid}`}
              selectedKey={selectedPid === null ? null : `p${selectedPid}`}
              onSelect={(r) => {
                setSelectedPid(r.pid);
                setSelectedOffset(r.offset);
              }}
              verdictOf={(r) => verdictOf(r.findings)}
            />
          )}
          {activeTab === "netscan" && (
            <DataTable
              rows={netRows}
              columns={netColumns}
              rowKey={(r) => `n${r.offset}`}
              selectedKey={selectedOffset === null ? null : `n${selectedOffset}`}
              onSelect={(r) => {
                setSelectedPid(r.pid);
                setSelectedOffset(r.offset);
              }}
              verdictOf={netVerdict}
            />
          )}
          {activeTab === "malfind" && (
            <DataTable
              rows={malRows}
              columns={malColumns}
              rowKey={(r) => `m${r.pid}-${r.start}`}
              selectedKey={null}
              onSelect={(r) => setSelectedPid(r.pid)}
              verdictOf={malVerdict}
            />
          )}
          {activeTab === "handles" && (
            <DataTable
              rows={handleRows}
              columns={handleColumns}
              rowKey={(r) => `h${r.pid}-${r.handleValue}-${r.offset}`}
              selectedKey={null}
              onSelect={(r) => setSelectedPid(r.pid)}
              verdictOf={() => "clean"}
            />
          )}

          <Inspector row={selectedProcess} onPivot={() => setActiveTab("handles")} />
        </div>
      </main>

      <div className="app-status">
        <StatusBar
          pluginsRun={4}
          contextAgeMs={18_400}
          symbolTable={image.symbolTable}
          totalRows={processes.length + connections.length + injections.length + streamed}
        />
      </div>
    </div>
  );
}
