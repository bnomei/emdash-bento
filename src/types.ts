import type { BlockBuilderValue } from "@bnomei/emdash-blocks";

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
