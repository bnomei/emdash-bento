import { normalizeBlocks } from "@bnomei/emdash-blocks";
import type { LayoutBuilderColumn, LayoutBuilderRow, LayoutBuilderValue } from "./types.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isValidSpan(span: string): boolean {
  const [rawNumerator, rawDenominator] = span.split("/");
  const numerator = Number(rawNumerator);
  const denominator = Number(rawDenominator);

  return (
    Number.isInteger(numerator) &&
    Number.isInteger(denominator) &&
    numerator > 0 &&
    denominator > 0 &&
    numerator <= denominator &&
    denominator <= 12
  );
}

export function layoutSpans(layout: string): string[] {
  const spans = layout
    .split(",")
    .map((span) => span.trim())
    .filter(Boolean)
    .filter(isValidSpan);

  return spans.length ? spans : ["1/1"];
}

export function spanToGridColumns(span?: string): number {
  const [rawNumerator, rawDenominator] = (span ?? "").split("/");
  const numerator = Number(rawNumerator);
  const denominator = Number(rawDenominator);

  if (
    Number.isInteger(numerator) &&
    Number.isInteger(denominator) &&
    numerator > 0 &&
    denominator > 0
  ) {
    const columns = Math.round((numerator / denominator) * 12);
    return Math.min(12, Math.max(1, columns));
  }

  return 12;
}

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

  return {
    ...layout,
    id: typeof layout.id === "string" && layout.id ? layout.id : `layout-${rowIndex + 1}`,
    layout:
      typeof layout.layout === "string" && layout.layout
        ? layout.layout
        : normalizedColumns.map((column) => column.span).join(", ") || "1/1",
    columns: normalizedColumns,
  };
}

export function normalizeLayoutRows(layouts?: LayoutBuilderValue | null): LayoutBuilderValue {
  return (layouts ?? []).map((layout, rowIndex) => normalizeLayoutRow(layout, rowIndex));
}

export function visibleLayoutRows(layouts?: LayoutBuilderValue | null): LayoutBuilderValue {
  return normalizeLayoutRows(layouts).filter((layout) => Array.isArray(layout.columns));
}
