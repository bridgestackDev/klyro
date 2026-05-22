import { getTranslations } from "next-intl/server";
import { Link2, MessageCircle, Bell } from "lucide-react";
import type { LucideIcon } from "lucide-react";

function FeatureCard({
  Icon,
  title,
  body,
}: {
  Icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div
      className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--color-bg-surface)] p-6 transition-colors hover:border-[var(--border-strong)]"
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-xl"
        style={{ background: "rgba(175,170,253,0.15)" }}
        aria-hidden="true"
      >
        <Icon className="h-6 w-6 text-[var(--color-violet)]" strokeWidth={1.75} />
      </div>
      <h3 className="text-lg font-bold tracking-tight text-[var(--color-text-primary)]">
        {title}
      </h3>
      <p className="text-base leading-relaxed text-[var(--color-text-secondary)]">
        {body}
      </p>
    </div>
  );
}

export async function Features() {
  const t = await getTranslations("landing");

  const cards = [
    {
      Icon: Link2,
      title: t("features.link.title"),
      body: t("features.link.body"),
    },
    {
      Icon: MessageCircle,
      title: t("features.confirm.title"),
      body: t("features.confirm.body"),
    },
    {
      Icon: Bell,
      title: t("features.reminder.title"),
      body: t("features.reminder.body"),
    },
  ];

  return (
    <section
      id="features"
      aria-labelledby="features-title"
      className="px-6 py-20 bg-[var(--color-bg-base)]"
    >
      <div className="mx-auto max-w-5xl">
        <p
          id="features-title"
          className="mb-10 text-center text-sm font-semibold uppercase tracking-widest text-[var(--color-violet-faint)]"
        >
          {t("features.sectionTitle")}
        </p>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {cards.map((card) => (
            <FeatureCard key={card.title} {...card} />
          ))}
        </div>
      </div>
    </section>
  );
}
