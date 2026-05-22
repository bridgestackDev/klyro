import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Footer } from "../Footer";

vi.mock("next-intl/server", () => ({
  getTranslations: () => Promise.resolve((key: string) => `landing.${key}`),
  getLocale: () => Promise.resolve("es"),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/es",
}));

describe("Footer", () => {
  it("renders the tagline", async () => {
    render(await Footer());
    expect(screen.getByText("landing.footer.tagline")).toBeInTheDocument();
  });

  it("renders the product heading", async () => {
    render(await Footer());
    expect(screen.getByText("landing.footer.productHeading")).toBeInTheDocument();
  });

  it("renders the company heading", async () => {
    render(await Footer());
    expect(screen.getByText("landing.footer.companyHeading")).toBeInTheDocument();
  });

  it("renders the copyright", async () => {
    render(await Footer());
    expect(screen.getByText("landing.footer.copyright")).toBeInTheDocument();
  });

  it("renders the language switcher", async () => {
    render(await Footer());
    expect(screen.getByText("ES")).toBeInTheDocument();
    expect(screen.getByText("EN")).toBeInTheDocument();
  });
});
