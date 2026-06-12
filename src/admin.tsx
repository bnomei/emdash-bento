import { Button, Input, MenuBar, Select } from "@cloudflare/kumo";
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ChangeEvent } from "react";
import { BlocksField } from "@bnomei/emdash-blocks/admin";
import type {
  BlockBuilderBlock,
  BlockBuilderDefinition,
  BlockBuilderValue,
} from "@bnomei/emdash-blocks";
import type { LayoutBuilderColumn, LayoutBuilderRow, LayoutBuilderValue } from "./types";

type FieldWidgetProps<TOptions = Record<string, unknown>> = {
  value: unknown;
  onChange: (value: unknown) => void;
  id?: string;
  options?: TOptions;
};

type LayoutBuilderOptions = {
  blockTypes?: BlockBuilderDefinition[];
  blockDefinitions?: BlockBuilderDefinition[];
  helpText?: string;
};

const wrapperStyle = {
  display: "grid",
  gap: "0.75rem",
} satisfies CSSProperties;

const layoutBandColor = "#f04f4f";
const columnBandColor = "#ff8a1f";

const rowStyle = {
  border:
    "1px solid var(--color-kumo-hairline, var(--color-kumo-line, color-mix(in srgb, currentColor 16%, transparent)))",
  borderRadius: "0.5rem",
  padding: "0.75rem",
  display: "grid",
  gap: "0.75rem",
  position: "relative",
  background: "transparent",
  boxShadow: `inset 3px 0 0 ${layoutBandColor}`,
} satisfies CSSProperties;

const anchorStyle = {
  position: "absolute",
  insetBlockStart: 0,
  insetInlineStart: 0,
  width: "1px",
  height: "1px",
  overflow: "hidden",
  pointerEvents: "none",
  scrollMarginBlock: "6rem",
} satisfies CSSProperties;

const columnStyle = {
  ...rowStyle,
  background: "transparent",
  boxShadow: `inset 3px 0 0 ${columnBandColor}`,
} satisfies CSSProperties;

const columnGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
  gridAutoFlow: "row",
  gap: "0.75rem",
  alignItems: "start",
} satisfies CSSProperties;

const addControlsStyle = {
  display: "grid",
  gap: "0.5rem",
} satisfies CSSProperties;

const cardHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: "0.75rem",
} satisfies CSSProperties;

const cardTitleStyle = {
  display: "flex",
  gap: "0.5rem",
  flexWrap: "wrap",
  alignItems: "center",
  minWidth: 0,
  lineHeight: 1.2,
  flexShrink: 0,
} satisfies CSSProperties;

const cardControlsStyle = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  flexShrink: 0,
} satisfies CSSProperties;

const headerControlsStyle = {
  ...cardControlsStyle,
  marginLeft: "auto",
} satisfies CSSProperties;

const layoutHeaderInputStyle = {
  flex: "0 1 auto",
  marginLeft: "auto",
  minWidth: 0,
  maxWidth: "min(100%, 32rem)",
} satisfies CSSProperties;

const layoutPatternInputStyle = {
  fieldSizing: "content",
  maxWidth: "100%",
  minWidth: "calc(3ch + 1.5rem)",
} satisfies CSSProperties;

const fullWidthButtonClassName = "h-9 min-h-9 w-full justify-center";
const menuBarClassName = "h-9 min-h-9";

const codeStyle = {
  color: "var(--text-color-kumo-strong, currentColor)",
  fontSize: "1rem",
  fontFamily: "inherit",
  fontWeight: 700,
  lineHeight: 1.35,
} satisfies CSSProperties;

const helpTextStyle = {
  color: "var(--text-color-kumo-subtle, currentColor)",
  fontSize: "0.85rem",
} satisfies CSSProperties;

const defaultLayoutPattern = "1/1";
const defaultNewLayoutPattern = "1/1, 1/2, 1/3";
const layoutInputPlaceholder = defaultNewLayoutPattern;

