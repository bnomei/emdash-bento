/**
 * Layout pattern parsing and column allocation for fractional bento spans.
 *
 * Spans use `numerator/denominator` fractions (denominator ≤ 12). Helpers here
 * validate patterns, derive columns from a pattern string, and map spans onto
 * a 12-column CSS grid without false wrapping on equal-width rows.
 */
import type { LayoutBuilderColumn } from "./types.js";

/** Full-width span used when a pattern is empty or contains no valid fractions. */
export const DEFAULT_LAYOUT_PATTERN = "1/1";

type SpanParts = {
  numerator: number;
  denominator: number;
};

/** Factory invoked when a layout pattern implies more columns than are stored. */
export type LayoutColumnFactory = (index: number, span: string) => LayoutBuilderColumn;

function parseSpan(span?: string): SpanParts | null {
  const parts = (span ?? "").split("/");
  if (parts.length !== 2) return null;

  const numerator = Number(parts[0]);
  const denominator = Number(parts[1]);

  if (!Number.isInteger(numerator) || !Number.isInteger(denominator)) return null;

  return { numerator, denominator };
}

/** Returns whether `span` is a positive fraction with denominator between 1 and 12. */
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

/** Extracts valid spans from a comma-separated layout pattern, dropping invalid tokens. */
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

/** Parsed spans for a layout pattern, falling back to `DEFAULT_LAYOUT_PATTERN` when empty. */
export function layoutSpans(layout?: string | null): string[] {
  const spans = validLayoutSpans(layout);
  return spans.length ? spans : [DEFAULT_LAYOUT_PATTERN];
}

/**
 * Normalizes a layout pattern to valid comma-separated spans.
 *
 * Invalid or empty input uses `fallbackLayout`; a blank fallback yields `""`.
 */
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

/** Builds a layout pattern string from stored column spans. */
export function columnsToLayout(
  columns: readonly Pick<LayoutBuilderColumn, "span">[] = [],
  fallbackLayout = DEFAULT_LAYOUT_PATTERN,
): string {
  return columns.length
    ? columns.map((column) => normalizeLayoutSpan(column.span)).join(", ")
    : normalizeLayoutPattern(fallbackLayout);
}

/** Maps one fractional span to a 1–12 CSS grid column count via independent rounding. */
export function spanToGridColumns(span?: string): number {
  const parts = parseSpan(span);

  if (parts && parts.numerator > 0 && parts.denominator > 0) {
    const columns = Math.round((parts.numerator / parts.denominator) * 12);
    return Math.min(12, Math.max(1, columns));
  }

  return 12;
}

function spanFraction(span?: string): number {
  const parts = parseSpan(span);
  return parts && parts.numerator > 0 && parts.denominator > 0
    ? parts.numerator / parts.denominator
    : 1;
}

/**
 * Row-aware 12-column grid widths that avoid false wrapping on full-width rows.
 *
 * When fractional spans sum to at most one line, distributes `round(total × 12)`
 * units with largest-remainder rounding. Rows wider than one line keep per-span
 * `spanToGridColumns` rounding so intentional overflow still wraps.
 */
export function layoutGridSpans(spans: readonly string[]): number[] {
  if (!spans.length) return [];

  const fractions = spans.map(spanFraction);
  const totalFraction = fractions.reduce((sum, fraction) => sum + fraction, 0);

  if (totalFraction > 1) {
    return spans.map((span) => spanToGridColumns(span));
  }

  const target = Math.min(12, Math.round(totalFraction * 12));
  const raw = fractions.map((fraction) => fraction * 12);
  const result = raw.map((value) => Math.floor(value));
  let remaining = target - result.reduce((sum, value) => sum + value, 0);

  const byRemainder = raw
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((left, right) => right.remainder - left.remainder);

  for (let position = 0; remaining > 0 && byRemainder.length; position += 1) {
    result[byRemainder[position % byRemainder.length].index] += 1;
    remaining -= 1;
  }

  // Each column needs at least one grid unit; rows with more columns than units wrap.
  return result.map((value) => Math.max(1, value));
}

function defaultLayoutColumn(index: number, span: string): LayoutBuilderColumn {
  return {
    id: `layout-column-${index + 1}`,
    span,
    blocks: [],
  };
}

/** Materializes columns for a layout pattern, reusing stored columns by index. */
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

/** Like `layoutColumns`, but keeps extra stored columns beyond the parsed pattern. */
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
