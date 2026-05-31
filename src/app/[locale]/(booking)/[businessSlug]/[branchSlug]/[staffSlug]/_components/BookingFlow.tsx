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
    continueBtn: string;
  };
  form: {
    name: string;
    namePlaceholder: string;
    whatsapp: string;
    email: { label: string; placeholder: string };
    contactHelp: string;
    atLeastOneContact: string;
    invalidEmail: string;
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
  businessName: string;
  businessLogo: string | null;
  businessCountry: CountryCode;
  businessTimezone: string;
  businessLanguage: string;
  services: BookingService[];
  messages: BookingMessages;
  backHref?: string;
  backLabel?: string;
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
  const first = new Date(`${days[0]}T12:00:00`);
  const dow = first.getDay();
  const offset = dow === 0 ? 6 : dow - 1;
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

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ── Service icon SVG (scissors — universal for personal care/grooming) ──────

function ScissorsIcon({ color = "#6b7280" }: { color?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="6" cy="6" r="3" />
      <path d="M8.12 8.12 12 12" />
      <path d="M20 4 8.12 15.88" />
      <circle cx="6" cy="18" r="3" />
      <path d="M14.8 14.8 20 20" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#94a3b8"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

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
      className="w-full text-left transition-all"
      style={{
        background: selected ? "rgba(109,100,251,0.06)" : "#ffffff",
        border: selected ? "1.5px solid var(--color-violet)" : "1px solid #E5E7EB",
        borderRadius: "12px",
        padding: "16px",
        cursor: "pointer",
      }}
      aria-pressed={selected}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        {/* Service icon */}
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "11px",
            background: selected ? "rgba(109,100,251,0.12)" : "#F3F4F6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <ScissorsIcon color={selected ? "var(--color-violet)" : "#6b7280"} />
        </div>

        {/* Name + duration */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span
            style={{
              fontWeight: 600,
              color: "#0A0E1A",
              fontSize: "14px",
              display: "block",
            }}
          >
            {svc.name}
          </span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              marginTop: "5px",
            }}
          >
            <ClockIcon />
            <span style={{ fontSize: "12px", color: "#94A3B8" }}>
              {svc.duration_minutes} min
            </span>
          </div>
        </div>

        {/* Price */}
        {price > 0 && (
          <span
            style={{
              fontSize: "17px",
              fontWeight: 700,
              color: "var(--color-violet)",
              letterSpacing: "-0.3px",
              flexShrink: 0,
            }}
          >
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
  const isToday = dateStr === getTodayStr();

  return (
    <button
      onClick={() => onSelect(dateStr)}
      className="flex flex-col items-center justify-center rounded-xl transition-all"
      style={{
        minHeight: "54px",
        padding: "6px 2px",
        background: selected ? "var(--color-violet)" : isToday ? "rgba(109,100,251,0.07)" : "transparent",
        border: selected
          ? "1.5px solid var(--color-violet)"
          : isToday
          ? "1.5px solid rgba(109,100,251,0.35)"
          : "1px solid #E5E7EB",
        cursor: "pointer",
      }}
      aria-pressed={selected}
      aria-label={dateStr}
    >
      <span
        style={{
          fontSize: "10px",
          color: selected ? "rgba(255,255,255,0.72)" : isToday ? "var(--color-violet)" : "#94A3B8",
        }}
      >
        {dayAbbr}
      </span>
      <span
        style={{
          fontSize: "14px",
          fontWeight: 600,
          marginTop: "2px",
          color: selected ? "#fff" : isToday ? "var(--color-violet)" : "#0A0E1A",
        }}
      >
        {dayNum}
      </span>
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
      className="w-full rounded-xl text-sm font-medium transition-all"
      style={{
        padding: "12px 8px",
        background: selected ? "var(--color-violet)" : "#ffffff",
        border: selected ? "1.5px solid var(--color-violet)" : "1px solid #E5E7EB",
        color: selected ? "#fff" : "#0A0E1A",
        cursor: "pointer",
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
      className="min-h-screen flex flex-col items-center justify-center px-5 py-12"
      style={{ background: "#FAFAFA" }}
    >
      <div style={{ maxWidth: "440px", width: "100%", textAlign: "center" }}>
        {/* Animated checkmark */}
        <div
          style={{
            margin: "0 auto 24px",
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            background: "var(--color-success)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "klyro-bounceIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both",
          }}
        >
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
            <path
              d="M9 18.5L15 25 27 11.5"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h1
          style={{
            fontSize: "24px",
            fontWeight: 700,
            color: "#0A0E1A",
            letterSpacing: "-0.5px",
            marginBottom: "8px",
            animation: "klyro-fadeUp 0.4s ease both 0.3s",
          }}
        >
          {messages.success.title}
        </h1>
        <p
          style={{
            fontSize: "14px",
            color: "#475569",
            marginBottom: "32px",
            animation: "klyro-fadeUp 0.4s ease both 0.4s",
          }}
        >
          {messages.success.subtitle}
        </p>

        {/* Booking code */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #E5E7EB",
            borderRadius: "16px",
            padding: "20px",
            marginBottom: "12px",
            animation: "klyro-fadeUp 0.4s ease both 0.45s",
          }}
        >
          <p
            style={{
              fontSize: "10px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.8px",
              color: "#94A3B8",
              marginBottom: "8px",
            }}
          >
            {messages.success.codeLabel}
          </p>
          <p
            style={{
              fontSize: "32px",
              fontWeight: 700,
              letterSpacing: "6px",
              fontFamily: "var(--font-mono)",
              color: "var(--color-violet)",
            }}
          >
            {bookingCode}
          </p>
        </div>

        {/* Appointment details */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #E5E7EB",
            borderRadius: "16px",
            padding: "16px",
            marginBottom: "20px",
            textAlign: "left",
            animation: "klyro-fadeUp 0.4s ease both 0.5s",
          }}
        >
          {[
            { label: lang === "en" ? "Service" : "Servicio", value: serviceName },
            { label: lang === "en" ? "With" : "Con", value: staffName },
            {
              label: lang === "en" ? "When" : "Cuándo",
              value: formatAppointmentDateTime(startsAt, timezone, lang),
            },
          ].map(({ label, value }) => (
            <div
              key={label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
                padding: "6px 0",
                borderBottom: "1px solid #F3F4F6",
              }}
            >
              <span style={{ fontSize: "13px", color: "#94A3B8", flexShrink: 0 }}>{label}</span>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#0A0E1A",
                  textAlign: "right",
                  textTransform: "capitalize",
                }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>

        <p style={{ fontSize: "12px", color: "#94A3B8", marginBottom: "24px" }}>
          {messages.success.saveHint}
        </p>

        <button
          onClick={() => window.location.reload()}
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "var(--color-violet)",
            background: "none",
            border: "none",
            cursor: "pointer",
            textDecoration: "underline",
          }}
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
  businessName,
  businessLogo,
  businessCountry,
  businessTimezone,
  businessLanguage,
  services,
  messages,
  backHref,
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
  const [clientEmail, setClientEmail] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
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

  const bookWithLabel = messages.flow.bookWith.replace("{name}", staffName);

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

  // Steps no longer auto-advance — user explicitly taps "Continuar"
  const handleServiceSelect = useCallback((svc: BookingService) => {
    setSelectedService(svc);
  }, []);

  const handleDateSelect = useCallback(
    (date: string) => {
      setSelectedDate(date);
      setSelectedSlot(null);
      // Eagerly fetch slots so they're ready when user taps Continue
      if (selectedService) {
        void fetchSlots(date, selectedService.id);
      }
    },
    [selectedService, fetchSlots]
  );

  const handleSlotSelect = useCallback((slot: Slot) => {
    setSelectedSlot(slot);
    setSlotTakenError(null);
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

    const e164Regex = /^\+\d{7,15}$/;
    // CountryPhoneInput emits dialCode+digits; digits.length > 3 means user typed national number
    const phoneDigits = clientPhone.replace(/\D/g, "");
    const phoneHasContent = phoneDigits.length > 3;
    const emailTrimmed = clientEmail.trim();
    const emailHasContent = emailTrimmed.length > 0;

    if (!phoneHasContent && !emailHasContent) {
      setPhoneError(messages.form.atLeastOneContact);
      setEmailError(null);
      valid = false;
    } else {
      if (phoneHasContent && !e164Regex.test(clientPhone)) {
        setPhoneError(messages.form.whatsappRequired);
        valid = false;
      } else {
        setPhoneError(null);
      }
      if (emailHasContent && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
        setEmailError(messages.form.invalidEmail);
        valid = false;
      } else {
        setEmailError(null);
      }
    }
    return valid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (!selectedService || !selectedSlot) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const phoneToSend = /^\+\d{7,15}$/.test(clientPhone) ? clientPhone : undefined;
      const emailToSend = clientEmail.trim() || undefined;

      const res = await fetch("/api/booking/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId,
          branchId,
          serviceId: selectedService.id,
          slotStart: selectedSlot.startsAt,
          clientName: clientName.trim(),
          ...(phoneToSend ? { clientPhone: phoneToSend } : {}),
          ...(emailToSend ? { clientEmail: emailToSend } : {}),
        }),
      });

      const json = (await res.json()) as {
        data?: { bookingCode: string; startsAt: string };
        error?: { code: string };
      };

      if (res.status === 409) {
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

  // Continue button: advances step or submits on step 4
  const handleContinue = () => {
    if (step === 1 && selectedService) setStep(2);
    else if (step === 2 && selectedDate) setStep(3);
    else if (step === 3 && selectedSlot) setStep(4);
    else if (step === 4) void handleSubmit();
  };

  // Whether the continue/submit button is enabled
  const isContinueEnabled =
    (step === 1 && !!selectedService) ||
    (step === 2 && !!selectedDate) ||
    (step === 3 && !!selectedSlot) ||
    step === 4;

  // ── Step 5: Confirmation ─────────────────────────────────────────────────

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

  // ── Calendar month label ─────────────────────────────────────────────────

  const calendarMonthLabel =
    days[0] !== undefined
      ? new Date(`${days[0]}T12:00:00`).toLocaleDateString(
          lang === "en" ? "en-US" : "es",
          { month: "long", year: "numeric" }
        )
      : "";

  // ── Step subtitles ───────────────────────────────────────────────────────

  const stepSubtitles: Record<number, string> = {
    1: lang === "en"
      ? "Select the service you'd like to book"
      : "Selecciona el servicio que deseas reservar",
    2: lang === "en" ? "What day works for you?" : "¿Qué día prefieres?",
    3: lang === "en" ? "What time works best?" : "¿A qué hora?",
    4: lang === "en"
      ? "Complete your details to confirm"
      : "Completa tus datos para confirmar",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAFA" }}>
      {/* ── Sticky header ────────────────────────────────────────────────── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "#FFFFFF",
          borderBottom: "1px solid #E5E7EB",
        }}
      >
        {/* Business info row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            padding: "16px 20px",
          }}
        >
          {/* Business logo / icon */}
          {businessLogo ? (
            <Image
              src={businessLogo}
              alt={businessName}
              width={52}
              height={52}
              style={{ borderRadius: "14px", objectFit: "cover", flexShrink: 0 }}
            />
          ) : (
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "14px",
                background: "rgba(109,100,251,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <ScissorsIcon color="var(--color-violet)" />
            </div>
          )}

          {/* Text column */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: "16px",
                color: "#0A0E1A",
                letterSpacing: "-0.3px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {businessName}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginTop: "4px",
              }}
            >
              {/* Staff mini-avatar */}
              {staffAvatar ? (
                <Image
                  src={staffAvatar}
                  alt={staffName}
                  width={18}
                  height={18}
                  style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                />
              ) : (
                <div
                  style={{
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    background: "var(--color-violet)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "9px",
                    fontWeight: 700,
                    color: "#fff",
                    flexShrink: 0,
                  }}
                >
                  {getInitials(staffName)}
                </div>
              )}
              <span style={{ fontSize: "12px", color: "#475569" }}>{bookWithLabel}</span>
            </div>
          </div>

          {/* Back to previous page (step 1 only) */}
          {backHref && step === 1 && (
            <a
              href={backHref}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                color: "#475569",
                background: "none",
                border: "none",
                cursor: "pointer",
                flexShrink: 0,
              }}
              aria-label={lang === "en" ? "Go back" : "Volver"}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
            </a>
          )}
        </div>

        {/* Progress bars */}
        <div style={{ padding: "0 20px 12px" }}>
          <div style={{ display: "flex", gap: "4px" }}>
            {stepLabels.map((_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: "3px",
                  borderRadius: "2px",
                  background: step > i ? "var(--color-violet)" : "#F3F4F6",
                  transition: "background 0.3s",
                }}
              />
            ))}
          </div>
          <p
            style={{
              fontSize: "10px",
              color: "#94A3B8",
              marginTop: "8px",
              textAlign: "center",
              letterSpacing: "0.8px",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            {lang === "en" ? "Step" : "Paso"} {step} {lang === "en" ? "of" : "de"} 4
          </p>
        </div>
      </header>

      {/* ── Step content ─────────────────────────────────────────────────── */}
      <main
        style={{
          maxWidth: "480px",
          margin: "0 auto",
          padding: "24px 20px 120px",
        }}
      >
        {/* Step title + subtitle */}
        <h2
          style={{
            fontWeight: 700,
            fontSize: "22px",
            color: "#0A0E1A",
            marginBottom: "6px",
            letterSpacing: "-0.5px",
          }}
        >
          {stepLabels[step - 1]}
        </h2>
        <p
          style={{
            color: "#475569",
            fontSize: "14px",
            lineHeight: "1.5",
            marginBottom: "20px",
          }}
        >
          {stepSubtitles[step]}
        </p>

        {/* ── Step 1: Service picker ─────────────────────────────────────── */}
        {step === 1 && (
          <div
            style={{ display: "grid", gap: "10px" }}
            role="list"
            aria-label={messages.flow.pickService}
          >
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
              <p style={{ fontSize: "14px", color: "#94A3B8", textAlign: "center", padding: "32px 0" }}>
                {lang === "en" ? "No services available" : "No hay servicios disponibles"}
              </p>
            )}
          </div>
        )}

        {/* ── Step 2: Date picker ────────────────────────────────────────── */}
        {step === 2 && (
          <div>
            {calendarMonthLabel && (
              <p
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#475569",
                  marginBottom: "12px",
                  textTransform: "capitalize",
                }}
              >
                {calendarMonthLabel}
              </p>
            )}
            {/* Weekday headers */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", marginBottom: "6px" }}>
              {weekdayHeaders.map((h) => (
                <div
                  key={h}
                  style={{ textAlign: "center", fontSize: "11px", fontWeight: 600, color: "#94A3B8", padding: "4px 0" }}
                >
                  {h}
                </div>
              ))}
            </div>
            {/* Calendar weeks */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {weeks.map((week, wi) => (
                <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
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

        {/* ── Step 3: Slot picker ────────────────────────────────────────── */}
        {step === 3 && (
          <div>
            {slotTakenError && (
              <div
                role="alert"
                style={{
                  borderRadius: "10px",
                  border: "1px solid #F59E0B",
                  padding: "12px",
                  fontSize: "13px",
                  color: "#F59E0B",
                  background: "rgba(245,158,11,0.08)",
                  marginBottom: "16px",
                }}
              >
                {slotTakenError}
              </div>
            )}
            {slotsLoading && (
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <p style={{ fontSize: "14px", color: "#94A3B8" }}>{messages.flow.loadingSlots}</p>
              </div>
            )}
            {slotsError && (
              <div
                style={{
                  borderRadius: "10px",
                  border: "1px solid #EF4444",
                  padding: "16px",
                  fontSize: "13px",
                  textAlign: "center",
                  color: "#EF4444",
                  background: "rgba(239,68,68,0.05)",
                }}
              >
                {slotsError}
              </div>
            )}
            {!slotsLoading && !slotsError && slots.length === 0 && (
              <p style={{ fontSize: "14px", color: "#94A3B8", textAlign: "center", padding: "48px 0" }}>
                {messages.flow.noSlots}
              </p>
            )}
            {!slotsLoading && slots.length > 0 && (
              <div
                style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}
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

        {/* ── Step 4: Client form ────────────────────────────────────────── */}
        {step === 4 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Name */}
            <div>
              <label
                htmlFor="booking-name"
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#0A0E1A",
                  marginBottom: "8px",
                }}
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
                autoFocus
                style={{
                  width: "100%",
                  borderRadius: "10px",
                  border: nameError ? "1.5px solid #EF4444" : "1px solid #E5E7EB",
                  padding: "13px 14px",
                  fontSize: "16px", // prevents iOS zoom
                  color: "#0A0E1A",
                  background: "#ffffff",
                  outline: "none",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
                aria-invalid={!!nameError}
                aria-describedby={nameError ? "booking-name-error" : undefined}
              />
              {nameError && (
                <p
                  id="booking-name-error"
                  role="alert"
                  style={{ fontSize: "12px", color: "#EF4444", marginTop: "6px" }}
                >
                  {nameError}
                </p>
              )}
            </div>

            {/* WhatsApp */}
            <div>
              <label
                htmlFor="booking-phone"
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#0A0E1A",
                  marginBottom: "8px",
                }}
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

            {/* Email */}
            <div>
              <label
                htmlFor="booking-email"
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#0A0E1A",
                  marginBottom: "8px",
                }}
              >
                {messages.form.email.label}
              </label>
              <input
                id="booking-email"
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder={messages.form.email.placeholder}
                autoComplete="email"
                style={{
                  width: "100%",
                  borderRadius: "10px",
                  border: emailError ? "1.5px solid #EF4444" : "1px solid #E5E7EB",
                  padding: "13px 14px",
                  fontSize: "16px",
                  color: "#0A0E1A",
                  background: "#ffffff",
                  outline: "none",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
                aria-invalid={!!emailError}
                aria-describedby={emailError ? "booking-email-error" : undefined}
              />
              {emailError && (
                <p
                  id="booking-email-error"
                  role="alert"
                  style={{ fontSize: "12px", color: "#EF4444", marginTop: "6px" }}
                >
                  {emailError}
                </p>
              )}
            </div>

            {/* Contact help text */}
            <p style={{ fontSize: "12px", color: "#94A3B8", marginTop: "-8px" }}>
              {messages.form.contactHelp}
            </p>

            {/* Submit error */}
            {submitError && (
              <div
                role="alert"
                style={{
                  borderRadius: "10px",
                  border: "1px solid #EF4444",
                  padding: "13px 16px",
                  fontSize: "13px",
                  color: "#EF4444",
                  background: "rgba(239,68,68,0.05)",
                }}
              >
                {submitError}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Fixed bottom bar ─────────────────────────────────────────────── */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "#FFFFFF",
          borderTop: "1px solid #E5E7EB",
          padding: "14px 20px",
          boxShadow: "0 -4px 12px rgba(0,0,0,0.05)",
        }}
      >
        <div
          style={{
            maxWidth: "480px",
            margin: "0 auto",
            display: "flex",
            gap: "8px",
          }}
        >
          {/* Back button (steps 2–4) */}
          {step > 1 && step < 5 && (
            <button
              onClick={handleBack}
              style={{
                background: "#F3F4F6",
                border: "none",
                borderRadius: "10px",
                padding: "13px 20px",
                fontSize: "14px",
                fontWeight: 600,
                color: "#475569",
                cursor: "pointer",
                fontFamily: "inherit",
                flexShrink: 0,
              }}
            >
              ← {messages.flow.back}
            </button>
          )}

          {/* Continue / Submit button */}
          <button
            onClick={handleContinue}
            disabled={!isContinueEnabled || submitting}
            style={{
              flex: 1,
              background: isContinueEnabled && !submitting ? "var(--color-violet)" : "#F3F4F6",
              border: "none",
              borderRadius: "10px",
              padding: "13px 24px",
              fontSize: "14px",
              fontWeight: 600,
              color: isContinueEnabled && !submitting ? "#ffffff" : "#94A3B8",
              cursor: isContinueEnabled && !submitting ? "pointer" : "not-allowed",
              transition: "all 0.15s",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            {step === 4
              ? (submitting ? messages.form.submitting : messages.form.submit)
              : messages.flow.continueBtn}
            {!submitting && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
