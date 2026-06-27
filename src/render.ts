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

export { layoutSpans, spanToGridColumns } from "./layout.js";

export function isLayoutBuilderRow(value: unknown): value is LayoutBuilderRow {
  const columns = isRecord(value) && Array.isArray(value.columns) ? value.columns : [];
  return isRecord(value) && ("layout" in value || "span" in (columns[0] ?? {}));
}

function normalizeLayoutColumn(
  column: LayoutBuilderColumn,
  rowIndex: number,
  columnIndex: number,
): LayoutBuilderColumn {
  return {
    id:
      typeof column.id === "string" && column.id
        ? column.id
        : `layout-${rowIndex + 1}-column-${columnIndex + 1}`,
    span: typeof column.span === "string" && column.span ? column.span : "1/1",
    blocks: normalizeBlocks(column.blocks),
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
