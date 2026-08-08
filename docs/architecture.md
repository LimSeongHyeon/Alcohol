# Architecture

Three processes, one long-lived analysis context, and a hard rule against
throwing that context away.

```
┌─────────────────────────────────────────────┐
│  Tauri shell (Rust)                         │
│  window, file dialogs, sidecar supervision  │
│  ┌───────────────────────────────────────┐  │
│  │  WebView — React + TypeScript         │  │
│  │  tables, tree, inspector, ribbon      │  │
│  └───────────────────────────────────────┘  │
└──────────────────┬──────────────────────────┘
                   │  Tauri IPC
┌──────────────────▼──────────────────────────┐
│  Broker (Rust)                              │
│  job queue, cancellation, backpressure      │
└──────────────────┬──────────────────────────┘
                   │  newline-delimited JSON over stdio
┌──────────────────▼──────────────────────────┐
│  Python daemon                              │
│  supervisor process                         │
│    ├── worker 1 — Context for image A       │
│    ├── worker 2 — Context for image A       │
│    └── worker 3 — Context for image B       │
└─────────────────────────────────────────────┘
```

## Why a daemon and not `vol.py`

The obvious design — shell out to `vol.py` per plugin and parse the output — is
the one the licence explicitly calls a wrapper and the one that performs worst.

Framework startup measured on the development machine, 197 plugins, no image
loaded:

| | import | discovery | total |
| --- | --- | --- | --- |
| cold (no `.pyc`) | 0.34 s | 1.34 s | 1.68 s |
| warm | 0.27 s | 0.44 s | 0.71 s |

Add Python interpreter startup on top. That is the floor, paid on every spawn,
before the image is even opened.

The costs that actually dominate have not been measured yet because they need a
real image: automagic (scanning for the DTB and kernel banner) and symbol table
loading, including PDB download and conversion on first sight of a Windows
build. **Measure these and record them here before making further performance
claims.**

All of that state lives on the `Context` and the layer stack hanging off it,
including `IntelLayer._translate_entry`, which is an
`@functools.lru_cache(maxsize=1024)` bound to the layer instance. Discard the
`Context` and the page-table cache goes with it.

So: one `Context` per image, built once, reused for every plugin run against
that image.

## Concurrency

**Not inside a plugin.** Volatility's own parallelism is off by default
(`constants.PARALLELISM = Parallelism.Off`) and only covers the body of
`TranslationLayerInterface.scan()`, and only for scanners that set
`thread_safe = True` — the interface default is `False`. Result post-processing
and scan-address generation are serial. The foundation's documentation states
that scanners are usually not the bottleneck and that parallelism offers no
significant gain.

**Across plugins, in separate processes.** Different plugins run concurrently in
separate worker processes, each owning its own `Context`. Never share one
`Context` between threads: neither the layer objects nor their `lru_cache`
instances are documented as thread-safe.

Workers are pooled and pinned to an image. Opening a second image starts a
second set rather than evicting the first, so switching between two images in
a comparison does not re-pay initialisation.

## Streaming

Volatility plugins are generators. The daemon iterates and emits rows as they
arrive; it does not materialise the full result before replying.

```jsonc
{"t":"job.started","job":"j17","plugin":"windows.handles.Handles","columns":[...]}
{"t":"job.rows","job":"j17","seq":1,"rows":[[...],[...]]}
{"t":"job.progress","job":"j17","done":0.42,"note":"Scanning layer_name"}
{"t":"job.rows","job":"j17","seq":2,"rows":[[...]]}
{"t":"job.done","job":"j17","rows":48213,"elapsed_ms":31402}
```

Rows are batched — one message per row would spend more time in JSON than in
analysis. The broker applies backpressure so a fast plugin cannot outrun the
renderer, and `job.cancel` unwinds the generator.

The UI treats a streaming result as usable: rows are sortable and filterable
while the job is still running, and the row count in the tab is live.

## Plugin availability

`framework.import_files(plugins, ignore_errors=True)` returns the list of
modules that failed to import, and the daemon must forward it. Measured plugin
counts by installed dependency:

| Installed | Plugins loaded |
| --- | --- |
| none | 166 |
| `pefile` | 191 |
| `+ yara-python` | 191 |
| `+ pycryptodome` | 197 |

`pefile`, `yara-python` and `pycryptodome` are pinned as required, not optional.
Even so the daemon reports the failure list on every startup, because a broken
install must surface as a disabled plugin with a reason attached — never as a
plugin that quietly does not exist. See
[analysis-workflows.md](analysis-workflows.md) for why this is a correctness
issue and not a polish issue.

## Opening an image

Not uploading one. An image is evidence — eight gigabytes that must not be
copied, moved or altered — so the tool records a path and a SHA-256 and reads in
place.

This is the one place where the browser and the shell genuinely diverge. A
browser's `<input type="file">` hands over bytes and hides the path, which is
useless here; Tauri's native dialog returns the path, which is the only thing we
want. The picker in `src/components/OpenImage.tsx` is built for the Tauri model,
and its two buttons are theatre until the shell exists.

Results are persisted to a `.alcohol` case archive so that reopening an image
does not re-run work already done. Format in [case-file.md](case-file.md).

## The frontend

Vite + React + TypeScript. Currently runs standalone against fixtures in
`src/data/`; the Tauri shell and the daemon are not wired up yet.

Constraints that shaped it:

- **Dense tables are the product.** Rows are 24 px, virtualised through
  `@tanstack/react-virtual`. The demo's `handles` tab holds 18,751 generated
  rows so the table is exercised at a realistic size rather than a comfortable
  one.
- **No network at runtime.** Fonts are bundled via `@fontsource`, never fetched.
  A forensics tool has no business making outbound requests while examining
  evidence. The only exception will be symbol downloads, which must be explicit
  and visible.
- **Achromatic chrome, chromatic verdicts.** Documented in
  `src/styles/tokens.css`. Selection, hover and focus are expressed in lightness
  alone.
- **Every text tone clears WCAG AA.** The ramp comments in `tokens.css` record
  the measured ratios. Analysts read this interface for hours.

### Looking at it

GUI quality is a stated goal, so someone has to actually look at the thing.
`tests/workspace.spec.ts` drives Chromium through the workspace at 1440×900 and
1280×720, writing captures to `.playwright/shots/` and asserting the behaviour
that is easy to break without noticing: keyboard navigation lands on every
press, unavailable plugins stay listed, the flagged filter leaves no unflagged
rows, nothing overflows horizontally.

```bash
npm run shot
```

Captures are gitignored. When visual regression is worth adopting, baselines go
in `tests/__screenshots__` and get committed.

## Not built yet

The Tauri shell, the Rust broker, the Python daemon and the JSON-RPC contract
above are all design, not code. `src/data/` holds fixtures shaped like the
daemon's eventual output so the two can be swapped without reworking the views.
