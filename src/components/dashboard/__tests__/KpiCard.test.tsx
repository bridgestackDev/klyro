import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { KpiCard } from "../KpiCard";

describe("KpiCard", () => {
  it("renders the label and value", () => {
    render(<KpiCard label="Citas hoy" value={7} />);
    expect(screen.getByText("Citas hoy")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("renders the optional hint when provided", () => {
    render(<KpiCard label="Completadas" value={3} hint="+2 vs ayer" />);
    expect(screen.getByText("+2 vs ayer")).toBeInTheDocument();
  });
});
