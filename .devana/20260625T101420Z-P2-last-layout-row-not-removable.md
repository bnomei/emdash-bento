DEVANA-FINDING: v1
Priority: P2 | Confidence: high | Security-sensitive: no | Status: fixed
Location: src/admin.tsx:411-441 | Slug: last-layout-row-not-removable

# Last layout row cannot be removed through the widget

## Finding

The remove-layout control is only rendered when `layouts.length > 1`. After an editor adds the first layout row, there is no UI path to return the field to the documented empty `[]` state.

## Violated Invariant Or Contract

README documents that empty layout fields stay empty on mount and the first row is created only via **Add Layout**, implying `[]` is a valid terminal persisted state.

## Oracle

With exactly one layout row, a remove control must exist and be able to call `onChange([])`.

## Counterexample

1. Mount with `value: []` → empty state shown.
2. Click **Add layout** → `onChange` persists one row.
3. `layouts.length === 1` → `layoutMenuOptions` is `[]`.
4. No remove button is rendered; the editor cannot return to `[]` through the widget.

## Why It Might Matter

Editors who add a layout by mistake cannot undo it without hand-editing JSON or using an external tool. The field remains non-empty in storage.

## Proof

**Control-flow trace:** remove handler lives only inside `layoutMenuOptions`, which is built only when `layouts.length > 1` (line 412). No other code path calls `onChange` with a filtered empty array when one row remains.

## Counterevidence Checked

- Remove works when `layouts.length > 1`.
- Column remove is similarly gated at `row.columns.length > 1`, but README requires at least one column per row.
- Empty mount intentionally does not call `onChange` (covered by `test/admin-empty-layout.test.mjs`).

## Suggested Next Step

Expose a remove control when `layouts.length === 1`, or add a dedicated "clear all layouts" action that calls `onChange([])`.

## Agent Handoff

After working this report, preserve the original finding body. Update line 2 `Status: ...` and the final `DEVANA-SUMMARY:` status. Use one of: `open`, `fixed`, `invalid`, `stale`, `duplicate`, `wontfix`. Add dated notes below with the evidence checked.

## Status Notes

- 2026-06-25: open by Devana. Initial report written from static source inspection.
- 2026-06-27: fixed. Removed the outer `layouts.length > 1` wrapper around `layoutMenuOptions`. The move-up/move-down options already self-gate by `rowIndex`, so dropping the wrapper keeps them hidden for a single row while the remove (trash) option now always renders. Removing the last row calls `updateLayouts(layouts.filter(...))` → `onChange([])`, returning the field to the documented empty state. Added a source regression assertion. Verified: 19/19 tests pass, `tsc --noEmit` clean.

DEVANA-KEY: src/admin.tsx:411-441 | P2 | last-layout-row-not-removable
DEVANA-SUMMARY: Status=fixed | P2 high src/admin.tsx:411-441 - Remove layout was hidden when only one row existed. Fixed by always rendering the remove option (move options still self-gate by position), so the last row can be removed back to [].