import { definePlugin, type PluginDescriptor } from "emdash";
import { bentoMessage, type BentoI18nConfig } from "./i18n";

export type { BentoI18nConfig, BentoI18nMessages, BentoMessageKey, LocalizedString } from "./i18n";
export {
  DEFAULT_BENTO_I18N,
  DEFAULT_LOCALE,
  bentoMessage,
  formatBentoMessage,
  localeFallbacks,
  localizedString,
} from "./i18n";
export type {
  LayoutBuilderColumn,
  LayoutBuilderOptions,
  LayoutBuilderRow,
  LayoutBuilderValue,
} from "./types";
export {
  isLayoutBuilderRow,
  layoutGridSpans,
  layoutSpans,
  normalizeLayoutRow,
  normalizeLayoutRows,
  spanToGridColumns,
  visibleLayoutRows,
} from "./render";

export type BentoDescriptorOptions = {
  entrypoint?: string;
  adminEntry?: string;
  i18n?: BentoI18nConfig;
};

const PLUGIN_ID = "bento";
const PLUGIN_VERSION = "0.2.1";
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
    options: { adminEntry, i18n: options.i18n },
  };
}

export function createPlugin(options: Pick<BentoDescriptorOptions, "adminEntry" | "i18n"> = {}) {
  return definePlugin({
    id: PLUGIN_ID,
    version: PLUGIN_VERSION,
    admin: {
      entry: options.adminEntry ?? `${PACKAGE_NAME}/admin`,
      fieldWidgets: [
        { name: "layouts", label: bentoMessage("grid", options.i18n), fieldTypes: ["json"] },
      ],
    },
  });
}

export default bentoPlugin;
