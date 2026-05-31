import { createAdminClient } from '@/lib/supabase/admin';
import { env } from '@/lib/env';
import {
  type MessageChannel,
  type MessagePayload,
  type MessageType,
  type TemplateVariables,
  MessageNotFoundError,
  NoChannelAvailableError,
  TemplateNotFoundError,
} from './types';
import { interpolate } from './variables';
import { formatDate, formatTime } from './format';

interface AppointmentRow {
  id: string;
  starts_at: string;
  cancel_token: string;
  status: string;
  branch: {
    id: string;
    name: string;
    address: string | null;
    timezone: string;
    whatsapp_number: string | null;
  };
  business: {
    id: string;
    name: string;
    slug: string;
    vertical: string;
    default_language: string;
  };
  client: {
    id: string;
    full_name: string;
    phone: string | null;
    email: string | null;
    whatsapp_number: string | null;
    preferred_language: string | null;
  };
  staff: { id: string; display_name: string };
  service: { id: string; name: string };
}

interface MessageRow {
  id: string;
  type: string;
  appointment: AppointmentRow | null;
}

export class MessageRouter {
  private supabase = createAdminClient();

  async resolve(messageId: string): Promise<MessagePayload> {
    const { data: msg, error } = await this.supabase
      .from('messages')
      .select(`
        id,
        type,
        appointment:appointments (
          id, starts_at, cancel_token, status,
          branch:branches ( id, name, address, timezone, whatsapp_number ),
          business:businesses ( id, name, slug, vertical, default_language ),
          client:clients ( id, full_name, phone, email, whatsapp_number, preferred_language ),
          staff:staff ( id, display_name ),
          service:services ( id, name )
        )
      `)
      .eq('id', messageId)
      .single();

    if (error || !msg || !msg.appointment) {
      throw new MessageNotFoundError(messageId);
    }

    // Supabase returns nested joins as arrays for to-one relations in some SDK versions.
    // Normalise to plain objects.
    const raw = msg as unknown as MessageRow;
    const appt = Array.isArray(raw.appointment) ? raw.appointment[0] : raw.appointment;

    if (!appt) throw new MessageNotFoundError(messageId);

    const branch = Array.isArray(appt.branch) ? appt.branch[0] : appt.branch;
    const business = Array.isArray(appt.business) ? appt.business[0] : appt.business;
    const client = Array.isArray(appt.client) ? appt.client[0] : appt.client;
    const staff = Array.isArray(appt.staff) ? appt.staff[0] : appt.staff;
    const service = Array.isArray(appt.service) ? appt.service[0] : appt.service;

    const language = ((client.preferred_language ?? business.default_language ?? 'es') as 'es' | 'en');
    const type = raw.type as MessageType;
    const vertical = business.vertical;

    const channel = this.resolveChannel(client, branch, appt.id);

    const { data: template, error: tmplError } = await this.supabase
      .from('message_templates')
      .select('content, variables')
      .eq('type', type)
      .eq('channel', channel)
      .eq('language', language)
      .eq('vertical', vertical)
      .eq('is_active', true)
      .single();

    if (tmplError || !template) {
      throw new TemplateNotFoundError(vertical, language, channel, type);
    }

    const timezone = branch.timezone ?? 'America/Tegucigalpa';
    const appUrl = env.NEXT_PUBLIC_APP_URL;

    const vars: TemplateVariables = {
      nombre: client.full_name.split(' ')[0] ?? client.full_name,
      fecha: formatDate(appt.starts_at, timezone, language),
      hora: formatTime(appt.starts_at, timezone, language),
      staff: staff.display_name,
      negocio: business.name,
      servicio: service.name,
      dirección: branch.address ?? '',
      sucursal: branch.name,
      cancel_link: `${appUrl}/api/appointments/${appt.id}/cancel`,
      link: `${appUrl}/${business.slug}`,
    };

    const declaredVars: string[] = Array.isArray(template.variables)
      ? (template.variables as string[])
      : [];

    const body = interpolate(template.content, vars, declaredVars);
    const to = this.getTo(channel, client);
    const subject = this.buildSubject(type, business.name, language);

    return {
      messageId,
      appointmentId: appt.id,
      type,
      channel,
      to,
      body,
      subject,
      businessName: business.name,
    };
  }

  private resolveChannel(
    client: { whatsapp_number: string | null; phone: string | null; email: string | null },
    branch: { whatsapp_number: string | null },
    appointmentId: string,
  ): MessageChannel {
    if (client.whatsapp_number && branch.whatsapp_number) return 'whatsapp';
    if (client.phone) return 'sms';
    if (client.email) return 'email';
    throw new NoChannelAvailableError(appointmentId);
  }

  private getTo(
    channel: MessageChannel,
    client: { whatsapp_number: string | null; phone: string | null; email: string | null },
  ): string {
    if (channel === 'whatsapp') return client.whatsapp_number!;
    if (channel === 'sms') return client.phone!;
    return client.email!;
  }

  private buildSubject(type: MessageType, businessName: string, language: 'es' | 'en'): string {
    const map: Record<MessageType, Record<'es' | 'en', string>> = {
      confirmation: {
        es: `Cita confirmada — ${businessName}`,
        en: `Appointment confirmed — ${businessName}`,
      },
      reminder_24h: {
        es: `Recordatorio de cita — ${businessName}`,
        en: `Appointment reminder — ${businessName}`,
      },
      cancellation: {
        es: `Cita cancelada — ${businessName}`,
        en: `Appointment cancelled — ${businessName}`,
      },
    };
    return map[type][language];
  }
}
