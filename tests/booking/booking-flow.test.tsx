import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BookingFlow } from "@/app/[locale]/(booking)/[businessSlug]/[branchSlug]/[staffSlug]/_components/BookingFlow";
import type { BookingFlowProps } from "@/app/[locale]/(booking)/[businessSlug]/[branchSlug]/[staffSlug]/_components/BookingFlow";

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

vi.mock("@/components/wizard/CountryPhoneInput", () => ({
  CountryPhoneInput: ({
    id,
    value,
    onChange,
    error,
    ariaLabel,
  }: {
    id: string;
    value: string;
    onChange: (v: string) => void;
    error?: string;
    ariaLabel?: string;
  }) => (
    <div>
      <input
        id={id}
        data-testid="phone-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
      />
      {error && <span role="alert">{error}</span>}
    </div>
  ),
}));

// ── Fixtures ───────────────────────────────────────────────────────────────

const messages: BookingFlowProps["messages"] = {
  business: { poweredBy: "Powered by" },
  flow: {
    pickService: "Pick a service",
    pickDate: "Pick a date",
    pickSlot: "Pick a time",
    yourDetails: "Your details",
    noSlots: "No times available",
    loadingSlots: "Loading...",
    back: "Back",
    bookWith: "Book with {name}",
  },
  form: {
    name: "Full name",
    namePlaceholder: "Your name",
    whatsapp: "WhatsApp",
    submit: "Confirm booking",
    submitting: "Booking...",
    nameRequired: "Please enter your name",
    nameTooShort: "Name must be at least 2 characters",
    nameTooLong: "Name cannot exceed 120 characters",
    whatsappRequired: "Please enter your WhatsApp number",
  },
  success: {
    title: "Booking confirmed!",
    subtitle: "Your appointment has been scheduled.",
    codeLabel: "Your booking code",
    saveHint: "Save this code.",
    newBooking: "Make another booking",
  },
  errors: {
    slotTaken: "Slot taken. Choose another.",
    networkError: "Connection error.",
    validationFailed: "Check the fields.",
  },
};

const services: BookingFlowProps["services"] = [
  {
    id: "svc-1",
    name: "Haircut",
    duration_minutes: 30,
    price: 150,
    currency: "HNL",
    price_override: null,
  },
  {
    id: "svc-2",
    name: "Beard trim",
    duration_minutes: 20,
    price: 100,
    currency: "HNL",
    price_override: null,
  },
];

const defaultProps: BookingFlowProps = {
  staffId: "staff-uuid",
  branchId: "branch-uuid",
  staffName: "Carlos",
  staffAvatar: null,
  businessCountry: "HN",
  businessTimezone: "America/Tegucigalpa",
  businessLanguage: "es",
  services,
  messages,
};

// ── Helpers ────────────────────────────────────────────────────────────────

