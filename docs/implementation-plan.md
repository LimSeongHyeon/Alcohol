# First implementation pass: plan

This document is written to be picked up cold, in a fresh session, by an
orchestrator who will fan the work out to subagents. It assumes no memory of the
conversation that produced it.

Scope of this pass: make the tool do something true. Today the interface is
complete and every number in it is invented. At the end of this pass an analyst
opens a real memory image, runs real plugins, sees real rows stream in, and
reopens the case tomorrow without re-running them.

Explicitly deferred to a later pass: running several plugins concurrently
against one image, comparison views, timeline, reporting. Reasons are in
[roadmap.md](roadmap.md).

## 1. Where the project stands

Read these before planning anything:

| Document | What it settles |
| --- | --- |
| [analysis-workflows.md](analysis-workflows.md) | Why the UI is shaped the way it is |
| [architecture.md](architecture.md) | Process model, warm context, why not `vol.py` per plugin |
| [case-file.md](case-file.md) | The `.alcohol` container format |
| [../CLAUDE.md](../CLAUDE.md) | Licence constraints, commit hygiene, performance rules |

What exists:

- A complete React and TypeScript frontend: case picker, address ribbon, plugin
  navigator grouped by the SANS phases, virtualised tables, tree with connectors
  and collapse, multi-select, context menus, analyst highlights, resizable
  inspector, streaming and cancellation surfaces.
- Fixtures in `src/data/` shaped like the daemon's eventual output.
- 38 Playwright checks covering behaviour, layout, contrast and house style.

What does not exist, at all:

- Any Rust. There is no `src-tauri/`.
- Any Python. There is no daemon.
- Any contact with Volatility 3. It is not even a declared dependency.
- Any persistence. The `.alcohol` format is specified and unimplemented.

## 2. The rule that makes parallel work possible

Four agents cannot build a client, a broker and a server at the same time unless
the wire format between them is fixed and testable before any of them starts.

So the work has one serial phase and then a fan-out:

```
  Phase 0  ────────────────────────────────  contract freeze (one agent)
                          │
        ┌─────────────┬───┴────────┬──────────────┐
        ▼             ▼            ▼              ▼
     Agent A       Agent B      Agent C        Agent D
     daemon        shell        frontend       test data
     (Python)      (Rust)       (TypeScript)   and CI
        └─────────────┴────────────┴──────────────┘
                          │
  Phase 2  ────────────────────────────────  integration (orchestrator)
```

Phase 0 produces a **mock daemon**: a small program that speaks the real
protocol and replies from the existing fixtures. Agents B and C develop and test
entirely against it, so they never wait for Agent A. Agent A develops against
the **conformance suite**, which both the mock and the real daemon must pass.

If the contract turns out to be wrong mid-flight, it changes in one place and
the orchestrator re-runs conformance for everyone. Do not let an agent quietly
widen the protocol in its own copy.

## 3. Phase 0: contract freeze

One agent, working alone, before anything else starts.

### Deliverables

```
docs/protocol.md                  prose specification, message by message
schema/                           JSON Schema per message, the normative form
  hello.schema.json
  image.open.schema.json
  job.start.schema.json
  job.rows.schema.json
  ...
src/ipc/protocol.ts               TypeScript types, hand-written to match
daemon/alcohol/protocol.py        Python dataclasses, hand-written to match
tools/mock-daemon/                speaks the protocol from src/data fixtures
tests/conformance/                the suite every daemon must pass
```

### The message set

Newline-delimited JSON over stdio. Requests carry an `id`; events do not.
Rationale for stdio over a socket is in [architecture.md](architecture.md).

**Host to daemon**

| Message | Purpose |
| --- | --- |
| `image.open` | `{path}`. Returns an `imageId` plus identity: profile, architecture, kernel base, DTB, symbol table, size. Hashing runs in the background and reports through `image.hashed`. |
| `image.close` | Releases the worker and its Context. |
| `plugin.list` | The catalogue, including entries that failed to import and why. |
| `job.start` | `{imageId, plugin, args}`. Returns a `jobId`. |
| `job.cancel` | `{jobId}`. Must unwind the generator, not orphan a worker. |
| `shutdown` | Graceful stop. |

**Daemon to host**

| Message | Purpose |
| --- | --- |
| `hello` | Sent unprompted on start: daemon version, Python version, Volatility version, plugin count, missing optional dependencies. |
| `image.hashed` | `{imageId, sha256}` when background hashing finishes. |
| `job.started` | `{jobId, columns}`. Columns are the plugin's declared schema. |
| `job.rows` | `{jobId, seq, rows}`. Batched. |
| `job.progress` | `{jobId, done, note}`. `done` is 0 to 1 or null. |
| `job.done` | `{jobId, rows, elapsedMs}`. |
| `job.error` | `{jobId, kind, message, traceback}`. |
| `log` | Daemon-side logging surfaced in the UI's diagnostics. |

