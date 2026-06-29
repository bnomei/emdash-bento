/**
 * Active EmDash admin locale for the bento widget.
 *
 * Reads the `emdash-locale` cookie in the browser and resyncs on focus so
 * widget copy tracks the admin language switcher without a full reload.
 */
import { useEffect, useState } from "react";
import { DEFAULT_LOCALE, normalizeLocale } from "./i18n";

const LOCALE_COOKIE_NAME = "emdash-locale";

/** Current admin locale from the `emdash-locale` cookie, or `fallback` when absent. */
export function readAdminLocale(fallback = DEFAULT_LOCALE): string {
  const normalizedFallback = normalizeLocale(fallback);

  if (typeof document === "undefined") return normalizedFallback;

  const cookieLocale = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${LOCALE_COOKIE_NAME}=`))
    ?.slice(LOCALE_COOKIE_NAME.length + 1);

  if (!cookieLocale) return normalizedFallback;

  try {
    return normalizeLocale(decodeURIComponent(cookieLocale)) || normalizedFallback;
  } catch {
    return normalizedFallback;
  }
}

/** React hook that tracks the admin locale cookie across focus and periodic resync. */
export function useAdminLocale(fallback = DEFAULT_LOCALE): string {
  const [locale, setLocale] = useState(() => readAdminLocale(fallback));

  useEffect(() => {
    function syncLocale() {
      setLocale(readAdminLocale(fallback));
    }

    syncLocale();
    window.addEventListener("focus", syncLocale);
    const interval = window.setInterval(syncLocale, 1000);

    return () => {
      window.removeEventListener("focus", syncLocale);
      window.clearInterval(interval);
    };
  }, [fallback]);

  return locale;
}
