"use client";

import { useEffect } from "react";
import { useReducedMotion, useAnimate, motion } from "framer-motion";

// SVG viewBox: 320 x 130. Three nodes at x=40, x=160, x=280, y=65.
const NODE_LEFT = { cx: 40, cy: 65 };
const NODE_MID = { cx: 160, cy: 65 };
const NODE_RIGHT = { cx: 280, cy: 65 };
const NODE_R = 22;
const PARTICLE_R = 5;
// Path d strings for the two connector lines (horizontal)
const PATH_1 = `M ${NODE_LEFT.cx + NODE_R} ${NODE_LEFT.cy} L ${NODE_MID.cx - NODE_R} ${NODE_MID.cy}`;
const PATH_2 = `M ${NODE_MID.cx + NODE_R} ${NODE_MID.cy} L ${NODE_RIGHT.cx - NODE_R} ${NODE_RIGHT.cy}`;

// Checkmark path inside the rightmost node (relative to node center 280,65)
const CHECK_D = "M 267 65 l 7 7 l 13 -13";

interface HeroAnimationProps {
  labels: { client: string; booking: string; confirmed: string };
}

export function HeroAnimation({ labels }: HeroAnimationProps) {
  const reduced = useReducedMotion() ?? false;
  const [scope, animate] = useAnimate();

  // Node label icon paths (client icon, calendar icon, check icon) inside each node
  const nodeLabels = [
    // Person silhouette (client)
    <g key="client" aria-hidden="true">
      <circle cx={40} cy={59} r={4} fill="var(--color-text-secondary)" />
      <path
        d="M 31 72 q 0 -8 9 -8 q 9 0 9 8"
        fill="none"
        stroke="var(--color-text-secondary)"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </g>,
    // Calendar grid (booking)
    <g key="booking" aria-hidden="true">
      <rect x={150} y={55} width={20} height={18} rx={2} fill="none" stroke="var(--color-text-secondary)" strokeWidth={1.5} />
      <line x1={150} y1={60} x2={170} y2={60} stroke="var(--color-text-secondary)" strokeWidth={1.5} />
      <rect x={153} y={63} width={4} height={4} rx={0.5} fill="var(--color-violet-soft)" />
      <rect x={160} y={63} width={4} height={4} rx={0.5} fill="var(--color-violet-soft)" />
    </g>,
    // Check inside right node drawn separately via CHECK_D
    null,
  ];

  useEffect(() => {
    if (reduced) return;

    let cancelled = false;

    async function runLoop() {
      while (!cancelled) {
        // Reset particle to start
        await animate("#particle", { cx: NODE_LEFT.cx + NODE_R, cy: NODE_LEFT.cy, opacity: 1 }, { duration: 0 });
        await animate("#node-mid-circle", { scale: 1 }, { duration: 0 });
        await animate("#node-right-circle", { scale: 1 }, { duration: 0 });
        await animate("#check-path", { pathLength: 0, opacity: 0 }, { duration: 0 });
        await animate("#node-right-fill", { opacity: 0 }, { duration: 0 });

        // Travel seg 1
        await animate(
          "#particle",
          { cx: NODE_MID.cx - NODE_R },
          { duration: 0.65, ease: "easeInOut" }
        );

        if (cancelled) break;

        // Pulse node mid
        await animate("#node-mid-circle", { scale: [1, 1.14, 1] }, { duration: 0.22, ease: "easeOut" });

        // Travel seg 2
        await animate(
          "#particle",
          { cx: NODE_RIGHT.cx - NODE_R },
          { duration: 0.65, ease: "easeInOut" }
        );

        if (cancelled) break;

        // Fade particle, pulse right node, draw check
        await animate("#particle", { opacity: 0 }, { duration: 0.15 });
        await animate("#node-right-circle", { scale: [1, 1.14, 1] }, { duration: 0.22, ease: "easeOut" });
        await animate("#node-right-fill", { opacity: 1 }, { duration: 0.2 });
        await animate("#check-path", { pathLength: [0, 1], opacity: 1 }, { duration: 0.3, ease: "easeOut" });

        if (cancelled) break;

        // Hold confirmed state
        await new Promise((r) => setTimeout(r, 1500));

        if (cancelled) break;

        // Fade out right fill + check, reset
        await animate("#node-right-fill", { opacity: 0 }, { duration: 0.3 });
        await animate("#check-path", { pathLength: 0, opacity: 0 }, { duration: 0.2 });
      }
    }

    runLoop();
    return () => { cancelled = true; };
  }, [animate, reduced]);

  return (
    <svg
      ref={scope}
      viewBox="0 0 320 130"
      aria-hidden="true"
      className="w-full max-w-[320px] select-none"
      style={{ overflow: "visible" }}
    >
      {/* Connector lines drawn with pathLength animation on mount */}
      <motion.path
        d={PATH_1}
        fill="none"
        stroke="var(--color-violet-faint)"
        strokeWidth={1.5}
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, ease: "easeOut", delay: 0.2 }}
      />
      <motion.path
        d={PATH_2}
        fill="none"
        stroke="var(--color-violet-faint)"
        strokeWidth={1.5}
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, ease: "easeOut", delay: 0.4 }}
      />

      {/* Node circles */}
      <motion.circle
        id="node-left-circle"
        cx={NODE_LEFT.cx}
        cy={NODE_LEFT.cy}
        r={NODE_R}
        fill="var(--color-bg-surface)"
        stroke="var(--border-strong, rgba(109,100,251,0.32))"
        strokeWidth={2}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      />
      <motion.circle
        id="node-mid-circle"
        cx={NODE_MID.cx}
        cy={NODE_MID.cy}
        r={NODE_R}
        fill="var(--color-bg-surface)"
        stroke="var(--border-strong, rgba(109,100,251,0.32))"
        strokeWidth={2}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.25 }}
        style={{ transformOrigin: `${NODE_MID.cx}px ${NODE_MID.cy}px` }}
      />
      <motion.circle
        id="node-right-circle"
        cx={NODE_RIGHT.cx}
        cy={NODE_RIGHT.cy}
        r={NODE_R}
        fill="var(--color-bg-surface)"
        stroke="var(--border-strong, rgba(109,100,251,0.32))"
        strokeWidth={2}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        style={{ transformOrigin: `${NODE_RIGHT.cx}px ${NODE_RIGHT.cy}px` }}
      />

      {/* Violet fill overlay for right node (revealed on "done") */}
      <motion.circle
        id="node-right-fill"
        cx={NODE_RIGHT.cx}
        cy={NODE_RIGHT.cy}
        r={NODE_R}
        fill="var(--color-violet)"
        initial={{ opacity: 0 }}
        style={{ transformOrigin: `${NODE_RIGHT.cx}px ${NODE_RIGHT.cy}px` }}
      />

      {/* Node icons */}
      {nodeLabels[0]}
      {nodeLabels[1]}

      {/* Check mark in right node */}
      <motion.path
        id="check-path"
        d={CHECK_D}
        fill="none"
        stroke="white"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        style={{ pathLength: 0 }}
      />

      {/* Traveling particle */}
      {!reduced && (
        <motion.circle
          id="particle"
          cx={NODE_LEFT.cx + NODE_R}
          cy={NODE_LEFT.cy}
          r={PARTICLE_R}
          fill="var(--color-violet)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.6 }}
        />
      )}

      {/* Node labels below */}
      <motion.text
        x={NODE_LEFT.cx}
        y={NODE_LEFT.cy + NODE_R + 14}
        textAnchor="middle"
        fontSize={10}
        fill="var(--color-text-muted)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.5 }}
        className="font-sans"
      >
        {labels.client}
      </motion.text>
      <motion.text
        x={NODE_MID.cx}
        y={NODE_MID.cy + NODE_R + 14}
        textAnchor="middle"
        fontSize={10}
        fill="var(--color-text-muted)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.6 }}
        className="font-sans"
      >
        {labels.booking}
      </motion.text>
      <motion.text
        x={NODE_RIGHT.cx}
        y={NODE_RIGHT.cy + NODE_R + 14}
        textAnchor="middle"
        fontSize={10}
        fill="var(--color-text-muted)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.7 }}
        className="font-sans"
      >
        {labels.confirmed}
      </motion.text>
    </svg>
  );
}