### Decisions to write down, not rediscover

- **Row shape is an array, not an object.** Volatility returns ordered columns.
  Sending `{"PID": 4, ...}` per row triples the bytes and loses column order.
  Columns arrive once in `job.started`.
- **Batch size is the daemon's choice**, bounded by both a row count and a byte
  budget, because one plugin's row is 40 bytes and another's is 4 KB.
- **`job.error` never kills the daemon.** A plugin that raises is a failed job,
  not a failed session. The Context survives.
- **Cancellation is cooperative.** The worker checks a flag between yields. A
  plugin stuck inside a single long scan cannot be interrupted mid-scan in this
  pass; say so in the UI rather than pretending.
- **The daemon never writes to the image.** Open read-only, and assert it.

### Exit criteria for Phase 0

1. `docs/protocol.md` describes every message with an example.
2. Every message has a JSON Schema, and the TypeScript and Python types are
   checked against those schemas by a test.
3. The mock daemon passes the full conformance suite.
4. `npm run daemon:mock` starts it, and a scripted session (open, list, run,
   cancel, close) round-trips.

## 4. Work packages

Each agent owns directories exclusively. If an agent needs a change outside its
territory, it writes the request into `docs/integration-notes.md` and the
orchestrator applies it. This is the only way to avoid merge conflicts across
four parallel branches.

### Agent A: Python daemon

**Owns** `daemon/`, `pyproject.toml`, `daemon/tests/`

**Does not touch** `src/`, `src-tauri/`, `tests/`

Build:

- A supervisor process that speaks the protocol on stdio.
- One worker process per open image, holding one `Context` and one layer stack
  for that image's lifetime. Jobs against an image are queued FIFO and run on
  that worker. **Never build a Context per plugin.**
- Plugin catalogue from `framework.list_plugins()`, plus the failure list from
  `framework.import_files(plugins, ignore_errors=True)`, forwarded verbatim.
- Streaming: iterate the plugin generator and emit `job.rows` as rows arrive.
  Do not materialise the full result.
- Cancellation that unwinds the generator and leaves the Context usable.
- Background SHA-256 with progress, skipped when size and mtime match a cached
  entry.

Pin as hard requirements, not optional extras: `pefile`, `yara-python`,
`pycryptodome`. Without the first, `windows.netscan` silently disappears; the
reasoning is in [analysis-workflows.md](analysis-workflows.md).

**Acceptance**

- Passes `tests/conformance/` identically to the mock.
- `pytest daemon/tests` green, including a test that a second plugin run against
  an already-open image does not call automagic again.
- Rows for `windows.pstree` and `windows.info` on the reference image match
  `vol.py --renderer=json` output exactly. See the oracle in section 6.

### Agent B: Tauri shell and broker

**Owns** `src-tauri/`

**Does not touch** `src/`, `daemon/`

Windows only for this pass. See section 8a.

Build:

- Tauri window, native open dialog, minimum window size 1280 by 720.
- Sidecar lifecycle: spawn the daemon, supervise it, kill it with the window,
  reap orphans on crash, restart with the UI told what happened.
- Job routing between the WebView and the daemon, with backpressure so a fast
  plugin cannot outrun the renderer.
- `.alcohol` read and write, per [case-file.md](case-file.md). Rust owns this
  because it owns the filesystem; the daemon stays focused on Volatility.
  Rows are appended as they stream, so a crash mid-run leaves a valid partial
  case.
- Bundle `LICENSE` and `NOTICE` into every artifact the packager emits. This is
  a licence obligation, not a nicety.

**Acceptance**

- `cargo test` green.
- Works end to end against the mock daemon with the real frontend.
- Killing the daemon process externally surfaces a visible error and offers a
  restart, rather than hanging.
- A written `.alcohol` reopens with results, highlights and notes intact, and
  round-trips through a schema check.

### Agent C: frontend integration

**Owns** `src/ipc/`, `src/state/`, and the wiring edits inside `src/App.tsx`

**Does not touch** `daemon/`, `src-tauri/`, and does not redesign components

The visual layer is finished. This is a data-source swap, not a redesign. If
something looks wrong, write it in `docs/integration-notes.md` rather than
restyling.

Build:

- A typed IPC client over the Tauri bridge, with the mock daemon reachable in
  the browser for development.
