import { describe, it, expect } from "vitest";
import es from "@/i18n/locales/es.json";
import en from "@/i18n/locales/en.json";

const REQUIRED_KEYS = [
  "nav.signIn",
  "hero.headline",
  "hero.subheadline",
  "hero.ctaPrimary",
  "hero.ctaSecondary",
  "features.sectionTitle",
  "features.link.title",
  "features.link.body",
  "features.confirm.title",
  "features.confirm.body",
  "features.reminder.title",
  "features.reminder.body",
  "cta.eyebrow",
  "cta.headline",
  "cta.sub",
  "cta.ctaPrimary",
  "cta.footnote",
  "footer.tagline",
  "footer.productHeading",
  "footer.productLinks.signIn",
  "footer.productLinks.signUp",
  "footer.companyHeading",
  "footer.companyLinks.about",
  "footer.companyLinks.contact",
  "footer.copyright",
];

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce((current: unknown, key: string) => {
    if (current && typeof current === "object") {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

describe("landing i18n keys", () => {
  it.each(REQUIRED_KEYS)("es.json has landing.%s", (key) => {
    const value = getNestedValue(es.landing as unknown as Record<string, unknown>, key);
    expect(value, `Missing key: landing.${key} in es.json`).toBeTruthy();
    expect(typeof value).toBe("string");
  });

  it.each(REQUIRED_KEYS)("en.json has landing.%s", (key) => {
    const value = getNestedValue(en.landing as unknown as Record<string, unknown>, key);
    expect(value, `Missing key: landing.${key} in en.json`).toBeTruthy();
    expect(typeof value).toBe("string");
  });
});
