import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

// Mock framer-motion to skip animation delays in tests.
// AnimatePresence with mode="wait" holds exiting children until RAF-based
// animations complete, which vi.useFakeTimers() cannot advance.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLProps<HTMLDivElement>) =>
      React.createElement("div", rest, children),
    p: ({ children, ...rest }: React.HTMLProps<HTMLParagraphElement>) =>
      React.createElement("p", rest, children),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

import { LaunchLoader } from "../LaunchLoader";

const messages = {
  wizard: {
    confirm: {
      launching: {
        message1: "Setting up your business...",
        message2: "Creating your team...",
        message3: "Generating your links...",
        message4: "Ready!",
        ariaLabel: "Launching your business",
      },
    },
  },
};

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}

describe("LaunchLoader", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is hidden when open=false", () => {
    const { container } = render(
      <Wrapper>
        <LaunchLoader open={false} locale="en" />
      </Wrapper>
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows first message when open=true", () => {
    render(
      <Wrapper>
        <LaunchLoader open locale="en" />
      </Wrapper>
    );
    expect(screen.getByText("Setting up your business...")).toBeInTheDocument();
  });

  it("advances to second message after 900ms", async () => {
    render(
      <Wrapper>
        <LaunchLoader open locale="en" />
      </Wrapper>
    );
    await act(async () => {
      vi.advanceTimersByTime(900);
    });
    expect(screen.getByText("Creating your team...")).toBeInTheDocument();
  });

  it("advances through all 4 messages in sequence", async () => {
    render(
      <Wrapper>
        <LaunchLoader open locale="en" />
      </Wrapper>
    );

    expect(screen.getByText("Setting up your business...")).toBeInTheDocument();

    await act(async () => { vi.advanceTimersByTime(900); });
    expect(screen.getByText("Creating your team...")).toBeInTheDocument();

    await act(async () => { vi.advanceTimersByTime(900); });
    expect(screen.getByText("Generating your links...")).toBeInTheDocument();

    await act(async () => { vi.advanceTimersByTime(900); });
    expect(screen.getByText("Ready!")).toBeInTheDocument();
  });

  it("stays on last message after all intervals have elapsed", async () => {
    render(
      <Wrapper>
        <LaunchLoader open locale="en" />
      </Wrapper>
    );

    // Advance incrementally so React can re-render and set the next timer between ticks
    for (let i = 0; i < 5; i++) {
      await act(async () => { vi.advanceTimersByTime(900); });
    }
    expect(screen.getByText("Ready!")).toBeInTheDocument();
  });

  it("has aria-live and aria-busy attributes for accessibility", () => {
    render(
      <Wrapper>
        <LaunchLoader open locale="en" />
      </Wrapper>
    );
    const wrapper = screen.getByRole("status");
    expect(wrapper).toHaveAttribute("aria-live", "polite");
    expect(wrapper).toHaveAttribute("aria-busy", "true");
    expect(wrapper).toHaveAttribute("aria-label", "Launching your business");
  });
});