- Replace `src/data/` reads with live state: image identity, plugin catalogue,
  job results, streaming row buffers.
- States the fixtures never needed: connecting, image opening, hashing,
  automagic running, plugin failed, daemon died, image not found.
- Keep `src/data/` as fixtures for tests. Do not delete them.

**Acceptance**

- Every Playwright check still passes against the mock daemon.
- No component under `src/components/` changes shape, only its data source.
- A plugin that errors shows the error, keeps the tab, and leaves the rest of
  the session working.

### Agent D: test data, CI and performance harness

**Owns** `.github/workflows/`, `tools/`, `tests/perf/`

Build:

- `tools/fetch-test-images` that downloads the Volatility Foundation's public
  test data and verifies checksums. Sources, confirmed present in the upstream
  CI workflow:

  ```
  https://github.com/volatilityfoundation/volatility3-test-data/releases/download/v0.0.1/
    win-10_19041-2025_03.dmp.gz            <- primary reference image
    symbols_win-10_19041-2025_03.zip       <- symbols, so no PDB download in CI
    win-xp-laptop-2005-06-25.img.gz
    linux-sample-1.bin.gz
    linux.zip
  ```

  The Windows 10 19041 image is the primary reference because it is the same
  build the fixtures were written against.

- CI: fast job on every push (typecheck, unit, conformance, Playwright against
  the mock, house style). Slow job nightly and on demand (real image, oracle
  comparison, performance). The daemon and its tests run on Linux in CI; the
  packaged application is built and tested on Windows.
- The performance harness described in section 7.

**Acceptance**

- A clean checkout can run `npm run test:fast` with no image present.
- `npm run test:real` fetches, verifies and runs against the reference image.
- Images are never committed. `.gitignore` already blocks the extensions;
  confirm the download directory is covered too.

## 5. Milestones

Each milestone ends with something demonstrable. Do not start the next one with
the previous one's exit criteria unmet.

### M2.0 Contract freeze

Phase 0 above. **Exit:** mock daemon passes conformance; a scripted session
round-trips.

### M2.1 The daemon speaks

Agent A, against the conformance suite and the reference image.

**Exit:** from a terminal, without any UI, open the reference image and run
`windows.info` then `windows.pstree`, streaming, cancellable, with rows matching
the `vol.py` oracle.

### M2.2 The shell runs the daemon

Agent B, plus the first real contact between B and A.

**Exit:** launch the desktop app, pick an image through the native dialog, watch
the image bar fill with real identity data.

### M2.3 The UI runs on live data

Agent C.

**Exit:** the workspace screen works with no fixture data behind it. Process
tree, netscan, malfind and handles all come from Volatility. The `handles`
streaming surface shows a real generator, not a `setTimeout`.

### M2.4 Cases persist

Agent B completes the codec; Agent C wires the picker.

**Exit:** run four plugins, mark some rows, close, reopen. Results and marks are
there, the tabs say `cached`, and nothing re-ran.

### M2.5 Integration and measurement

Orchestrator.

**Exit:** the full suite is green, the performance numbers below are recorded in
`architecture.md`, and the numbers in `README.md` and `CLAUDE.md` are corrected
to whatever the real image says.

## 6. Test strategy

Seven layers, each answering a different question.

| Layer | Question | Tool | Runs |
| --- | --- | --- | --- |
| Unit, Python | Does this function work | pytest | every push |
| Unit, Rust | Does this function work | cargo test | every push |
| Conformance | Does this daemon obey the protocol | pytest and node, shared cases | every push |
| Oracle | Are our rows the same rows the CLI produces | pytest against `vol.py` | nightly |
| E2E on mock | Does the app work, deterministically | Playwright | every push |
| E2E on real | Does the app work against Volatility | Playwright, tagged | nightly and on demand |
| Non-functional | Contrast, house style, layout, performance | Playwright and the perf harness | every push, perf nightly |

### The oracle is the important one

`vol.py` with the JSON renderer is a correct implementation of every plugin we
run. Our daemon must produce the same rows for the same plugin and image. That
is a real correctness test, not a smoke test, and it catches the whole class of
bugs where a warm Context returns subtly different results from a cold one.

```
vol.py -q -r json -f <image> windows.pstree      >  expected.json
alcohol-daemon run <image> windows.pstree --json >  actual.json
diff, after normalising key order and float formatting
```

Start with `windows.info`, `windows.pstree`, `windows.psscan`,
`windows.netscan`, `windows.malware.malfind`, `windows.handles`. Extend as
plugins are enabled. Upstream keeps golden JSON of its own under
`volatility3/test/plugins/`, which is worth reading for the shape of these
comparisons.

