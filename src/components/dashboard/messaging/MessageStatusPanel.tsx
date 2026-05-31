"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { MessageSquare, Mail, Phone, CheckCircle2, Clock, XCircle, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type MessageChannel = "whatsapp" | "sms" | "email";
type MessageStatus = "pending" | "sent" | "delivered" | "failed" | "cancelled";
type MessageType = "confirmation" | "reminder_24h" | "cancellation";

interface MessageRow {
  id: string;
  type: MessageType;
  channel: MessageChannel;
  status: MessageStatus;
  scheduledAt: string | null;
  sentAt: string | null;
  providerMessageId: string | null;
}

interface MessageStatusPanelProps {
  appointmentId: string;
}

function ChannelIcon({ channel }: { channel: MessageChannel }) {
  if (channel === "whatsapp") return <MessageSquare className="h-4 w-4" aria-hidden />;
  if (channel === "sms") return <Phone className="h-4 w-4" aria-hidden />;
  return <Mail className="h-4 w-4" aria-hidden />;
}

function StatusBadge({ status }: { status: MessageStatus }) {
  const t = useTranslations("messaging.status");

  const colorClass: Record<MessageStatus, string> = {
    delivered: "text-[var(--color-success)]",
    sent: "text-[var(--color-warning)]",
    pending: "text-[var(--color-text-muted)]",
    failed: "text-[var(--color-danger)]",
    cancelled: "text-[var(--color-danger)]",
  };

  const Icon: Record<MessageStatus, React.FC<{ className?: string }>> = {
    delivered: CheckCircle2,
    sent: Send,
    pending: Clock,
    failed: XCircle,
    cancelled: XCircle,
  };

  const StatusIcon = Icon[status];

  return (
    <span className={`flex items-center gap-1 text-sm font-medium ${colorClass[status]}`}>
      <StatusIcon className="h-3.5 w-3.5" aria-hidden />
      {t(status)}
    </span>
  );
}

export function MessageStatusPanel({ appointmentId }: MessageStatusPanelProps) {
  const t = useTranslations("messaging");
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Initial data fetch
  useEffect(() => {
    async function fetchMessages() {
      try {
        const res = await fetch(`/api/appointments/${appointmentId}/messages`);
        if (!res.ok) return;
        const json = (await res.json()) as { data: MessageRow[] };
        setMessages(json.data ?? []);
      } finally {
        setLoading(false);
      }
    }
    void fetchMessages();
  }, [appointmentId]);

  // Realtime subscription — live status updates
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${appointmentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `appointment_id=eq.${appointmentId}`,
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          if (payload.eventType === "UPDATE" || payload.eventType === "INSERT") {
            const updated = payload.new;
            setMessages((prev) => {
              const idx = prev.findIndex((m) => m.id === updated["id"]);
              const row: MessageRow = {
                id: String(updated["id"] ?? ""),
                type: (updated["type"] ?? "confirmation") as MessageType,
                channel: (updated["channel"] ?? "whatsapp") as MessageChannel,
                status: (updated["status"] ?? "pending") as MessageStatus,
                scheduledAt: (updated["scheduled_at"] as string | null) ?? null,
                sentAt: (updated["sent_at"] as string | null) ?? null,
                providerMessageId: (updated["provider_message_id"] as string | null) ?? null,
              };
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = row;
                return next;
              }
              return [...prev, row];
            });
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [appointmentId]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-2 p-4">
        <div className="h-4 w-1/3 rounded bg-[var(--color-bg-elevated)]" />
        <div className="h-10 rounded bg-[var(--color-bg-elevated)]" />
        <div className="h-10 rounded bg-[var(--color-bg-elevated)]" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-[var(--color-text-muted)]">
        <MessageSquare className="h-8 w-8 opacity-40" aria-hidden />
        <p className="text-sm">{t("noMessages")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
        {t("title")}
      </p>
      <ul className="space-y-2" aria-label={t("title")}>
        {messages.map((msg) => (
          <li
            key={msg.id}
            className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--color-bg-surface)] px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span className="text-[var(--color-text-muted)]">
                <ChannelIcon channel={msg.channel} />
              </span>
              <div>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  {t(`type.${msg.type}`)}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {t(`channel.${msg.channel}`)}
                  {msg.sentAt
                    ? ` · ${new Date(msg.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                    : null}
                </p>
              </div>
            </div>
            <StatusBadge status={msg.status} />
          </li>
        ))}
      </ul>
    </div>
  );
}
