import assert from "node:assert/strict";
import test from "node:test";
import {
  layoutSpans,
  normalizeLayoutRow,
  normalizeLayoutRows,
  spanToGridColumns,
  visibleLayoutRows,
} from "./render.js";
import type { LayoutBuilderRow } from "./types.js";

test("layoutSpans trims, filters, and falls back to a full-width span", () => {
  assert.deepEqual(layoutSpans(" 1/2, , 1/3 , invalid "), ["1/2", "1/3"]);
  assert.deepEqual(layoutSpans(""), ["1/1"]);
  assert.deepEqual(layoutSpans("0/1, 3/2, 1/13, nope"), ["1/1"]);
});

test("spanToGridColumns converts valid spans to a twelve-column grid", () => {
  assert.equal(spanToGridColumns("1/1"), 12);
  assert.equal(spanToGridColumns("1/2"), 6);
  assert.equal(spanToGridColumns("1/3"), 4);
  assert.equal(spanToGridColumns("2/3"), 8);
  assert.equal(spanToGridColumns("1/4"), 3);
});

test("spanToGridColumns clamps or falls back for edge cases", () => {
  assert.equal(spanToGridColumns("1/24"), 1);
  assert.equal(spanToGridColumns("2/1"), 12);
  assert.equal(spanToGridColumns("0/3"), 12);
  assert.equal(spanToGridColumns("abc"), 12);
  assert.equal(spanToGridColumns(), 12);
});

test("normalizeLayoutRow preserves row and column updates while filling stable defaults", () => {
  const row = normalizeLayoutRow(
    {
      id: "hero",
      layout: "1/3, 2/3",
      settings: { theme: "dark" },
      columns: [
        {
          id: "copy",
          span: "1/3",
          blocks: [{ id: "headline", type: "text", props: { text: "Hi" } }],
        },
        { id: "media", span: "2/3", blocks: [] },
      ],
    },
    2,
  );

  assert.equal(row.id, "hero");
  assert.equal(row.layout, "1/3, 2/3");
  assert.deepEqual(row.settings, { theme: "dark" });
  assert.equal(row.columns[0]?.id, "copy");
  assert.equal(row.columns[0]?.span, "1/3");
  assert.equal(row.columns[0]?.blocks[0]?.id, "headline");
  assert.equal(row.columns[1]?.id, "media");
});

test("normalizeLayoutRow derives layout from updated columns when row layout is empty", () => {
  const row = normalizeLayoutRow(
    {
      id: "columns-updated",
      layout: "",
      columns: [
        { id: "left", span: "1/4", blocks: [] },
        { id: "right", span: "3/4", blocks: [] },
      ],
    },
    0,
  );

  assert.equal(row.layout, "1/4, 3/4");
  assert.deepEqual(
    row.columns.map((column) => column.span),
    ["1/4", "3/4"],
  );
});

test("empty layout values stay empty until user action supplies rows", () => {
  assert.deepEqual(normalizeLayoutRows(), []);
  assert.deepEqual(normalizeLayoutRows(null), []);
  assert.deepEqual(normalizeLayoutRows([]), []);
  assert.deepEqual(visibleLayoutRows([]), []);

  const userAddedRow: LayoutBuilderRow = {
    id: "layout-1",
    layout: "1/1",
    columns: [{ id: "layout-1-column-1", span: "1/1", blocks: [] }],
  };

  assert.deepEqual(normalizeLayoutRows([userAddedRow]), [userAddedRow]);
});
