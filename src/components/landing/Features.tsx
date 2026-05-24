import { getTranslations } from "next-intl/server";
import { Link2, MessageCircle, Bell } from "lucide-react";
import type { LucideIcon } from "lucide-react";

function FeatureCard({
  Icon,
  title,
  body,
  index,
}: {
  Icon: LucideIcon;
  title: string;
  body: string;
  index: number;
}) {
  return (
    <div
      className="klyro-feature-card group flex flex-col gap-4 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--color-bg-surface)] p-6 transition-all duration-300 hover:border-[var(--border-strong)]"
      style={{
        animation: "klyro-slideUp 0.55s ease-out both",
        animationDelay: `${index * 0.12}s`,
      }}
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-xl transition-colors duration-300 group-hover:bg-[rgba(109,100,251,0.2)]"
        style={{ background: "rgba(175,170,253,0.12)" }}
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
      className="relative px-6 py-20 bg-[var(--color-bg-surface)]"
    >
      {/* Top hairline + glow */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent 0%, rgba(109,100,251,0.5) 50%, transparent 100%)" }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24"
        style={{ background: "linear-gradient(to bottom, rgba(109,100,251,0.07) 0%, transparent 100%)" }}
        aria-hidden="true"
      />
      {/* Bottom hairline */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent 0%, rgba(109,100,251,0.4) 50%, transparent 100%)" }}
        aria-hidden="true"
      />

      <div className="mx-auto max-w-5xl">
        <p
          id="features-title"
          className="mb-10 text-center text-sm font-semibold uppercase tracking-widest text-[var(--color-violet-faint)]"
          style={{
            animation: "klyro-slideUp 0.55s ease-out both",
            animationDelay: "0s",
          }}
        >
          {t("features.sectionTitle")}
        </p>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {cards.map((card, i) => (
            <FeatureCard key={card.title} {...card} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
