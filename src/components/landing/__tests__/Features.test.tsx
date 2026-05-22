import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Features } from "../Features";

vi.mock("next-intl/server", () => ({
  getTranslations: () => Promise.resolve((key: string) => `landing.${key}`),
  getLocale: () => Promise.resolve("es"),
}));

describe("Features", () => {
  it("renders the section title", async () => {
    render(await Features());
    expect(screen.getByText("landing.features.sectionTitle")).toBeInTheDocument();
  });

  it("renders all 3 feature card titles", async () => {
    render(await Features());
    expect(screen.getByText("landing.features.link.title")).toBeInTheDocument();
    expect(screen.getByText("landing.features.confirm.title")).toBeInTheDocument();
    expect(screen.getByText("landing.features.reminder.title")).toBeInTheDocument();
  });

  it("renders all 3 feature card bodies", async () => {
    render(await Features());
    expect(screen.getByText("landing.features.link.body")).toBeInTheDocument();
    expect(screen.getByText("landing.features.confirm.body")).toBeInTheDocument();
    expect(screen.getByText("landing.features.reminder.body")).toBeInTheDocument();
  });
});
