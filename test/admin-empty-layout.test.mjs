import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../src/admin.tsx", import.meta.url), "utf8");

test("empty layouts stay empty on mount", () => {
  assert.match(source, /const layouts = asLayouts\(value\);/);
  assert.doesNotMatch(source, /storedLayouts\.length \? storedLayouts : \[defaultLayoutRow\(\)\]/);
  assert.doesNotMatch(source, /onChange\(\[defaultLayoutRow\(\)\]\)/);
});

test("empty layouts show an add-first-row empty state", () => {
  assert.match(source, /layouts\.length === 0/);
  assert.match(source, /bentoMessage\("noLayoutsTitle"/);
  assert.match(source, /bentoMessage\("noLayoutsDescription"/);
  assert.match(source, /bentoMessage\("addLayout"/);
});

test("blurring an invalid layout pattern falls back to the current layout", () => {
  // The row layout field must pass a fallbackLayout so an empty or invalid
  // draft normalizes back to the existing layout instead of "", which would
  // truncate multi-column rows down to the first column on blur.
  assert.match(source, /fallbackLayout=\{row\.layout \|\| columnsToLayout\(row\.columns\)\}/);
});

test("synthetic columns implied by the layout use deterministic ids", () => {
  // normalizeRow's column factory must not use randomId, otherwise columns
  // implied by the layout pattern remount on every re-render before the first
  // save and lose in-progress block edits.
  assert.match(
    source,
    /\(columnIndex, span\) => \(\{\s*\n\s*id: `layout-\$\{rowIndex \+ 1\}-column-\$\{columnIndex \+ 1\}`/,
  );
});

test("the remove-layout control is available even for the last remaining row", () => {
  // The remove option must not be gated behind layouts.length > 1, otherwise a
  // single row can never be removed back to the empty [] state.
  assert.doesNotMatch(source, /layouts\.length > 1\s*\n?\s*\?\s*\[/);
  assert.match(source, /id: "remove",\s*\n\s*tooltip: bentoMessage\("removeLayout"/);
  assert.match(source, /const layoutMenuOptions = \[/);
});

test("a singleton row object is coerced into an editable row, not empty state", () => {
  // asLayouts must wrap a non-array layout-row object so a migration mistake
  // is editable instead of silently empty (and overwritten on next save).
  assert.match(source, /isLayoutBuilderRow\(value\) \? \[value\] : \[\]/);
  assert.match(source, /import \{[^}]*isLayoutBuilderRow[^}]*\} from "\.\/render"/);
});

test("a singleton block object on a column is coerced, not emptied", () => {
  // admin normalizeBlocks must wrap a singleton block object via the shared
  // asBlocksArray helper instead of returning [] for any non-array value.
  assert.match(source, /import \{[^}]*asBlocksArray[^}]*\} from "\.\/render"/);
  assert.match(source, /return asBlocksArray\(value\)\.map\(\(item, index\) => normalizeBlock/);
});

test("layout draft is not overwritten while the field is focused", () => {
  // Same-row structural edits change row.layout (the value prop); the draft
  // sync effect must be guarded by focus so uncommitted text is not reverted.
  assert.match(source, /const isFocused = useRef\(false\)/);
  assert.match(source, /if \(isFocused\.current\) return;\s*\n\s*setDraft\(value\)/);
  assert.match(source, /onFocus=\{\(\) => \{\s*\n\s*isFocused\.current = true;/);
});
