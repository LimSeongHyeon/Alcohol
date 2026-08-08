import type { TreeShape } from "../tree";

/**
 * The process hierarchy, drawn rather than spelled.
 *
 * It used to be a string of box-drawing characters ("│ │ └ "), which put the
 * structure at the mercy of the monospace metrics and gave nothing to click.
 * Now each ancestor level is a fixed-width lane with a real rule in it, the
 * elbow is drawn on the row's own lane, and a parent gets a disclosure control
 * so an analyst can fold away the half of the tree that is just Windows being
 * Windows.
 */
export function TreeCell({
  shape,
  depth,
  collapsed,
  onToggle,
  children,
}: {
  shape: TreeShape;
  depth: number;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <span className="tree">
      {shape.rails.map((on, i) => (
        <span key={i} className={on ? "tree-lane tree-lane-rail" : "tree-lane"} />
      ))}
      {depth > 0 && <span className={`tree-lane tree-elbow${shape.isLast ? " tree-elbow-last" : ""}`} />}

      {shape.hasChildren ? (
        <button
          className="tree-toggle"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand subtree" : "Collapse subtree"}
          title={collapsed ? "Expand" : "Collapse"}
        >
          <span className={`tree-chevron${collapsed ? " tree-chevron-closed" : ""}`} />
        </button>
      ) : (
        <span className="tree-toggle tree-toggle-empty" />
      )}

      <span className="tree-label">{children}</span>
    </span>
  );
}
