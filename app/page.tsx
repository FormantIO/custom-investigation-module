"use client";

import dynamic from "next/dynamic";

const InvestigationModule = dynamic(
  () => import("@/components/InvestigationModule"),
  { ssr: false }
);

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950">
      <InvestigationModule />
    </main>
  );
}
