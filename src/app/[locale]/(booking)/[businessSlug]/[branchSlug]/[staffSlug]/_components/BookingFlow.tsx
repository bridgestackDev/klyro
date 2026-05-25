"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { CountryPhoneInput } from "@/components/wizard/CountryPhoneInput";
import { formatCurrency } from "@/lib/format/currency";
import { getInitials } from "@/lib/format";
import type { CountryCode } from "@/lib/i18n/countries";
import { COUNTRIES } from "@/lib/i18n/countries";
import type { BookingService } from "@/lib/booking/queries";

// ── Types ──────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4 | 5;
type Slot = { startsAt: string; endsAt: string };

export interface BookingMessages {
  business: { poweredBy: string };
  flow: {
    pickService: string;
    pickDate: string;
    pickSlot: string;
    yourDetails: string;
    noSlots: string;
    loadingSlots: string;
    back: string;
    bookWith: string;
  };
  form: {
    name: string;
    namePlaceholder: string;
    whatsapp: string;
    submit: string;
    submitting: string;
    nameRequired: string;
    nameTooShort: string;
    nameTooLong: string;
    whatsappRequired: string;
  };
  success: {
    title: string;
    subtitle: string;
    codeLabel: string;
    saveHint: string;
    newBooking: string;
  };
  errors: {
    slotTaken: string;
    networkError: string;
    validationFailed: string;
  };
}

export interface BookingFlowProps {
  staffId: string;
  branchId: string;
  staffName: string;
  staffAvatar: string | null;
  businessCountry: CountryCode;
  businessTimezone: string;
  businessLanguage: string;
  services: BookingService[];
  messages: BookingMessages;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function getNext28Days(): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = 0; i < 28; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const dy = String(d.getDate()).padStart(2, "0");
    days.push(`${y}-${mo}-${dy}`);
  }
  return days;
}

function buildCalendarWeeks(days: string[]): (string | null)[][] {
  if (days.length === 0) return [];
  // Parse the first day at noon to avoid DST edge cases
  const first = new Date(`${days[0]}T12:00:00`);
  const dow = first.getDay(); // 0=Sun … 6=Sat
  const offset = dow === 0 ? 6 : dow - 1; // Monday-first calendar
  const grid: (string | null)[] = [
    ...Array<null>(offset).fill(null),
    ...days,
  ];
  while (grid.length % 7 !== 0) grid.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < grid.length; i += 7) {
    weeks.push(grid.slice(i, i + 7));
  }
  return weeks;
}

function formatSlotTime(utcTime: string, timezone: string, lang: string): string {
  return new Date(utcTime).toLocaleTimeString(
    lang === "en" ? "en-US" : "es-HN",
    { timeZone: timezone, hour: "2-digit", minute: "2-digit", hour12: lang === "en" }
  );
}

function formatAppointmentDateTime(utcTime: string, timezone: string, lang: string): string {
  return new Date(utcTime).toLocaleString(lang === "en" ? "en-US" : "es-HN", {
    timeZone: timezone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: lang === "en",
  });
}

