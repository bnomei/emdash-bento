import { definePlugin, type PluginDescriptor } from "emdash";

export type { LayoutBuilderColumn, LayoutBuilderRow, LayoutBuilderValue } from "./types";
export {
  isLayoutBuilderRow,
  layoutSpans,
  normalizeLayoutRow,
  normalizeLayoutRows,
  spanToGridColumns,
  visibleLayoutRows,
} from "./render";

export type BentoDescriptorOptions = {
  entrypoint?: string;
  adminEntry?: string;
};

const PLUGIN_ID = "bento";
const PLUGIN_VERSION = "0.1.0";
const PACKAGE_NAME = "@bnomei/emdash-bento";

export function bentoPlugin(options: BentoDescriptorOptions = {}): PluginDescriptor {
  const entrypoint = options.entrypoint ?? PACKAGE_NAME;
  const adminEntry = options.adminEntry ?? `${entrypoint}/admin`;

  return {
    id: PLUGIN_ID,
    version: PLUGIN_VERSION,
    format: "native",
    entrypoint,
    adminEntry,
    options: { adminEntry },
  };
}

export function createPlugin(options: Pick<BentoDescriptorOptions, "adminEntry"> = {}) {
  return definePlugin({
    id: PLUGIN_ID,
    version: PLUGIN_VERSION,
    admin: {
      entry: options.adminEntry ?? `${PACKAGE_NAME}/admin`,
      fieldWidgets: [{ name: "layouts", label: "Grid", fieldTypes: ["json"] }],
    },
  });
}

export default bentoPlugin;
