"use client";

// Booking flow network — nodes are business/client endpoints,
// paths are appointment requests traveling through Klyro.
const PATHS = {
  p1: "M 460 55 C 560 110, 670 175, 760 240",
  p2: "M 200 180 C 420 188, 600 222, 760 240",
  p3: "M 200 180 C 155 300, 112 390, 82 462",
  p4: "M 760 240 C 710 360, 660 442, 600 520",
  p5: "M 322 352 C 432 406, 516 466, 600 520",
  p6: "M 600 520 C 800 480, 980 442, 1160 400",
  p7: "M 600 520 C 558 622, 510 700, 462 762",
  p8: "M 1160 400 C 1246 488, 1312 546, 1382 602",
  p9: "M 82 462 C 280 496, 432 516, 600 520",
};

export function HeroBackground() {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none select-none"
      aria-hidden="true"
    >
      <style>{`
        /* Flow-dash animation — marching dots along each connection */
        @media (prefers-reduced-motion: no-preference) {
          .kfd  { stroke-dasharray: 6 22; animation: kfd-march 2.8s linear infinite; }
          .kfd2 { stroke-dasharray: 5 20; animation: kfd-march 4.2s linear infinite; }
          .khub { animation: khub-beat 3.6s ease-in-out infinite; }
        }
        @media (prefers-reduced-motion: reduce) {
          .kpart { display: none; }
          .kfd, .kfd2 { animation: none; stroke-dasharray: none; opacity: 0.08; }
        }
        @keyframes kfd-march { to { stroke-dashoffset: -28; } }
        @keyframes khub-beat {
          0%,100% { opacity: 0.55; }
          50%     { opacity: 1; }
        }
      `}</style>

      <svg
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Hub glow — bloomed circle behind each hub node */}
          <filter id="khub-fx" x="-120%" y="-120%" width="340%" height="340%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Particle trail glow */}
          <filter id="kpart-fx" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Ambient violet orbs */}
          <radialGradient id="korb-a" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#6d64fb" stopOpacity="0.38" />
            <stop offset="100%" stopColor="#6d64fb" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="korb-b" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#8a83fc" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#8a83fc" stopOpacity="0" />
          </radialGradient>

          {/* Bottom-fade to bg-base */}
          <linearGradient id="kfade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="62%" stopColor="#0a0a1f" stopOpacity="0" />
            <stop offset="100%" stopColor="#0a0a1f" stopOpacity="1" />
          </linearGradient>

          {/* Edge vignette */}
          <radialGradient id="kvign" cx="50%" cy="50%" r="50%">
            <stop offset="35%" stopColor="#0a0a1f" stopOpacity="0" />
            <stop offset="100%" stopColor="#0a0a1f" stopOpacity="0.55" />
          </radialGradient>

          {/* Named paths — referenced by animateMotion particles */}
          <path id="kp1" d={PATHS.p1} />
          <path id="kp2" d={PATHS.p2} />
          <path id="kp3" d={PATHS.p3} />
          <path id="kp4" d={PATHS.p4} />
          <path id="kp5" d={PATHS.p5} />
          <path id="kp6" d={PATHS.p6} />
          <path id="kp7" d={PATHS.p7} />
          <path id="kp8" d={PATHS.p8} />
          <path id="kp9" d={PATHS.p9} />
        </defs>

        {/* ─── AMBIENT ORBS ───────────────────────────────────────── */}
        <ellipse cx="260"  cy="230" rx="440" ry="380" fill="url(#korb-a)" />
        <ellipse cx="1200" cy="155" rx="400" ry="320" fill="url(#korb-b)" />
        <ellipse cx="680"  cy="820" rx="360" ry="280" fill="url(#korb-a)" opacity="0.6" />

        {/* ─── CONNECTION BASE LINES ───────────────────────────────── */}
        <path d={PATHS.p1} fill="none" stroke="rgba(109,100,251,0.15)" strokeWidth="1.5" />
        <path d={PATHS.p2} fill="none" stroke="rgba(109,100,251,0.20)" strokeWidth="1.5" />
        <path d={PATHS.p3} fill="none" stroke="rgba(109,100,251,0.12)" strokeWidth="1.5" />
        <path d={PATHS.p4} fill="none" stroke="rgba(109,100,251,0.20)" strokeWidth="1.5" />
        <path d={PATHS.p5} fill="none" stroke="rgba(109,100,251,0.12)" strokeWidth="1.5" />
        <path d={PATHS.p6} fill="none" stroke="rgba(109,100,251,0.20)" strokeWidth="1.5" />
        <path d={PATHS.p7} fill="none" stroke="rgba(109,100,251,0.15)" strokeWidth="1.5" />
        <path d={PATHS.p8} fill="none" stroke="rgba(109,100,251,0.12)" strokeWidth="1.5" />
        <path d={PATHS.p9} fill="none" stroke="rgba(109,100,251,0.12)" strokeWidth="1.5" />

        {/* ─── ANIMATED DASH OVERLAY (marching flow) ──────────────── */}
        <path d={PATHS.p2} className="kfd"  fill="none" stroke="rgba(175,170,253,0.38)" strokeWidth="1.5" strokeLinecap="round" />
        <path d={PATHS.p4} className="kfd"  fill="none" stroke="rgba(175,170,253,0.38)" strokeWidth="1.5" strokeLinecap="round" />
        <path d={PATHS.p6} className="kfd2" fill="none" stroke="rgba(175,170,253,0.34)" strokeWidth="1.5" strokeLinecap="round" />
        <path d={PATHS.p1} className="kfd2" fill="none" stroke="rgba(175,170,253,0.28)" strokeWidth="1.5" strokeLinecap="round" />
        <path d={PATHS.p7} className="kfd"  fill="none" stroke="rgba(175,170,253,0.28)" strokeWidth="1.5" strokeLinecap="round" />

        {/* ─── HUB NODES (larger, glowing) ─────────────────────────
            H1 (200,180)  — top-left intake
            H2 (760,240)  — top-center router
            H3 (600,520)  — center core (Klyro engine)
            H4 (1160,400) — right delivery
            H5 (462,762)  — bottom-left confirmation
        ──────────────────────────────────────────────────────────── */}

        {/* H1 */}
        <circle cx="200" cy="180" r="13" fill="rgba(109,100,251,0.14)" className="khub" />
        <circle cx="200" cy="180" r="5"  fill="#6d64fb" opacity="0.82" filter="url(#khub-fx)" />
        <circle cx="200" cy="180" r="2.5" fill="#c4c1fe" />

        {/* H2 */}
        <circle cx="760" cy="240" r="16" fill="rgba(109,100,251,0.16)" className="khub" style={{ animationDelay: "0.9s" }} />
        <circle cx="760" cy="240" r="6"  fill="#6d64fb" opacity="0.88" filter="url(#khub-fx)" />
        <circle cx="760" cy="240" r="3"  fill="#c4c1fe" />

        {/* H3 — central hub, slightly larger */}
        <circle cx="600" cy="520" r="20" fill="rgba(109,100,251,0.18)" className="khub" style={{ animationDelay: "1.8s" }} />
        <circle cx="600" cy="520" r="7.5" fill="#6d64fb" opacity="0.92" filter="url(#khub-fx)" />
        <circle cx="600" cy="520" r="3.5" fill="#c4c1fe" />

        {/* H4 */}
        <circle cx="1160" cy="400" r="13" fill="rgba(109,100,251,0.14)" className="khub" style={{ animationDelay: "2.6s" }} />
        <circle cx="1160" cy="400" r="5"  fill="#6d64fb" opacity="0.82" filter="url(#khub-fx)" />
        <circle cx="1160" cy="400" r="2.5" fill="#c4c1fe" />

        {/* H5 */}
        <circle cx="462" cy="762" r="12" fill="rgba(109,100,251,0.12)" className="khub" style={{ animationDelay: "1.2s" }} />
        <circle cx="462" cy="762" r="4.5" fill="#6d64fb" opacity="0.78" filter="url(#khub-fx)" />
        <circle cx="462" cy="762" r="2"  fill="#c4c1fe" />

        {/* ─── ENDPOINT NODES (small client/business dots) ─────────── */}
        <circle cx="460"  cy="55"  r="3"   fill="rgba(175,170,253,0.45)" />
        <circle cx="1000" cy="88"  r="2.5" fill="rgba(175,170,253,0.32)" />
        <circle cx="1382" cy="158" r="2.5" fill="rgba(175,170,253,0.28)" />
        <circle cx="82"   cy="462" r="3"   fill="rgba(175,170,253,0.40)" />
        <circle cx="322"  cy="352" r="3"   fill="rgba(175,170,253,0.36)" />
        <circle cx="1382" cy="602" r="3"   fill="rgba(175,170,253,0.32)" />
        <circle cx="742"  cy="862" r="2.5" fill="rgba(175,170,253,0.28)" />

        {/* ─── PARTICLES (booking requests traveling the network) ───── */}
        {/* p2: H1 → H2 */}
        <circle className="kpart" r="3.5" fill="#afaafd" opacity="0.88" filter="url(#kpart-fx)">
          <animateMotion dur="3.2s" repeatCount="indefinite" begin="0s">
            <mpath href="#kp2" />
          </animateMotion>
        </circle>

        {/* p4: H2 → H3 */}
        <circle className="kpart" r="3" fill="#8a83fc" opacity="0.92" filter="url(#kpart-fx)">
          <animateMotion dur="2.8s" repeatCount="indefinite" begin="0.7s">
            <mpath href="#kp4" />
          </animateMotion>
        </circle>

        {/* p6: H3 → H4 */}
        <circle className="kpart" r="3.5" fill="#afaafd" opacity="0.85" filter="url(#kpart-fx)">
          <animateMotion dur="4s" repeatCount="indefinite" begin="0.3s">
            <mpath href="#kp6" />
          </animateMotion>
        </circle>

        {/* p1: E1 → H2 */}
        <circle className="kpart" r="2.5" fill="#6d64fb" opacity="0.95" filter="url(#kpart-fx)">
          <animateMotion dur="3s" repeatCount="indefinite" begin="1.6s">
            <mpath href="#kp1" />
          </animateMotion>
        </circle>

        {/* p7: H3 → H5 */}
        <circle className="kpart" r="3" fill="#afaafd" opacity="0.78" filter="url(#kpart-fx)">
          <animateMotion dur="3.6s" repeatCount="indefinite" begin="2.1s">
            <mpath href="#kp7" />
          </animateMotion>
        </circle>

        {/* p9: E4 → H3 */}
        <circle className="kpart" r="2.5" fill="#8a83fc" opacity="0.82" filter="url(#kpart-fx)">
          <animateMotion dur="4.4s" repeatCount="indefinite" begin="1.1s">
            <mpath href="#kp9" />
          </animateMotion>
        </circle>

        {/* p8: H4 → E7 */}
        <circle className="kpart" r="2.5" fill="#afaafd" opacity="0.75" filter="url(#kpart-fx)">
          <animateMotion dur="3.8s" repeatCount="indefinite" begin="2.8s">
            <mpath href="#kp8" />
          </animateMotion>
        </circle>

        {/* p5: E5 → H3 (slower, secondary flow) */}
        <circle className="kpart" r="2" fill="#6d64fb" opacity="0.7" filter="url(#kpart-fx)">
          <animateMotion dur="5s" repeatCount="indefinite" begin="0.5s">
            <mpath href="#kp5" />
          </animateMotion>
        </circle>

        {/* ─── OVERLAYS ────────────────────────────────────────────── */}
        {/* Edge vignette — keeps focus on center */}
        <rect width="1440" height="900" fill="url(#kvign)" />
        {/* Bottom fade — content merges into bg */}
        <rect width="1440" height="900" fill="url(#kfade)" />
      </svg>
    </div>
  );
}
