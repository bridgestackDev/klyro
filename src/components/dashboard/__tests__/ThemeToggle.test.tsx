import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeToggle } from "../ThemeToggle";

const setTheme = vi.fn();
let currentTheme = "system";

vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
}));

vi.mock("@/components/shared/ThemeProvider", () => ({
  useTheme: () => ({
    theme: currentTheme,
    resolvedTheme: currentTheme === "system" ? "dark" : currentTheme,
    setTheme,
  }),
}));

describe("ThemeToggle", () => {
  beforeEach(() => {
    setTheme.mockClear();
    currentTheme = "system";
  });

  it("renders the three theme options", () => {
    render(<ThemeToggle />);
    expect(
      screen.getByRole("button", { name: "dashboard.theme.light" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "dashboard.theme.dark" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "dashboard.theme.system" })
    ).toBeInTheDocument();
  });

  it("labels the group for assistive tech", () => {
    render(<ThemeToggle />);
    expect(
      screen.getByRole("group", { name: "dashboard.theme.label" })
    ).toBeInTheDocument();
  });

  it("calls setTheme with the chosen value on click", () => {
    render(<ThemeToggle />);
    fireEvent.click(
      screen.getByRole("button", { name: "dashboard.theme.dark" })
    );
    expect(setTheme).toHaveBeenCalledWith("dark");
  });

  it("marks the active theme with aria-pressed after mount", () => {
    currentTheme = "dark";
    render(<ThemeToggle />);
    expect(
      screen.getByRole("button", { name: "dashboard.theme.dark" })
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "dashboard.theme.light" })
    ).toHaveAttribute("aria-pressed", "false");
  });
});
