import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { CitiesSection } from "@/components/landing/CitiesSection";
import { EventsSection } from "@/components/landing/EventsSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { FaqSection } from "@/components/landing/FaqSection";
import { StatsSection } from "@/components/landing/StatsSection";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <StatsSection />
        <HowItWorks />
        <CitiesSection />
        <EventsSection />
        <TestimonialsSection />
        <FaqSection />
      </main>
      <Footer />
    </>
  );
}
