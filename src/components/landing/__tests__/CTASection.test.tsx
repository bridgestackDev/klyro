import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CTASection } from "../CTASection";

vi.mock("next-intl/server", () => ({
  getTranslations: () => Promise.resolve((key: string) => `landing.${key}`),
  getLocale: () => Promise.resolve("es"),
}));

describe("CTASection", () => {
  it("renders the eyebrow", async () => {
    render(await CTASection());
    expect(screen.getByText("landing.cta.eyebrow")).toBeInTheDocument();
  });

  it("renders the headline", async () => {
    render(await CTASection());
    expect(screen.getByText("landing.cta.headline")).toBeInTheDocument();
  });

  it("renders the primary CTA linking to login", async () => {
    render(await CTASection());
    const cta = screen.getByText("landing.cta.ctaPrimary");
    expect(cta.closest("a")).toHaveAttribute("href", "/es/login");
  });

  it("renders the footnote", async () => {
    render(await CTASection());
    expect(screen.getByText("landing.cta.footnote")).toBeInTheDocument();
  });
});
