import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AgendaAppointment } from "@/lib/dashboard/agenda-data";

const { refresh, toastSuccess, toastError, updateStatus } = vi.hoisted(() => ({
  refresh: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  updateStatus: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

vi.mock("sonner", () => ({ toast: { success: toastSuccess, error: toastError } }));

vi.mock("@/lib/actions/appointments", () => ({
  updateAppointmentStatus: (...args: unknown[]) => updateStatus(...args),
}));

vi.mock("@/components/dashboard/messaging/MessageStatusPanel", () => ({
  MessageStatusPanel: ({ appointmentId }: { appointmentId: string }) => (
    <div data-testid="msg-panel">{appointmentId}</div>
  ),
}));

// Render Sheet pieces as plain passthrough elements (skip the base-ui portal).
vi.mock("@/components/ui/sheet", () => {
  const Pass = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    Sheet: Pass,
    SheetContent: Pass,
    SheetHeader: Pass,
    SheetTitle: Pass,
    SheetDescription: Pass,
    SheetFooter: Pass,
  };
});

import { AppointmentDrawer } from "../AppointmentDrawer";

const appt: AgendaAppointment = {
  id: "appt-1",
  startsAt: "2025-06-09T15:00:00Z",
  endsAt: "2025-06-09T15:30:00Z",
  status: "confirmed",
  bookingCode: "KLY-ABCD",
  notes: "VIP",
  clientName: "Ana García",
  clientPhone: "+50412345678",
  clientEmail: null,
  serviceName: "Corte de cabello",
  staffId: "s1",
  staffName: "Luis",
  branchId: "b1",
  branchName: "Centro",
};

describe("AppointmentDrawer", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the appointment details", () => {
    render(<AppointmentDrawer appt={appt} open onOpenChange={vi.fn()} locale="es" />);
    expect(screen.getByText("Ana García")).toBeInTheDocument();
    expect(screen.getByText("Corte de cabello")).toBeInTheDocument();
    expect(screen.getByText("Luis")).toBeInTheDocument();
    expect(screen.getByText("KLY-ABCD")).toBeInTheDocument();
    expect(screen.getByTestId("msg-panel")).toHaveTextContent("appt-1");
  });

  it("marks completed: calls the action, toasts, closes, refreshes", async () => {
    updateStatus.mockResolvedValue(undefined);
    const onOpenChange = vi.fn();
    render(<AppointmentDrawer appt={appt} open onOpenChange={onOpenChange} locale="es" />);

    await userEvent.click(screen.getByRole("button", { name: /markCompleted/ }));

    await waitFor(() => {
      expect(updateStatus).toHaveBeenCalledWith("appt-1", "completed");
      expect(toastSuccess).toHaveBeenCalled();
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(refresh).toHaveBeenCalled();
    });
  });

  it("shows an error toast when the action fails", async () => {
    updateStatus.mockRejectedValue(new Error("boom"));
    render(<AppointmentDrawer appt={appt} open onOpenChange={vi.fn()} locale="es" />);

    await userEvent.click(screen.getByRole("button", { name: /markNoShow/ }));

    await waitFor(() => expect(toastError).toHaveBeenCalled());
  });
});
