"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Phone,
  History,
  Settings,
  Menu,
  X,
  Zap,
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="app-shell">
      {/* ─── Desktop Sidebar ─────────────────────────────────────────────── */}
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
                background: "var(--accent-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Phone size={14} color="#fff" strokeWidth={2.5} />
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
                  fontSize: "10px",
                  color: "var(--ink-tertiary)",
                  fontWeight: 500,
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
            padding: "0.75rem 0.5rem",
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
                <span style={{ flex: 1 }}>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Status footer */}
        <div
          style={{
            padding: "0.875rem 1rem",
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.5rem",
              padding: "0.5rem 0.625rem",
              borderRadius: "var(--radius-md)",
              background: "var(--call-live-bg)",
              border: "1px solid var(--status-success-border)",
            }}
          >
            <span className="live-dot" aria-hidden="true" />
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "var(--call-live)",
              }}
            >
              Voice Engine Ready
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
            }}
          >
            <Zap size={11} style={{ color: "var(--ink-disabled)" }} />
            <p
              style={{
                fontSize: "10px",
                color: "var(--ink-disabled)",
                lineHeight: 1.4,
                margin: 0,
                fontWeight: 500,
              }}
            >
              Gemini Live · Supabase RLS
            </p>
          </div>
        </div>
      </nav>

      {/* ─── Mobile Header ───────────────────────────────────────────────── */}
      <div
        className="mobile-header"
        style={{
          display: "none",
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: "var(--surface-raised)",
          borderBottom: "1px solid var(--border-subtle)",
          padding: "0.875rem 1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div
              aria-hidden="true"
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "5px",
                background: "var(--accent-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Phone size={12} color="#fff" strokeWidth={2.5} />
            </div>
            <span
              style={{
                fontSize: "var(--font-size-sm)",
                fontWeight: 700,
                color: "var(--ink-primary)",
              }}
            >
              {APP_NAME}
            </span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="btn btn-ghost btn-sm"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            style={{ padding: "0.375rem" }}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* ─── Mobile Menu Drawer ──────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <>
          <div
            className="mobile-menu-overlay"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              display: "none",
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.3)",
              zIndex: 50,
            }}
          />
          <div
            className="mobile-menu-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            style={{
              display: "none",
              position: "fixed",
              top: 0,
              left: 0,
              bottom: 0,
              width: "280px",
              background: "var(--surface-raised)",
              zIndex: 60,
              overflowY: "auto",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <div style={{ padding: "1.25rem 1rem", borderBottom: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div
                  aria-hidden="true"
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "6px",
                    background: "var(--accent-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Phone size={14} color="#fff" strokeWidth={2.5} />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "var(--font-size-sm)",
                      fontWeight: 700,
                      color: "var(--ink-primary)",
                    }}
                  >
                    {APP_NAME}
                  </div>
                  <div
                    style={{
                      fontSize: "10px",
                      color: "var(--ink-tertiary)",
                      fontWeight: 500,
                    }}
                  >
                    {APP_TAGLINE}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: "0.75rem 0.5rem" }}>
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
                    onClick={() => setMobileMenuOpen(false)}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            <div
              style={{
                padding: "0.875rem 1rem",
                borderTop: "1px solid var(--border-subtle)",
                marginTop: "auto",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem 0.625rem",
                  borderRadius: "var(--radius-md)",
                  background: "var(--call-live-bg)",
                  border: "1px solid var(--status-success-border)",
                }}
              >
                <span className="live-dot" aria-hidden="true" />
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "var(--call-live)",
                  }}
                >
                  Voice Engine Ready
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── Main content ─────────────────────────────────────────────────── */}
      <main className="main-content" id="main-content">
        {children}
      </main>

      <style jsx>{`
        @media (max-width: 768px) {
          .sidebar {
            display: none !important;
          }
          .mobile-header {
            display: block !important;
          }
          .mobile-menu-overlay {
            display: block !important;
          }
          .mobile-menu-drawer {
            display: flex !important;
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
