import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Hero } from "../Hero";

vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
  useLocale: () => "es",
}));

vi.mock("framer-motion", () => ({
  useReducedMotion: () => false,
  useAnimate: () => [{ current: null }, vi.fn()],
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement> & { children?: React.ReactNode }) => <h1 {...props}>{children}</h1>,
    p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement> & { children?: React.ReactNode }) => <p {...props}>{children}</p>,
    circle: ({ children, ...props }: React.SVGProps<SVGCircleElement> & { children?: React.ReactNode }) => <circle {...props}>{children}</circle>,
    path: ({ children, ...props }: React.SVGProps<SVGPathElement> & { children?: React.ReactNode }) => <path {...props}>{children}</path>,
    text: ({ children, ...props }: React.SVGProps<SVGTextElement> & { children?: React.ReactNode }) => <text {...props}>{children}</text>,
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/es",
}));

describe("Hero", () => {
  it("renders the headline", () => {
    render(<Hero />);
    expect(screen.getByText("landing.hero.headline")).toBeInTheDocument();
  });

  it("renders the primary CTA", () => {
    render(<Hero />);
    const links = screen.getAllByText("landing.hero.ctaPrimary");
    expect(links.length).toBeGreaterThan(0);
    expect(links[0]!.closest("a")).toHaveAttribute("href", "/es/login");
  });

  it("renders the secondary CTA", () => {
    render(<Hero />);
    const link = screen.getByText("landing.hero.ctaSecondary");
    expect(link.closest("a")).toHaveAttribute("href", "/es/login");
  });

  it("renders the Logo wordmark in the nav", () => {
    render(<Hero />);
    // Logo wordmark SVG has aria-label="klyro" (brand lowercase)
    expect(screen.getByLabelText("klyro")).toBeInTheDocument();
  });

  it("renders the sign-in nav link", () => {
    render(<Hero />);
    const navLink = screen.getByText("landing.nav.signIn");
    expect(navLink.closest("a")).toHaveAttribute("href", "/es/login");
  });
});
