import { SovereignDashboard } from "@/components/sovereign-dashboard";

export const metadata = {
  title: "GEO Rank — AI Search Visibility",
  description:
    "Measure brand visibility, citations, provider coverage, and Share of Voice across AI search results.",
};

export default function DemoPage() {
  return <SovereignDashboard demoMode />;
}
