import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import TradeTogether from "@/components/landing/TradeTogether";
import CommunityStats from "@/components/landing/CommunityStats";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#050b15",
      }}
    >
      <Hero />
      <Features />
      <TradeTogether />
      <CommunityStats />
      <CTA />
      <Footer />
    </main>
  );
}