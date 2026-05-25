import { describe, it, expect } from "vitest";
import { VERTICALS } from "@/lib/verticals/registry";
import esMessages from "@/i18n/locales/es.json";
import enMessages from "@/i18n/locales/en.json";

describe("vertical-aware booking copy", () => {
  it("barbershop appointmentNoun differs from fitness appointmentNoun in es", () => {
    const barber = VERTICALS.barbershop.bookingPageHints.appointmentNoun.es;
    const fitness = VERTICALS.fitness.bookingPageHints.appointmentNoun.es;
    expect(barber).not.toBe(fitness);
    expect(barber).toBe("turno");
    expect(fitness).toBe("sesión");
  });

  it("barbershop appointmentNoun differs from fitness appointmentNoun in en", () => {
    const barber = VERTICALS.barbershop.bookingPageHints.appointmentNoun.en;
    const fitness = VERTICALS.fitness.bookingPageHints.appointmentNoun.en;
    // Both are "appointment" / "session"
    expect(barber).toBe("appointment");
    expect(fitness).toBe("session");
  });

  it("fitness staffNoun is entrenador (es) / trainer (en)", () => {
    expect(VERTICALS.fitness.bookingPageHints.staffNoun.es).toBe("entrenador");
    expect(VERTICALS.fitness.bookingPageHints.staffNoun.en).toBe("trainer");
  });

  it("barbershop staffNoun is barbero (es) / barber (en)", () => {
    expect(VERTICALS.barbershop.bookingPageHints.staffNoun.es).toBe("barbero");
    expect(VERTICALS.barbershop.bookingPageHints.staffNoun.en).toBe("barber");
  });

  it("es booking messages exist and have required keys", () => {
    const m = esMessages.booking;
    expect(m.flow.pickService).toBeTruthy();
    expect(m.flow.pickDate).toBeTruthy();
    expect(m.flow.pickSlot).toBeTruthy();
    expect(m.flow.yourDetails).toBeTruthy();
    expect(m.form.submit).toBeTruthy();
    expect(m.success.title).toBeTruthy();
    expect(m.success.codeLabel).toBeTruthy();
    expect(m.errors.slotTaken).toBeTruthy();
  });

  it("en booking messages exist and have required keys", () => {
    const m = enMessages.booking;
    expect(m.flow.pickService).toBeTruthy();
    expect(m.flow.pickDate).toBeTruthy();
    expect(m.flow.pickSlot).toBeTruthy();
    expect(m.flow.yourDetails).toBeTruthy();
    expect(m.form.submit).toBeTruthy();
    expect(m.success.title).toBeTruthy();
    expect(m.success.codeLabel).toBeTruthy();
    expect(m.errors.slotTaken).toBeTruthy();
  });

  it("es and en booking messages are different (not accidentally identical)", () => {
    expect(esMessages.booking.flow.pickService).not.toBe(enMessages.booking.flow.pickService);
    expect(esMessages.booking.success.title).not.toBe(enMessages.booking.success.title);
  });

  it("bookPrefix + appointmentNoun forms the expected tagline for fitness in es", () => {
    const prefix = esMessages.booking.business.bookPrefix; // "Reserva tu"
    const noun = VERTICALS.fitness.bookingPageHints.appointmentNoun.es; // "sesión"
    expect(`${prefix} ${noun}`).toBe("Reserva tu sesión");
  });

  it("bookPrefix + appointmentNoun forms the expected tagline for barbershop in es", () => {
    const prefix = esMessages.booking.business.bookPrefix;
    const noun = VERTICALS.barbershop.bookingPageHints.appointmentNoun.es;
    expect(`${prefix} ${noun}`).toBe("Reserva tu turno");
  });
});
