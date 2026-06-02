import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Supabase admin mock ──────────────────────────────────────────────────────

const mockSingleMessage = vi.fn();
const mockTemplateIn = vi.fn(); // terminal call of the template query (.in)

const messageChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: mockSingleMessage,
};

const templateChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: mockTemplateIn,
};

const mockFrom = vi.fn((table: string) => {
  if (table === 'messages') return messageChain;
  if (table === 'message_templates') return templateChain;
  return messageChain;
});

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

// All providers configured so channel candidacy depends only on client contact fields.
vi.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_APP_URL: 'https://klyro.app',
    WHATSAPP_PHONE_NUMBER_ID: 'wa-id',
    WHATSAPP_ACCESS_TOKEN: 'wa-token',
    TWILIO_ACCOUNT_SID: 'AC-test',
    TWILIO_AUTH_TOKEN: 'twilio-token',
    TWILIO_MESSAGING_SERVICE_SID: 'MG-test',
    RESEND_API_KEY: 're_test',
  },
}));

import { MessageRouter } from '@/lib/messaging/router';
import {
  MessageNotFoundError,
  NoChannelAvailableError,
  TemplateNotFoundError,
} from '@/lib/messaging/types';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const MSG_ID = 'msg-001';
const APPT_ID = 'appt-001';
const CANCEL_TOKEN = 'tok-001';

const DEFAULT_CONTENT = '¡Hola {nombre}! Tu corte el {fecha} a las {hora} con {staff}. Cancelar: {cancel_link}';
const DEFAULT_VARS = ['nombre', 'fecha', 'hora', 'staff', 'cancel_link'];

function makeMessageRow(overrides: Record<string, unknown> = {}) {
  return {
    id: MSG_ID,
    type: 'confirmation',
    appointment: {
      id: APPT_ID,
      starts_at: '2026-06-02T15:00:00Z',
      cancel_token: CANCEL_TOKEN,
      status: 'confirmed',
      branch: {
        id: 'br-001',
        name: 'Centro',
        address: 'Calle Real 10',
        timezone: 'America/Tegucigalpa',
        whatsapp_number: '+50422334455',
      },
      business: {
        id: 'biz-001',
        name: 'Barber Club',
        slug: 'barber-club',
        vertical: 'barbershop',
        default_language: 'es',
      },
      client: {
        id: 'cli-001',
        full_name: 'Carlos Pérez',
        phone: '+50412345678',
        email: 'carlos@example.com',
        whatsapp_number: '+50412345678',
        preferred_language: 'es',
      },
      staff: { id: 'staff-001', display_name: 'Juan' },
      service: { id: 'svc-001', name: 'Corte clásico' },
      ...overrides,
    },
  };
}

