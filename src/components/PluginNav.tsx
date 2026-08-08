import { useMemo, useState } from "react";
import type { Phase, PluginEntry } from "../types";

export function PluginNav({
  phases,
  plugins,
  activeId,
  onRun,
}: {
  phases: Phase[];
  plugins: PluginEntry[];
  activeId: string | null;
  onRun: (plugin: PluginEntry) => void;
}) {
  const [query, setQuery] = useState("");

  const matching = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return plugins;
    return plugins.filter(
      (p) => p.name.toLowerCase().includes(q) || p.summary.toLowerCase().includes(q) || p.id.toLowerCase().includes(q),
    );
  }, [plugins, query]);

  const groups = useMemo(
    () =>
      phases
        .map((phase) => ({ phase, items: matching.filter((p) => p.phase === phase.id) }))
        .filter((g) => g.items.length > 0),
    [phases, matching],
  );

  return (
    <nav className="nav" aria-label="Plugins by investigation phase">
      <div className="nav-search">
        <input
          className="nav-input"
          type="search"
          placeholder="Filter plugins"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Filter plugins"
        />
      </div>

      <div className="nav-scroll">
        {groups.map(({ phase, items }) => (
          <div className="nav-group" key={phase.id}>
            <div className="nav-grouphead">
              <span className="nav-step">{phase.step !== null ? String(phase.step) : "·"}</span>
              <span className="nav-grouptitle">{phase.title}</span>
            </div>
            <p className="nav-blurb">{phase.blurb}</p>

            {items.map((p) => {
              const blocked = p.unavailable !== null;
              return (
                <button
                  key={p.id}
                  className={`nav-item${activeId === p.id ? " nav-item-active" : ""}`}
                  onClick={() => onRun(p)}
                  disabled={blocked}
                  title={blocked ? `${p.unavailable?.reason} — module "${p.unavailable?.missingModule}" not importable` : p.summary}
                >
                  <span className="nav-name">{p.name}</span>
                  <span className="nav-meta">
                    {blocked && <span className="nav-lock">dep</span>}
                    {p.run && p.run.alerts > 0 && <span className="nav-dot nav-dot-alert" />}
                    {p.run && p.run.alerts === 0 && <span className="nav-dot nav-dot-clean" />}
                    {p.run && <span className="nav-count">{p.run.rows.toLocaleString("en-US")}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        ))}

        {groups.length === 0 && <p className="nav-blurb">No plugin matches “{query}”.</p>}
      </div>
    </nav>
  );
}
