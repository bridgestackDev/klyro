import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge, STATUS_TOKEN } from "../StatusBadge";
import type { AppointmentStatus } from "@/lib/dashboard/home-data";

const CASES: Array<[AppointmentStatus, string]> = [
  ["pending", "--color-warning"],
  ["confirmed", "--color-info"],
  ["completed", "--color-success"],
  ["noshow", "--color-danger"],
  ["cancelled", "--color-text-muted"],
];

describe("StatusBadge", () => {
  it("maps every status to the correct semantic token", () => {
    for (const [status, token] of CASES) {
      expect(STATUS_TOKEN[status]).toBe(token);
    }
  });

  it.each(CASES)("renders %s with its token color", (status, token) => {
    const { unmount } = render(<StatusBadge status={status} label={status} />);
    const badge = screen.getByText(status);
    expect(badge).toHaveAttribute("data-status", status);
    expect(badge.style.color).toContain(token);
    unmount();
  });
});
