DEVANA-FINDING: v1
Priority: P2 | Confidence: medium | Security-sensitive: no | Status: fixed
Location: src/admin.tsx:228-236,350 | Slug: synthetic-column-ids-unstable

# Synthetic column IDs regenerate on every parent re-render

## Finding

When stored JSON has fewer `columns` than the row `layout` pattern implies, `asLayouts` fabricates missing columns with `randomId("column")` on every render. Parent re-renders before the first save assign new IDs to the same logical column positions, remounting column UI via `key={column.id}`.

## Violated Invariant Or Contract

Columns implied by the layout pattern must remain stable at each index across renders so blocks and in-progress edits at that position are preserved. The render adapter uses deterministic IDs (`layout-${rowIndex}-column-${columnIndex}`) for the same case.

## Oracle

Stored `{ layout: "1/1, 1/2, 1/3", columns: [{ id: "c1", span: "1/1", blocks: [...] }] }` must keep stable IDs for synthetic columns 2 and 3 across unchanged `value` props.

## Counterexample

1. Mount with one stored column and a three-span layout.
2. First render creates synthetic columns 2–3 with `uuid-A` and `uuid-B`.
3. Parent re-renders for an unrelated reason before `onChange` fires.
4. `asLayouts(value)` runs again; synthetic columns get `uuid-C` and `uuid-D`.
5. React remounts `BlocksMiniEditor` for those columns; in-progress block edits are lost.

## Why It Might Matter

Incomplete stored rows (common during migration or hand-edited JSON) produce unstable column identity in the admin UI until the first save. Editors can lose work without any explicit delete action.

## Proof

**Dataflow trace:** `LayoutsField` → `const layouts = asLayouts(value)` every render (no memoization) → `normalizeRow` → `layoutColumnsPreservingExisting` with `randomId("column")` factory when `existingColumns[index]` is missing.

**Contract mismatch:** `src/render.ts` `normalizeLayoutRow` uses deterministic `layout-${rowIndex + 1}-column-${columnIndex + 1}` for the same synthetic columns.

## Counterevidence Checked

- After any `onChange`, saved JSON includes explicit column objects and IDs stabilize.
- Fully populated stored rows do not call `randomId` for existing indices.
- Bug requires incomplete stored data plus a parent re-render before persistence.

## Suggested Next Step

Use deterministic per-index IDs in admin `normalizeRow`, matching `normalizeLayoutRow`, instead of `randomId` for synthetic columns.

## Agent Handoff

After working this report, preserve the original finding body. Update line 2 `Status: ...` and the final `DEVANA-SUMMARY:` status. Use one of: `open`, `fixed`, `invalid`, `stale`, `duplicate`, `wontfix`. Add dated notes below with the evidence checked.

## Status Notes

- 2026-06-25: open by Devana. Initial report written from static source inspection.
- 2026-06-27: fixed. The synthetic-column factory in admin `normalizeRow` now produces deterministic IDs `layout-${rowIndex + 1}-column-${columnIndex + 1}`, matching `normalizeColumn` and render's `normalizeLayoutRow`, instead of `randomId("column")`. Columns implied by the layout pattern now keep a stable identity across re-renders before the first save, so `key={column.id}` no longer remounts their `BlocksMiniEditor`. `randomId` is retained for genuinely new user-initiated add-column/add-layout actions. Added a source regression assertion. Verified: 20/20 tests pass, `tsc --noEmit` clean.

DEVANA-KEY: src/admin.tsx:228-236,350 | P2 | synthetic-column-ids-unstable
DEVANA-SUMMARY: Status=fixed | P2 medium src/admin.tsx:228-236,350 - Columns implied by the layout were fabricated with randomId on every render, remounting editors before the first save. Fixed by using deterministic per-index IDs matching the render adapter.