function randomId(prefix: string) {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function shortId(value: string) {
  return value.includes("-") ? value.slice(0, 8) : value;
}

function visualAnchorId(baseId: string, ...segments: string[]) {
  return [baseId, ...segments.map((segment) => encodeURIComponent(segment))].join(":");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeBlock(value: unknown, index: number): BlockBuilderBlock {
  const record = asRecord(value);
  const props =
    record.props && typeof record.props === "object" && !Array.isArray(record.props)
      ? (record.props as Record<string, unknown>)
      : {};

  return {
    id: typeof record.id === "string" && record.id ? record.id : `block-${index + 1}`,
    type: typeof record.type === "string" && record.type ? record.type : "text",
    hidden: typeof record.hidden === "boolean" ? record.hidden : undefined,
    props,
  };
}

function normalizeBlocks(value: unknown): BlockBuilderValue {
  return Array.isArray(value) ? value.map((item, index) => normalizeBlock(item, index)) : [];
}

function normalizeColumn(
  value: unknown,
  rowIndex: number,
  columnIndex: number,
): LayoutBuilderColumn {
  const record = asRecord(value);
  return {
    id:
      typeof record.id === "string" && record.id
        ? record.id
        : `layout-${rowIndex + 1}-column-${columnIndex + 1}`,
    span: typeof record.span === "string" && record.span ? record.span : "1/1",
    blocks: normalizeBlocks(record.blocks),
  };
}

function columnsToLayout(columns: LayoutBuilderColumn[]) {
  return columns.length ? columns.map((column) => column.span).join(", ") : defaultLayoutPattern;
}

function normalizeRow(value: unknown, rowIndex: number): LayoutBuilderRow {
  const record = asRecord(value);
  const settings =
    record.settings && typeof record.settings === "object" && !Array.isArray(record.settings)
      ? (record.settings as Record<string, unknown>)
      : undefined;
  const existingColumns = Array.isArray(record.columns)
    ? record.columns.map((column, columnIndex) => normalizeColumn(column, rowIndex, columnIndex))
    : [];
  const layout =
    typeof record.layout === "string" && record.layout.trim()
      ? normalizeLayoutPattern(record.layout, defaultLayoutPattern)
      : normalizeLayoutPattern(columnsToLayout(existingColumns), defaultLayoutPattern);

  return {
    id: typeof record.id === "string" && record.id ? record.id : `layout-${rowIndex + 1}`,
    layout,
    settings,
    columns: layoutColumns(layout, existingColumns),
  };
}

function asLayouts(value: unknown): LayoutBuilderValue {
  return Array.isArray(value) ? value.map((item, index) => normalizeRow(item, index)) : [];
}

function spanToGridColumns(span: string) {
  const [rawNumerator, rawDenominator] = span.split("/");
  const numerator = Number(rawNumerator);
  const denominator = Number(rawDenominator);

  if (
    Number.isInteger(numerator) &&
    Number.isInteger(denominator) &&
    numerator > 0 &&
    denominator > 0
  ) {
    const columns = Math.round((numerator / denominator) * 12);
    return Math.min(12, Math.max(1, columns));
  }

  return 12;
}

function isValidSpan(span: string) {
  const [rawNumerator, rawDenominator] = span.split("/");
  const numerator = Number(rawNumerator);
  const denominator = Number(rawDenominator);
  return (
    Number.isInteger(numerator) &&
    Number.isInteger(denominator) &&
    numerator > 0 &&
    denominator > 0 &&
    numerator <= denominator &&
    denominator <= 12
  );
}

function validLayoutSpans(layout: string): string[] {
  return layout
    .split(",")
    .map((span) => span.trim())
    .filter(Boolean)
    .filter(isValidSpan);
}

function layoutSpans(layout: string): string[] {
  const spans = validLayoutSpans(layout);
  return spans.length ? spans : ["1/1"];
}

function normalizeLayoutPattern(layout: string, fallbackLayout = "1/1") {
  const spans = validLayoutSpans(layout);
  if (spans.length) return spans.join(", ");

  if (!fallbackLayout.trim()) return "";

  const fallbackSpans = validLayoutSpans(fallbackLayout);
  return (fallbackSpans.length ? fallbackSpans : ["1/1"]).join(", ");
}

function compactControlWidth(values: string[], min = 8, max = 42) {
  const contentWidth = values.reduce((longest, value) => Math.max(longest, value.length), 0);
  return Math.min(Math.max(contentWidth + 6, min), max);
}

function spanOptions(layout: string) {
  const spans = new Set(layoutSpans(layout));
  return Array.from(spans)
    .sort(
      (left, right) =>
        spanToGridColumns(left) - spanToGridColumns(right) || left.localeCompare(right),
    )
    .map((span) => ({ value: span, label: span }));
}

function firstLayoutSpan(layout: string) {
  return layoutSpans(layout)[0] ?? "1/1";
}

function layoutColumns(
  layout: string,
  existingColumns: LayoutBuilderColumn[] = [],
): LayoutBuilderColumn[] {
  const spans = layoutSpans(layout);
  const columnCount = spans.length;

  return Array.from({ length: columnCount }, (_value, index) => ({
    id: existingColumns[index]?.id ?? randomId("column"),
    span: spans[index] ?? existingColumns[index]?.span ?? "1/1",
    blocks: existingColumns[index]?.blocks ?? [],
  }));
}

function defaultLayoutRow(): LayoutBuilderRow {
  const layout = defaultLayoutPattern;
  return {
    id: "layout-1",
    layout,
    columns: [{ id: "layout-1-column-1", span: firstLayoutSpan(layout), blocks: [] }],
  };
}

function LayoutPatternField({
  id,
  value,
  fallbackLayout,
  ariaLabel = "Layout",
  style,
  onCommit,
}: {
  id: string;
  value: string;
  fallbackLayout?: string;
  ariaLabel?: string;
  style?: CSSProperties;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  return (
    <div style={{ ...layoutHeaderInputStyle, ...style }}>
      <Input
        id={id}
        aria-label={ariaLabel}
        className="max-w-full"
        placeholder={layoutInputPlaceholder}
        style={layoutPatternInputStyle}
        value={draft}
        onChange={(event: ChangeEvent<HTMLInputElement>) => setDraft(event.currentTarget.value)}
        onBlur={() => {
          const nextLayout = normalizeLayoutPattern(draft, fallbackLayout ?? "");
          setDraft(nextLayout);
          onCommit(nextLayout);
        }}
      />
    </div>
  );
}

function BlocksMiniEditor({
  blocks,
  onChange,
  id,
  options,
}: {
  blocks: BlockBuilderValue;
  onChange: (blocks: BlockBuilderValue) => void;
  id: string;
  options?: LayoutBuilderOptions;
}) {
  return (
    <BlocksField
      value={blocks}
      onChange={(nextValue) => onChange(Array.isArray(nextValue) ? nextValue : [])}
      id={id}
      options={options}
    />
  );
}

export function LayoutsField({
  value,
  onChange,
  id = "bento",
  options,
}: FieldWidgetProps<LayoutBuilderOptions>) {
  const storedLayouts = asLayouts(value);
  const layouts = storedLayouts.length ? storedLayouts : [defaultLayoutRow()];
  const didPrefillEmptyLayout = useRef(false);

  useEffect(() => {
    if (storedLayouts.length > 0) {
      didPrefillEmptyLayout.current = false;
      return;
    }

    if (!didPrefillEmptyLayout.current) {
      didPrefillEmptyLayout.current = true;
      onChange([defaultLayoutRow()]);
    }
  }, [storedLayouts.length, onChange]);

  function updateLayouts(nextLayouts: LayoutBuilderValue) {
    onChange(
      nextLayouts.map((row) => {
        const layout = normalizeLayoutPattern(
          row.layout || columnsToLayout(row.columns),
          defaultLayoutPattern,
        );
        return {
          ...row,
          layout,
          settings: row.settings && Object.keys(row.settings).length ? row.settings : undefined,
          columns: layoutColumns(layout, row.columns).map((column) => ({
            ...column,
            blocks: column.blocks ?? [],
          })),
        };
      }),
    );
  }

  function updateRow(index: number, nextRow: LayoutBuilderRow) {
    const nextLayouts = [...layouts];
    nextLayouts[index] = nextRow;
    updateLayouts(nextLayouts);
  }

  function moveLayout(fromIndex: number, toIndex: number) {
    const nextLayouts = [...layouts];
    const [moved] = nextLayouts.splice(fromIndex, 1);
    if (!moved) return;
    nextLayouts.splice(toIndex, 0, moved);
    updateLayouts(nextLayouts);
  }

  function moveColumn(rowIndex: number, fromIndex: number, toIndex: number) {
    const row = layouts[rowIndex];
    if (!row) return;

    const columns = [...row.columns];
    const [moved] = columns.splice(fromIndex, 1);
    if (!moved) return;
    columns.splice(toIndex, 0, moved);

    updateRow(rowIndex, {
      ...row,
      layout: columnsToLayout(columns),
      columns,
    });
  }

  return (
    <div id={id} tabIndex={-1} style={wrapperStyle}>
      {layouts.map((row, rowIndex) => {
        const layoutMenuOptions =
          layouts.length > 1
            ? [
                ...(rowIndex > 0
                  ? [
                      {
                        icon: <ArrowUpIcon size={14} />,
                        id: "move-up",
                        tooltip: "Move layout up",
                        onClick: () => moveLayout(rowIndex, rowIndex - 1),
                      },
                    ]
                  : []),
                ...(rowIndex < layouts.length - 1
                  ? [
                      {
                        icon: <ArrowDownIcon size={14} />,
                        id: "move-down",
                        tooltip: "Move layout down",
                        onClick: () => moveLayout(rowIndex, rowIndex + 1),
                      },
                    ]
                  : []),
                {
                  icon: <TrashIcon size={14} />,
                  id: "remove",
                  tooltip: "Remove layout",
                  onClick: () => updateLayouts(layouts.filter((_row, index) => index !== rowIndex)),
                },
              ]
            : [];

        return (
          <section key={row.id} style={rowStyle}>
            <span
              id={visualAnchorId(id, "layout", row.id)}
              aria-hidden="true"
              style={anchorStyle}
            />
            <div style={cardHeaderStyle}>
              <div style={cardTitleStyle}>
                <strong style={codeStyle} title={row.id}>
                  {shortId(row.id)}
                </strong>
              </div>
              <LayoutPatternField
                id={`${id}-${rowIndex}-layout`}
                value={row.layout}
                onCommit={(layout) =>
                  updateRow(rowIndex, {
                    ...row,
                    layout,
                    columns: layoutColumns(layout, row.columns),
                  })
                }
              />
              {layoutMenuOptions.length ? (
                <MenuBar
                  className={menuBarClassName}
                  isActive={undefined}
                  optionIds
                  options={layoutMenuOptions}
                />
              ) : null}
            </div>
            <div style={columnGridStyle}>
              {row.columns.map((column, columnIndex) => {
                const gridSpan = spanToGridColumns(column.span);
                const columnSpanOptions = spanOptions(row.layout);
                const columnSpanValue = columnSpanOptions.some((item) => item.value === column.span)
                  ? column.span
                  : undefined;
                const showSpanSelect = columnSpanOptions.length > 1;
                const showColumnMenu = row.columns.length > 1;

                return (
                  <section
                    key={column.id}
                    style={{
                      ...columnStyle,
                      gridColumn: `span ${gridSpan} / span ${gridSpan}`,
                    }}
                  >
                    <span
                      id={visualAnchorId(id, "layout", row.id, "column", column.id)}
                      aria-hidden="true"
                      style={anchorStyle}
                    />
                    <div style={cardHeaderStyle}>
                      <div style={cardTitleStyle}>
                        <strong style={codeStyle} title={column.id}>
                          {shortId(column.id)}
                        </strong>
                      </div>
                      {showSpanSelect || showColumnMenu ? (
                        <div style={headerControlsStyle}>
                          {showSpanSelect ? (
                            <div
                              style={{
                                width: `${compactControlWidth(
                                  columnSpanOptions.map((item) => item.label),
                                  8,
                                  14,
                                )}ch`,
                              }}
                            >
                              <Select
                                aria-label={`Column ${columnIndex + 1} width`}
                                className="w-full"
                                items={columnSpanOptions}
                                value={columnSpanValue}
                                onValueChange={(nextValue) => {
                                  const nextColumns = [...row.columns];
                                  nextColumns[columnIndex] = {
                                    ...column,
                                    span: String(nextValue),
                                  };
                                  updateRow(rowIndex, {
                                    ...row,
                                    layout: columnsToLayout(nextColumns),
                                    columns: nextColumns,
                                  });
                                }}
                              />
                            </div>
                          ) : null}
                          {showColumnMenu ? (
                            <MenuBar
                              className={menuBarClassName}
                              isActive={undefined}
                              optionIds
                              options={[
                                ...(columnIndex > 0
                                  ? [
                                      {
                                        icon: <ArrowLeftIcon size={14} />,
                                        id: "move-left",
                                        tooltip: "Move column left",
                                        onClick: () =>
                                          moveColumn(rowIndex, columnIndex, columnIndex - 1),
                                      },
                                    ]
                                  : []),
                                ...(columnIndex < row.columns.length - 1
                                  ? [
                                      {
                                        icon: <ArrowRightIcon size={14} />,
                                        id: "move-right",
                                        tooltip: "Move column right",
                                        onClick: () =>
                                          moveColumn(rowIndex, columnIndex, columnIndex + 1),
                                      },
                                    ]
                                  : []),
                                {
                                  icon: <TrashIcon size={14} />,
                                  id: "remove",
                                  tooltip: "Remove column",
                                  onClick: () => {
                                    const nextColumns = row.columns.filter(
                                      (_column, index) => index !== columnIndex,
                                    );
                                    updateRow(rowIndex, {
                                      ...row,
                                      layout: columnsToLayout(nextColumns),
                                      columns: nextColumns,
                                    });
                                  },
                                },
                              ]}
                            />
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <BlocksMiniEditor
                      id={visualAnchorId(id, "layout", row.id, "column", column.id, "blocks")}
                      blocks={column.blocks}
                      options={options}
                      onChange={(blocks) => {
                        const nextColumns = [...row.columns];
                        nextColumns[columnIndex] = { ...column, blocks };
                        updateRow(rowIndex, { ...row, columns: nextColumns });
                      }}
                    />
                  </section>
                );
              })}
            </div>
            <div style={addControlsStyle}>
              <Button
                type="button"
                size="sm"
                className={fullWidthButtonClassName}
                icon={PlusIcon}
                onClick={() => {
                  const span = defaultLayoutPattern;
                  const columns = [...row.columns, { id: randomId("column"), span, blocks: [] }];
                  updateRow(rowIndex, {
                    ...row,
                    layout: columnsToLayout(columns),
                    columns,
                  });
                }}
              >
                Add Column
              </Button>
            </div>
          </section>
        );
      })}
      <div style={addControlsStyle}>
        <Button
          type="button"
          size="sm"
          className={fullWidthButtonClassName}
          icon={PlusIcon}
          onClick={() => {
            const layout = normalizeLayoutPattern(defaultNewLayoutPattern, defaultLayoutPattern);
            updateLayouts([
              ...layouts,
              {
                id: randomId("layout"),
                layout,
                columns: layoutColumns(layout),
              },
            ]);
          }}
        >
          Add Layout
        </Button>
      </div>
      {options?.helpText ? <small style={helpTextStyle}>{options.helpText}</small> : null}
    </div>
  );
}

export const fields = {
  layouts: LayoutsField,
};
