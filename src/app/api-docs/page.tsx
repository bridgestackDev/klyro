import { notFound } from "next/navigation";
import { SwaggerUi } from "./_components/SwaggerUi";

export const metadata = {
  title: "Klyro API Docs",
  robots: { index: false, follow: false },
};

export default function ApiDocsPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--color-bg-base)",
      }}
    >
      <SwaggerUi />
    </main>
  );
}
