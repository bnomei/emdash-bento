import assert from "node:assert/strict";
import test from "node:test";
import {
  isLayoutBuilderRow,
  layoutSpans,
  normalizeLayoutRow,
  normalizeLayoutRows,
  spanToGridColumns,
  visibleLayoutRows,
} from "./render.js";
import { columnsToLayout, layoutColumns, normalizeLayoutPattern } from "./layout.js";
import { bentoMessage, formatBentoMessage, localeFallbacks, localizedString } from "./i18n.js";
import type { LayoutBuilderRow } from "./types.js";

test("bento messages follow the EmDash-style fallback chain", () => {
  const i18n = {
    locale: "fr-CA",
    defaultLocale: "en",
    locales: ["en", "fr", "fr-CA"],
    fallback: { "fr-CA": "fr", fr: "en" },
    messages: {
      fr: { addLayout: "Ajouter une mise en page" },
      en: { columnWidth: "Column {column}" },
    },
  };

  assert.deepEqual(localeFallbacks(i18n), ["fr-CA", "fr", "en"]);
  assert.equal(bentoMessage("addLayout", i18n), "Ajouter une mise en page");
  assert.equal(formatBentoMessage("columnWidth", i18n, { column: 2 }), "Column 2");
  assert.equal(localizedString({ en: "Grid", fr: "Grille" }, i18n), "Grille");
});

test("layoutSpans trims, filters, and falls back to a full-width span", () => {
  assert.deepEqual(layoutSpans(" 1/2, , 1/3 , invalid "), ["1/2", "1/3"]);
  assert.deepEqual(layoutSpans(""), ["1/1"]);
  assert.deepEqual(layoutSpans("0/1, 3/2, 1/13, 1/2/3, nope"), ["1/1"]);
});

test("normalizeLayoutPattern keeps valid spans and normalizes invalid fallbacks", () => {
  assert.equal(normalizeLayoutPattern(" 1/2, nope, 1/3 "), "1/2, 1/3");
  assert.equal(normalizeLayoutPattern("nope", "1/4, bad, 3/4"), "1/4, 3/4");
  assert.equal(normalizeLayoutPattern("nope", ""), "");
  assert.equal(normalizeLayoutPattern("nope", "also-nope"), "1/1");
});

