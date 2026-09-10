import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

export const SUPPORTED_LOCALES = ["fr", "en"] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: AppLocale = "fr";
export const LOCALE_COOKIE = "intervia-locale";

function isSupportedLocale(value: string | undefined): value is AppLocale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * Locale is a per-user preference (cookie, seeded from profiles.locale on
 * login), not a URL segment — org-scoped routes already carry `/o/[orgSlug]`,
 * and stacking `/[locale]` on top would complicate every internal link for
 * little benefit in an authenticated B2B app where each user picks their
 * language once in Settings.
 */
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isSupportedLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
