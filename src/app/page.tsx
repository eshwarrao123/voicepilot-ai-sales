import type { Metadata } from "next";
import Link from "next/link";
import { Phone, History, Settings, TrendingUp, Users, CheckCircle2, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Overview",
  description: "VoicePilot sales dashboard — overview of your AI-assisted call activity.",
};

export default function OverviewPage() {
  return (
    <div className="page-container">
      {/* Page header */}
      <header className="page-header">
        <h1 className="page-title">Overview</h1>
        <p className="page-description">
          Your AI-assisted sales activity, at a glance.
        </p>
      </header>

      {/* Quick action */}
      <div
        style={{
          marginBottom: "2rem",
          padding: "1.25rem 1.5rem",
          background: "var(--accent-50)",
          border: "1px solid var(--accent-200)",
          borderRadius: "var(--radius-xl)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: "var(--font-size-base)",
              fontWeight: 600,
              color: "var(--ink-primary)",
              marginBottom: "0.25rem",
            }}
          >
            Start a new call
          </h2>
          <p
            style={{
              fontSize: "var(--font-size-sm)",
              color: "var(--ink-tertiary)",
              margin: 0,
            }}
          >
            Connect with a prospect using the AI voice assistant.
          </p>
        </div>
        <Link href="/call" className="btn btn-primary btn-lg" id="start-call-cta">
          <Phone size={16} strokeWidth={2} />
          Open Live Call
        </Link>
      </div>

      {/* Metric cards — empty state */}
      <section aria-labelledby="metrics-heading" style={{ marginBottom: "2rem" }}>
        <h2
          id="metrics-heading"
          className="section-title"
          style={{ marginBottom: "0.75rem" }}
        >
          Activity
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: "0.75rem",
          }}
        >
          <MetricCard
            label="Total Calls"
            icon={<Phone size={16} />}
            empty
          />
          <MetricCard
            label="Conversion Rate"
            icon={<TrendingUp size={16} />}
            empty
          />
          <MetricCard
            label="Interested Leads"
            icon={<Users size={16} />}
            empty
          />
          <MetricCard
            label="Follow-ups Needed"
            icon={<CheckCircle2 size={16} />}
            empty
          />
        </div>
        <p
          style={{
            marginTop: "0.75rem",
            fontSize: "var(--font-size-xs)",
            color: "var(--ink-disabled)",
          }}
        >
          Metrics will appear after you complete your first call.
        </p>
      </section>

      <div
        style={{
          height: "1px",
          background: "var(--border-subtle)",
          margin: "1.5rem 0",
        }}
      />

      {/* Recent calls — empty state */}
      <section aria-labelledby="recent-heading" style={{ marginBottom: "2rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "0.75rem",
            gap: "0.5rem",
            flexWrap: "wrap",
          }}
        >
          <h2 id="recent-heading" className="section-title">
            Recent Calls
          </h2>
          <Link
            href="/history"
            className="btn btn-secondary btn-sm"
            id="view-all-calls"
          >
            View all
            <ArrowRight size={12} strokeWidth={2} />
          </Link>
        </div>

        <div className="card">
          <div className="empty-state">
            <History size={36} className="empty-state-icon" aria-hidden="true" />
            <div>
              <p
                style={{
                  fontWeight: 600,
                  color: "var(--ink-primary)",
                  fontSize: "var(--font-size-sm)",
                  marginBottom: "0.25rem",
                }}
              >
                No calls yet
              </p>
              <p
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--ink-tertiary)",
                  margin: 0,
                }}
              >
                Start a conversation to see it recorded here.
              </p>
            </div>
            <Link href="/call" className="btn btn-primary" id="empty-start-call">
              <Phone size={14} strokeWidth={2} />
              Start a Call
            </Link>
          </div>
        </div>
      </section>

      <div
        style={{
          height: "1px",
          background: "var(--border-subtle)",
          margin: "1.5rem 0",
        }}
      />

      {/* Quick-access cards */}
      <section aria-labelledby="quick-access-heading">
        <h2
          id="quick-access-heading"
          className="section-title"
          style={{ marginBottom: "0.75rem" }}
        >
          Quick Access
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: "0.75rem",
          }}
        >
          <QuickLink
            href="/call"
            icon={<Phone size={18} strokeWidth={1.8} />}
            label="Live Call"
            description="Start or manage an active AI sales call."
            id="quick-live-call"
          />
          <QuickLink
            href="/history"
            icon={<History size={18} strokeWidth={1.8} />}
            label="Call History"
            description="Review transcripts, summaries, and outcomes."
            id="quick-history"
          />
          <QuickLink
            href="/setup"
            icon={<Settings size={18} strokeWidth={1.8} />}
            label="Product Setup"
            description="Configure the FlowDesk product knowledge for the AI."
            id="quick-setup"
          />
        </div>
      </section>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  icon: React.ReactNode;
  value?: string | number;
  empty?: boolean;
}

function MetricCard({ label, icon, value, empty }: MetricCardProps) {
  return (
    <div
      className="card"
      style={{ padding: "1rem 1.25rem" }}
      aria-label={label}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: "0.75rem",
          color: "var(--ink-tertiary)",
        }}
      >
        {icon}
        <span className="label">{label}</span>
      </div>
      {empty ? (
        <div
          style={{
            width: "2.5rem",
            height: "2px",
            background: "var(--border-subtle)",
            borderRadius: "1px",
          }}
          aria-label="No data"
        />
      ) : (
        <div className="stat-value">{value}</div>
      )}
    </div>
  );
}

interface QuickLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  id: string;
}

function QuickLink({ href, icon, label, description, id }: QuickLinkProps) {
  return (
    <Link
      href={href}
      id={id}
      className="card quick-link"
      style={{ textDecoration: "none", display: "block" }}
    >
      <div
        style={{
          padding: "1rem 1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}
      >
        <div style={{ color: "var(--accent-600)" }}>{icon}</div>
        <div>
          <div
            style={{
              fontSize: "var(--font-size-sm)",
              fontWeight: 600,
              color: "var(--ink-primary)",
              marginBottom: "0.2rem",
            }}
          >
            {label}
          </div>
          <div
            style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--ink-tertiary)",
              lineHeight: 1.45,
            }}
          >
            {description}
          </div>
        </div>
      </div>
    </Link>
  );
}
