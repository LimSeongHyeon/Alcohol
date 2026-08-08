# How analysts actually work, and what that means for the UI

This document records the research behind the interface's information
architecture. It is not a survey of everything Volatility can do — it is an
account of what practitioners reach for, in what order, and what that demands
of a GUI.

## The methodology everything is built on

Memory analysis in incident response follows the six-step method taught in SANS
FOR508. Every cheat sheet, blog post and training course found during this
research organises around it, explicitly or not:

1. **Identify rogue processes** — what was running, and what is hiding
2. **Analyse process objects** — DLLs, handles, tokens, command lines
3. **Review network artifacts** — connections and their owners
4. **Look for evidence of code injection** — executable memory with no file behind it
5. **Check for signs of a rootkit** — hooks, unlinked modules, tampered tables
6. **Dump suspicious processes and drivers** — carve artifacts for further analysis

This ordering is not arbitrary and it is not decorative. It is a dependency
chain: you cannot judge whether an executable memory region is suspicious until
you know which processes are real, and you cannot decide what to dump until you
know what is suspicious.

**Consequence for the UI.** The plugin navigator is grouped by these six phases
and the groups are numbered, because the sequence carries information the
analyst needs. Supplementary groups — registry, timeline, credentials, pattern
scanning — are listed after, unnumbered, because they have no inherent order.

Alphabetical or namespace-based grouping was rejected. `windows.malware.malfind`
and `windows.malware.ldrmodules` sit next to each other in the namespace and
also in the workflow, but `windows.netscan` and `windows.netstat` are separated
from `windows.registry.*` by nothing except a string sort. Grouping by the
framework's module layout would make the tool organised around its own internals
instead of around the job.

## Two patterns that appeared in every source

### Cross-referencing is a primary action, not a feature

The oldest reliable trick in memory forensics is comparing two ways of finding
the same thing. `pslist` walks `ActiveProcessLinks`; `psscan` pool-scans for
`_EPROCESS` structures. A process present in the scan but absent from the walk
has been unlinked — the classic direct kernel object manipulation signal.
`psxview` exists solely to automate that comparison across seven sources, and
`svcdiff` does the same for services.

**Consequence for the UI.** Comparison must be a first-class view, not an export
followed by a diff in another tool. The demo carries `list walk: present /
absent` and `pool scan: present / absent` on the process record, and a
**Compare** action in the result toolbar. Two result sets need to be viewable
side by side with their differences marked.

### Analysts pivot on a process, not on a plugin

The observed working pattern is: find a suspicious PID, then run six or seven
plugins scoped to it. `cmdline` to see how it was launched, `dlllist` for
reflectively loaded modules, `handles` for what it had open, `malfind` for
injected regions, `vadinfo` for the memory map, `privileges` for what it could
do.

The CLI makes this laborious — each step is a fresh command with a repeated
`--pid`. Worse, with a subprocess-per-invocation design each one re-pays the
framework startup and symbol loading cost.

**Consequence for the UI.** The selected row owns a persistent inspector, and
every process-scoped plugin is one click from it, pre-bound to the PID. This is
also the strongest argument for the warm-context daemon: this pattern issues
many small plugin runs against one image in quick succession, which is precisely
the case a cold subprocess design handles worst.

## What gets run first

Across the practitioner sources, triage converges on a small set:

| Plugin | What it answers |
| --- | --- |
| `windows.info` | Is this image even parseable, and what is it |
| `windows.pstree` | What was running, and what spawned what |
| `windows.cmdline` | How was it launched — encoded PowerShell, LOLBins |
| `windows.netscan` | Who was talking to whom |
| `windows.malware.malfind` | Executable private memory |

Suspicious parentage is the single highest-signal thing in the tree: Office
applications spawning shells, `svchost.exe` outside `services.exe`, anything
running from `AppData`. Encoded PowerShell command lines are the other reliable
tell.

**Consequence for the UI.** The process tree is the default view and it decodes
`-enc` payloads inline rather than making the analyst paste base64 elsewhere.
Findings state the observation and leave the conclusion to the analyst: "Word
has no legitimate reason to launch PowerShell" is evidence; "this is malware" is
not something the tool gets to say.

## What the interface must not do

**Never hide an unavailable plugin.** Volatility's
`framework.import_files(plugins, ignore_errors=True)` silently drops plugins
whose imports fail. Measured on a clean interpreter:

| Installed | Plugins loaded |
| --- | --- |
| none | 166 |
| `pefile` | 191 |
| `+ yara-python` | 191 |
| `+ pycryptodome` | 197 |

Missing `pefile` alone removes `windows.netscan` — one of the five triage
plugins above. An analyst who opens the network phase, finds nothing there, and
concludes the host had no connections has been actively misled by the tool.

Unavailable plugins therefore stay in the navigator, disabled, labelled with the
dependency that is missing. The three credential plugins in the demo are shown
in exactly this state.

**Never let a long run look like a hang.** Scanning plugins on a large image run
for minutes. Progress and cancellation are part of the result surface, and rows
stream into the table as the generator yields them rather than appearing all at
once at the end.

**Never let colour be decoration.** The interface is achromatic. Saturated
colour is reserved for verdicts, so that a coloured row in a list of forty
thousand always means something.

## Sources

- [SANS FOR508 memory forensics cheat sheet](https://dfir.com.br/pdf/memory-forensics-cheat-sheet.pdf)
- [SANS six-part methodology, in *Digital Forensics and Incident Response*](https://www.oreilly.com/library/view/digital-forensics-and/9781787288683/c18a3aad-ef94-49fe-abc8-0b48d790cbe7.xhtml)
- [Volatility 3 cheat sheet — Ashley Pearson](https://blog.onfvp.com/post/volatility-cheatsheet/)
- [Memory forensics with Volatility 3: what attackers leave behind](https://hivesecurity.gitlab.io/blog/memory-forensics-volatility-attack-detect/)
- [Volatility 3 documentation](https://volatility3.readthedocs.io/en/latest/)
- Plugin inventory and dependency gating measured directly against
  `volatilityfoundation/volatility3` at commit `fffd844`.
