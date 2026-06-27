DEVANA-FINDING: v1
DEVANA-STATE: open | P2 | medium | security=no
DEVANA-KEY: src/admin.tsx:206-209,239,444,489 | react-key-id-collision-state-bleed

# Synthesized positional row/column ids can collide with stored ids, producing duplicate React keys and editor state bleed

## Finding

`normalizeRow` and `normalizeColumn` only synthesize an id when the stored one is absent/empty, and they synthesize a *positional* id:

```ts
// normalizeColumn (admin.tsx:206-209)
id: typeof record.id === "string" && record.id ? record.id : `layout-${rowIndex + 1}-column-${columnIndex + 1}`,
// normalizeRow (admin.tsx:239)
id: typeof record.id === "string" && record.id ? record.id : `layout-${rowIndex + 1}`,
```

There is no global uniqueness/dedup pass (`asLayouts` just maps `normalizeRow` per index; the only `Set` in the file is `spanOptions`'s span set at line 261). These ids are then used as React reconciliation keys: `key={row.id}` (admin.tsx:444) and `key={column.id}` (admin.tsx:489). A *stored* id on one sibling that equals the *synthesized positional* id of another sibling yields two elements with the same key.

## Violated Invariant Or Contract

React requires sibling `key` values to be unique; the rendering code implicitly assumes each row id and each column id within a row is unique. Mixing stored ids with positional synthesized ids without a uniqueness pass breaks that assumption.

## Oracle

React's documented contract: keys among siblings must be unique, else reconciliation reuses/drops the wrong instance and component state is attached to the wrong child. The code relies on this by keying directly on `row.id`/`column.id` and by holding per-instance state (`LayoutPatternField` draft at admin.tsx:296; the `BlocksField` block-editor instance per column).

## Counterexample

Stored JSON (hand- or import-authored; CMS content files are plain editable text):

```json
[
  { "id": "layout-2", "columns": [ { "span": "1/1", "blocks": [] } ] },
  {                    "columns": [ { "span": "1/1", "blocks": [] } ] }
]
```

- Row 0 keeps its stored id `"layout-2"`.
- Row 1 has no id → synthesized `layout-${1 + 1}` = `"layout-2"`.
- Both rows render as `<section key="layout-2">`.

The same collision applies to columns within a row (a stored `"layout-1-column-2"` next to a sibling synthesized `"layout-1-column-2"`).

## Why It Might Matter

Duplicate keys make React reconcile two distinct rows/columns onto one component instance. Per-instance state bleeds: the `LayoutPatternField` draft and the block editor (`BlocksMiniEditor`/`BlocksField`) for one card attach to the wrong card, or one sibling is dropped from reconciliation. An editor can see/edit block content under the wrong row/column, and the dev console logs "Encountered two children with the same key." That is a correctness/data-integrity hazard for the field's editing UI.

## Proof

- State-transition / reconciliation mismatch: two siblings share a React key (counterexample above), so React keys collide and reuse one instance for two logical children.
- Counterexample value: an explicit two-row JSON where index-based synthesis equals a sibling's stored id.

## Counterevidence Checked

- In-UI authoring is safe: "Add layout"/"Add column" mint `randomId()` UUIDs (admin.tsx:611, 636, 232/275), which are effectively unique; and when *all* siblings lack stored ids, the positional ids are unique by index. So the collision cannot originate purely from clicks inside this widget.
- Reachability: it requires externally/hand-authored or partially-id'd content where a stored id matches a sibling's positional pattern (e.g. a row literally id'd `"layout-2"` adjacent to an id-less row at array index 1). For a CMS whose content is user-edited text/JSON, this is a realistic vector. `layoutColumnsPreservingExisting` (layout.ts) preserves the colliding stored id by index, so the bad key survives into render.
- Strongest reason it might be false: if every deployment only ever produces ids via this widget's own add-buttons, collisions never arise. But the widget explicitly accepts and normalizes arbitrary stored `value`, and assigns positional ids to id-less entries, so mixed-id content is in-contract input.

## Suggested Next Step

Add a uniqueness pass when normalizing (e.g. de-duplicate row ids and per-row column ids, regenerating a fresh id on collision), or derive React keys from a guaranteed-unique source rather than the raw stored id.

## Agent Handoff

After working this report, preserve the original finding body. Update line 2 `DEVANA-STATE: ...` and the final `DEVANA-SUMMARY:` prefix. Keep `DEVANA-KEY:` stable unless the same finding moved.

## Status Notes

- 2026-06-27: open by Devana. Found via state-lifecycle trail; confirmed no id-uniqueness pass exists in admin normalization.

DEVANA-KEY: src/admin.tsx:206-209,239,444,489 | react-key-id-collision-state-bleed
DEVANA-SUMMARY: Status=open | P2 medium src/admin.tsx:206-209,239,444,489 - Positional synthesized ids (`layout-N`, `layout-R-column-C`) can equal a sibling's stored id, producing duplicate React keys and per-instance editor state bleed.
