# Klyro — App Features

**Version:** 1.0
**Date:** May 2026
**Audience:** Pioneer onboarding, sales conversations, product demos, support reference

> This document describes what Klyro does today. For the product vision and business case, see `ProjectGoals.md`. For the technical architecture, see `TechStack.md`.

---

## What Klyro is, in one paragraph

Klyro is a scheduling platform for any business that books clients by appointment. The owner sets up their business in under fifteen minutes through a guided wizard, then shares a personal booking link on Instagram, WhatsApp, or a business card. Clients open the link on their phone, pick a service, pick a time, and reserve in under a minute. The owner sees the appointment appear in their dashboard in real time, and the client receives an automatic confirmation. Twenty-four hours before the appointment, the client receives an automatic reminder. No commission, no marketplace, no apps to download.

---

## Who Klyro is for

Klyro is built for any service business that operates on a one-client-at-a-time appointment model. Eight verticals are supported at launch:

- **Barbershop** — single-operator and team setups, walk-in and appointment hybrid.
- **Beauty salon** — multi-stylist, with services that vary in duration.
- **Fitness and personal training** — one-on-one sessions, not group classes.
- **Spa and aesthetics** — massage, facials, longer treatments with prep buffers.
- **Tattoo and piercing studio** — long appointments, custom service descriptions.
- **Car wash and detailing** — service-per-vehicle, time-slot based.
- **Pet grooming** — appointments by pet size or breed.
- **Generic** — for any service business not covered above, with no preset services.

What Klyro is *not* built for (and explicitly out of scope at launch):

- Group classes with capacity greater than one per slot (yoga studios with twenty attendees).
- Restaurant or table reservations.
- Hotel or room-night bookings.
- Medical or dental practices requiring HIPAA compliance.

---

## How the owner experience works

### 1. Sign up

The owner visits `klyro.app`, enters their email, and signs in with a magic link, Google, or Apple. No password to remember, no credit card upfront during closed beta.

### 2. The setup wizard

A guided, nine-step modal that walks the owner from a blank account to a working booking link. Each step is self-contained, with a sticky progress bar at the top and a sticky Back/Continue at the bottom.

1. **Pick your vertical** — eight cards, one click. The choice pre-loads sensible defaults for everything that follows.
2. **Business name** — name and URL slug, auto-generated from the name, editable.
3. **First branch** — name, address, city, country, timezone (auto-suggested by country), and contact phone.
4. **Services catalog** — pre-seeded with appropriate services for the chosen vertical (e.g. "Haircut" and "Beard trim" for a barbershop, "Swedish massage" and "Facial" for a spa). The owner can edit, add, or remove any.
5. **Staff** — the owner is the first staff member by default. Team members can be added later from the dashboard.
6. **Availability** — a weekly grid where the owner sets open and close times per day.
7. **Notifications** — primary contact channel (WhatsApp number, email fallback).
8. **Booking link preview** — the owner sees exactly what their public URL looks like.
9. **Review and launch** — a summary of everything entered, with a single "Launch" button.

Wizard progress is saved automatically. If the owner closes the browser mid-setup, they resume exactly where they left off. The whole wizard typically takes between eight and fifteen minutes the first time.

### 3. Multi-branch and multi-staff

After the wizard, owners can grow their setup as needed:

- **Add branches.** Each branch has its own address, contact info, and timezone. Each branch also gets its own booking link.
- **Add staff.** Each staff member is invited by email. They receive a magic-link invitation, set up their profile (display name, slug, photo), and gain access to a staff-only dashboard.
- **Per-staff and per-branch availability.** A barber can work Mondays at the downtown branch and Wednesdays at the mall branch — the booking system understands these separately.
- **Service overrides per branch.** A "Premium haircut" can cost twenty-five dollars at one location and thirty-five at another.

### 4. The owner dashboard

The dashboard is mobile-first and dark-themed. It is where the owner spends their day-to-day operational time:

- **Home (Today)** — count of today's appointments, list of upcoming bookings, no-show alerts.
- **Agenda** — a calendar view (day or week) with appointment cards. Filter by branch, staff, or service.
- **Team** — list of staff, invite new members, edit roles, upload avatars.
- **Branches** — list of branches with quick stats per branch.
- **Services** — full catalog management.
- **Links** — copy booking URLs and download QR codes for printing on business cards or storefront posters.
- **Settings** — business profile, logo upload, language, currency, cancellation policy.

When a new booking comes in, the dashboard updates in real time without refresh. The owner can see it appear as it happens.

### 5. The staff dashboard

A simplified view tailored to individual team members. Staff members see only their own appointments — Row-Level Security in the database makes this guarantee unbreakable, not just a UI hide.

