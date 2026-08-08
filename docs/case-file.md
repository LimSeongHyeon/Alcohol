# The `.alcohol` case file

A case is a Zip archive holding everything an analyst produced against one
memory image, and nothing else. Its whole purpose is that reopening an image
should not re-run work that has already been done: `windows.filescan` on a
16 GiB server image is minutes of scanning, and an analyst who closes the tool
at 18:00 should not pay for it again at 09:00.

## What it is not

**It never contains the image.** Not a copy, not a slice, not a carved region.
The archive records a hash and a path and nothing else about the file itself.
Anything that would put evidence bytes inside a document analysts email to each
other is out.

**It is still sensitive.** Plugin output carries user names, file paths, IP
addresses, registry contents and command lines. A case file is not evidence, but
it is not safe to publish either. `.gitignore` excludes `*.alcohol`.

## Layout

```
IR-2026-0431.alcohol          (Zip, deflate)
├── manifest.json             format version, tool version, timestamps
├── image.json                identity of the image this case belongs to
├── runs/
│   ├── windows.pstree.PsTree/
│   │   ├── meta.json         arguments, timing, provenance, column schema
│   │   └── rows.jsonl        one JSON array per row, in plugin order
│   └── windows.netscan.NetScan/
│       ├── meta.json
│       └── rows.jsonl
├── annotations.json          highlights and per-row notes
└── notes/
    └── 01-timeline.md        free-form analyst notes
```

Rows are JSONL because plugins are generators: the daemon can append a line as
each row arrives, so a case survives a crash mid-run with everything up to that
point intact. Zip's deflate handles compression, so the format stays greppable
when someone needs to debug it.

## `image.json`

```jsonc
{
  "sha256": "9f2c41a0e7b8…",
  "sizeBytes": 8589934592,
  "lastKnownPath": "E:\\cases\\IR-2026-0431\\WS-FIN-04.raw",
  "profile": "Windows 10 19041.1949",
  "architecture": "Intel64",
  "kernelBase": "0xf8022c600000",
  "dtb": "0x1ad000",
  "symbolTable": "ntkrnlmp.pdb/1B4A9F0C…/ISF"
}
```

**The hash is the identity, the path is a hint.** Move the image and the case
still matches it. Put a different image at the same path and the case refuses
it. The recent-case list shows "image not found" when the path no longer
resolves; the case still opens, results and all, and only re-running a plugin
requires locating the file again.

Hashing eight gigabytes takes time. The daemon hashes on first open and stores
it; on reopen it verifies size and mtime first and only re-hashes when those
disagree.

## `runs/<plugin>/meta.json`

```jsonc
{
  "plugin": "windows.netscan.NetScan",
  "arguments": {},
  "startedAt": "2026-08-05T11:04:19Z",
  "elapsedMs": 2870,
  "rowCount": 16,
  "complete": true,
  "columns": [
    { "name": "Offset", "type": "int" },
    { "name": "Proto", "type": "str" }
  ],
  "provenance": {
    "volatility": "2.28.2",
    "framework": "2.28.0",
    "symbolTable": "ntkrnlmp.pdb/1B4A9F0C…/ISF"
  }
}
```

Three fields exist to stop the cache from lying:

- **`columns`** is the schema the plugin declared at run time. Volatility
  plugins do change their columns between releases. Reopening a case whose
  stored columns disagree with the installed plugin must surface that, not
  quietly render rows against the wrong headers.
- **`provenance.volatility`** records who produced the rows. If the installed
  version differs, the result is still shown — it was true when it was
  produced — but labelled with the version that produced it. The analyst decides
  whether to re-run.
- **`complete`** is false for a run that was cancelled or interrupted. A partial
  result is worth keeping and must never be mistaken for a full one.

A cached run is offered as-is when the plugin, the arguments and the column
schema all match. Anything else is presented as re-runnable, with the reason
stated.

## `annotations.json`

```jsonc
{
  "highlights": {
    "windows.pstree.PsTree": { "p4412": "amber", "p5120": "rose" }
  },
  "notes": {
    "windows.pstree.PsTree": {
      "p3204": "Decoded payload matches the IOC list from the client."
    }
  }
}
```

Keys are row keys, not row indices. A row key is derived from the row's own
natural identity — the PID for a process, the pool offset for a scanned
object — so a highlight stays attached to the right row after filtering,
sorting, collapsing, or a re-run that returns rows in a different order. Indices
would silently reattach a mark to a different process, which in a forensics tool
is worse than losing it.

## Versioning

`manifest.json` carries `formatVersion`. The reader accepts its own version and
older ones; a newer version is refused with the version numbers named rather
than partially parsed. Format changes that drop or reinterpret a field require a
major bump.

## Status

Designed, not built. The UI surfaces it — the case picker, the `cached` badges
on tabs, the unsaved-changes dot — against fixtures. Writing and reading the
archive belongs to M2, alongside the daemon that produces the rows.
