/**
 * Table selection.
 *
 * `primary` is the row the inspector follows — the last one touched, which is
 * not necessarily the last one in the range. `anchor` is where a Shift range
 * measures from, and it deliberately survives a Shift-click so that dragging a
 * range wider or narrower pivots around the same point, the way every file
 * manager behaves.
 */
export interface Selection {
  keys: Set<string>;
  primary: string | null;
  anchor: string | null;
}

export const emptySelection = (): Selection => ({ keys: new Set(), primary: null, anchor: null });

export const singleSelection = (key: string): Selection => ({
  keys: new Set([key]),
  primary: key,
  anchor: key,
});

/** Inclusive range between two keys, in the order the rows are currently in. */
export function keysBetween(orderedKeys: string[], a: string, b: string): string[] {
  const ia = orderedKeys.indexOf(a);
  const ib = orderedKeys.indexOf(b);
  if (ia < 0 || ib < 0) return [b];
  const [lo, hi] = ia <= ib ? [ia, ib] : [ib, ia];
  return orderedKeys.slice(lo, hi + 1);
}

/**
 * Resolves a click into the next selection.
 *
 * Plain replaces, Ctrl/Cmd toggles one, Shift takes the range from the anchor,
 * and Ctrl+Shift adds a range to what is already there.
 */
export function selectionFromClick(
  current: Selection,
  orderedKeys: string[],
  key: string,
  modifiers: { shift: boolean; additive: boolean },
): Selection {
  if (modifiers.shift && current.anchor) {
    const range = keysBetween(orderedKeys, current.anchor, key);
    return {
      keys: modifiers.additive ? new Set([...current.keys, ...range]) : new Set(range),
      primary: key,
      anchor: current.anchor,
    };
  }

  if (modifiers.additive) {
    const keys = new Set(current.keys);
    if (keys.has(key)) keys.delete(key);
    else keys.add(key);
    return { keys, primary: key, anchor: key };
  }

  return singleSelection(key);
}

/** Arrow-key movement. Shift extends from the anchor instead of replacing. */
export function selectionFromKeys(
  current: Selection,
  orderedKeys: string[],
  nextKey: string,
  shift: boolean,
): Selection {
  if (!shift) return singleSelection(nextKey);
  const anchor = current.anchor ?? current.primary ?? nextKey;
  return { keys: new Set(keysBetween(orderedKeys, anchor, nextKey)), primary: nextKey, anchor };
}
