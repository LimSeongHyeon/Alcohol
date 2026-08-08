# Alcohol: project instructions

A desktop memory forensics interface for Volatility 3. Tauri (Rust) plus React
and TypeScript, with a Python sidecar daemon.

Windows is the only target platform for the current pass. Other platforms come
later, once the daemon and the packaging path are proven.

## Language

Everything inside the repository is written in English: code, identifiers,
comments, interface strings, documentation and commit messages.

## House style

**Never use an em dash (`U+2014`) or an en dash (`U+2013`).** Anywhere. Rewrite
the sentence instead of substituting a hyphen: a comma, a colon, a full stop or
parentheses will carry the same structure. For an absent value in a table, use a
plain hyphen. For a numeric range, write "0 to 1".

`tests/house-style.spec.ts` enforces this across every tracked file. `LICENSE`
is exempt because it is upstream text that must stay byte-identical.

## Licence: not negotiable

This repository is under the **Volatility Software License v1.0**. It cannot be
changed to MIT, Apache, BSD or GPL.

The `Copyleft` section of Volatility 3's VSL includes this in "Additions":

> any software designed to execute the software and parse its results, such as a
> wrapper written for the software

Calling it through a subprocess and parsing the output still counts. The linking
strategy is irrelevant. The carve-out for a general execution shell or menu does
not apply to a Volatility-specific interface.

Therefore:

- `LICENSE` is the full VSL v1.0 text and **is never edited, not by one
  character.** Our own copyright notice lives separately in `NOTICE`.
- Do not bring in code under another licence. Check the licence before adding
  any dependency.
- Do not combine this repository or its artifacts with an LGPL or GPL project.
- Volatility 2 (GPLv2, Python 2, end of life) is not adopted as a dependency.
- **"Volatility" does not appear in package names, binary names, logos or
  domains.** VSL grants no trademark rights. Use the name only in documentation,
  to refer to the upstream software.
- Every artifact ships `LICENSE` and `NOTICE`.
- Violation terminates the licence immediately. There is no cure period.

GitHub showing the licence as `unknown` is expected, because VSL is not
OSI-approved. Do not "fix" that by switching licences.

## Public repository: commit hygiene

This is a forensics tool and the repository is public. **A memory image or an
analysis artifact reaching a commit is an incident.**

- Check `git status` for new files before committing. Look at what is being
  staged.
- `.gitignore` blocks `*.raw`, `*.mem`, `*.vmem`, `*.dmp`, `*.E01`, `*.alcohol`,
  and `evidence/`, `samples/`, `dumps/`, `output/`. It is a safety net, not a
  plan.
- Avoid `git add -A` and `git add .`. Stage explicit paths.
- Redact user names, paths and addresses before pasting real analysis output
  into an issue or a commit message.
- If a test fixture needs an image, take the path from an environment variable.

## Architecture: performance decides the design

Confirmed by reading the Volatility 3 source, not assumed.

**Do not expect parallelism.** `constants.PARALLELISM` defaults to `Off`, and
even enabled it only covers the body of `TranslationLayerInterface.scan()`. The
scanner must set `thread_safe = True`, and the interface default is `False`.
Result post-processing and scan-address generation are serial. The foundation's
own documentation says the gain is not significant.

**The real cost is initialisation.** Framework startup measured on this machine,
197 plugins, no image loaded:

| | import | discovery | total |
| --- | --- | --- | --- |
| cold (no `.pyc`) | 0.34s | 1.34s | 1.68s |
| warm | 0.27s | 0.44s | 0.71s |

Python interpreter startup sits on top of that. It is a fixed cost of at least
0.7 seconds every time a process is spawned.

**These numbers were measured without an image.** Opening a real one adds
automagic (the DTB and kernel banner scan) and symbol table loading, and those
are heavier. They have not been measured yet. Measure them when an image is
available and update this table. Do not write estimates as if they were
measurements.

The rules that follow:

1. **Reuse the Context.** The Python daemon is long-running and builds one
   `Context` and layer stack per image. `_translate_entry` in `intel.py:184` is
   an `lru_cache(maxsize=1024)` bound to the layer instance. Discard the Context
   and the cache goes with it. **Spawning `vol.py` per plugin is forbidden.**
2. **Concurrency belongs between plugins.** Do not split one plugin's work.
   Run different plugins in separate worker processes. Never share one Context
   across threads: neither the layer objects nor their caches are documented as
   thread-safe.
3. **Stream results.** Plugins are generators. Send rows to the interface as
   they arrive rather than waiting for completion.
4. **Preserve the symbol cache.** The sqlite cache and ISF files under
   `~/.cache/volatility3` are reused. Do not let a daemon restart invalidate
   them.

## Plugin availability: silent failure is not allowed

`framework.import_files(plugins, True)` **silently skips** plugins that fail to
import. Measured:

| Installed | Plugins loaded |
| --- | --- |
| nothing | 166 |
| `pefile` | 191 |
| `+ yara-python` | 191 |
| `+ pycryptodome` | **197** |

Missing `pefile` alone removes `windows.netscan`, one of the most used plugins
there is. Without `yara-python` there is no `yarascan` or `mftscan`. Without
`pycryptodome` there is no `hashdump`, `lsadump` or `cachedump`.

In a forensics tool this is serious. An analyst looking for network connections
who does not find `netscan` in the list may read that as **"there were no
connections"** rather than as a broken installation.

So:

- `pefile`, `yara-python` and `pycryptodome` are **required dependencies, not
  optional extras.** Pin them in the daemon's requirements.
- The daemon collects the failure list from `import_files` at startup and
  forwards it to the interface.
- The interface shows unavailable plugins **disabled, with the reason, never
  hidden.** Disappearing from the list is forbidden.

## Interface quality

Interface quality matters as much as function here. Use the `design` plugin
skills for UI work and the `tone` skill for user-facing text.

What a forensics tool specifically demands:

- Data density is high. Design tables of tens of thousands of rows around
  virtual scrolling from the start.
- Analysis takes a long time. Progress and cancellation are first-class, not a
  spinner.
- Analysts compare results. Several plugin outputs need to be viewable side by
  side.
- Analysts look at this for hours. Dark theme by default, and every text tone
  must clear WCAG AA. `tests/house-style.spec.ts` and the contrast checks in
  `tests/workspace.spec.ts` hold the line.

## Colour has one job

The interface chrome is achromatic. Selection, hover and focus are expressed in
lightness alone. Saturation is reserved for meaning, in two separate channels:

- A **verdict** is the tool's own observation. Small, solid, saturated: a stripe
  at the row's leading edge.
- A **highlight** is applied by the analyst. Large, translucent, desaturated:
  the row fill.

A row can carry both and still be read. Do not spend colour on anything else.

## Where to look

| Document | Contents |
| --- | --- |
| `docs/implementation-plan.md` | The current work plan, agent assignments, milestones, tests |
| `docs/architecture.md` | Process model, protocol, why not `vol.py` per plugin |
| `docs/analysis-workflows.md` | Research behind the interface's structure |
| `docs/case-file.md` | The `.alcohol` container format |
| `docs/roadmap.md` | Milestones beyond the current pass |