function effectivePrice(svc: BookingService): number {
  return svc.price_override ?? svc.price ?? 0;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StepBar({ step, labels }: { step: Step; labels: string[] }) {
  if (step === 5) return null;
  return (
    <div className="px-4 pt-4 pb-2 max-w-lg mx-auto">
      <div className="flex gap-1.5 mb-2">
        {labels.map((_, i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-colors"
            style={{
              backgroundColor: step > i ? "var(--color-violet)" : "var(--border-on-light)",
            }}
          />
        ))}
      </div>
      <p className="text-xs font-medium" style={{ color: "var(--color-text-on-light-muted)" }}>
        {labels[step - 1]}
      </p>
    </div>
  );
}

function ServiceCard({
  svc,
  selected,
  onSelect,
  countryLocale,
}: {
  svc: BookingService;
  selected: boolean;
  onSelect: (svc: BookingService) => void;
  countryLocale: string;
}) {
  const price = effectivePrice(svc);
  const currency = svc.currency ?? "HNL";

  return (
    <button
      onClick={() => onSelect(svc)}
      className="w-full text-left rounded-xl border p-4 transition-all"
      style={{
        backgroundColor: selected ? "var(--color-violet)" : "var(--color-bg-light-surface)",
        borderColor: selected ? "var(--color-violet)" : "var(--border-on-light)",
        color: selected ? "#fff" : "var(--color-text-on-light)",
      }}
      aria-pressed={selected}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold text-sm">{svc.name}</div>
          <div
            className="text-xs mt-0.5"
            style={{ color: selected ? "rgba(255,255,255,0.75)" : "var(--color-text-on-light-muted)" }}
          >
            {svc.duration_minutes} min
          </div>
        </div>
        {price > 0 && (
          <span className="text-sm font-semibold flex-shrink-0">
            {formatCurrency(price, currency, countryLocale)}
          </span>
        )}
      </div>
    </button>
  );
}

function DateCell({
  dateStr,
  selected,
  onSelect,
  lang,
}: {
  dateStr: string;
  selected: boolean;
  onSelect: (date: string) => void;
  lang: string;
}) {
  const d = new Date(`${dateStr}T12:00:00`);
  const dayNum = d.getDate();
  const dayAbbr = d.toLocaleDateString(lang === "en" ? "en-US" : "es", {
    weekday: "short",
  });

  return (
    <button
      onClick={() => onSelect(dateStr)}
      className="flex flex-col items-center justify-center rounded-xl py-2 px-1 text-xs transition-all"
      style={{
        backgroundColor: selected ? "var(--color-violet)" : "transparent",
        color: selected ? "#fff" : "var(--color-text-on-light)",
        border: selected ? "1.5px solid var(--color-violet)" : "1.5px solid var(--border-on-light)",
      }}
      aria-pressed={selected}
      aria-label={dateStr}
    >
      <span style={{ color: selected ? "rgba(255,255,255,0.75)" : "var(--color-text-on-light-muted)" }}>
        {dayAbbr}
      </span>
      <span className="font-semibold mt-0.5">{dayNum}</span>
    </button>
  );
}

function SlotButton({
  slot,
  selected,
  onSelect,
  timezone,
  lang,
}: {
  slot: Slot;
  selected: boolean;
  onSelect: (slot: Slot) => void;
  timezone: string;
  lang: string;
}) {
  const label = formatSlotTime(slot.startsAt, timezone, lang);
  return (
    <button
      onClick={() => onSelect(slot)}
      className="rounded-xl py-2 px-3 text-sm font-medium transition-all"
      style={{
        backgroundColor: selected ? "var(--color-violet)" : "var(--color-bg-light-surface)",
        borderColor: selected ? "var(--color-violet)" : "var(--border-on-light)",
        border: "1.5px solid",
        color: selected ? "#fff" : "var(--color-text-on-light)",
      }}
      aria-pressed={selected}
    >
      {label}
    </button>
  );
}

function ConfirmationScreen({
  bookingCode,
  startsAt,
  staffName,
  serviceName,
  timezone,
  lang,
  messages,
}: {
  bookingCode: string;
  startsAt: string;
  staffName: string;
  serviceName: string;
  timezone: string;
  lang: string;
  messages: BookingMessages;
}) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ backgroundColor: "var(--color-bg-light)" }}
    >
      <div className="max-w-sm w-full text-center">
        {/* Checkmark */}
        <div
          className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-6"
          style={{ backgroundColor: "var(--color-success)", opacity: 0.9 }}
        >
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <path
              d="M8 16.5L13.5 22 24 11"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h1
          className="text-2xl font-bold mb-2"
          style={{ color: "var(--color-text-on-light)" }}
        >
          {messages.success.title}
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--color-text-on-light-muted)" }}>
          {messages.success.subtitle}
        </p>

        {/* Booking code */}
        <div
          className="rounded-2xl border p-5 mb-5"
          style={{
            backgroundColor: "var(--color-bg-light-surface)",
            borderColor: "var(--border-on-light)",
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-on-light-muted)" }}>
            {messages.success.codeLabel}
          </p>
          <p
            className="text-3xl font-bold tracking-widest"
            style={{ fontFamily: "var(--font-mono)", color: "var(--color-violet)" }}
          >
            {bookingCode}
          </p>
        </div>

        {/* Appointment details */}
        <div
          className="rounded-2xl border p-4 mb-5 text-left text-sm"
          style={{
            backgroundColor: "var(--color-bg-light-surface)",
            borderColor: "var(--border-on-light)",
          }}
        >
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between gap-2">
              <span style={{ color: "var(--color-text-on-light-muted)" }}>
                {lang === "en" ? "Service" : "Servicio"}
              </span>
              <span className="font-medium text-right" style={{ color: "var(--color-text-on-light)" }}>
                {serviceName}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span style={{ color: "var(--color-text-on-light-muted)" }}>
                {lang === "en" ? "With" : "Con"}
              </span>
              <span className="font-medium text-right" style={{ color: "var(--color-text-on-light)" }}>
                {staffName}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span style={{ color: "var(--color-text-on-light-muted)" }}>
                {lang === "en" ? "When" : "Cuándo"}
              </span>
              <span className="font-medium text-right capitalize" style={{ color: "var(--color-text-on-light)" }}>
                {formatAppointmentDateTime(startsAt, timezone, lang)}
              </span>
            </div>
          </div>
        </div>

        <p className="text-xs mb-6" style={{ color: "var(--color-text-on-light-muted)" }}>
          {messages.success.saveHint}
        </p>

        <button
          onClick={() => window.location.reload()}
          className="text-sm font-medium underline"
          style={{ color: "var(--color-violet)" }}
        >
          {messages.success.newBooking}
        </button>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export function BookingFlow({
  staffId,
  branchId,
  staffName,
  staffAvatar,
  businessCountry,
  businessTimezone,
  businessLanguage,
  services,
  messages,
}: BookingFlowProps) {
  const lang = businessLanguage.startsWith("en") ? "en" : "es";
  const countryLocale = COUNTRIES[businessCountry]?.locale ?? "es-HN";

  const [step, setStep] = useState<Step>(1);
  const [selectedService, setSelectedService] = useState<BookingService | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [slotTakenError, setSlotTakenError] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [bookingResult, setBookingResult] = useState<{
    bookingCode: string;
    startsAt: string;
  } | null>(null);

  const days = getNext28Days();
  const weeks = buildCalendarWeeks(days);
  const weekdayHeaders =
    lang === "en"
      ? ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]
      : ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

  const stepLabels = [
    messages.flow.pickService,
    messages.flow.pickDate,
    messages.flow.pickSlot,
    messages.flow.yourDetails,
  ];

  // ── Handlers ────────────────────────────────────────────────────────────

  const fetchSlots = useCallback(
    async (date: string, serviceId: string) => {
      setSlotsLoading(true);
      setSlotsError(null);
      setSlots([]);
      try {
        const url = `/api/booking/slots?staffId=${staffId}&serviceId=${serviceId}&branchId=${branchId}&date=${date}`;
        const res = await fetch(url);
        if (!res.ok) {
          setSlotsError(messages.errors.networkError);
          return;
        }
        const json = (await res.json()) as { data: Slot[] };
        setSlots(json.data ?? []);
      } catch {
        setSlotsError(messages.errors.networkError);
      } finally {
        setSlotsLoading(false);
      }
    },
    [staffId, branchId, messages.errors.networkError]
  );

  const handleServiceSelect = useCallback((svc: BookingService) => {
    setSelectedService(svc);
    setSelectedDate(null);
    setSlots([]);
    setSelectedSlot(null);
    setStep(2);
  }, []);

  const handleDateSelect = useCallback(
    (date: string) => {
      setSelectedDate(date);
      setSelectedSlot(null);
      setStep(3);
      if (selectedService) {
        void fetchSlots(date, selectedService.id);
      }
    },
    [selectedService, fetchSlots]
  );

  const handleSlotSelect = useCallback((slot: Slot) => {
    setSelectedSlot(slot);
    setSlotTakenError(null);
    setStep(4);
  }, []);

  const handleBack = () => {
    if (step > 1 && step < 5) setStep((step - 1) as Step);
  };

  const validateForm = (): boolean => {
    let valid = true;
    const name = clientName.trim();
    if (!name) {
      setNameError(messages.form.nameRequired);
      valid = false;
    } else if (name.length < 2) {
      setNameError(messages.form.nameTooShort);
      valid = false;
    } else if (name.length > 120) {
      setNameError(messages.form.nameTooLong);
      valid = false;
    } else {
      setNameError(null);
    }
    if (!clientPhone) {
      setPhoneError(messages.form.whatsappRequired);
      valid = false;
    } else {
      setPhoneError(null);
    }
    return valid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (!selectedService || !selectedSlot) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/booking/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId,
          branchId,
          serviceId: selectedService.id,
          slotStart: selectedSlot.startsAt,
          clientName: clientName.trim(),
          clientPhone,
        }),
      });

      const json = (await res.json()) as {
        data?: { bookingCode: string; startsAt: string };
        error?: { code: string };
      };

      if (res.status === 409) {
        // Go back to slot picker; slotTakenError persists through re-fetch
        setSelectedSlot(null);
        setStep(3);
        setSlotTakenError(messages.errors.slotTaken);
        if (selectedDate) {
          void fetchSlots(selectedDate, selectedService.id);
        }
        return;
      }

      if (!res.ok || !json.data) {
        setSubmitError(messages.errors.networkError);
        return;
      }

      setBookingResult({
        bookingCode: json.data.bookingCode,
        startsAt: json.data.startsAt,
      });
      setStep(5);
    } catch {
      setSubmitError(messages.errors.networkError);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Step 5: Success ──────────────────────────────────────────────────────

  if (step === 5 && bookingResult) {
    return (
      <ConfirmationScreen
        bookingCode={bookingResult.bookingCode}
        startsAt={bookingResult.startsAt}
        staffName={staffName}
        serviceName={selectedService?.name ?? ""}
        timezone={businessTimezone}
        lang={lang}
        messages={messages}
      />
    );
  }

  // ── Steps 1–4 ────────────────────────────────────────────────────────────

  const bookWithLabel = messages.flow.bookWith.replace("{name}", staffName);

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: "var(--color-bg-light)" }}>
      {/* Staff header */}
      <header
        className="px-4 pt-5 pb-4 border-b sticky top-0 z-10"
        style={{
          borderColor: "var(--border-on-light)",
          backgroundColor: "var(--color-bg-light-surface)",
        }}
      >
        <div className="max-w-lg mx-auto flex items-center gap-3">
          {staffAvatar ? (
            <Image
              src={staffAvatar}
              alt={staffName}
              width={40}
              height={40}
              className="rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
              style={{ backgroundColor: "var(--color-violet)" }}
            >
              {getInitials(staffName)}
            </div>
          )}
          <div className="min-w-0">
            <div
              className="font-semibold text-sm"
              style={{ color: "var(--color-text-on-light)" }}
            >
              {bookWithLabel}
            </div>
            {selectedService && (
              <div
                className="text-xs mt-0.5 truncate"
                style={{ color: "var(--color-text-on-light-muted)" }}
              >
                {selectedService.name}
                {selectedSlot
                  ? ` · ${formatSlotTime(selectedSlot.startsAt, businessTimezone, lang)}`
                  : null}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <StepBar step={step} labels={stepLabels} />

      {/* Step content */}
      <main className="px-4 pt-2 pb-4 max-w-lg mx-auto">
        {/* ── Step 1: Service ── */}
        {step === 1 && (
          <div className="flex flex-col gap-2" role="list" aria-label={messages.flow.pickService}>
            {services.map((svc) => (
              <div key={svc.id} role="listitem">
                <ServiceCard
                  svc={svc}
                  selected={selectedService?.id === svc.id}
                  onSelect={handleServiceSelect}
                  countryLocale={countryLocale}
                />
              </div>
            ))}
            {services.length === 0 && (
              <p className="text-sm py-4 text-center" style={{ color: "var(--color-text-on-light-muted)" }}>
                {lang === "en" ? "No services available" : "No hay servicios disponibles"}
              </p>
            )}
          </div>
        )}

        {/* ── Step 2: Date ── */}
        {step === 2 && (
          <div>
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {weekdayHeaders.map((h) => (
                <div
                  key={h}
                  className="text-center text-xs py-1"
                  style={{ color: "var(--color-text-on-light-muted)" }}
                >
                  {h}
                </div>
              ))}
            </div>
            {/* Calendar weeks */}
            <div className="flex flex-col gap-1">
              {weeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 gap-1">
                  {week.map((dateStr, di) =>
                    dateStr ? (
                      <DateCell
                        key={dateStr}
                        dateStr={dateStr}
                        selected={selectedDate === dateStr}
                        onSelect={handleDateSelect}
                        lang={lang}
                      />
                    ) : (
                      <div key={di} />
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 3: Slots ── */}
        {step === 3 && (
          <div>
            {slotTakenError && (
              <div
                className="rounded-xl border p-3 text-sm mb-3"
                role="alert"
                style={{
                  borderColor: "var(--color-warning)",
                  color: "var(--color-warning)",
                  backgroundColor: "rgba(245,158,11,0.08)",
                }}
              >
                {slotTakenError}
              </div>
            )}
            {slotsLoading && (
              <p
                className="text-sm text-center py-6"
                style={{ color: "var(--color-text-on-light-muted)" }}
              >
                {messages.flow.loadingSlots}
              </p>
            )}
            {slotsError && (
              <div
                className="rounded-xl border p-4 text-sm text-center"
                style={{
                  borderColor: "var(--color-danger)",
                  color: "var(--color-danger)",
                  backgroundColor: "rgba(239,68,68,0.05)",
                }}
              >
                {slotsError}
              </div>
            )}
            {!slotsLoading && !slotsError && slots.length === 0 && (
              <p
                className="text-sm text-center py-8"
                style={{ color: "var(--color-text-on-light-muted)" }}
              >
                {messages.flow.noSlots}
              </p>
            )}
            {!slotsLoading && slots.length > 0 && (
              <div
                className="grid gap-2"
                style={{ gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))" }}
                role="list"
                aria-label={messages.flow.pickSlot}
              >
                {slots.map((slot) => (
                  <div key={slot.startsAt} role="listitem">
                    <SlotButton
                      slot={slot}
                      selected={selectedSlot?.startsAt === slot.startsAt}
                      onSelect={handleSlotSelect}
                      timezone={businessTimezone}
                      lang={lang}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Step 4: Form ── */}
        {step === 4 && (
          <div className="flex flex-col gap-4">
            {/* Name */}
            <div>
              <label
                htmlFor="booking-name"
                className="block text-sm font-medium mb-1"
                style={{ color: "var(--color-text-on-light)" }}
              >
                {messages.form.name}
              </label>
              <input
                id="booking-name"
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder={messages.form.namePlaceholder}
                autoComplete="name"
                className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2"
                style={{
                  borderColor: nameError ? "var(--color-danger)" : "var(--border-on-light)",
                  backgroundColor: "var(--color-bg-light-surface)",
                  color: "var(--color-text-on-light)",
                }}
                aria-invalid={!!nameError}
                aria-describedby={nameError ? "booking-name-error" : undefined}
              />
              {nameError && (
                <p
                  id="booking-name-error"
                  className="text-xs mt-1"
                  role="alert"
                  style={{ color: "var(--color-danger)" }}
                >
                  {nameError}
                </p>
              )}
            </div>

            {/* WhatsApp */}
            <div>
              <label
                htmlFor="booking-phone"
                className="block text-sm font-medium mb-1"
                style={{ color: "var(--color-text-on-light)" }}
              >
                {messages.form.whatsapp}
              </label>
              <CountryPhoneInput
                id="booking-phone"
                country={businessCountry}
                value={clientPhone}
                onChange={setClientPhone}
                error={phoneError ?? undefined}
                ariaLabel={messages.form.whatsapp}
              />
            </div>

            {/* Submit error */}
            {submitError && (
              <div
                className="rounded-xl border px-4 py-3 text-sm"
                role="alert"
                style={{
                  borderColor: "var(--color-danger)",
                  color: "var(--color-danger)",
                  backgroundColor: "rgba(239,68,68,0.05)",
                }}
              >
                {submitError}
              </div>
            )}

            {/* Submit button */}
            <button
              onClick={() => void handleSubmit()}
              disabled={submitting}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
              style={{ backgroundColor: "var(--color-violet)" }}
            >
              {submitting ? messages.form.submitting : messages.form.submit}
            </button>
          </div>
        )}
      </main>

      {/* Back button */}
      {step > 1 && (
        <div className="px-4 pt-2 max-w-lg mx-auto">
          <button
            onClick={handleBack}
            className="text-sm"
            style={{ color: "var(--color-text-on-light-muted)" }}
          >
            ← {messages.flow.back}
          </button>
        </div>
      )}
    </div>
  );
}
