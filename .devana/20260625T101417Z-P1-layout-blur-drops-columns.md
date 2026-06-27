DEVANA-FINDING: v1
Priority: P1 | Confidence: high | Security-sensitive: no | Status: fixed
Location: src/admin.tsx:312-316,460-465 | Slug: layout-blur-drops-columns

# Layout pattern blur drops trailing columns and blocks

## Finding

When an editor blurs the row layout input with an empty or fully invalid draft, the widget commits an empty layout string and rebuilds columns through `layoutColumns`, which keeps only the first column. Trailing columns and their nested blocks are removed from the persisted JSON.

## Violated Invariant Or Contract

Invalid layout input should normalize safely without shrinking a multi-column row to a single column unless the editor intentionally commits a shorter valid pattern. The read path (`asLayouts` / `normalizeLayoutRow`) preserves extra columns via `layoutColumnsPreservingExisting`; the blur commit path does not.

## Oracle

README layout editing rules: editing the pattern updates columns by position and preserves blocks at matching indices; shortening a valid pattern may remove trailing columns. Blurring `"nope"` or `""` on a two-column row must not delete the second column.

`layout.test.ts` expects `normalizeLayoutRow` to preserve extra stored columns when the layout string normalizes to fewer spans.

## Counterexample

1. Row: `{ layout: "1/1, 1/2", columns: [colA with blocks, colB with blocks] }`.
2. Editor clears the layout field (or types `"nope"`) and blurs.
3. `normalizeLayoutPattern(draft, "")` returns `""`.
4. `onCommit("")` calls `layoutColumns("", row.columns)`.
5. `layoutSpans("")` resolves to `["1/1"]`, so only `colA` survives; `colB` and its blocks are dropped in `onChange` output.

## Why It Might Matter

Editors can lose column content from a typo or accidental blur with no confirmation. Frontend renderers reading the saved JSON will never see the removed columns again.

## Proof

**Control-flow trace:** `LayoutPatternField.onBlur` → `normalizeLayoutPattern(draft, fallbackLayout ?? "")` with no `fallbackLayout` passed at the call site → `onCommit` → `layoutColumns(layout, row.columns)` → `updateLayouts` → parent `onChange`.

**Counterexample value:** `draft = "nope"` or `draft = ""` on a row with `columns.length > 1`.

`updateLayouts` later uses `row.layout || columnsToLayout(row.columns)`, but `row.columns` is already truncated in `onCommit`, so recovery cannot happen.

## Counterevidence Checked

- Intentional shrink to a shorter *valid* pattern (for example `"1/1"`) is documented and expected.
- `asLayouts` on mount uses `layoutColumnsPreservingExisting` and does not cause this loss until blur commit.
- Block-only edits keep `row.layout` aligned with `columnsToLayout(row.columns)` and do not hit this path.

## Suggested Next Step

Pass the row's current layout (or `columnsToLayout(row.columns)`) as `fallbackLayout` to `LayoutPatternField`, and use `layoutColumnsPreservingExisting` (or equivalent) when recomputing columns on commit unless the committed pattern intentionally has fewer valid spans.

## Agent Handoff

After working this report, preserve the original finding body. Update line 2 `Status: ...` and the final `DEVANA-SUMMARY:` status. Use one of: `open`, `fixed`, `invalid`, `stale`, `duplicate`, `wontfix`. Add dated notes below with the evidence checked.

## Status Notes

- 2026-06-25: open by Devana. Initial report written from static source inspection.
- 2026-06-27: fixed. `LayoutPatternField` for each row now receives `fallbackLayout={row.layout || columnsToLayout(row.columns)}` (src/admin.tsx:460). On blur with an empty or invalid draft, `normalizeLayoutPattern(draft, fallbackLayout)` now returns the row's current layout instead of `""`, so `layoutColumns` is rebuilt with a span count matching the existing columns and no trailing columns/blocks are dropped. Intentional shrink to a shorter *valid* pattern still truncates as documented. Added a source regression assertion in test/admin-empty-layout.test.mjs. Verified: 15/15 tests pass, `tsc --noEmit` clean.

DEVANA-KEY: src/admin.tsx:312-316,460-465 | P1 | layout-blur-drops-columns
DEVANA-SUMMARY: Status=fixed | P1 high src/admin.tsx:312-316,460-465 - Blurring an invalid or empty layout pattern commits through truncating layoutColumns and can silently delete trailing columns and their blocks. Fixed by passing fallbackLayout to LayoutPatternField so invalid drafts normalize back to the current layout.