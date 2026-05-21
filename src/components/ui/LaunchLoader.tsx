"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Logo } from "@/components/shared/Logo";

interface LaunchLoaderProps {
  open: boolean;
  locale: "es" | "en";
}

const MESSAGE_INTERVAL_MS = 900;

export function LaunchLoader({ open }: LaunchLoaderProps) {
  const t = useTranslations("wizard.confirm.launching");
  const messages = [t("message1"), t("message2"), t("message3"), t("message4")];
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!open || messageIndex >= messages.length - 1) return;
    const timer = setTimeout(() => {
      setMessageIndex((i) => Math.min(i + 1, messages.length - 1));
    }, MESSAGE_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [open, messageIndex, messages.length]);

  if (!open) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={t("ariaLabel")}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{
        background:
          "linear-gradient(180deg, var(--color-bg-surface) 0%, var(--color-bg-base) 100%)",
      }}
    >
      <motion.div
        animate={{
          scale: [1, 1.08, 1],
          opacity: [1, 0.75, 1],
        }}
        transition={{
          duration: 1.6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="mb-8"
      >
        <Logo
          variant="mark"
          theme="dark"
          className="[&>svg]:h-24 [&>svg]:w-24"
        />
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.p
          key={messageIndex}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          className="text-base font-medium text-[var(--color-text-secondary)]"
        >
          {messages[messageIndex]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
