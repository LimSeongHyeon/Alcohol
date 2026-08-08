import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

// Built from code points, not typed literally: this file is scanned too.
const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);

/**
 * Em dashes are banned in this repository, in prose and in anything the UI
 * renders. En dashes go with them: they read as the same punctuation at a
 * glance and creep back in the same way.
 *
 * A checked rule beats a remembered one. This test is here so the ban survives
 * the next person who did not read the contributing guide.
 */
test("no em or en dashes anywhere in the repository", () => {
  const files = execFileSync("git", ["ls-files"], { encoding: "utf8" })
    .split("\n")
    .map((f) => f.trim())
    .filter(Boolean)
    // The licence text is upstream's and must stay byte-identical.
    .filter((f) => f !== "LICENSE");

  const offenders: string[] = [];

  for (const file of files) {
    let text: string;
    try {
      text = readFileSync(file, "utf8");
    } catch {
      continue; // binary or unreadable
    }
    text.split("\n").forEach((line, i) => {
      if (line.includes(EM_DASH) || line.includes(EN_DASH)) {
        offenders.push(`${file}:${i + 1}: ${line.trim()}`);
      }
    });
  }

  expect(offenders, `Use a comma, a colon, or a full stop instead:\n${offenders.join("\n")}`).toEqual([]);
});
