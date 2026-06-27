DEVANA-FINDING: v1
Priority: P1 | Confidence: high | Security-sensitive: no | Status: open
Location: src/admin.tsx:298-300,609-616 | Slug: layout-draft-lost-on-row-update

# Uncommitted layout draft reset when same-row layout value changes

## Finding

`LayoutPatternField` syncs its local draft from the `value` prop on every change. Same-row actions that update `row.layout` (such as Add Column) change the prop while the layout input may still be focused, overwriting in-progress text before blur/commit.

## Violated Invariant Or Contract

Uncommitted text in a focused control must not be overwritten by prop sync until the user blurs or explicitly commits.

## Oracle

While the layout input is focused and the user has typed a not-yet-blurred pattern, a same-row structural change must not erase the draft.

## Counterexample

1. Row has `layout: "1/1, 1/2, 1/3"`.
2. Editor focuses the layout input and types `1/2, 1/2` without blurring.
3. Editor clicks **Add column** on that row.
4. `updateRow` sets `layout: columnsToLayout(columns)`, changing the `value` prop passed to `LayoutPatternField`.
5. `useEffect([value])` runs `setDraft(value)`, reverting the draft to the auto-derived layout; the typed `1/2, 1/2` is lost and never reaches `onCommit`.

## Why It Might Matter

Editors lose layout edits mid-flow when performing routine column operations on the same row. The lost pattern is never persisted.

## Proof

**State transition mismatch:** `draft` is unconditionally reset when `value` changes; there is no focus guard.

**Control-flow trace:** Add column → `updateRow` → `columnsToLayout` → `row.layout` prop change → `useEffect` → `setDraft(value)`.

Same-row handlers that change `row.layout` include span select (`onValueChange`), column remove, and column move.

## Counterevidence Checked

- Block-only edits change `columns` but not `row.layout`, so they do not trigger the `[value]` effect on the layout field.
- Cross-row edits do not change this row's `value` prop.
- Removing a row without blurring is a separate unmount-without-commit gap; blur-first workflows avoid it.

## Suggested Next Step

Skip `setDraft(value)` while the input is focused, or commit the draft before same-row handlers that change `row.layout`.

## Agent Handoff

After working this report, preserve the original finding body. Update line 2 `Status: ...` and the final `DEVANA-SUMMARY:` status. Use one of: `open`, `fixed`, `invalid`, `stale`, `duplicate`, `wontfix`. Add dated notes below with the evidence checked.

## Status Notes

- 2026-06-25: open by Devana. Initial report written from static source inspection.

DEVANA-KEY: src/admin.tsx:298-300,609-616 | P1 | layout-draft-lost-on-row-update
DEVANA-SUMMARY: Status=open | P1 high src/admin.tsx:298-300,609-616 - LayoutPatternField resets its draft whenever row.layout changes, so same-row column actions can erase uncommitted layout text.