/** Make the template query resolve with a template for each given channel. */
function setTemplates(channels: string[], content = DEFAULT_CONTENT, variables = DEFAULT_VARS) {
  mockTemplateIn.mockResolvedValue({
    data: channels.map((channel) => ({ channel, content, variables })),
    error: null,
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('MessageRouter.resolve', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation((table: string) => {
      if (table === 'messages') return messageChain;
      if (table === 'message_templates') return templateChain;
      return messageChain;
    });
  });

  it('returns a MessagePayload for a barbershop confirmation (es) via whatsapp', async () => {
    mockSingleMessage.mockResolvedValue({ data: makeMessageRow(), error: null });
    setTemplates(['whatsapp', 'email']);

    const router = new MessageRouter();
    const payload = await router.resolve(MSG_ID);

    expect(payload.messageId).toBe(MSG_ID);
    expect(payload.appointmentId).toBe(APPT_ID);
    expect(payload.type).toBe('confirmation');
    expect(payload.channel).toBe('whatsapp');
    expect(payload.to).toBe('+50412345678');
    expect(payload.businessName).toBe('Barber Club');
    expect(payload.body).toContain('Carlos');
    expect(payload.body).toContain('Juan');
    expect(payload.body).toContain(`https://klyro.app/api/appointments/${APPT_ID}/cancel`);
    expect(payload.subject).toContain('Barber Club');
  });

  it('queries templates with language=en for a client with preferred_language=en', async () => {
    const row = makeMessageRow({
      client: {
        id: 'cli-002',
        full_name: 'Ana Smith',
        phone: '+50412345678',
        email: null,
        whatsapp_number: '+50412345678',
        preferred_language: 'en',
      },
    });
    mockSingleMessage.mockResolvedValue({ data: row, error: null });
    setTemplates(['whatsapp'], 'Hi {nombre}! Appointment on {fecha} at {hora} with {staff}. Cancel: {cancel_link}');

    const router = new MessageRouter();
    const payload = await router.resolve(MSG_ID);

    expect(templateChain.eq).toHaveBeenCalledWith('language', 'en');
    expect(payload.body).toContain('Ana');
  });

  it('queries templates for the spa vertical', async () => {
    const row = makeMessageRow({
      business: {
        id: 'biz-002',
        name: 'Serenity Spa',
        slug: 'serenity-spa',
        vertical: 'spa',
        default_language: 'es',
      },
    });
    mockSingleMessage.mockResolvedValue({ data: row, error: null });
    setTemplates(['whatsapp'], 'Hola {nombre}, tu cita el {fecha}. Cancelar: {cancel_link}', ['nombre', 'fecha', 'cancel_link']);

    const router = new MessageRouter();
    await router.resolve(MSG_ID);

    expect(templateChain.eq).toHaveBeenCalledWith('vertical', 'spa');
  });

  it('uses SMS when whatsapp is absent and an SMS template exists', async () => {
    const row = makeMessageRow({
      client: {
        id: 'cli-003',
        full_name: 'Luis Torres',
        phone: '+50499887766',
        email: 'luis@example.com',
        whatsapp_number: null,
        preferred_language: 'es',
      },
    });
    mockSingleMessage.mockResolvedValue({ data: row, error: null });
    setTemplates(['sms', 'email'], 'Hola {nombre}! Cita el {fecha}. Cancelar: {cancel_link}', ['nombre', 'fecha', 'cancel_link']);

    const router = new MessageRouter();
    const payload = await router.resolve(MSG_ID);

    expect(payload.channel).toBe('sms');
    expect(payload.to).toBe('+50499887766');
    expect(templateChain.in).toHaveBeenCalledWith('channel', ['sms', 'email']);
  });

  // The core fallback-bug regression: client HAS a phone but there is no SMS
  // template — must fall through to email instead of failing.
  it('falls through to EMAIL when the client has a phone but no SMS template exists', async () => {
    const row = makeMessageRow({
      client: {
        id: 'cli-006',
        full_name: 'Pedro Gómez',
        phone: '+50455667788',
        email: 'pedro@example.com',
        whatsapp_number: null,
        preferred_language: 'es',
      },
    });
    mockSingleMessage.mockResolvedValue({ data: row, error: null });
    // Only an email template exists; sms is a candidate but has no template.
    setTemplates(['email'], 'Hola {nombre}! Cita el {fecha}. Cancelar: {cancel_link}', ['nombre', 'fecha', 'cancel_link']);

    const router = new MessageRouter();
    const payload = await router.resolve(MSG_ID);

    expect(payload.channel).toBe('email');
    expect(payload.to).toBe('pedro@example.com');
  });

  it('uses email when client has only an email', async () => {
    const row = makeMessageRow({
      client: {
        id: 'cli-004',
        full_name: 'María López',
        phone: null,
        email: 'maria@example.com',
        whatsapp_number: null,
        preferred_language: 'es',
      },
    });
    mockSingleMessage.mockResolvedValue({ data: row, error: null });
    setTemplates(['email'], 'Hola {nombre}! Cita el {fecha}. Cancelar: {cancel_link}', ['nombre', 'fecha', 'cancel_link']);

    const router = new MessageRouter();
    const payload = await router.resolve(MSG_ID);

    expect(payload.channel).toBe('email');
    expect(payload.to).toBe('maria@example.com');
  });

  it('throws NoChannelAvailableError when no contact fields exist', async () => {
    const row = makeMessageRow({
      client: {
        id: 'cli-005',
        full_name: 'Sin Contacto',
        phone: null,
        email: null,
        whatsapp_number: null,
        preferred_language: 'es',
      },
    });
    mockSingleMessage.mockResolvedValue({ data: row, error: null });

    const router = new MessageRouter();
    await expect(router.resolve(MSG_ID)).rejects.toBeInstanceOf(NoChannelAvailableError);
  });

  it('throws MessageNotFoundError when message does not exist', async () => {
    mockSingleMessage.mockResolvedValue({ data: null, error: { message: 'Not found' } });

    const router = new MessageRouter();
    await expect(router.resolve('bad-id')).rejects.toBeInstanceOf(MessageNotFoundError);
  });

  it('throws MessageNotFoundError when appointment is null', async () => {
    mockSingleMessage.mockResolvedValue({
      data: { id: MSG_ID, type: 'confirmation', appointment: null },
      error: null,
    });

    const router = new MessageRouter();
    await expect(router.resolve(MSG_ID)).rejects.toBeInstanceOf(MessageNotFoundError);
  });

  it('throws TemplateNotFoundError when no template exists for any candidate channel', async () => {
    mockSingleMessage.mockResolvedValue({ data: makeMessageRow(), error: null });
    mockTemplateIn.mockResolvedValue({ data: [], error: null });

    const router = new MessageRouter();
    await expect(router.resolve(MSG_ID)).rejects.toBeInstanceOf(TemplateNotFoundError);
  });

  it('includes cancel_link in payload body', async () => {
    mockSingleMessage.mockResolvedValue({ data: makeMessageRow(), error: null });
    setTemplates(['whatsapp'], 'Cancelar: {cancel_link}', ['cancel_link']);

    const router = new MessageRouter();
    const payload = await router.resolve(MSG_ID);

    expect(payload.body).toBe(`Cancelar: https://klyro.app/api/appointments/${APPT_ID}/cancel`);
  });

  it('uses nombre first name only in template variables', async () => {
    mockSingleMessage.mockResolvedValue({ data: makeMessageRow(), error: null });
    setTemplates(['whatsapp'], 'Hola {nombre}!', ['nombre']);

    const router = new MessageRouter();
    const payload = await router.resolve(MSG_ID);

    // full_name is 'Carlos Pérez'; nombre should be 'Carlos' (first word)
    expect(payload.body).toBe('Hola Carlos!');
  });

  it('sets subject with business name for Spanish confirmation', async () => {
    mockSingleMessage.mockResolvedValue({ data: makeMessageRow(), error: null });
    setTemplates(['whatsapp'], 'body', []);

    const router = new MessageRouter();
    const payload = await router.resolve(MSG_ID);

    expect(payload.subject).toBe('Cita confirmada — Barber Club');
  });

  it('sets subject in English for en language', async () => {
    const row = makeMessageRow({
      client: {
        id: 'cli-en',
        full_name: 'John Doe',
        phone: '+50412345678',
        email: null,
        whatsapp_number: '+50412345678',
        preferred_language: 'en',
      },
    });
    mockSingleMessage.mockResolvedValue({ data: row, error: null });
    setTemplates(['whatsapp'], 'Hi {nombre}! Appt {fecha}. Cancel: {cancel_link}', ['nombre', 'fecha', 'cancel_link']);

    const router = new MessageRouter();
    const payload = await router.resolve(MSG_ID);

    expect(payload.subject).toBe('Appointment confirmed — Barber Club');
  });

  // ── US2: reminder_24h type ─────────────────────────────────────────────────

  it('queries the reminder_24h template (not confirmation) when message type is reminder_24h', async () => {
    const row = { ...makeMessageRow(), type: 'reminder_24h' };
    mockSingleMessage.mockResolvedValue({ data: row, error: null });
    setTemplates(['whatsapp'], '¡{nombre}, te recordamos tu turno mañana {fecha} a las {hora} con {staff}!', ['nombre', 'fecha', 'hora', 'staff']);

    const router = new MessageRouter();
    const payload = await router.resolve(MSG_ID);

    expect(templateChain.eq).toHaveBeenCalledWith('type', 'reminder_24h');
    expect(payload.type).toBe('reminder_24h');
  });

  it('returns reminder payload with correct body populated for reminder_24h', async () => {
    const row = { ...makeMessageRow(), type: 'reminder_24h' };
    mockSingleMessage.mockResolvedValue({ data: row, error: null });
    setTemplates(['whatsapp'], '¡{nombre}, mañana entrenas! Tu sesión con {staff} a las {hora}.', ['nombre', 'staff', 'hora']);

    const router = new MessageRouter();
    const payload = await router.resolve(MSG_ID);

    expect(payload.body).toContain('Carlos'); // nombre
    expect(payload.body).toContain('Juan');   // staff
  });

  it('sets the reminder subject in Spanish', async () => {
    const row = { ...makeMessageRow(), type: 'reminder_24h' };
    mockSingleMessage.mockResolvedValue({ data: row, error: null });
    setTemplates(['whatsapp'], '{nombre} {fecha}', ['nombre', 'fecha']);

    const router = new MessageRouter();
    const payload = await router.resolve(MSG_ID);

    expect(payload.subject).toBe('Recordatorio de cita — Barber Club');
  });

  it('sets the reminder subject in English when client language is en', async () => {
    const row = {
      ...makeMessageRow({
        client: {
          id: 'cli-en2',
          full_name: 'John Doe',
          phone: '+50412345678',
          email: null,
          whatsapp_number: '+50412345678',
          preferred_language: 'en',
        },
      }),
      type: 'reminder_24h',
    };
    mockSingleMessage.mockResolvedValue({ data: row, error: null });
    setTemplates(['whatsapp'], 'Hey {nombre}!', ['nombre']);

    const router = new MessageRouter();
    const payload = await router.resolve(MSG_ID);

    expect(payload.subject).toBe('Appointment reminder — Barber Club');
  });
});