- **My day** — today's appointments, in order.
- **My link** — personal booking URL (for sharing with regular clients).
- **My schedule** — edit availability without owner approval.
- **Mark as completed or no-show** — once an appointment passes.

---

## How the client experience works

A client receives a link. What happens depends on which link.

### Three levels of booking URL

| URL pattern | Behavior |
|---|---|
| `klyro.app/marcus-barber` | Business landing — logo, name, list of branches. Client picks a branch. |
| `klyro.app/marcus-barber/centro` | Branch landing — services and staff at that location. Client picks both. |
| `klyro.app/marcus-barber/centro/juan` | Staff landing — straight to the calendar for a specific staff member. |

### The booking flow itself

Built mobile-first, accessible (WCAG 2.1 AA), and works without any app install or account creation.

1. Client opens the link, sees the business or staff page with branding.
2. Picks a service (or it's already chosen from the URL).
3. Picks a date — calendar shows availability at a glance.
4. Picks a slot — only available times are shown; taken slots are visibly disabled.
5. Fills a short form — name and WhatsApp number. Email is optional.
6. Confirms — a success page appears with the booking code (`KLY-XXXX`) and the appointment details.

Total time from open to confirmation: typically under sixty seconds.

The booking page automatically displays in the client's preferred language (Spanish or English, detected from their browser) and uses vocabulary appropriate for the vertical — "appointment" for a salon, "session" for fitness, "reservation" for a car wash. This is not cosmetic; it is the platform speaking the language of each industry.

### Automatic messaging

After a booking is confirmed, the platform sends two messages automatically:

- **Confirmation** — within five seconds of booking. Contains date, time, staff, location, and a way to cancel.
- **Reminder** — twenty-four hours before the appointment.

Channel selection is automatic, with priority: WhatsApp first, SMS second, email third. The owner configures which channels are active for their business.

All message content is template-driven and varies by vertical, language, and channel. A barbershop confirmation reads casual and direct ("¡Tu corte está confirmado! Te esperamos."), while a spa confirmation uses a wellness tone ("Tu momento de bienestar está reservado.") — the same data, wrapped in vertical-appropriate voice.

---

## Internationalization and localization

This is not a translated app — it was built bilingual from the first commit.

- **Languages:** Spanish (primary) and English (secondary).
- **Auto-detection:** the booking page picks the client's language from their browser settings; the dashboard uses the owner's preferred language.
- **Country support:** Honduras (default), six other Latin American countries, and the United States.
- **Date and time formatting:** localized by country, not just by language.
- **Currency formatting:** matched to the business's country, with appropriate symbols and decimal conventions.
- **Phone validation:** country-aware. A Honduran number is validated differently from a Mexican or US number.

---

## Brand and customization

The platform is white-label in spirit, even though it runs at `klyro.app/<your-name>`:

- Upload your business logo — appears on every booking page and in every automated message.
- Upload staff avatars — clients see real photos of who they will see at their appointment.
- Vertical-appropriate copy — every label, button, and message reflects the kind of business you run.

There is no "Powered by Klyro" badge that overshadows the business identity on the booking page. The platform is present but quiet.

---

## Privacy and data ownership

Klyro is built on the principle that **the business owns its customer relationships**, not the platform.

- Client contact information collected through the booking flow belongs to the business.
- Klyro does not market to clients on behalf of the platform.
- Klyro does not show "competing businesses near you" on any booking page.
- Owners can export their client list and booking history as a CSV at any time.

At the technical level, every business's data is isolated from every other business via Row-Level Security policies at the database layer. There is no possibility of one business seeing another's appointments, even in the case of a bug — the database itself enforces the separation.

---

## What is not in the MVP

To be transparent about scope: the closed beta launches without the following. These are planned for later versions, not abandoned.

- Online payment processing (planned: post-launch, via Stripe Connect).
- Client portal with booking history (planned for v2).
- Loyalty programs, coupons, or discounts.
- Marketing automation (mass SMS or email campaigns).
- Advanced analytics and revenue reporting.
- Native mobile apps for iOS or Android.
- Calendar synchronization with Google Calendar or Apple Calendar.
- Custom domains per business.
- POS integration.

---

## Pricing during closed beta

Klyro is free for the first ten pioneer businesses during closed beta. Once we open to self-serve, pricing will be a transparent monthly subscription (no per-booking commission). Pricing tiers are still being calibrated based on feedback from pioneers — the goal is a number that feels obviously fair compared to the alternative of running scheduling manually.

---

## Where Klyro is right now

Active development. The setup wizard, public booking flow, owner dashboard infrastructure, and message templates are built. Closed beta launch is anchored to the completion of automated messaging delivery (the final platform component) and the onboarding of the first pioneer cohort.

For status of any specific feature, see `STATUS.md` and `TASKS.md` in the repository.
