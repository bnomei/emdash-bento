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
