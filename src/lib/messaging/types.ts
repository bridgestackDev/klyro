export type MessageType = 'confirmation' | 'reminder_24h' | 'cancellation';
export type MessageChannel = 'whatsapp' | 'sms' | 'email';
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'cancelled';

export interface TemplateVariables extends Record<string, string | undefined> {
  nombre: string;
  fecha: string;
  hora: string;
  staff: string;
  negocio: string;
  servicio?: string;
  dirección?: string;
  sucursal?: string;
  mascota?: string;
  cancel_link?: string;
  link?: string;
}

export interface MessagePayload {
  messageId: string;
  appointmentId: string;
  type: MessageType;
  channel: MessageChannel;
  to: string;
  body: string;
  subject?: string;
  businessName: string;
}

export interface ChannelResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
}

export class MissingVariableError extends Error {
  constructor(public readonly variable: string) {
    super(`Missing required template variable: ${variable}`);
    this.name = 'MissingVariableError';
  }
}

export class NoChannelAvailableError extends Error {
  constructor(public readonly appointmentId: string) {
    super(`No messaging channel available for appointment: ${appointmentId}`);
    this.name = 'NoChannelAvailableError';
  }
}

export class MessageNotFoundError extends Error {
  constructor(public readonly messageId: string) {
    super(`Message not found or missing appointment data: ${messageId}`);
    this.name = 'MessageNotFoundError';
  }
}

export class TemplateNotFoundError extends Error {
  constructor(
    public readonly vertical: string,
    public readonly language: string,
    public readonly channel: MessageChannel,
    public readonly type: MessageType,
  ) {
    super(`No active template for (${vertical}, ${language}, ${channel}, ${type})`);
    this.name = 'TemplateNotFoundError';
  }
}
