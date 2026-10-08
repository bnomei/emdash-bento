import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { bentoPlugin, createPlugin } from "../dist/index.mjs";

const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

test("built plugin registers with EmDash 1.2 and advertises the release version", () => {
  const descriptor = bentoPlugin();
  const plugin = createPlugin(descriptor.options);
  assert.equal(descriptor.format, "native");
  assert.equal(descriptor.entrypoint, pkg.name);
  assert.equal(descriptor.version, pkg.version);
  assert.equal(plugin.version, pkg.version);
  assert.equal(plugin.id, "bento");
  assert.equal(plugin.admin.entry, descriptor.adminEntry);
  assert.deepEqual(plugin.admin.fieldWidgets, [
    { name: "layouts", label: "Grid", fieldTypes: ["json"] },
  ]);
});

test("descriptor forwards custom entry and localized registration to the runtime", () => {
  const descriptor = bentoPlugin({
    entrypoint: "custom-bento",
    adminEntry: "custom-bento/editor",
    i18n: { locale: "de", messages: { de: { grid: "Raster" } } },
  });
  const plugin = createPlugin(descriptor.options);
  assert.equal(plugin.admin.entry, "custom-bento/editor");
  assert.equal(plugin.admin.fieldWidgets[0].label, "Raster");
});
