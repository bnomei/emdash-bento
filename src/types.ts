/**
 * Persisted layout JSON shapes for the bento field widget.
 *
 * A layout value is a row array; each row owns a layout pattern string and
 * columns that embed nested blocks from `@bnomei/emdash-blocks`.
 */
import type { BlockBuilderDefinition, BlockBuilderValue } from "@bnomei/emdash-blocks";
import type { BentoI18nConfig, LocalizedString } from "./i18n.js";

/** One column in a layout row: stable id, fractional span, and nested blocks. */
export type LayoutBuilderColumn = {
  id: string;
  span: string;
  blocks: BlockBuilderValue;
};

/** One bento row: layout pattern, optional settings, and ordered columns. */
export type LayoutBuilderRow = {
  id: string;
  layout: string;
  settings?: Record<string, unknown>;
  columns: LayoutBuilderColumn[];
};

/** Top-level persisted value for a `bento:layouts` JSON field (zero or more rows). */
export type LayoutBuilderValue = LayoutBuilderRow[];

/** Widget options for block definitions, help text, and admin locale overrides. */
export type LayoutBuilderOptions = {
  blockTypes?: BlockBuilderDefinition[];
  blockDefinitions?: BlockBuilderDefinition[];
  helpText?: LocalizedString;
  i18n?: BentoI18nConfig;
};
