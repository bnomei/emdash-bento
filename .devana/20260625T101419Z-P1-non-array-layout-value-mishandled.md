DEVANA-FINDING: v1
Priority: P1 | Confidence: high | Security-sensitive: no | Status: open
Location: src/admin.tsx:246-248,src/render.ts:62-64 | Slug: non-array-layout-value-mishandled

# Non-array layout values silently empty in admin and crash in render

## Finding

When the persisted JSON field value is a single layout row object instead of an array, the admin widget treats it as empty while the render helpers throw. A subsequent admin action can overwrite the stored data with a new array, permanently losing the original row.

## Violated Invariant Or Contract

Admin ingest and render ingest should handle the same runtime JSON shapes without opposite outcomes (silent discard vs runtime throw).

## Oracle

Passing `{ id: "hero", layout: "1/2, 1/2", columns: [...] }` to both `LayoutsField` and `visibleLayoutRows` must not yield an empty editor in one path and a `TypeError` in the other.

## Counterexample

Persisted value:
```json
{ "id": "hero", "layout": "1/2, 1/2", "columns": [{ "id": "c1", "span": "1/2", "blocks": [] }] }
```

- Admin: `asLayouts(value)` → `Array.isArray(value)` is false → `[]` → empty-state UI.
- Render: `normalizeLayoutRows(value)` → `(layouts ?? []).map(...)` calls `.map` on the object → `TypeError`.
- User clicks **Add layout** → `onChange([newRow])` overwrites the original object in storage.

## Why It Might Matter

Malformed but recoverable CMS data can crash Astro pages and be wiped on the next admin edit. Migration mistakes (singleton object instead of array) are a realistic source shape.

## Proof

**Cross-entry mismatch:** `asLayouts` uses `Array.isArray(value) ? value.map(...) : []`; `normalizeLayoutRows` uses `(layouts ?? []).map(...)` with no array guard.

**Dataflow trace:** non-array value → admin shows empty → user adds row → `onChange` emits array → original row lost.

## Counterevidence Checked

- `null` and `undefined` normalize to `[]` in both paths.
- Documented `LayoutBuilderValue` type is an array; both entrypoints accept `unknown` at runtime.
- `isLayoutBuilderRow` would recognize the object, but `LayoutsField` never uses it.

## Suggested Next Step

Wrap non-array row objects into a one-element array in `asLayouts` and `normalizeLayoutRows`, or reject with a visible error instead of silent empty state.

## Agent Handoff

After working this report, preserve the original finding body. Update line 2 `Status: ...` and the final `DEVANA-SUMMARY:` status. Use one of: `open`, `fixed`, `invalid`, `stale`, `duplicate`, `wontfix`. Add dated notes below with the evidence checked.

## Status Notes

- 2026-06-25: open by Devana. Initial report written from static source inspection.

DEVANA-KEY: src/admin.tsx:246-248,src/render.ts:62-64 | P1 | non-array-layout-value-mishandled
DEVANA-SUMMARY: Status=open | P1 high src/admin.tsx:246-248,src/render.ts:62-64 - A singleton layout object is treated as empty in admin but crashes normalizeLayoutRows, and the next admin save can overwrite it.