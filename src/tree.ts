/**
 * Tree geometry for a flat, pre-ordered list of rows carrying a depth.
 *
 * Volatility's pstree emits exactly that shape, so the UI never builds a nested
 * structure. It computes where the connector lines go and draws them.
 */

export interface TreeShape {
  /** True when the row is the last child under its parent. */
  isLast: boolean;
  /** One entry per ancestor level: does a vertical line pass through here? */
  rails: boolean[];
  /** True when at least one row is nested under this one. */
  hasChildren: boolean;
}

export function computeTree(depths: number[]): TreeShape[] {
  const n = depths.length;
  const isLast = new Array<boolean>(n).fill(true);
  const hasChildren = new Array<boolean>(n).fill(false);

  for (let i = 0; i < n; i++) {
    const d = depths[i] ?? 0;
    for (let j = i + 1; j < n; j++) {
      const dj = depths[j] ?? 0;
      if (dj <= d) {
        if (dj === d) isLast[i] = false;
        break;
      }
      hasChildren[i] = true;
    }
  }

  const out: TreeShape[] = [];
  // stack[L] answers "does the ancestor occupying level L have siblings still to
  // come?", which is exactly when a vertical line must pass through column L.
  const stack: boolean[] = [];
  for (let i = 0; i < n; i++) {
    const d = depths[i] ?? 0;
    stack.length = d;
    out.push({
      isLast: isLast[i] ?? true,
      rails: stack.slice(0, Math.max(0, d - 1)),
      hasChildren: hasChildren[i] ?? false,
    });
    stack[d] = !(isLast[i] ?? true);
  }
  return out;
}

/**
 * Hides every descendant of a collapsed row. Operates on the flat list, so a
 * collapsed ancestor removes its whole subtree in one pass.
 */
export function applyCollapse<T extends { depth: number }>(
  rows: T[],
  isCollapsed: (row: T, index: number) => boolean,
): T[] {
  const out: T[] = [];
  let hiddenBelow: number | null = null;
  rows.forEach((row, i) => {
    if (hiddenBelow !== null) {
      if (row.depth > hiddenBelow) return;
      hiddenBelow = null;
    }
    out.push(row);
    if (isCollapsed(row, i)) hiddenBelow = row.depth;
  });
  return out;
}
