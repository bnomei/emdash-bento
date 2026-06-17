import { normalizeBlocks } from "@bnomei/emdash-blocks";
import { columnsToLayout, layoutColumns, normalizeLayoutPattern } from "./layout.js";
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
  const columns = Array.isArray(layout.columns) ? layout.columns : [];
  const normalizedColumns = columns.map((column, columnIndex) =>
    normalizeLayoutColumn(column, rowIndex, columnIndex),
  );
  const layoutPattern =
    typeof layout.layout === "string" && layout.layout.trim()
      ? normalizeLayoutPattern(layout.layout)
      : columnsToLayout(normalizedColumns);

  return {
    ...layout,
    id: typeof layout.id === "string" && layout.id ? layout.id : `layout-${rowIndex + 1}`,
    layout: layoutPattern,
    columns: layoutColumns(layoutPattern, normalizedColumns, (columnIndex, span) => ({
      id: `layout-${rowIndex + 1}-column-${columnIndex + 1}`,
      span,
      blocks: [],
    })),
  };
}

export function normalizeLayoutRows(layouts?: LayoutBuilderValue | null): LayoutBuilderValue {
  return (layouts ?? []).map((layout, rowIndex) => normalizeLayoutRow(layout, rowIndex));
}

export function visibleLayoutRows(layouts?: LayoutBuilderValue | null): LayoutBuilderValue {
  return normalizeLayoutRows(layouts).filter((layout) => Array.isArray(layout.columns));
}
