import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { CTASection } from "@/components/landing/CTASection";
import { Footer } from "@/components/landing/Footer";

export default function HomePage() {
  return (
    <main>
      <Hero />
      <Features />
      <CTASection />
      <Footer />
    </main>
  );
}