### Conformance suite

One set of cases, two runners. Every case is a scripted exchange with expected
message shapes:

- open a nonexistent path, get a structured error, daemon stays alive
- open, list plugins, confirm the failure list is present and typed
- start a job, receive `job.started` with columns before any `job.rows`
- cancel mid-stream, receive `job.done` with `complete: false`, then run another
  job successfully on the same image
- start a plugin that raises, receive `job.error`, daemon stays alive
- two images open at once, jobs do not cross

### What the E2E tests must not do

Do not assert on absolute row counts from a real image. Builds change, symbols
change, and the test becomes a liability. Assert on structure: the tree has a
`System` process at PID 4, `netscan` returns rows with a plausible protocol
column, the streaming tab reaches its final count and stops.

The existing 38 checks stay and must keep passing. Three of them encode
decisions that are easy to regress:

- unavailable plugins stay listed and disabled, never hidden
- every text token clears WCAG AA
- no em dash or en dash anywhere in the repository

## 7. Performance harness

The premise of this whole design is that a warm Context is cheaper than a cold
one. That premise is currently unmeasured on a real image, and the plan is
worthless if it turns out to be wrong.

Measure and record, on the reference image:

| Number | Why |
| --- | --- |
| Interpreter start to `hello` | Fixed cost per daemon launch |
| `image.open` to identity ready | Automagic: DTB and kernel banner scan |
| First symbol table load | Cold, with symbols present locally |
| `windows.pstree` cold, first plugin on the image | Includes everything above |
| `windows.pstree` warm, second run | The claim |
| `windows.psscan` after pstree | A different plugin on the warm Context |
| The same two through `vol.py`, twice | What we are beating |

**Assertion to encode:** the second plugin against an open image completes in
materially less wall-clock time than the first, and both beat two separate
`vol.py` invocations. If that does not hold, stop and reconsider the
architecture rather than shipping the claim.

Then correct `README.md` and `CLAUDE.md`. They currently quote framework startup
figures measured without an image and say so; replace them with real ones.

## 8. Risks and open decisions

**Concurrency within one image is out of scope for this pass.** One worker per
image, jobs queued. Sharing a Context across threads is unsafe, and a second
worker on the same image pays automagic again. Queueing is honest; say so in the
UI. Revisit with a worker pool once the numbers from section 7 exist.

**Sidecar packaging is the most likely schedule risk.** Bundling a Python
runtime into a Tauri app is fiddly on every platform. Agent B should prove the
packaging path early, on Windows first, rather than leaving it to the end.

**Symbol download is a network call from a forensics tool.** The app must not
reach the network silently. Make it explicit, visible, and refusable, and record
in the case file whether symbols came from the bundle or the internet.

## 8a. Decisions already taken

Recorded here so no agent reopens them.

**Windows only for this pass.** The reference image is a Windows 10 build, and
Tauri uses WebView2 on Windows, which is Chromium, so the Playwright checks
already run against something close to the production runtime. Adding macOS
would bring a WKWebView test matrix and a second packaging path, which is the
schedule risk named above. Prove the daemon and the packaging on one platform
first.

Practical consequences for agents:

- Agent B targets WebView2 and a Windows installer. Do not spend time on
  cross-platform packaging yet, but do not hard-code Windows paths either:
  keep path handling and process spawning behind an abstraction so the second
  platform is a port, not a rewrite.
- Agent A must still work on Linux, because CI runs there and Volatility itself
  is cross-platform. The daemon has no reason to be Windows-specific.
- Agent D configures Playwright with the `chromium` project only. Add `webkit`
  when macOS support starts.

**Repository language is English.** Code, comments, interface strings,
documentation, commit messages, and now `README.md`, `CONTRIBUTING.md` and
`CLAUDE.md` as well. A public forensics tool has an international audience, and
a repository whose entry documents are in one language and whose code is in
another creates friction for both.

**`main` is the default branch.** Work flows `dev` into `main` into `release`,
as `CONTRIBUTING.md` describes. Pull requests target `dev`.

## 9. Definition of done for this pass

- A packaged desktop application opens a real memory image through a native
  dialog.
- Six plugins run against it and stream real rows: `windows.info`,
  `windows.pstree`, `windows.psscan`, `windows.netscan`,
  `windows.malware.malfind`, `windows.handles`.
- A long run reports progress and cancels cleanly.
- Closing and reopening the case restores results and highlights without
  re-running anything.
- Plugins whose dependencies are missing appear disabled with the reason.
- The full test suite is green, including the oracle against `vol.py`.
- The performance claim is measured and written down, or retracted.
