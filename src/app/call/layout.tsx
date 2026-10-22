import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Call",
  description:
    "AI voice sales assistant workspace — conduct and manage live sales calls.",
};

export default function CallLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
