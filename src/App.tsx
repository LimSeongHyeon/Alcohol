import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { ImageBar } from "./components/ImageBar";
import { AddressRibbon, type RibbonMark } from "./components/AddressRibbon";
import { PluginNav } from "./components/PluginNav";
import { DataTable, type Column } from "./components/DataTable";
import { Inspector } from "./components/Inspector";
import { StatusBar } from "./components/StatusBar";
import { ContextMenu, type MenuItem, type MenuState } from "./components/ContextMenu";
import { OpenImage, type RecentCase } from "./components/OpenImage";
import { Splitter, defaultInspectorHeight } from "./components/Splitter";
import { TreeCell } from "./components/TreeCell";
import { image } from "./data/image";
import { recentCases } from "./data/cases";
import { phases, plugins as pluginCatalog } from "./data/phases";
import { processes, verdictOf } from "./data/processes";
import { connections, generateHandles, injections } from "./data/artifacts";
import type { HandleRow, MalfindRow, NetRow, ProcessRow, Verdict } from "./types";
import type { HighlightId, HighlightMap } from "./highlights";
import { emptySelection, singleSelection, type Selection } from "./selection";
import { applyCollapse, computeTree } from "./tree";
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
  /** True when the rows came out of the case file instead of a fresh run. */
  cached: boolean;
}

const TABS: TabDef[] = [
  { key: "pstree", pluginId: "windows.pstree.PsTree", label: "pstree", total: processes.length, elapsedMs: 412, cached: true },
  { key: "netscan", pluginId: "windows.netscan.NetScan", label: "netscan", total: connections.length, elapsedMs: 2870, cached: true },
  { key: "malfind", pluginId: "windows.malware.malfind.Malfind", label: "malfind", total: injections.length, elapsedMs: 6104, cached: true },
  { key: "handles", pluginId: "windows.handles.Handles", label: "handles", total: allHandles.length, elapsedMs: 0, cached: false },
];

const netVerdict = (r: NetRow): Verdict => verdictOf(r.findings);
const malVerdict = (r: MalfindRow): Verdict => verdictOf(r.findings);

const copy = (text: string) => void navigator.clipboard?.writeText(text);

