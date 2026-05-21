import Image from "next/image";

type LogoVariant = "mark" | "wordmark" | "lockup";
type LogoTheme = "dark" | "light";

interface LogoProps {
  variant?: LogoVariant;
  theme?: LogoTheme;
  className?: string;
}

function CatMark({ theme }: { theme: LogoTheme }) {
  const bodyFill = theme === "dark" ? "url(#grad-body)" : "#14143A";

  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="grad-body" x1="2" y1="2" x2="38" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#221F58" />
          <stop offset="100%" stopColor="#14143A" />
        </linearGradient>
      </defs>

      {/* Left ear */}
      <path d="M 6.5 13 L 10 1.5 L 18 11" fill="#6D64FB" />
      <path d="M 8.5 12.5 L 11 5.5 L 16 11" fill="#B8B0FE" opacity="0.45" />

      {/* Right ear */}
      <path d="M 22 11 L 30 1.5 L 33.5 13" fill="#6D64FB" />
      <path d="M 24 11 L 29 5.5 L 31.5 12.5" fill="#B8B0FE" opacity="0.45" />

      {/* Body */}
      <rect x="3" y="9" width="34" height="29" rx="10" fill={bodyFill} />

      {/* Checkmark */}
      <path
        d="M 12.5 23 L 18 28.5 L 27.5 17.5"
        stroke="white"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Wordmark placeholder — swap for dedicated wordmark asset when available.
function Wordmark({ theme }: { theme: LogoTheme }) {
  const lyroColor = theme === "dark" ? "#FFFFFF" : "#14143A";

  return (
    <svg
      width="72"
      height="32"
      viewBox="0 0 72 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="klyro"
    >
      <text
        x="0"
        y="24"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="28"
        fontWeight="800"
        letterSpacing="-0.02em"
        fill="#6D64FB"
      >
        k
      </text>
      <text
        x="18"
        y="24"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="28"
        fontWeight="800"
        letterSpacing="-0.02em"
        fill={lyroColor}
      >
        lyro
      </text>
    </svg>
  );
}

export function Logo({ variant = "lockup", theme = "dark", className }: LogoProps) {
  if (variant === "mark") {
    return (
      <span className={className} aria-label="Klyro">
        <CatMark theme={theme} />
      </span>
    );
  }

  if (variant === "wordmark") {
    return (
      <span className={className}>
        <Wordmark theme={theme} />
      </span>
    );
  }

  // lockup: production PNG asset
  return (
    <span
      className={`inline-flex items-center overflow-hidden ${className ?? ""}`}
      aria-label="Klyro"
    >
      <Image
        src="/klyro_logo_w.png"
        alt="Klyro"
        width={140}
        height={140}
        priority
 
      />
    </span>
  );
}

export default Logo;
