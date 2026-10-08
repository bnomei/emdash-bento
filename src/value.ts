import type { LayoutBuilderRow } from "./types.js";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isLayoutBuilderRow(value: unknown): value is LayoutBuilderRow {
  if (!isRecord(value)) return false;
  if ("layout" in value) return true;
  const columns = Array.isArray(value.columns) ? value.columns : [];
  return columns.some((column) => isRecord(column) && "span" in column);
}

export function asBlocksArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  return isRecord(value) ? [value] : [];
}
