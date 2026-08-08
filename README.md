# Alcohol

A desktop memory forensics interface for Volatility 3.

> **Early development.** There is no working application yet. The interface is
> built and runs against fixtures; nothing behind it is real. See
> [docs/implementation-plan.md](docs/implementation-plan.md) for what happens
> next.

## Why

Volatility 3 is a good framework behind a command line. Every plugin is a fresh
command, results arrive as text you cannot sort or filter, and following a
process tree means reading output with your eyes.

It is also easy to make slow. Starting the framework alone costs about 0.7
seconds warm and 1.7 cold, just to discover its 197 plugins. Add interpreter
startup, then automagic and symbol loading when an image is opened. A GUI that
spawns `vol.py` per plugin pays all of that again on every click.

Alcohol takes a different shape.

- **A warm context.** Volatility 3 lives inside a long-running Python daemon
  that builds one `Context` and one layer stack per image. The page table
  translation cache in `intel.py` and the loaded symbol tables survive between
  plugin runs.
- **Concurrency between plugins, not inside them.** Volatility's own
  `--parallelism` only covers the body of a scan, and the foundation's
  documentation says the gain is small. Running different plugins in separate
  worker processes is where the time actually is.
- **Streaming results.** Plugins are generators. Rows reach the table as they
  are produced rather than after the run finishes.

## Stack

| Layer | Technology |
| --- | --- |
| Shell | Tauri (Rust) |
| Interface | React and TypeScript |
| Analysis | Volatility 3 in a Python sidecar daemon, JSON over stdio |

Windows first. Other platforms once the daemon and the packaging path are
proven.

## Licence

**This project is under the Volatility Software License v1.0.** The full text is
in [LICENSE](LICENSE), and the canonical copy is at
[volatilityfoundation.org/license/vsl-v1.0](https://www.volatilityfoundation.org/license/vsl-v1.0).

Not MIT, not Apache, not GPL. There was no choice to make.

The `Copyleft` section of VSL v1.0 defines "Additions" like this:

> "Additions" also includes any software designed to execute the software and
> parse its results, such as a wrapper written for the software, but does not
> include shell or execution menu software designed to execute software
> generally.

Alcohol is software that executes Volatility 3 and parses its results. That is
the definition of a wrapper, so it is an Addition. Calling it in a separate
process makes no difference, because the licence text does not distinguish
between linking strategies. The carve-out for a general execution shell does not
apply either: Alcohol is a Volatility-specific interface, not a launcher that
will run anything you point it at.

So the whole source is published, which is what the licence asks for.

**This project is not affiliated with or endorsed by the Volatility
Foundation.**

VSL grants no trademark rights (`Trademarks: This license grants you no rights
to any trademarks or service marks.`). The name "Volatility" appears here only
to identify the upstream software this project works with, never in the project
name, package names or logo.

Two things worth knowing:

- VSL is not an OSI-approved licence. GitHub cannot classify it automatically
  and may show the licence as `unknown`. That is expected.
- VSL terminates immediately on violation (`Termination`). There is no cure
  period.

Copyright notices are in [NOTICE](NOTICE).

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) first. Two points matter most.

**Never commit a memory image.** Memory dumps contain passwords, session tokens,
private keys and personal data exactly as they were in RAM. Once one reaches a
public repository you cannot take it back. `.gitignore` blocks the common
extensions, but that is a safety net, not a plan. Keep evidence outside the
working tree.

**Contributions arrive under VSL v1.0**, which also means code under other
licences cannot be brought in.

## Related work

- [VolWeb](https://github.com/k1nd0ne/VolWeb): a web-based collaborative
  forensics platform (GPL-3.0)
- [Orochi](https://github.com/LDO-CERT/orochi): distributed memory forensics
  (MIT)

Both ship under licences other than VSL. Reading the Addition clause literally,
they arguably should not. Alcohol takes the literal reading.
