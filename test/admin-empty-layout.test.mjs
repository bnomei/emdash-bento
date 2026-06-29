import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../src/admin.tsx", import.meta.url), "utf8");
const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");

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
  assert.match(source, /fallbackLayout=\{row\.layout \|\| columnsToLayout\(row\.columns\)\}/);
});

test("synthetic columns implied by the layout use deterministic ids", () => {
  assert.match(
    source,
    /\(columnIndex, span\) => \(\{\s*\n\s*id: `layout-\$\{rowIndex \+ 1\}-column-\$\{columnIndex \+ 1\}`/,
  );
});

test("the remove-layout control is available even for the last remaining row", () => {
  assert.doesNotMatch(source, /layouts\.length > 1\s*\n?\s*\?\s*\[/);
  assert.match(source, /id: "remove",\s*\n\s*tooltip: bentoMessage\("removeLayout"/);
  assert.match(source, /const layoutMenuOptions = \[/);
});

test("a singleton row object is coerced into an editable row, not empty state", () => {
  assert.match(source, /isLayoutBuilderRow\(value\) \? \[value\] : \[\]/);
  assert.match(source, /import \{[^}]*isLayoutBuilderRow[^}]*\} from "\.\/render"/);
});

test("row and column ids are de-duplicated to avoid duplicate React keys", () => {
  assert.match(source, /function uniqueId\(id: string, index: number, seen: Set<string>\)/);
  assert.match(source, /const seenRowIds = new Set<string>\(\)/);
  assert.match(source, /const seenColumnIds = new Set<string>\(\)/);
  assert.match(source, /const id = uniqueId\(row\.id, index, seenRowIds\)/);
  assert.match(source, /const columnId = uniqueId\(column\.id, columnIndex, seenColumnIds\)/);
  assert.doesNotMatch(source, /uniqueId\([^)]*randomId/);
});

test("a singleton block object on a column is coerced, not emptied", () => {
  assert.match(source, /import \{[^}]*asBlocksArray[^}]*\} from "\.\/render"/);
  assert.match(source, /return asBlocksArray\(value\)\.map\(\(item, index\) => normalizeBlock/);
});

test("layout draft is not overwritten while the field is focused", () => {
  assert.match(source, /const isFocused = useRef\(false\)/);
  assert.match(source, /if \(isFocused\.current\) return;\s*\n\s*setDraft\(value\)/);
  assert.match(source, /onFocus=\{\(\) => \{\s*\n\s*isFocused\.current = true;/);
});

test("frontend README uses row-level grid allocation", () => {
  assert.match(readme, /import \{ layoutGridSpans, visibleLayoutRows \}/);
  assert.match(
    readme,
    /const gridSpans = layoutGridSpans\(row\.columns\.map\(\(column\) => column\.span\)\)/,
  );
  assert.match(readme, /style=\{`--span: \$\{gridSpans\[columnIndex\] \?\? 12\}`\}/);
  assert.doesNotMatch(readme, /spanToGridColumns\(column\.span\)/);
});
