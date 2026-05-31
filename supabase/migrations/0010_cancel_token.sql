-- Migration 0010: add cancel_token to appointments, extend messages status,
-- and append {cancel_link} to all confirmation templates.

-- 1. Add cancel_token column
alter table appointments
  add column cancel_token uuid not null default gen_random_uuid();

-- 2. Extend messages.status to allow 'cancelled'
alter table messages
  drop constraint messages_status_check;

alter table messages
  add constraint messages_status_check
    check (status in ('pending','sent','delivered','failed','cancelled'));

-- 3. WhatsApp confirmation templates — Spanish
update message_templates
  set
    content   = content || E'\nCancelar: {cancel_link}',
    variables = variables || '["cancel_link"]'::jsonb
where type = 'confirmation' and channel = 'whatsapp' and language = 'es';

-- 4. WhatsApp confirmation templates — English
update message_templates
  set
    content   = content || E'\nCancel: {cancel_link}',
    variables = variables || '["cancel_link"]'::jsonb
where type = 'confirmation' and channel = 'whatsapp' and language = 'en';

-- 5. Email confirmation templates — Spanish
update message_templates
  set
    content   = content || E'\n\nPara cancelar tu cita: {cancel_link}',
    variables = variables || '["cancel_link"]'::jsonb
where type = 'confirmation' and channel = 'email' and language = 'es';

-- 6. Email confirmation templates — English
update message_templates
  set
    content   = content || E'\n\nTo cancel your appointment: {cancel_link}',
    variables = variables || '["cancel_link"]'::jsonb
where type = 'confirmation' and channel = 'email' and language = 'en';
