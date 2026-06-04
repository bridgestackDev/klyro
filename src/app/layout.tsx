import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { getLocale } from "next-intl/server";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { THEME_NO_FLASH_SCRIPT } from "@/components/shared/theme-no-flash";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Klyro — Agenda inteligente para tu negocio",
  description:
    "Klyro es una plataforma de agendamiento para negocios de citas. Tu negocio. Tus clientes. Tu marca.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="min-h-full antialiased">
        {/* Dashboard-scoped no-flash theme script — self-gates to dashboard
            paths; rendered here (stable root layout) so it never goes through a
            client render. See theme-no-flash.ts / ADR-040. */}
        <script
          dangerouslySetInnerHTML={{ __html: THEME_NO_FLASH_SCRIPT }}
          suppressHydrationWarning
        />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
