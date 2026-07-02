import type { Metadata } from "next";
import Nav from "@/components/home/Nav";
import Hero from "@/components/home/Hero";
import StatStrip from "@/components/home/StatStrip";
import HowItWorks from "@/components/home/HowItWorks";
import CaseExplorer from "@/components/home/CaseExplorer";
import ProductRow from "@/components/home/ProductRow";
import DemoVideos from "@/components/home/DemoVideos";
import Pricing from "@/components/home/Pricing";
import Footer from "@/components/home/Footer";

export const metadata: Metadata = {
  title: "Penny — the controller who watches all 2,000 stores · Team t32",
  description:
    "Penny is a continuous finance & controls agent for McContext: six controller duties, every store, every day. Deterministic math, innocent-explanation-first investigation, and evidence attached to every verdict. By team t32 for the Atlan AI Hackathon 2026.",
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#070707] text-white">
      <Nav />
      <main>
        <Hero />
        <StatStrip />
        <HowItWorks />
        <CaseExplorer />
        <ProductRow />
        <DemoVideos />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
}
