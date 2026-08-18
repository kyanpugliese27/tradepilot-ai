import "./globals.css";
import type { Metadata } from "next";
import PremiumCopilotGate from "@/components/PremiumCopilotGate";
import AchievementToastProvider from "@/components/AchievementToastProvider";

export const metadata: Metadata = {
  title: "Norvexa",
  description:
    "AI-powered investing research and education.",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}

        <PremiumCopilotGate />

        <AchievementToastProvider />
      </body>
    </html>
  );
}