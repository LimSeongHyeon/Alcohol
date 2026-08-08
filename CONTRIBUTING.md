# Contributing

## Read this first: never commit a memory image

A memory dump holds everything that was in RAM at capture time. Passwords,
session tokens, private keys, browser history, document contents. Once one
reaches a public repository, reverting the commit does not undo it: forks,
clones, caches and crawlers keep their copies.

So:

- Keep evidence outside the repository. Do not rely on `.gitignore`; do not put
  the file in the working tree in the first place.
- If a test needs an image, take the path from an environment variable. Never
  check the file in.
- When pasting output into a bug report, redact process names, paths, user names
  and addresses.
- Run `git status` and `git diff --stat` before you push.

`.gitignore` blocks the usual extensions (`*.raw`, `*.mem`, `*.vmem`, `*.dmp`,
`*.E01`) and directories (`evidence/`, `samples/`, `dumps/`), plus `*.alcohol`
case files, which are not evidence but still carry user names, paths and
registry contents. It is a safety net, not a plan.

## Licence

Contributions arrive under the **Volatility Software License v1.0**. Opening a
pull request means accepting that.

In practice:

- Code under MIT, Apache-2.0, BSD or GPL cannot be brought in. The terms differ.
- Adding a dependency is a separate question, but LGPL and GPL libraries may
  conflict with VSL's full-disclosure requirement. Raise it in an issue first.
- Do not remove copyright notices from any source. That is VSL's `Notices`
  section.
- Volatility 2 is GPLv2, Python 2 based, and unsupported upstream. It will not
  be adopted as a dependency.

The name is constrained too. VSL grants no trademark rights, so **"Volatility"
does not appear in package names, binary names, logos or domains.** It is used
only in documentation, to refer to the upstream software.

## Branches

```
dev  ──▶  main  ──▶  release
```

- **`dev`** is the working branch. Feature branches start here and merge back
  here.
- **`main`** is the integration branch. Work arrives from `dev`.
- **`release`** is where tags are cut and release artifacts are built.

Workflow:

```bash
git switch dev
git switch -c feat/process-tree
# work, commit
git push -u origin feat/process-tree
```

Pull requests target `dev`. Do not commit directly to `main` or `release`; they
only receive merges.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/).

```
feat(daemon): reuse Context across plugin runs
fix(ui): keep row selection when the result stream appends
docs(license): clarify the Addition clause
perf(daemon): warm the page-table cache on image open
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`,
`ci`, `chore`

## House style

**No em dash (`U+2014`) and no en dash (`U+2013`).** This covers code comments,
documentation, interface strings and commit messages. Use a comma, a colon, a
full stop or parentheses instead. `tests/house-style.spec.ts` scans every
tracked file and fails if either character appears anywhere. It cannot even be
quoted in this paragraph, which is why the code points are written out.

`LICENSE` is the one exception. It is upstream text and stays byte-identical.

## Release artifacts

VSL's `Notices` section requires that everyone who receives a copy of the
software also receives the licence text or a link to it. So every artifact the
packager emits, whether installer, archive or container image, ships `LICENSE`
and `NOTICE` alongside it. If you touch the packaging configuration, check that
both files are still included.
