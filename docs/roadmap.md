# Roadmap

Ordered by dependency, not by ambition. Each milestone should leave the project
in a state where the next one can be evaluated honestly.

## M0 — Repository ✅

Licence, notices, contribution rules, branch strategy, commit hygiene for a
public forensics repository.

## M1 — Demo screen ✅

The analysis workspace running against fixtures: image bar, address ribbon,
phase-grouped plugin navigator, virtualised result tables, process inspector,
streaming simulation. No backend.

Purpose is to settle the interface direction before wiring anything to it, and
to have something concrete to argue with.

## M2 — Daemon and first real result

The point at which the tool does something true.

- Python daemon: supervisor, one worker, one `Context` per image
- Line-delimited JSON over stdio, the protocol in
  [architecture.md](architecture.md)
- `windows.info` and `windows.pstree` end to end, against a real image
- Startup dependency probe reported to the UI
- **Measure automagic and symbol-loading cost on a real image and record it**

Exit criterion: opening an image and running two plugins with no `vol.py`
subprocess anywhere, and the second plugin visibly cheaper than the first.

## M3 — Tauri shell

- Window, native file dialog, sidecar packaging and supervision
- Daemon lifecycle tied to the window, orphan cleanup on crash
- `LICENSE` and `NOTICE` bundled into every artifact the packager emits

## M4 — Streaming and cancellation

- Row batching with backpressure
- Cancel that actually unwinds the generator rather than orphaning a worker
- Progress from Volatility's own `progress_callback`
- A long scanning plugin — `windows.filescan` or `windows.handles` — as the
  proving case

## M5 — Full plugin surface

- All 197 plugins, argument forms generated from each plugin's
  `get_requirements()`
- Process-scoped plugins launchable from the inspector
- Unavailable plugins disabled with their missing dependency named

## M6 — Comparison

The feature the CLI cannot offer, and the reason cross-referencing was called
out in the research.

- Two result sets side by side with differences marked
- `pslist` against `psscan`, `modules` against `modscan`, `svclist` against
  `svcscan`
- Comparison across two images of the same host

## M7 — Timeline

- `timeliner` output on a zoomable axis
- Selection in the timeline filters the open result tabs

## M8 — Case and reporting

- Persist a session: image identity, plugin runs, selections, analyst notes
- Export findings with the offsets and plugin invocations that produced them, so
  a reader can reproduce them from the CLI
- Never write evidence into the case file — record paths and hashes

## Deliberately out of scope

- **Bundling Volatility.** It is a declared dependency. Bundling would mean
  shipping its source in our artifacts, and while the licence permits that with
  notices intact, it makes upgrades our problem.
- **Volatility 2 support.** GPLv2, Python 2, unsupported upstream.
- **Automated verdicts.** The tool surfaces observations and the evidence behind
  them. Calling something malicious is the analyst's judgement, and a tool that
  makes that call teaches people to stop looking.
- **Telemetry of any kind.** Not now, not behind a flag.
