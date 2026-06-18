import type { BlockBuilderDefinition, BlockBuilderValue } from "@bnomei/emdash-blocks";
import type { BentoI18nConfig, LocalizedString } from "./i18n.js";

export type LayoutBuilderColumn = {
  id: string;
  span: string;
  blocks: BlockBuilderValue;
};

export type LayoutBuilderRow = {
  id: string;
  layout: string;
  settings?: Record<string, unknown>;
  columns: LayoutBuilderColumn[];
};

export type LayoutBuilderValue = LayoutBuilderRow[];

export type LayoutBuilderOptions = {
  blockTypes?: BlockBuilderDefinition[];
  blockDefinitions?: BlockBuilderDefinition[];
  helpText?: LocalizedString;
  i18n?: BentoI18nConfig;
};
