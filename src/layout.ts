import type { LayoutBuilderColumn } from "./types.js";

export const DEFAULT_LAYOUT_PATTERN = "1/1";

type SpanParts = {
  numerator: number;
  denominator: number;
};

export type LayoutColumnFactory = (index: number, span: string) => LayoutBuilderColumn;

function parseSpan(span?: string): SpanParts | null {
  const parts = (span ?? "").split("/");
  if (parts.length !== 2) return null;

  const numerator = Number(parts[0]);
  const denominator = Number(parts[1]);

  if (!Number.isInteger(numerator) || !Number.isInteger(denominator)) return null;

  return { numerator, denominator };
}

export function isValidLayoutSpan(span: string): boolean {
  const parts = parseSpan(span);

  return Boolean(
    parts &&
    parts.numerator > 0 &&
    parts.denominator > 0 &&
    parts.numerator <= parts.denominator &&
    parts.denominator <= 12,
  );
}

export function validLayoutSpans(layout?: string | null): string[] {
  return (layout ?? "")
    .split(",")
    .map((span) => span.trim())
    .filter(Boolean)
    .filter(isValidLayoutSpan);
}

function normalizeLayoutSpan(span?: string | null): string {
  const trimmed = (span ?? "").trim();
  return isValidLayoutSpan(trimmed) ? trimmed : DEFAULT_LAYOUT_PATTERN;
}

export function layoutSpans(layout?: string | null): string[] {
  const spans = validLayoutSpans(layout);
  return spans.length ? spans : [DEFAULT_LAYOUT_PATTERN];
}

export function normalizeLayoutPattern(
  layout?: string | null,
  fallbackLayout = DEFAULT_LAYOUT_PATTERN,
): string {
  const spans = validLayoutSpans(layout);
  if (spans.length) return spans.join(", ");

  if (!fallbackLayout.trim()) return "";

  const fallbackSpans = validLayoutSpans(fallbackLayout);
  return (fallbackSpans.length ? fallbackSpans : [DEFAULT_LAYOUT_PATTERN]).join(", ");
}

export function columnsToLayout(
  columns: readonly Pick<LayoutBuilderColumn, "span">[] = [],
  fallbackLayout = DEFAULT_LAYOUT_PATTERN,
): string {
  return columns.length
    ? columns.map((column) => normalizeLayoutSpan(column.span)).join(", ")
    : normalizeLayoutPattern(fallbackLayout);
}

export function spanToGridColumns(span?: string): number {
  const parts = parseSpan(span);

  if (parts && parts.numerator > 0 && parts.denominator > 0) {
    const columns = Math.round((parts.numerator / parts.denominator) * 12);
    return Math.min(12, Math.max(1, columns));
  }

  return 12;
}

function defaultLayoutColumn(index: number, span: string): LayoutBuilderColumn {
  return {
    id: `layout-column-${index + 1}`,
    span,
    blocks: [],
  };
}

export function layoutColumns(
  layout: string,
  existingColumns: readonly LayoutBuilderColumn[] = [],
  createColumn: LayoutColumnFactory = defaultLayoutColumn,
): LayoutBuilderColumn[] {
  return layoutSpans(layout).map((span, index) => {
    const column = existingColumns[index] ?? createColumn(index, span);

    return {
      ...column,
      span,
      blocks: column.blocks ?? [],
    };
  });
}

export function layoutColumnsPreservingExisting(
  layout: string,
  existingColumns: readonly LayoutBuilderColumn[] = [],
  createColumn: LayoutColumnFactory = defaultLayoutColumn,
): LayoutBuilderColumn[] {
  const columns = layoutColumns(layout, existingColumns, createColumn);
  const extraColumns = existingColumns.slice(columns.length).map((column) => ({
    ...column,
    span: normalizeLayoutSpan(column.span),
    blocks: column.blocks ?? [],
  }));

  return [...columns, ...extraColumns];
}