function renderFlow(props: Partial<BookingFlowProps> = {}) {
  return render(<BookingFlow {...defaultProps} {...props} />);
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("BookingFlow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders step 1 with service cards", () => {
    renderFlow();
    expect(screen.getByText("Pick a service")).toBeInTheDocument();
    expect(screen.getByText("Haircut")).toBeInTheDocument();
    expect(screen.getByText("Beard trim")).toBeInTheDocument();
  });

  it("shows staff name in the header", () => {
    renderFlow();
    expect(screen.getByText("Book with Carlos")).toBeInTheDocument();
  });

  it("shows staff initials when no avatar", () => {
    renderFlow();
    // getInitials("Carlos") returns "C" — single word = first char only
    expect(screen.getByText("C")).toBeInTheDocument();
  });

  it("advances to step 2 when a service is selected", () => {
    renderFlow();
    fireEvent.click(screen.getByText("Haircut"));
    expect(screen.getByText("Pick a date")).toBeInTheDocument();
  });

  it("shows a back button on step 2", () => {
    renderFlow();
    fireEvent.click(screen.getByText("Haircut"));
    expect(screen.getByText("← Back")).toBeInTheDocument();
  });

  it("goes back to step 1 when back is clicked on step 2", () => {
    renderFlow();
    fireEvent.click(screen.getByText("Haircut"));
    fireEvent.click(screen.getByText("← Back"));
    expect(screen.getByText("Pick a service")).toBeInTheDocument();
  });

  it("form step: shows name error when name is empty on submit", async () => {
    // Mock fetch to avoid actual API call — return no slots so we can test form directly
    const user = userEvent.setup();

    vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => {
      if (String(url).includes("/api/booking/slots")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [{ startsAt: "2026-05-27T15:00:00Z", endsAt: "2026-05-27T15:30:00Z" }],
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    }));

    renderFlow();

    // Step 1: pick service
    await user.click(screen.getByText("Haircut"));

    // Step 2: pick date — click any date button (aria-label is YYYY-MM-DD)
    const dayBtns = screen.getAllByRole("button", { name: /^\d{4}-\d{2}-\d{2}$/ });
    expect(dayBtns.length).toBeGreaterThan(0);
    if (!dayBtns[0]) throw new Error("No day button found");
    await user.click(dayBtns[0]);

    // Step 3: wait for slot and click it
    await waitFor(() =>
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument()
    );
    const slotBtns = screen.getAllByRole("button");
    // The slot button label is a formatted time — contains ":"
    const slotBtn = slotBtns.find((b) => (b.textContent ?? "").includes(":"));
    expect(slotBtn).toBeTruthy();
    if (!slotBtn) throw new Error("No slot button found");
    await user.click(slotBtn);

    // Step 4: form — try to submit without name
    const submitBtn = screen.getByText("Confirm booking");
    await user.click(submitBtn);

    expect(screen.getByText("Please enter your name")).toBeInTheDocument();
  });

  it("form step: shows nameTooShort error when name is 1 char", async () => {
    const user = userEvent.setup();

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [{ startsAt: "2026-05-27T15:00:00Z", endsAt: "2026-05-27T15:30:00Z" }],
        }),
    }));

    renderFlow();
    await user.click(screen.getByText("Haircut"));

    const dayBtns = screen.getAllByRole("button", { name: /^\d{4}-\d{2}-\d{2}$/ });
    expect(dayBtns.length).toBeGreaterThan(0);
    if (!dayBtns[0]) throw new Error("No day button found");
    await user.click(dayBtns[0]);

    await waitFor(() =>
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument()
    );
    const slotBtns = screen.getAllByRole("button");
    const slotBtn = slotBtns.find((b) => (b.textContent ?? "").includes(":"));
    if (!slotBtn) throw new Error("No slot button found");
    await user.click(slotBtn);

    // Enter a 1-char name
    const nameInput = screen.getByLabelText("Full name");
    await user.type(nameInput, "A");
    await user.click(screen.getByText("Confirm booking"));

    expect(screen.getByText("Name must be at least 2 characters")).toBeInTheDocument();
  });

  it("form step: shows whatsapp error when phone is empty", async () => {
    const user = userEvent.setup();

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [{ startsAt: "2026-05-27T15:00:00Z", endsAt: "2026-05-27T15:30:00Z" }],
        }),
    }));

    renderFlow();
    await user.click(screen.getByText("Haircut"));

    const dayBtns = screen.getAllByRole("button", { name: /^\d{4}-\d{2}-\d{2}$/ });
    expect(dayBtns.length).toBeGreaterThan(0);
    if (!dayBtns[0]) throw new Error("No day button found");
    await user.click(dayBtns[0]);

    await waitFor(() =>
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument()
    );
    const slotBtns = screen.getAllByRole("button");
    const slotBtn = slotBtns.find((b) => (b.textContent ?? "").includes(":"));
    if (!slotBtn) throw new Error("No slot button found");
    await user.click(slotBtn);

    // Enter valid name but no phone
    await user.type(screen.getByLabelText("Full name"), "Ana García");
    await user.click(screen.getByText("Confirm booking"));

    expect(screen.getByText("Please enter your WhatsApp number")).toBeInTheDocument();
  });

  it("form step: calls POST /api/booking/create on valid submit", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes("/api/booking/slots")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [{ startsAt: "2026-05-27T15:00:00Z", endsAt: "2026-05-27T15:30:00Z" }],
            }),
        });
      }
      // booking/create
      return Promise.resolve({
        ok: true,
        status: 201,
        json: () =>
          Promise.resolve({
            data: { bookingCode: "KLY-ABCD", startsAt: "2026-05-27T15:00:00Z", endsAt: "2026-05-27T15:30:00Z" },
          }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    renderFlow();
    await user.click(screen.getByText("Haircut"));

    const dayBtns = screen.getAllByRole("button", { name: /^\d{4}-\d{2}-\d{2}$/ });
    expect(dayBtns.length).toBeGreaterThan(0);
    if (!dayBtns[0]) throw new Error("No day button found");
    await user.click(dayBtns[0]);

    await waitFor(() =>
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument()
    );
    const slotBtns = screen.getAllByRole("button");
    const slotBtn = slotBtns.find((b) => (b.textContent ?? "").includes(":"));
    if (!slotBtn) throw new Error("No slot button found");
    await user.click(slotBtn);

    await user.type(screen.getByLabelText("Full name"), "Ana García");

    // Set phone via the mocked input
    const phoneInput = screen.getByTestId("phone-input");
    await user.type(phoneInput, "+50499998888");

    await user.click(screen.getByText("Confirm booking"));

    await waitFor(() =>
      expect(screen.getByText("Booking confirmed!")).toBeInTheDocument()
    );

    // Verify create was called
    const createCall = fetchMock.mock.calls.find((c: unknown[]) =>
      String(c[0]).includes("/api/booking/create")
    );
    expect(createCall).toBeTruthy();
    if (!createCall) throw new Error("create call not found");
    const body = JSON.parse((createCall[1] as { body: string }).body);
    expect(body.staffId).toBe("staff-uuid");
    expect(body.serviceId).toBe("svc-1");
    expect(body.clientName).toBe("Ana García");
  });

  it("shows slotTaken error and returns to slot step on 409 response", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => {
      if (String(url).includes("/api/booking/slots")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [{ startsAt: "2026-05-27T15:00:00Z", endsAt: "2026-05-27T15:30:00Z" }],
            }),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 409,
        json: () =>
          Promise.resolve({ error: { code: "SLOT_TAKEN", message: "Slot taken" } }),
      });
    }));

    renderFlow();
    await user.click(screen.getByText("Haircut"));

    const dayBtns = screen.getAllByRole("button", { name: /^\d{4}-\d{2}-\d{2}$/ });
    expect(dayBtns.length).toBeGreaterThan(0);
    if (!dayBtns[0]) throw new Error("No day button found");
    await user.click(dayBtns[0]);

    await waitFor(() =>
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument()
    );
    const slotBtns = screen.getAllByRole("button");
    const slotBtn = slotBtns.find((b) => (b.textContent ?? "").includes(":"));
    if (!slotBtn) throw new Error("No slot button found");
    await user.click(slotBtn);

    await user.type(screen.getByLabelText("Full name"), "Test User");
    const phoneInput = screen.getByTestId("phone-input");
    await user.type(phoneInput, "+50499998888");

    await user.click(screen.getByText("Confirm booking"));

    await waitFor(() =>
      expect(screen.getByText("Slot taken. Choose another.")).toBeInTheDocument()
    );
    // Should be back on the slot picker step
    expect(screen.getByText("Pick a time")).toBeInTheDocument();
  });
});
