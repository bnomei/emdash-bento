DEVANA-FINDING: v1
Priority: P2 | Confidence: high | Security-sensitive: no | Status: fixed
Location: src/render.ts:15-18 | Slug: is-layout-builder-row-span-gap

# isLayoutBuilderRow misses span on non-first columns

## Finding

`isLayoutBuilderRow` treats a value as a layout row only when it has a top-level `layout` key or a `span` on `columns[0]`. Rows where only a later column carries `span` are classified as non-layout rows even though `normalizeLayoutRow` would accept and normalize them.

## Violated Invariant Or Contract

Detection should recognize layout-builder rows from column structure consistently with what `normalizeLayoutRow` accepts, or scan all columns for `span`.

## Oracle

An object with `columns: [{ id: "c1", blocks: [] }, { id: "c2", span: "1/2", blocks: [] }]` and no `layout` key should be detected as a layout-builder row.

## Counterexample

```json
{
  "id": "row-1",
  "columns": [
    { "id": "c1", "blocks": [] },
    { "id": "c2", "span": "1/2", "blocks": [] }
  ]
}
```

- `"layout" in value` → false
- `"span" in columns[0]` → false
- `isLayoutBuilderRow(value)` → false
- `normalizeLayoutRow(value)` would derive a valid layout from columns

## Why It Might Matter

Consumer code using `isLayoutBuilderRow` for branching, migration, or conditional rendering can skip or mishandle legacy partial rows that the normalization pipeline would repair.

## Proof

**Contract mismatch:** predicate inspects only `columns[0]` for `span`; no scan of remaining columns.

**Counterexample value:** span present only on `columns[1]`.

## Counterevidence Checked

- Rows produced by the admin widget always include `layout` and per-column `span`.
- Happy-path editor output is unaffected.
- `isLayoutBuilderRow` is exported for consumer-side detection on raw stored JSON.

## Suggested Next Step

Scan all `columns` entries for `span`, or delegate detection to a try-normalize check.

## Agent Handoff

After working this report, preserve the original finding body. Update line 2 `Status: ...` and the final `DEVANA-SUMMARY:` status. Use one of: `open`, `fixed`, `invalid`, `stale`, `duplicate`, `wontfix`. Add dated notes below with the evidence checked.

## Status Notes

- 2026-06-25: open by Devana. Initial report written from static source inspection.
- 2026-06-27: fixed. `isLayoutBuilderRow` now scans every column for a `span` (`columns.some((column) => isRecord(column) && "span" in column)`) instead of inspecting only `columns[0]`, so legacy rows whose span lives on a later column are recognized consistently with what `normalizeLayoutRow` accepts. The per-column `isRecord` guard also makes the `in` check safe against primitive column entries. Added regression tests for span on a non-first column, the negative cases, and primitive columns. Verified: 22/22 tests pass, `tsc --noEmit` clean.

DEVANA-KEY: src/render.ts:15-18 | P2 | is-layout-builder-row-span-gap
DEVANA-SUMMARY: Status=fixed | P2 high src/render.ts:15-18 - isLayoutBuilderRow only checked columns[0] for span. Fixed by scanning all columns (with an isRecord guard per column) so rows with span on later columns are detected.