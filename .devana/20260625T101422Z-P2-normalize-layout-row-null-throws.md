DEVANA-FINDING: v1
Priority: P2 | Confidence: high | Security-sensitive: no | Status: fixed
Location: src/render.ts:35-38 | Slug: normalize-layout-row-null-throws

# normalizeLayoutRow throws on null array elements

## Finding

`normalizeLayoutRows` maps array elements directly into `normalizeLayoutRow` without null guards. A `null` entry causes a `TypeError` when accessing `layout.columns`. The admin path coerces null elements into default rows via `asRecord`.

## Violated Invariant Or Contract

Public frontend helpers that accept native Bento values should tolerate messy persisted JSON without throwing, consistent with the admin normalization path.

## Oracle

`visibleLayoutRows([null])` and `normalizeLayoutRows([row, null])` must return normalized output without throwing.

## Counterexample

```ts
normalizeLayoutRows([null])
```

1. `normalizeLayoutRow(null, 0)` runs.
2. `Array.isArray(layout.columns)` evaluates `layout.columns` on `null`.
3. `TypeError: Cannot read properties of null` aborts the Astro render path.

Admin equivalent `asLayouts([null])` calls `normalizeRow(null, 0)` → `asRecord(null)` → `{}` → synthetic default row.

## Why It Might Matter

A single null hole in CMS JSON can crash a page that calls `visibleLayoutRows(entry.layouts)`, while the admin editor would still mount.

## Proof

**Control-flow trace:** `normalizeLayoutRows` → `.map(normalizeLayoutRow)` → `layout.columns` on unguarded `layout` parameter.

**Cross-entry mismatch:** admin `normalizeColumn` / `normalizeRow` use `asRecord(value)`; render `normalizeLayoutRow` does not.

## Counterevidence Checked

- Well-typed `LayoutBuilderRow[]` from the editor does not include null elements.
- `undefined` row objects hit the same throw path.
- Typed `LayoutBuilderValue` excludes null elements, but runtime JSON is unvalidated.

## Suggested Next Step

Guard `normalizeLayoutRow` with the same `asRecord` / unknown coercion used in admin, or filter null elements before mapping.

## Agent Handoff

After working this report, preserve the original finding body. Update line 2 `Status: ...` and the final `DEVANA-SUMMARY:` status. Use one of: `open`, `fixed`, `invalid`, `stale`, `duplicate`, `wontfix`. Add dated notes below with the evidence checked.

## Status Notes

- 2026-06-25: open by Devana. Initial report written from static source inspection.
- 2026-06-27: fixed. `normalizeLayoutRow` now coerces its argument via the existing `isRecord` guard (`const row = isRecord(layout) ? layout : {}`) before any property access, so null/undefined/primitive holes in the layouts array no longer throw. Holes synthesize a default single-column row, matching the admin `asRecord` path. All reads (`row.columns`, `row.layout`, `row.id`) and the spread use the coerced record. Added a runtime regression test covering `normalizeLayoutRows([good, null])`, primitives, and `visibleLayoutRows([null])`. Verified: 21/21 tests pass, `tsc --noEmit` clean. (Null *column* entries are tracked separately by normalize-layout-column-null-throws.)

DEVANA-KEY: src/render.ts:35-38 | P2 | normalize-layout-row-null-throws
DEVANA-SUMMARY: Status=fixed | P2 high src/render.ts:35-38 - null entries in a layouts array crashed normalizeLayoutRows. Fixed by coercing non-object rows via isRecord, matching the admin normalization path.