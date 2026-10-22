import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Product Setup",
  description:
    "Configure FlowDesk product knowledge for the VoicePilot AI sales assistant.",
};

export default function SetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