test("columnsToLayout preserves column positions when stored spans are invalid", () => {
  assert.equal(columnsToLayout([{ span: "bad" }, { span: "1/3" }]), "1/1, 1/3");
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

test("normalizeLayoutRow preserves stored columns when row layouts are stale", () => {
  const row = normalizeLayoutRow({
    id: "legacy",
    layout: "1/1",
    columns: [
      {
        id: "main",
        span: "1/1",
        blocks: [{ id: "headline", type: "text", props: { text: "Hi" } }],
      },
      {
        id: "aside",
        span: "1/2",
        blocks: [{ id: "note", type: "text", props: { text: "Keep me" } }],
      },
    ],
  });

  assert.equal(row.layout, "1/1, 1/2");
  assert.deepEqual(
    row.columns.map((column) => ({ id: column.id, span: column.span })),
    [
      { id: "main", span: "1/1" },
      { id: "aside", span: "1/2" },
    ],
  );
  assert.equal(row.columns[1]?.blocks[0]?.id, "note");
});

test("normalizeLayoutRow filters invalid row layouts and preserves extra stored columns", () => {
  const row = normalizeLayoutRow({
    id: "mixed",
    layout: " 1/2, nope, 1/3, 4/3 ",
    columns: [
      { id: "left", span: "bad", blocks: [] },
      { id: "right", span: "1/4", blocks: [] },
      { id: "unused", span: "1/1", blocks: [] },
    ],
  });

  assert.equal(row.layout, "1/2, 1/3, 1/1");
  assert.deepEqual(
    row.columns.map((column) => ({ id: column.id, span: column.span })),
    [
      { id: "left", span: "1/2" },
      { id: "right", span: "1/3" },
      { id: "unused", span: "1/1" },
    ],
  );
});

test("layoutColumns creates missing columns from the shared parsed layout", () => {
  const columns = layoutColumns("1/2, nope, 1/3", [], (index, span) => ({
    id: `new-${index + 1}`,
    span,
    blocks: [],
  }));

  assert.deepEqual(
    columns.map((column) => ({ id: column.id, span: column.span })),
    [
      { id: "new-1", span: "1/2" },
      { id: "new-2", span: "1/3" },
    ],
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

test("normalizeLayoutRows tolerates a singleton row object persisted without an array", () => {
  const singleton = {
    id: "hero",
    layout: "1/2, 1/2",
    columns: [
      { id: "c1", span: "1/2", blocks: [] },
      { id: "c2", span: "1/2", blocks: [] },
    ],
  } as unknown as LayoutBuilderRow;

  const rows = normalizeLayoutRows(singleton);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.id, "hero");
  assert.equal(rows[0]?.columns.length, 2);
  assert.equal(visibleLayoutRows(singleton).length, 1);

  // A non-row object is still treated as empty rather than wrapped.
  assert.deepEqual(normalizeLayoutRows({ foo: "bar" } as unknown as LayoutBuilderRow), []);
});

test("normalizeLayoutRows tolerates null and primitive holes without throwing", () => {
  const good: LayoutBuilderRow = {
    id: "layout-1",
    layout: "1/1",
    columns: [{ id: "layout-1-column-1", span: "1/1", blocks: [] }],
  };

  assert.doesNotThrow(() =>
    normalizeLayoutRows([good, null as unknown as LayoutBuilderRow]),
  );
  const rows = normalizeLayoutRows([
    null as unknown as LayoutBuilderRow,
    good,
    "x" as unknown as LayoutBuilderRow,
  ]);
  assert.equal(rows.length, 3);
  // Null/primitive holes become synthesized default rows, matching admin.
  assert.equal(rows[0]?.columns.length, 1);
  assert.equal(rows[1]?.id, "layout-1");
  assert.doesNotThrow(() => visibleLayoutRows([null as unknown as LayoutBuilderRow]));
});

test("normalizeLayoutRow tolerates null/primitive column holes without throwing", () => {
  const stored = {
    id: "row-1",
    layout: "1/2, 1/2",
    columns: [null, { id: "c2", span: "1/2", blocks: [] }],
  } as unknown as LayoutBuilderRow;

  assert.doesNotThrow(() => normalizeLayoutRow(stored));
  const row = normalizeLayoutRow(stored);
  assert.equal(row.columns.length, 2);
  // Null hole becomes a synthesized default column, matching admin.
  assert.equal(row.columns[0]?.id, "layout-1-column-1");
  assert.equal(row.columns[1]?.id, "c2");
  assert.doesNotThrow(() =>
    visibleLayoutRows([
      {
        id: "row-1",
        layout: "1/2, 1/2",
        columns: ["x", null],
      } as unknown as LayoutBuilderRow,
    ]),
  );
});

test("normalizeLayoutRow preserves a singleton block object on a column", () => {
  const stored = {
    id: "hero",
    layout: "1/1",
    columns: [
      {
        id: "c1",
        span: "1/1",
        blocks: { id: "headline", type: "text", props: { text: "Hi" } },
      },
    ],
  } as unknown as LayoutBuilderRow;

  assert.doesNotThrow(() => normalizeLayoutRow(stored));
  const row = normalizeLayoutRow(stored);
  assert.equal(row.columns[0]?.blocks.length, 1);
  assert.equal(row.columns[0]?.blocks[0]?.id, "headline");
  assert.equal(row.columns[0]?.blocks[0]?.type, "text");

  // Null/undefined blocks still normalize to [] in both directions.
  const empty = {
    id: "r",
    layout: "1/1",
    columns: [{ id: "c1", span: "1/1", blocks: null }],
  } as unknown as LayoutBuilderRow;
  assert.deepEqual(normalizeLayoutRow(empty).columns[0]?.blocks, []);
});

test("isLayoutBuilderRow detects span on any column, not just the first", () => {
  assert.equal(isLayoutBuilderRow({ id: "row-1", layout: "1/1" }), true);
  assert.equal(
    isLayoutBuilderRow({
      id: "row-1",
      columns: [
        { id: "c1", blocks: [] },
        { id: "c2", span: "1/2", blocks: [] },
      ],
    }),
    true,
  );
  // No layout key and no span on any column → not a layout row.
  assert.equal(isLayoutBuilderRow({ id: "row-1", columns: [{ id: "c1", blocks: [] }] }), false);
  assert.equal(isLayoutBuilderRow({ foo: "bar" }), false);
  assert.equal(isLayoutBuilderRow(null), false);
  // Primitive column entries must not throw on the `in` check.
  assert.doesNotThrow(() => isLayoutBuilderRow({ id: "row-1", columns: ["x", 1, null] }));
  assert.equal(isLayoutBuilderRow({ id: "row-1", columns: ["x", 1, null] }), false);
});
