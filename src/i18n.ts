export type LocalizedString = string | Record<string, string | undefined>;

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

export type BentoI18nMessages = Partial<
  Record<string, Partial<Record<BentoMessageKey, string | undefined>>>
>;

export type BentoI18nConfig = {
  locale?: string;
  defaultLocale?: string;
  locales?: string[];
  fallback?: Record<string, string>;
  messages?: BentoI18nMessages;
};

export const DEFAULT_LOCALE = "en";

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

export function normalizeLocale(locale: string | null | undefined): string {
  return (locale ?? DEFAULT_LOCALE).trim() || DEFAULT_LOCALE;
}

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

export function bentoMessage(
  key: BentoMessageKey,
  i18n: BentoI18nConfig | string | null | undefined,
): string {
  const config = typeof i18n === "string" ? { locale: i18n } : (i18n ?? {});

  // Walk the full fallback chain for a user override before falling back to the
  // built-in default. The default locale can sit mid-chain (when `fallback`
  // routes through it to a more specific locale), so resolving the en default
  // in-loop would shadow a later fallback locale's override — diverging from
  // localizedString, which honors those later locales.
  for (const locale of localeFallbacks(config)) {
    const override = config.messages?.[locale]?.[key];
    if (typeof override === "string" && override.length > 0) return override;
  }

  const sourceOverride = config.messages?.[DEFAULT_LOCALE]?.[key];
  if (typeof sourceOverride === "string" && sourceOverride.length > 0) return sourceOverride;

  return DEFAULT_BENTO_I18N.messages.en[key] ?? key;
}

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
