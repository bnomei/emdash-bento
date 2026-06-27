DEVANA-FINDING: v1
Priority: P1 | Confidence: high | Security-sensitive: no | Status: fixed
Location: src/admin.tsx:195-197,211,src/render.ts:31 | Slug: non-array-column-blocks-mismatch

# Non-array column.blocks coerced in admin and throws in render

## Finding

When a column stores `blocks` as a singleton object instead of an array, the admin widget coerces it to an empty array while the render helpers throw. A subsequent admin edit persists `blocks: []`, permanently dropping the orphaned block object.

## Violated Invariant Or Contract

Admin ingest and render ingest must handle the same runtime `blocks` shapes without opposite outcomes (silent discard vs runtime throw).

## Oracle

A column with `blocks: { id: "headline", type: "text", props: { text: "Hi" } }` must not show as empty in admin while `visibleLayoutRows()` / `normalizeLayoutRow()` throw on the same stored JSON.

## Counterexample

```json
{
  "id": "hero",
  "layout": "1/1",
  "columns": [{
    "id": "c1",
    "span": "1/1",
    "blocks": { "id": "headline", "type": "text", "props": { "text": "Hi" } }
  }]
}
```

1. Admin `normalizeBlocks(record.blocks)` → `Array.isArray` is false → `[]` → column shows no blocks.
2. Render `normalizeBlocks(column.blocks)` → `(blocks ?? []).map(...)` calls `.map` on the object → `TypeError`.
3. User edits any field → `updateLayouts` → `onChange` persists `blocks: []`.

## Why It Might Matter

Hand-edited or migrated CMS JSON can crash Astro pages and lose nested block content on the next admin save. The mismatch is specific to `blocks`, not the top-level layout array shape.

## Proof

**Cross-entry producer/consumer mismatch:** admin `normalizeBlocks` guards with `Array.isArray`; `@bnomei/emdash-blocks` `normalizeBlocks` only null-coalesces and maps any other truthy value.

**Dataflow trace:** singleton `blocks` object → admin displays `[]` → user edit → `onChange` writes `[]` → frontend still cannot render original shape.

## Counterevidence Checked

- `null` and `undefined` `blocks` normalize to `[]` in both paths.
- Widget-produced saves always emit `blocks` as an array via `BlocksField`.
- Non-array `columns` is handled consistently in admin and render; mismatch is specific to `blocks`.
- Top-level non-array layout values are a separate finding (`non-array-layout-value-mishandled`).

## Suggested Next Step

Align admin `normalizeBlocks` with the package implementation, or add the same `Array.isArray` guard to a shared helper used by both paths.

## Agent Handoff

After working this report, preserve the original finding body. Update line 2 `Status: ...` and the final `DEVANA-SUMMARY:` status. Use one of: `open`, `fixed`, `invalid`, `stale`, `duplicate`, `wontfix`. Add dated notes below with the evidence checked.

## Status Notes

- 2026-06-27: open by Devana. Initial report written from static source inspection.
- 2026-06-27: fixed. Added a shared `asBlocksArray(value)` helper in src/render.ts: returns arrays as-is, wraps a singleton record into a one-element array, and maps anything else to `[]`. `normalizeLayoutColumn` now pre-coerces `column.blocks` through it before the package `normalizeBlocks` (no more `.map` on a non-array object → no throw in render). Admin `normalizeBlocks` routes through the same helper, so a singleton block object is preserved and editable instead of being silently emptied and overwritten on the next save. `null`/`undefined`/primitive blocks still normalize to `[]` in both paths. This wraps-to-preserve approach mirrors the [non-array-layout-value-mishandled] row-level fix. Added runtime + source regression tests. Verified: 24/24 tests pass, `tsc --noEmit` clean.

DEVANA-KEY: src/admin.tsx:195-197,211,src/render.ts:31 | P1 | non-array-column-blocks-mismatch
DEVANA-SUMMARY: Status=fixed | P1 high src/admin.tsx:195-197,211,src/render.ts:31 - Singleton block objects in column.blocks were emptied in admin but crashed render. Fixed with a shared asBlocksArray helper that wraps a singleton block into a one-element array in both paths.