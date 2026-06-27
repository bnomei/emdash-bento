/**
 * Locale resolution and built-in admin copy for the bento field widget.
 *
 * Fallback chains walk configured locale order before built-in English defaults.
 * `bentoMessage` resolves widget chrome; `localizedString` resolves field options
 * such as help text.
 */
export type LocalizedString = string | Record<string, string | undefined>;

/** Keys for built-in admin widget copy resolved by `bentoMessage`. */
export type BentoMessageKey =
  | "addColumn"
  | "addLayout"
  | "columnWidth"
  | "grid"
  | "layout"
  | "moveColumnLeft"
  | "moveColumnRight"
  | "moveLayoutDown"
  | "moveLayoutUp"
  | "noLayoutsDescription"
  | "noLayoutsTitle"
  | "removeColumn"
  | "removeLayout";

/** Per-locale overrides for `BentoMessageKey` strings. */
export type BentoI18nMessages = Partial<
  Record<string, Partial<Record<BentoMessageKey, string | undefined>>>
>;

/** Locale, fallback map, and message overrides for the bento admin widget. */
export type BentoI18nConfig = {
  locale?: string;
  defaultLocale?: string;
  locales?: string[];
  fallback?: Record<string, string>;
  messages?: BentoI18nMessages;
};

/** Source locale for built-in widget messages and final fallback resolution. */
export const DEFAULT_LOCALE = "en";

/** Built-in English messages shipped with the widget. */
export const DEFAULT_BENTO_I18N = {
  defaultLocale: DEFAULT_LOCALE,
  locales: [DEFAULT_LOCALE],
  messages: {
    en: {
      addColumn: "Add Column",
      addLayout: "Add Layout",
      columnWidth: "Column {column} width",
      grid: "Grid",
      layout: "Layout",
      moveColumnLeft: "Move column left",
      moveColumnRight: "Move column right",
      moveLayoutDown: "Move layout down",
      moveLayoutUp: "Move layout up",
      noLayoutsDescription: "Add a layout to create the first row.",
      noLayoutsTitle: "No layouts yet",
      removeColumn: "Remove column",
      removeLayout: "Remove layout",
    },
  },
} satisfies {
  defaultLocale: string;
  locales: string[];
  messages: Record<typeof DEFAULT_LOCALE, Record<BentoMessageKey, string>>;
};

/** Trims a locale tag and falls back to `DEFAULT_LOCALE` when empty. */
export function normalizeLocale(locale: string | null | undefined): string {
  return (locale ?? DEFAULT_LOCALE).trim() || DEFAULT_LOCALE;
}

/**
 * Ordered locale chain: active locale, configured fallbacks, then default locale.
 *
 * Stops on cycles; the default locale is appended when not already visited.
 */
export function localeFallbacks(i18n: BentoI18nConfig | string | null | undefined): string[] {
  const config = typeof i18n === "string" ? { locale: i18n } : (i18n ?? {});
  const defaultLocale = normalizeLocale(config.defaultLocale ?? DEFAULT_BENTO_I18N.defaultLocale);
  const startLocale = normalizeLocale(config.locale ?? defaultLocale);
  const chain: string[] = [startLocale];
  const visited = new Set(chain);
  let current = startLocale;

  while (config.fallback?.[current]) {
    const next = config.fallback[current];
    if (!next || visited.has(next)) break;
    chain.push(next);
    visited.add(next);
    current = next;
  }

  if (!visited.has(defaultLocale)) {
    chain.push(defaultLocale);
  }

  return chain;
}

/** Resolves a localized option value by walking the locale fallback chain. */
export function localizedString(
  value: LocalizedString | null | undefined,
  i18n: BentoI18nConfig | string | null | undefined,
  fallback = "",
): string {
  if (typeof value === "string") return value;
  if (!value) return fallback;

  for (const candidate of localeFallbacks(i18n)) {
    const translated = value[candidate];
    if (typeof translated === "string" && translated.length > 0) return translated;
  }

  const source = value[DEFAULT_LOCALE];
  if (typeof source === "string" && source.length > 0) return source;

  const first = Object.values(value).find(
    (translated): translated is string => typeof translated === "string" && translated.length > 0,
  );
  return first ?? fallback;
}

/**
 * Resolves a built-in widget message, honoring user overrides across the full
 * fallback chain before falling back to English defaults.
 */
export function bentoMessage(
  key: BentoMessageKey,
  i18n: BentoI18nConfig | string | null | undefined,
): string {
  const config = typeof i18n === "string" ? { locale: i18n } : (i18n ?? {});

  for (const locale of localeFallbacks(config)) {
    const override = config.messages?.[locale]?.[key];
    if (typeof override === "string" && override.length > 0) return override;
  }

  const sourceOverride = config.messages?.[DEFAULT_LOCALE]?.[key];
  if (typeof sourceOverride === "string" && sourceOverride.length > 0) return sourceOverride;

  return DEFAULT_BENTO_I18N.messages.en[key] ?? key;
}

/** Like `bentoMessage`, substituting `{name}` placeholders from `replacements`. */
export function formatBentoMessage(
  key: BentoMessageKey,
  i18n: BentoI18nConfig | string | null | undefined,
  replacements: Record<string, string | number>,
): string {
  return bentoMessage(key, i18n).replace(/\{([a-zA-Z0-9_]+)\}/g, (match, name: string) => {
    const replacement = replacements[name];
    return replacement === undefined ? match : String(replacement);
  });
}
