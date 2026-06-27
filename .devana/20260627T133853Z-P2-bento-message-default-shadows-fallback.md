DEVANA-FINDING: v1
DEVANA-STATE: fixed | P2 | medium | security=no
DEVANA-KEY: src/i18n.ts:113-119 | bento-message-default-shadows-fallback

# bentoMessage returns the hardcoded en default for a key even when a later fallback locale carries a user override

## Finding

In `bentoMessage`, the per-locale loop short-circuits to the hardcoded English default the moment the locale `"en"` is encountered anywhere in the fallback chain:

```ts
for (const locale of localeFallbacks(config)) {
  const override = config.messages?.[locale]?.[key];
  if (typeof override === "string" && override.length > 0) return override;

  const defaultMessage = DEFAULT_BENTO_I18N.messages.en[key];
  if (locale === DEFAULT_LOCALE && defaultMessage) return defaultMessage;   // line 118
}
```

But `localeFallbacks` does **not** stop the chain at the default locale — it keeps following `config.fallback` past `"en"` and only halts on a cycle (i18n.ts:70-76). So `"en"` can sit in the *middle* of the chain, with lower-priority fallback locales after it that carry real user overrides. When that happens, line 118 fires for `"en"` and returns the built-in English string, never reaching the later locale whose override should win.

## Violated Invariant Or Contract

Documented/intended precedence is: user override for an earlier-in-chain locale > user override for a later fallback locale > default-locale default > built-in en default > raw key. The short-circuit at line 118 inverts the last two ranks: it lets the built-in en default beat a *later fallback locale's user override*.

## Oracle

The sibling resolver `localizedString` (i18n.ts:85-105) consumes the *same* `localeFallbacks` chain but has no en short-circuit — it walks the full chain and returns the first non-empty translation. For an equivalent value it returns the later-locale override. The two resolvers disagree on precedence for identical configs, which identifies line 118 as the anomaly rather than an intended design.

## Counterexample

```ts
bentoMessage("grid", {
  locale: "fr",
  defaultLocale: "en",
  fallback: { fr: "en", en: "de" },
  messages: { de: { grid: "Raster" } },
});
// returns "Grid" (built-in en default), NOT "Raster"
```

Trace:
- `localeFallbacks` → chain `["fr","en","de"]` (start `fr`; `fallback.fr="en"` push; `fallback.en="de"` push; `de` ends it; `en` already visited so not re-appended).
- loop `"fr"`: no override; `"fr" !== "en"`, continue.
- loop `"en"`: no `messages.en.grid`; `defaultMessage="Grid"`, `"en" === DEFAULT_LOCALE` → returns `"Grid"`.
- `"de"` is never visited, so `messages.de.grid = "Raster"` is unreachable.

By contrast `localizedString({de:"Raster"}, sameConfig)` walks `["fr","en","de"]` and returns `"Raster"`.

## Why It Might Matter

A host that configures a fallback chain routing through the default locale to a more specific locale (e.g. region → en → brand-specific overrides) gets the built-in English label in the admin UI instead of its configured override. The resolved strings are user-visible: the field label (`index.ts:59`) and admin tooltips/aria-labels/buttons (`admin.tsx` `bentoMessage`/`formatBentoMessage` calls). Low severity (a mislabeled control), but a concrete wrong runtime string and an internal inconsistency between the two resolvers.

## Proof

- Contract mismatch + cross-resolver divergence: `bentoMessage` and `localizedString` return different results for the same fallback chain and equivalent data.
- Concrete config + line-by-line control-flow trace (above).

## Counterevidence Checked

- Normal configs: when `fallback` is absent, `localeFallbacks` appends `defaultLocale` ("en") at the *end*, so the short-circuit fires only on the last element and is harmless. The bug requires a fallback that explicitly routes *through* en and then continues — an uncommon but fully valid configuration.
- Direct en override is unaffected: with `messages.en.<key>` set, line 115 returns the override before the line-118 default is reached (verified: `bentoMessage("grid", {locale:"en", messages:{en:{grid:"Custom"}}})` → `"Custom"`).
- Strongest reason it might be false: one could argue anything after the default locale in the chain is "below default" and should not win. But `localeFallbacks` deliberately advertises those later locales as valid lower-priority sources, and `localizedString` honors them — so the short-circuit is an inconsistency, not an intended cutoff.

## Suggested Next Step

Either stop the fallback chain once the default locale is reached, or remove the in-loop en-default short-circuit and rely on the post-loop default resolution (lines 121-124) so a later fallback-locale override is consulted first. Align the precedence with `localizedString`.

## Agent Handoff

After working this report, preserve the original finding body. Update line 2 `DEVANA-STATE: ...` and the final `DEVANA-SUMMARY:` prefix. Keep `DEVANA-KEY:` stable unless the same finding moved.

## Status Notes

- 2026-06-27: open by Devana. Found via invariants-contracts trail; confirmed by precedence divergence against localizedString on the same chain.
- 2026-06-27: fixed. Removed the in-loop `locale === DEFAULT_LOCALE` short-circuit in `bentoMessage`. The loop now walks the full fallback chain looking only for user overrides; the built-in en default is resolved after the loop (via the existing `messages.en` check and `DEFAULT_BENTO_I18N.messages.en[key] ?? key`). A fallback that routes through the default locale to a more specific locale (fr -> en -> de) now returns that later locale's override ("Raster") instead of the built-in "Grid", matching `localizedString`'s precedence. Direct en overrides still win in-loop and the built-in default still resolves when no override exists. Added a regression test covering the mid-chain default-locale case plus the unaffected normal cases. Verified: 27/27 tests pass, `tsc --noEmit` clean.

DEVANA-KEY: src/i18n.ts:113-119 | bento-message-default-shadows-fallback
DEVANA-SUMMARY: Status=fixed | P2 medium src/i18n.ts:113-119 - The `locale === DEFAULT_LOCALE` short-circuit returned the built-in en default as soon as "en" appeared mid-chain, shadowing a later fallback locale's override. Fixed by removing the in-loop short-circuit and resolving the default after the full chain walk, aligning with localizedString.
