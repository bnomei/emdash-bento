/**
 * Frontend normalization for persisted bento layout JSON.
 *
 * Coerces migration mistakes (singleton rows/blocks, null holes) into stable
 * row and column shapes before Astro renderers map spans onto the 12-column grid.
 */
import { normalizeBlocks } from "@bnomei/emdash-blocks";
import {
  columnsToLayout,
  layoutColumnsPreservingExisting,
  normalizeLayoutPattern,
} from "./layout.js";
import type { LayoutBuilderColumn, LayoutBuilderRow, LayoutBuilderValue } from "./types.js";
import { asBlocksArray, isLayoutBuilderRow, isRecord } from "./value.js";

export { layoutGridSpans, layoutSpans, spanToGridColumns } from "./layout.js";
export { asBlocksArray, isLayoutBuilderRow } from "./value.js";

function normalizeLayoutColumn(
  column: LayoutBuilderColumn,
  rowIndex: number,
  columnIndex: number,
): LayoutBuilderColumn {
  const col = (isRecord(column) ? column : {}) as Partial<LayoutBuilderColumn>;
  return {
    id:
      typeof col.id === "string" && col.id
        ? col.id
        : `layout-${rowIndex + 1}-column-${columnIndex + 1}`,
    span: typeof col.span === "string" && col.span ? col.span : "1/1",
    blocks: normalizeBlocks(asBlocksArray(col.blocks)),
  };
}

/** Normalizes one row: fills ids/spans, aligns columns to the layout pattern, normalizes blocks. */
export function normalizeLayoutRow(layout: LayoutBuilderRow, rowIndex = 0): LayoutBuilderRow {
  const row = (isRecord(layout) ? layout : {}) as Partial<LayoutBuilderRow>;
  const storedColumns = Array.isArray(row.columns) ? row.columns : [];
  const normalizedColumns = storedColumns.map((column, columnIndex) =>
    normalizeLayoutColumn(column, rowIndex, columnIndex),
  );
  const layoutPattern =
    typeof row.layout === "string" && row.layout.trim()
      ? normalizeLayoutPattern(row.layout)
      : columnsToLayout(normalizedColumns);
  const columns = layoutColumnsPreservingExisting(
    layoutPattern,
    normalizedColumns,
    (columnIndex, span) => ({
      id: `layout-${rowIndex + 1}-column-${columnIndex + 1}`,
      span,
      blocks: [],
    }),
  );

  return {
    ...row,
    id: typeof row.id === "string" && row.id ? row.id : `layout-${rowIndex + 1}`,
    layout: columnsToLayout(columns),
    columns,
  };
}

/** Coerces a field value to a row array, wrapping a singleton row object when needed. */
export function asLayoutRows(
  value?: LayoutBuilderValue | LayoutBuilderRow | null,
): LayoutBuilderValue {
  if (Array.isArray(value)) return value;
  return isLayoutBuilderRow(value) ? [value] : [];
}

/** Normalizes every row in a layout value, tolerating null and primitive holes. */
export function normalizeLayoutRows(
  layouts?: LayoutBuilderValue | LayoutBuilderRow | null,
): LayoutBuilderValue {
  return asLayoutRows(layouts).map((layout, rowIndex) => normalizeLayoutRow(layout, rowIndex));
}

/** Normalized rows ready for frontend rendering (rows without columns are dropped). */
export function visibleLayoutRows(
  layouts?: LayoutBuilderValue | LayoutBuilderRow | null,
): LayoutBuilderValue {
  return normalizeLayoutRows(layouts).filter((layout) => Array.isArray(layout.columns));
}
