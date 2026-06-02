import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  TodayAppointments,
  type TodayAppointmentItem,
} from "../TodayAppointments";

const items: TodayAppointmentItem[] = [
  {
    id: "1",
    time: "09:00",
    clientName: "Ana García",
    serviceName: "Corte de cabello",
    staffName: "Luis",
    status: "completed",
    statusLabel: "Completada",
  },
  {
    id: "2",
    time: "14:30",
    clientName: "Beto Ruiz",
    serviceName: "Arreglo de barba",
    staffName: "Luis",
    status: "confirmed",
    statusLabel: "Confirmada",
  },
];

describe("TodayAppointments", () => {
  it("renders a row per appointment when data is present", () => {
    render(<TodayAppointments appointments={items} emptyTitle="No tienes citas hoy." />);
    expect(screen.getByText("Ana García")).toBeInTheDocument();
    expect(screen.getByText("Beto Ruiz")).toBeInTheDocument();
    expect(screen.getByText("09:00")).toBeInTheDocument();
    expect(screen.getByText("14:30")).toBeInTheDocument();
    expect(screen.getByText("Completada")).toBeInTheDocument();
    expect(screen.queryByText("No tienes citas hoy.")).toBeNull();
  });

  it("renders the empty state when there are no appointments", () => {
    render(<TodayAppointments appointments={[]} emptyTitle="No tienes citas hoy." />);
    expect(screen.getByText("No tienes citas hoy.")).toBeInTheDocument();
    expect(screen.queryByText("Ana García")).toBeNull();
  });
});
