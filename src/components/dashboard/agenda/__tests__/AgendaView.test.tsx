import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AgendaAppointment } from "@/lib/dashboard/agenda-data";

vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
}));

// Stub the drawer so we can assert AgendaView's open/selected wiring directly.
vi.mock("../AppointmentDrawer", () => ({
  AppointmentDrawer: ({ open, appt }: { open: boolean; appt: AgendaAppointment | null }) =>
    open ? <div data-testid="drawer">{appt?.id}</div> : null,
}));

import { AgendaView } from "../AgendaView";

const TZ = "America/Tegucigalpa";
const TODAY = "2025-06-09";

function appt(over: Partial<AgendaAppointment>): AgendaAppointment {
  return {
    id: "x",
    startsAt: "2025-06-09T15:00:00Z",
    endsAt: "2025-06-09T15:30:00Z",
    status: "confirmed",
    bookingCode: null,
    notes: null,
    clientName: "Client",
    clientPhone: null,
    clientEmail: null,
    serviceName: "Service",
    staffId: "s1",
    staffName: "Luis",
    branchId: "b1",
    branchName: "Centro",
    ...over,
  };
}

const appts = [
  appt({ id: "today1", clientName: "Today One", staffId: "s1", startsAt: "2025-06-09T15:00:00Z" }),
  appt({ id: "today2", clientName: "Today Two", staffId: "s2", startsAt: "2025-06-09T16:00:00Z" }),
  appt({ id: "tom1", clientName: "Tomorrow One", staffId: "s1", startsAt: "2025-06-10T15:00:00Z" }),
];

const branches = [
  { id: "b1", name: "Centro" },
  { id: "b2", name: "Norte" },
];
const staff = [
  { id: "s1", name: "Luis" },
  { id: "s2", name: "Ana" },
];

function renderView() {
  return render(
    <AgendaView
      appointments={appts}
      branches={branches}
      staff={staff}
      tz={TZ}
      locale="es"
      todayYmd={TODAY}
    />
  );
}

describe("AgendaView", () => {
  it("shows only today's appointments in the default day view", () => {
    renderView();
    expect(screen.getByRole("button", { name: /Today One/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Today Two/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Tomorrow One/ })).toBeNull();
  });

  it("reveals the rest of the week when switching to the week view", async () => {
    renderView();
    await userEvent.click(screen.getByRole("button", { name: "dashboard.agenda.week" }));
    expect(screen.getByRole("button", { name: /Tomorrow One/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Today One/ })).toBeInTheDocument();
  });

  it("narrows the set when a staff filter is applied", async () => {
    renderView();
    await userEvent.selectOptions(
      screen.getByLabelText("dashboard.agenda.staffFilter"),
      "s1"
    );
    expect(screen.getByRole("button", { name: /Today One/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Today Two/ })).toBeNull();
  });

  it("opens the drawer with the selected appointment", async () => {
    renderView();
    expect(screen.queryByTestId("drawer")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: /Today One/ }));
    expect(screen.getByTestId("drawer")).toHaveTextContent("today1");
  });
});
