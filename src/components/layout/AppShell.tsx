"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Phone,
  History,
  Settings,
  Mic,
} from "lucide-react";
import { APP_NAME, APP_TAGLINE, NAV_ITEMS } from "@/lib/constants";

const ICON_MAP = {
  LayoutDashboard,
  Phone,
  History,
  Settings,
} as const;

type IconName = keyof typeof ICON_MAP;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      {/* ─── Sidebar ─────────────────────────────────────────────────────── */}
      <nav className="sidebar" aria-label="Primary navigation">
        {/* Brand */}
        <div
          style={{
            padding: "1.25rem 1rem",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div
              aria-hidden="true"
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "6px",
                background: "var(--accent-600)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Mic size={15} color="#fff" strokeWidth={2.2} />
            </div>
            <div>
              <div
                style={{
                  fontSize: "var(--font-size-sm)",
                  fontWeight: 700,
                  color: "var(--ink-primary)",
                  letterSpacing: "-0.01em",
                  lineHeight: 1.2,
                }}
              >
                {APP_NAME}
              </div>
              <div
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--ink-tertiary)",
                  fontWeight: 400,
                  marginTop: "1px",
                }}
              >
                {APP_TAGLINE}
              </div>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <div
          style={{
            padding: "0.75rem 0.75rem",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            flex: 1,
          }}
        >
          {NAV_ITEMS.map((item) => {
            const Icon = ICON_MAP[item.icon as IconName];
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link${isActive ? " active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Footer note */}
        <div
          style={{
            padding: "0.75rem 1rem",
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          <p
            style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--ink-disabled)",
              lineHeight: 1.4,
            }}
          >
            Phase 1 — Interface only.
            <br />
            Voice &amp; AI integration in Phase 2.
          </p>
        </div>
      </nav>

      {/* ─── Main content ─────────────────────────────────────────────────── */}
      <main className="main-content" id="main-content">
        {children}
      </main>
    </div>
  );
}
