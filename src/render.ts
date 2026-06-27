import { normalizeBlocks } from "@bnomei/emdash-blocks";
import {
  columnsToLayout,
  layoutColumnsPreservingExisting,
  normalizeLayoutPattern,
} from "./layout.js";
import type { LayoutBuilderColumn, LayoutBuilderRow, LayoutBuilderValue } from "./types.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export { layoutGridSpans, layoutSpans, spanToGridColumns } from "./layout.js";

export function isLayoutBuilderRow(value: unknown): value is LayoutBuilderRow {
  if (!isRecord(value)) return false;
  if ("layout" in value) return true;
  // Scan every column for a span, not just columns[0]: legacy rows may carry
  // span only on a later column, which normalizeLayoutRow still accepts.
  const columns = Array.isArray(value.columns) ? value.columns : [];
  return columns.some((column) => isRecord(column) && "span" in column);
}

export function asBlocksArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  // Tolerate a singleton block object stored where an array was expected so it
  // is preserved (and editable) instead of throwing in render / being silently
  // emptied in admin and overwritten on the next save.
  return isRecord(value) ? [value] : [];
}

function normalizeLayoutColumn(
  column: LayoutBuilderColumn,
  rowIndex: number,
  columnIndex: number,
): LayoutBuilderColumn {
  // Tolerate null/primitive holes in the columns array the same way the admin
  // path does, rather than throwing on a property access during render.
  const col = (isRecord(column) ? column : {}) as Partial<LayoutBuilderColumn>;
  return {
    id:
      typeof col.id === "string" && col.id
        ? col.id
        : `layout-${rowIndex + 1}-column-${columnIndex + 1}`,
    span: typeof col.span === "string" && col.span ? col.span : "1/1",
    blocks: normalizeBlocks(asBlocksArray(col.blocks) as LayoutBuilderColumn["blocks"]),
  };
}

export function normalizeLayoutRow(layout: LayoutBuilderRow, rowIndex = 0): LayoutBuilderRow {
  // Tolerate messy persisted JSON (null/undefined/primitive holes in the
  // layouts array) the same way the admin path does, rather than throwing on
  // a property access and aborting the render.
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

export function asLayoutRows(value?: LayoutBuilderValue | LayoutBuilderRow | null): LayoutBuilderValue {
  if (Array.isArray(value)) return value;
  // Tolerate a singleton row object persisted where an array was expected
  // (e.g. a migration that stored one row instead of [row]) instead of
  // throwing in render or silently discarding it in admin.
  return isLayoutBuilderRow(value) ? [value] : [];
}

export function normalizeLayoutRows(
  layouts?: LayoutBuilderValue | LayoutBuilderRow | null,
): LayoutBuilderValue {
  return asLayoutRows(layouts).map((layout, rowIndex) => normalizeLayoutRow(layout, rowIndex));
}

export function visibleLayoutRows(
  layouts?: LayoutBuilderValue | LayoutBuilderRow | null,
): LayoutBuilderValue {
  return normalizeLayoutRows(layouts).filter((layout) => Array.isArray(layout.columns));
}
