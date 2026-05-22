import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

// vi.mock is hoisted — define everything inline, no outer variable refs
vi.mock("framer-motion", () => {
  function makeMotion(tag: string) {
    const component = React.forwardRef<SVGElement, Record<string, unknown>>(
      ({ children, initial, animate, transition, style, ...rest }, ref) => {
        void initial; void animate; void transition; void style;
        return React.createElement(tag, { ...rest, ref }, children as React.ReactNode);
      }
    );
    component.displayName = `motion.${tag}`;
    return component;
  }

  return {
    useReducedMotion: vi.fn(() => false),
    useAnimate: vi.fn(() => [React.createRef(), vi.fn()]),
    motion: {
      circle: makeMotion("circle"),
      path: makeMotion("path"),
      text: makeMotion("text"),
    },
  };
});

// Import AFTER mock is registered
import { useReducedMotion } from "framer-motion";
import { HeroAnimation } from "../HeroAnimation";

describe("HeroAnimation", () => {
  beforeEach(() => {
    vi.mocked(useReducedMotion).mockReturnValue(false);
  });

  it("renders an SVG with aria-hidden='true'", () => {
    render(<HeroAnimation />);
    const svgs = document.querySelectorAll("svg");
    const animSvg = Array.from(svgs).find((el) => el.getAttribute("aria-hidden") === "true");
    expect(animSvg).toBeTruthy();
  });

  it("renders at least three node circles", () => {
    render(<HeroAnimation />);
    const circles = document.querySelectorAll("circle");
    expect(circles.length).toBeGreaterThanOrEqual(3);
  });

  it("renders the two connector paths", () => {
    render(<HeroAnimation />);
    const paths = document.querySelectorAll("path");
    expect(paths.length).toBeGreaterThanOrEqual(2);
  });

  it("does NOT render the traveling particle when useReducedMotion is true", () => {
    vi.mocked(useReducedMotion).mockReturnValue(true);
    render(<HeroAnimation />);
    const particle = document.querySelector("#particle");
    expect(particle).toBeNull();
  });

  it("renders the traveling particle when useReducedMotion is false", () => {
    vi.mocked(useReducedMotion).mockReturnValue(false);
    render(<HeroAnimation />);
    const particle = document.querySelector("#particle");
    expect(particle).not.toBeNull();
  });

  it("renders three text label elements", () => {
    render(<HeroAnimation />);
    const texts = document.querySelectorAll("text");
    expect(texts.length).toBe(3);
  });
});
