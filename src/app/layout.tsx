import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | VoicePilot",
    default: "VoicePilot — AI Sales Studio",
  },
  description:
    "VoicePilot is an AI-powered voice sales assistant that conducts real conversations, captures live transcripts, and classifies sales outcomes.",
  keywords: ["AI sales", "voice assistant", "sales automation", "Gemini Live"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full`} data-theme="dark">
      <body className="h-full antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
