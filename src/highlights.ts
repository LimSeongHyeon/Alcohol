/**
 * Analyst-applied row marking.
 *
 * Distinct from a verdict: a verdict is the tool's observation, a highlight is
 * the analyst's. Five is deliberate — enough to separate threads of an
 * investigation ("attacker processes", "already ruled out", "ask the client"),
 * few enough that the meanings stay in the analyst's head.
 */

export const HIGHLIGHTS = [
  { id: "amber", label: "Amber", fillVar: "--hl-amber", solidVar: "--hl-amber-solid" },
  { id: "rose", label: "Rose", fillVar: "--hl-rose", solidVar: "--hl-rose-solid" },
  { id: "violet", label: "Violet", fillVar: "--hl-violet", solidVar: "--hl-violet-solid" },
  { id: "teal", label: "Teal", fillVar: "--hl-teal", solidVar: "--hl-teal-solid" },
  { id: "green", label: "Green", fillVar: "--hl-green", solidVar: "--hl-green-solid" },
] as const;

export type HighlightId = (typeof HIGHLIGHTS)[number]["id"];

const byId = new Map(HIGHLIGHTS.map((h) => [h.id as HighlightId, h]));

export const highlightFill = (id: HighlightId | null | undefined): string | undefined =>
  id ? `var(${byId.get(id)?.fillVar})` : undefined;

/** Keyed by row key, so a mark survives sorting and filtering. */
export type HighlightMap = Record<string, HighlightId>;