export default function App() {
  const [openCase, setOpenCase] = useState<RecentCase | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("pstree");
  const [selectedPid, setSelectedPid] = useState<number | null>(3204);
  const [selectedOffset, setSelectedOffset] = useState<number | null>(0xc0d92080);
  // One selection per tab: switching to netscan and back should not lose the
  // rows an analyst had gathered in the tree.
  const [selections, setSelections] = useState<Record<TabKey, Selection>>(() => ({
    pstree: singleSelection("p3204"),
    netscan: emptySelection(),
    malfind: emptySelection(),
    handles: emptySelection(),
  }));
  const selection = selections[activeTab];
  const setSelection = (next: Selection) => setSelections((prev) => ({ ...prev, [activeTab]: next }));
  const [filter, setFilter] = useState("");
  const [alertsOnly, setAlertsOnly] = useState(false);
  // Seeded so the feature is visible on first load. Keys are row keys, which is
  // what lets a mark survive filtering, sorting and collapsing.
  const [highlights, setHighlights] = useState<HighlightMap>({ p4412: "amber" });
  const [collapsed, setCollapsed] = useState<Set<number>>(() => new Set());
  // A fixed default starves the table on a laptop. Start proportional, then the
  // splitter takes over and the analyst's choice sticks for the session.
  const [inspectorH, setInspectorH] = useState(defaultInspectorHeight);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [dirty, setDirty] = useState(false);

  const [streamed, setStreamed] = useState(0);
  useEffect(() => {
    if (!openCase || streamed >= allHandles.length) return;
    const id = window.setTimeout(() => setStreamed((n) => Math.min(allHandles.length, n + 1400)), 70);
    return () => window.clearTimeout(id);
  }, [streamed, openCase]);

  const streaming = streamed < allHandles.length;

  /** Marks every key at once, so highlighting a range is one action and one
   *  undo-sized change rather than twenty. */
  const mark = (keys: string[], id: HighlightId | null) => {
    setHighlights((prev) => {
      const next = { ...prev };
      for (const key of keys) {
        if (id === null) delete next[key];
        else next[key] = id;
      }
      return next;
    });
    setDirty(true);
  };

  const catalog = useMemo(
    () =>
      pluginCatalog.map((p) => {
        const tab = TABS.find((t) => t.pluginId === p.id);
        if (!tab) return p;
        const rows = tab.key === "handles" ? streamed : tab.total;
        const alerts =
          tab.key === "pstree" ? processes.filter((r) => verdictOf(r.findings) === "alert").length
          : tab.key === "netscan" ? connections.filter((r) => netVerdict(r) === "alert").length
          : tab.key === "malfind" ? injections.filter((r) => malVerdict(r) === "alert").length
          : 0;
        return { ...p, run: { rows, elapsedMs: tab.elapsedMs, alerts } };
      }),
    [streamed],
  );

  const selectedProcess = useMemo(
    () => (selectedPid === null ? null : (processes.find((p) => p.pid === selectedPid) ?? null)),
    [selectedPid],
  );

  const q = filter.trim().toLowerCase();

  // Collapsing happens before filtering: folding a subtree away should hide it
  // whatever the filter says, and filtering a folded tree should not silently
  // resurrect its children.
  const visibleProcesses = useMemo(
    () => applyCollapse(processes, (row) => collapsed.has(row.pid)),
    [collapsed],
  );

  const procRows = useMemo(() => {
    let rows = visibleProcesses;
    if (q) rows = rows.filter((r) => `${r.pid} ${r.ppid} ${r.name} ${r.cmdline ?? ""}`.toLowerCase().includes(q));
    if (alertsOnly) rows = rows.filter((r) => verdictOf(r.findings) !== "clean");
    return rows;
  }, [visibleProcesses, q, alertsOnly]);

  const procShapes = useMemo(() => computeTree(procRows.map((r) => r.depth)), [procRows]);
  const shapeByPid = useMemo(
    () => new Map(procRows.map((r, i) => [r.pid, procShapes[i]!])),
    [procRows, procShapes],
  );

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

  // The ribbon mirrors whatever table is open, so it is a minimap of the result
  // set in front of you rather than a permanent decoration.
  const ribbonMarks = useMemo<RibbonMark[]>(() => {
    switch (activeTab) {
      case "pstree":
        return procRows.map((r) => ({ offset: r.offset, verdict: verdictOf(r.findings), label: `${r.name} (${r.pid})` }));
      case "netscan":
        return netRows.map((r) => ({ offset: r.offset, verdict: netVerdict(r), label: `${r.owner} → ${r.foreignAddr}` }));
      case "handles":
        return handleRows.filter((_, i) => i % 24 === 0).map((r) => ({ offset: r.offset, verdict: "clean" as const, label: `${r.type} (${r.process})` }));
      default:
        return [];
    }
  }, [activeTab, procRows, netRows, handleRows]);

  // Everything the session has recovered, thinned so the substrate reads as
  // texture rather than a solid block.
  const ribbonContext = useMemo(
    () => [
      ...processes.map((p) => p.offset),
      ...connections.map((c) => c.offset),
      ...allHandles.filter((_, i) => i % 8 === 0).map((h) => h.offset),
    ],
    [],
  );

  const ribbonCaption =
    activeTab === "malfind"
      ? "malfind reports virtual addresses — not plottable here"
      : `${activeTab} · ${count(ribbonMarks.length)} marks`;

  /**
   * Shared menu tail: highlight swatches, then copy and filter actions.
   *
   * Everything here acts on the whole selection. Single-row actions built from
   * the clicked cell only appear when exactly one row is selected — "filter by
   * this value" is meaningless when the analyst has twelve rows marked.
   */
  function baseMenu<T>(
    keys: string[],
    row: T,
    column: Column<T> | null,
    columns: Column<T>[],
    rowsInTable: T[],
    rowKeyOf: (r: T) => string,
    extra: MenuItem[],
  ): MenuItem[] {
    const key = keys[0] ?? "";
    const multiple = keys.length > 1;
    const targets = new Set(keys);
    const cellText = column?.text?.(row);
    const asTsv = (r: T) => columns.map((c) => c.text?.(r) ?? "").join("\t");

    return [
      {
        kind: "highlights",
        active: multiple ? null : (highlights[key] ?? null),
        onPick: (id) => mark(keys, id),
      },
      { kind: "separator" },
      ...(multiple ? [] : extra),
      ...(multiple ? [] : [{ kind: "separator" as const }]),
      ...(!multiple && cellText !== undefined && column
        ? [
            { kind: "action" as const, label: `Copy ${column.header.toLowerCase()}`, onSelect: () => copy(cellText) },
            { kind: "action" as const, label: "Filter rows by this value", onSelect: () => setFilter(cellText) },
          ]
        : []),
      {
        kind: "action",
        label: multiple ? `Copy ${keys.length} rows as TSV` : "Copy row as TSV",
        onSelect: () =>
          copy(multiple ? rowsInTable.filter((r) => targets.has(rowKeyOf(r))).map(asTsv).join("\n") : asTsv(row)),
      },
    ];
  }

  function openMenu(title: string, items: MenuItem[], e: MouseEvent, targetCount: number) {
    setMenu({ x: e.clientX, y: e.clientY, title: targetCount > 1 ? `${targetCount} rows selected` : title, items });
  }

  const procColumns: Column<ProcessRow>[] = [
    { key: "pid", header: "PID", width: 62, align: "right", render: (r) => <span className="td-mono td-strong">{r.pid}</span>, text: (r) => String(r.pid) },
    { key: "ppid", header: "PPID", width: 62, align: "right", render: (r) => <span className="td-mono">{r.ppid}</span>, text: (r) => String(r.ppid) },
    {
      key: "name",
      header: "Image",
      width: 340,
      text: (r) => r.name,
      render: (r) => (
        <TreeCell
          shape={shapeByPid.get(r.pid) ?? { isLast: true, rails: [], hasChildren: false }}
          depth={r.depth}
          collapsed={collapsed.has(r.pid)}
          onToggle={() =>
            setCollapsed((prev) => {
              const next = new Set(prev);
              if (next.has(r.pid)) next.delete(r.pid);
              else next.add(r.pid);
              return next;
            })
          }
        >
          <span className={verdictOf(r.findings) === "clean" ? "" : "td-strong"}>{r.name}</span>
          {!r.listWalkVisible && <span className="tag tag-alert">unlinked</span>}
          {r.exitTime && <span className="tag tag-neutral">exited</span>}
        </TreeCell>
      ),
    },
    // pstree does not carry the command line; the GUI joins it in, because
    // "what was it launched with" is the next question in every case and the
    // CLI makes you run a second plugin to answer it.
    { key: "cmdline", header: "Command line", width: 0, render: (r) => <span className="td-mono td-dim">{r.cmdline ?? "—"}</span>, text: (r) => r.cmdline ?? "" },
    { key: "offset", header: "Offset(P)", width: 118, render: (r) => <span className="td-mono">{hex(r.offset)}</span>, text: (r) => hex(r.offset) },
    { key: "threads", header: "Thr", width: 54, align: "right", render: (r) => <span className="td-mono">{r.threads}</span>, text: (r) => String(r.threads) },
    { key: "handles", header: "Hnd", width: 62, align: "right", render: (r) => <span className="td-mono">{r.handles ?? "—"}</span>, text: (r) => String(r.handles ?? "") },
    { key: "sess", header: "Sess", width: 54, align: "right", render: (r) => <span className="td-mono">{r.sessionId ?? "—"}</span>, text: (r) => String(r.sessionId ?? "") },
    { key: "start", header: "Started", width: 82, render: (r) => <span className="td-mono">{clock(r.createTime)}</span>, text: (r) => r.createTime },
  ];

  const netColumns: Column<NetRow>[] = [
    { key: "proto", header: "Proto", width: 70, render: (r) => <span className="td-mono">{r.proto}</span>, text: (r) => r.proto },
    { key: "local", header: "Local address", width: 146, render: (r) => <span className="td-mono">{r.localAddr}</span>, text: (r) => r.localAddr },
    { key: "lport", header: "Port", width: 62, align: "right", render: (r) => <span className="td-mono td-strong">{r.localPort}</span>, text: (r) => String(r.localPort) },
    { key: "foreign", header: "Foreign address", width: 146, render: (r) => <span className="td-mono td-strong">{r.foreignAddr}</span>, text: (r) => r.foreignAddr },
    { key: "fport", header: "Port", width: 62, align: "right", render: (r) => <span className="td-mono">{r.foreignPort || "—"}</span>, text: (r) => String(r.foreignPort) },
    { key: "state", header: "State", width: 118, render: (r) => <span className="td-mono">{r.state || "—"}</span>, text: (r) => r.state },
    { key: "pid", header: "PID", width: 62, align: "right", render: (r) => <span className="td-mono">{r.pid}</span>, text: (r) => String(r.pid) },
    { key: "owner", header: "Owner", width: 182, render: (r) => r.owner, text: (r) => r.owner },
    { key: "offset", header: "Offset(P)", width: 126, render: (r) => <span className="td-mono td-dim">{hex(r.offset)}</span>, text: (r) => hex(r.offset) },
    { key: "created", header: "Created", width: 82, render: (r) => <span className="td-mono td-dim">{r.created ? clock(r.created) : "—"}</span>, text: (r) => r.created ?? "" },
    { key: "pad", header: "", width: 0, render: () => null },
  ];

  const malColumns: Column<MalfindRow>[] = [
    { key: "pid", header: "PID", width: 62, align: "right", render: (r) => <span className="td-mono td-strong">{r.pid}</span>, text: (r) => String(r.pid) },
    { key: "process", header: "Process", width: 146, render: (r) => r.process, text: (r) => r.process },
    { key: "start", header: "Start VPN", width: 130, render: (r) => <span className="td-mono">{hex(r.start)}</span>, text: (r) => hex(r.start) },
    { key: "end", header: "End VPN", width: 130, render: (r) => <span className="td-mono">{hex(r.end)}</span>, text: (r) => hex(r.end) },
    { key: "tag", header: "Tag", width: 58, render: (r) => <span className="td-mono">{r.tag}</span>, text: (r) => r.tag },
    { key: "prot", header: "Protection", width: 222, render: (r) => <span className={r.protection === "PAGE_EXECUTE_READWRITE" ? "td-mono td-strong" : "td-mono"}>{r.protection}</span>, text: (r) => r.protection },
    { key: "commit", header: "Commit", width: 72, align: "right", render: (r) => <span className="td-mono">{r.commitCharge}</span>, text: (r) => String(r.commitCharge) },
    { key: "private", header: "Private", width: 70, render: (r) => <span className="td-mono">{r.privateMemory ? "yes" : "no"}</span>, text: (r) => (r.privateMemory ? "yes" : "no") },
    { key: "bytes", header: "First bytes", width: 0, render: (r) => <span className="td-mono td-dim">{r.hexdump[0]?.slice(0, 62) ?? ""}</span>, text: (r) => r.hexdump[0] ?? "" },
  ];

  const handleColumns: Column<HandleRow>[] = [
    { key: "pid", header: "PID", width: 62, align: "right", render: (r) => <span className="td-mono">{r.pid}</span>, text: (r) => String(r.pid) },
    { key: "process", header: "Process", width: 148, render: (r) => r.process, text: (r) => r.process },
    { key: "offset", header: "Offset(V)", width: 122, render: (r) => <span className="td-mono td-dim">{hex(r.offset)}</span>, text: (r) => hex(r.offset) },
    { key: "handle", header: "Handle", width: 80, align: "right", render: (r) => <span className="td-mono">{hex(r.handleValue)}</span>, text: (r) => hex(r.handleValue) },
    { key: "type", header: "Type", width: 128, render: (r) => r.type, text: (r) => r.type },
    { key: "access", header: "Access", width: 92, render: (r) => <span className="td-mono td-dim">{hex(r.grantedAccess)}</span>, text: (r) => hex(r.grantedAccess) },
    { key: "name", header: "Name", width: 0, render: (r) => <span className="td-mono">{r.name || "—"}</span>, text: (r) => r.name },
  ];

  if (!openCase) {
    return (
      <OpenImage
        recents={recentCases}
        onOpenImage={() => setOpenCase(recentCases[0]!)}
        onOpenCase={(c) => setOpenCase(c)}
      />
    );
  }

  const tabMeta = TABS.find((t) => t.key === activeTab);
  const visibleCount =
    activeTab === "pstree" ? procRows.length
    : activeTab === "netscan" ? netRows.length
    : activeTab === "malfind" ? malRows.length
    : handleRows.length;

  return (
    <div className="app" style={{ ["--inspector-h" as string]: `${inspectorH}px` }}>
      <div className="app-bar">
        <ImageBar
          image={image}
          caseName={openCase.caseFile}
          dirty={dirty}
          onSave={() => setDirty(false)}
          onClose={() => setOpenCase(null)}
        />
      </div>

      <div className="app-ribbon">
        <AddressRibbon
          maxAddress={image.maxAddress}
          marks={ribbonMarks}
          context={ribbonContext}
          selected={selectedOffset}
          caption={ribbonCaption}
        />
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
                  {t.cached && <span className="tab-cached" title="Loaded from the case file — not re-run">cached</span>}
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
            <button className={`toolbar-btn${alertsOnly ? " toolbar-btn-on" : ""}`} onClick={() => setAlertsOnly((v) => !v)} aria-pressed={alertsOnly}>
              Flagged only
            </button>
            {activeTab === "pstree" && (
              <>
                <button className="toolbar-btn" onClick={() => setCollapsed(new Set(processes.filter((p) => p.depth >= 2).map((p) => p.pid)))}>
                  Collapse
                </button>
                <button className="toolbar-btn" onClick={() => setCollapsed(new Set())}>
                  Expand all
                </button>
              </>
            )}
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
              {selection.keys.size > 1 && <span className="toolbar-selcount">{count(selection.keys.size)} selected</span>}
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
              selection={selection}
              onSelectionChange={setSelection}
              onPrimaryRow={(r) => {
                setSelectedPid(r.pid);
                setSelectedOffset(r.offset);
              }}
              verdictOf={(r) => verdictOf(r.findings)}
              highlights={highlights}
              onRowContextMenu={(r, col, e, keys) =>
                openMenu(
                  `${r.name} · pid ${r.pid}`,
                  baseMenu(keys, r, col, procColumns, procRows, (x) => `p${x.pid}`, [
                    { kind: "action", label: `Run cmdline --pid ${r.pid}`, onSelect: () => setActiveTab("handles") },
                    { kind: "action", label: `Run malfind --pid ${r.pid}`, onSelect: () => setActiveTab("malfind") },
                    { kind: "action", label: `Show connections owned by ${r.pid}`, onSelect: () => { setActiveTab("netscan"); setFilter(String(r.pid)); } },
                    { kind: "action", label: "Collapse subtree", disabled: !(shapeByPid.get(r.pid)?.hasChildren ?? false), onSelect: () => setCollapsed((p) => new Set(p).add(r.pid)) },
                  ]),
                  e,
                  keys.length,
                )
              }
            />
          )}
          {activeTab === "netscan" && (
            <DataTable
              rows={netRows}
              columns={netColumns}
              rowKey={(r) => `n${r.offset}`}
              selection={selection}
              onSelectionChange={setSelection}
              onPrimaryRow={(r) => {
                setSelectedPid(r.pid);
                setSelectedOffset(r.offset);
              }}
              verdictOf={netVerdict}
              highlights={highlights}
              onRowContextMenu={(r, col, e, keys) =>
                openMenu(
                  `${r.owner} · ${r.foreignAddr}:${r.foreignPort}`,
                  baseMenu(keys, r, col, netColumns, netRows, (x) => `n${x.offset}`, [
                    { kind: "action", label: `Show process ${r.pid} in the tree`, onSelect: () => { setActiveTab("pstree"); setSelectedPid(r.pid); } },
                    { kind: "action", label: `Filter to ${r.foreignAddr}`, onSelect: () => setFilter(r.foreignAddr) },
                  ]),
                  e,
                  keys.length,
                )
              }
            />
          )}
          {activeTab === "malfind" && (
            <DataTable
              rows={malRows}
              columns={malColumns}
              rowKey={(r) => `m${r.pid}-${r.start}`}
              selection={selection}
              onSelectionChange={setSelection}
              onPrimaryRow={(r) => setSelectedPid(r.pid)}
              verdictOf={malVerdict}
              highlights={highlights}
              onRowContextMenu={(r, col, e, keys) =>
                openMenu(
                  `${r.process} · ${hex(r.start)}`,
                  baseMenu(keys, r, col, malColumns, malRows, (x) => `m${x.pid}-${x.start}`, [
                    { kind: "action", label: "Dump this region", onSelect: () => undefined },
                    { kind: "action", label: `Show process ${r.pid} in the tree`, onSelect: () => { setActiveTab("pstree"); setSelectedPid(r.pid); } },
                  ]),
                  e,
                  keys.length,
                )
              }
            />
          )}
          {activeTab === "handles" && (
            <DataTable
              rows={handleRows}
              columns={handleColumns}
              rowKey={(r) => `h${r.pid}-${r.handleValue}-${r.offset}`}
              selection={selection}
              onSelectionChange={setSelection}
              onPrimaryRow={(r) => setSelectedPid(r.pid)}
              verdictOf={() => "clean"}
              highlights={highlights}
              onRowContextMenu={(r, col, e, keys) =>
                openMenu(
                  `${r.type} · ${r.process}`,
                  baseMenu(keys, r, col, handleColumns, handleRows, (x) => `h${x.pid}-${x.handleValue}-${x.offset}`, [
                    { kind: "action", label: `Show process ${r.pid} in the tree`, onSelect: () => { setActiveTab("pstree"); setSelectedPid(r.pid); } },
                  ]),
                  e,
                  keys.length,
                )
              }
            />
          )}

          <Splitter height={inspectorH} onResize={setInspectorH} />
          <Inspector row={selectedProcess} onPivot={() => setActiveTab("handles")} />
        </div>
      </main>

      <div className="app-status">
        <StatusBar
          pluginsRun={4}
          contextAgeMs={18_400}
          symbolTable={image.symbolTable}
          totalRows={processes.length + connections.length + injections.length + streamed}
          caseName={openCase.caseFile}
          dirty={dirty}
        />
      </div>

      <ContextMenu state={menu} onClose={() => setMenu(null)} />
    </div>
  );
}
