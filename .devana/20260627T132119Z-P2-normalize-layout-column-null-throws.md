DEVANA-FINDING: v1
Priority: P2 | Confidence: high | Security-sensitive: no | Status: open
Location: src/render.ts:20-38,src/admin.tsx:199-213 | Slug: normalize-layout-column-null-throws

# normalizeLayoutColumn throws on null columns array elements

## Finding

`normalizeLayoutRow` maps `columns` entries directly into `normalizeLayoutColumn` without null guards. A `null` column element causes a `TypeError` when accessing `column.id`. The admin path coerces null column elements into synthetic defaults via `asRecord`.

## Violated Invariant Or Contract

Public frontend helpers that accept native Bento values should tolerate messy persisted JSON without throwing, consistent with the admin normalization path.

## Oracle

`visibleLayoutRows([{ id: "row-1", layout: "1/2, 1/2", columns: [null, { id: "c2", span: "1/2", blocks: [] }] }])` must normalize without throwing.

## Counterexample

```ts
normalizeLayoutRow({
  id: "row-1",
  layout: "1/2, 1/2",
  columns: [null, { id: "c2", span: "1/2", blocks: [] }],
}, 0)
```

1. `storedColumns.map(... normalizeLayoutColumn(null, ...))` runs.
2. `normalizeLayoutColumn` evaluates `typeof column.id` with `column === null`.
3. `TypeError: Cannot read properties of null (reading 'id')` aborts the Astro render path.

Admin equivalent: `normalizeColumn(null, …)` → `asRecord(null)` → `{}` → synthetic `{ id: "layout-1-column-1", span: "1/1", blocks: [] }`.

## Why It Might Matter

Sparse or migration-damaged `columns` arrays can crash frontend rendering while the editor still mounts and may rewrite the row on save.

## Proof

**Cross-entry mismatch:** admin wraps unknown column values with `asRecord`; render dereferences column fields directly.

**Control-flow trace:** null column hole → `normalizeLayoutColumn` → property access on null → throw before `visibleLayoutRows` returns.

## Counterevidence Checked

- Typed `LayoutBuilderColumn` disallows null elements, but runtime JSON has no validation gate.
- Existing `normalize-layout-row-null-throws` covers null **row** elements, not null **column** elements (different array, different throw site).
- Widget-produced rows always emit object columns; holey arrays imply hand-edited or migrated data.

## Suggested Next Step

Guard `normalizeLayoutColumn` with the same `asRecord` pattern used in admin, or filter nullish column entries before mapping.

## Agent Handoff

After working this report, preserve the original finding body. Update line 2 `Status: ...` and the final `DEVANA-SUMMARY:` status. Use one of: `open`, `fixed`, `invalid`, `stale`, `duplicate`, `wontfix`. Add dated notes below with the evidence checked.

## Status Notes

- 2026-06-27: open by Devana. Initial report written from static source inspection.

DEVANA-KEY: src/render.ts:20-38,src/admin.tsx:199-213 | P2 | normalize-layout-column-null-throws
DEVANA-SUMMARY: Status=open | P2 high src/render.ts:20-38,src/admin.tsx:199-213 - null entries in columns[] crash normalizeLayoutRow while admin normalization synthesizes a default column.