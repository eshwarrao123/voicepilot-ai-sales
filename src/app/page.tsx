"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Phone,
  History,
  Settings,
  TrendingUp,
  Users,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  FileAudio,
} from "lucide-react";
import type { CallRecord, DbCallRecord, SalesOutcome } from "@/types";
import { SALES_OUTCOME_LABELS } from "@/types";
import {
  getSupabaseClient,
  isSupabaseConfigured,
  ensureAnonymousSession,
  getLastAuthError,
  dbRecordToCallRecord,
} from "@/lib/supabase/client";

const OUTCOME_STYLES: Record<
  SalesOutcome,
  { bg: string; color: string; border: string }
> = {
  converted: { bg: "#ecfdf5", color: "#065f46", border: "#a7f3d0" },
  interested: { bg: "#eff6ff", color: "#1e40af", border: "#bfdbfe" },
  demo_requested: { bg: "#f5f3ff", color: "#5b21b6", border: "#ddd6fe" },
  follow_up_required: { bg: "#fffbeb", color: "#92400e", border: "#fde68a" },
  not_interested: { bg: "#fef2f2", color: "#991b1b", border: "#fecaca" },
  no_response: { bg: "#f3f4f6", color: "#374151", border: "#e5e7eb" },
};

export default function OverviewPage() {
  const [records, setRecords] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(() => isSupabaseConfigured());
  const [error, setError] = useState<string | null>(null);
  const [unconfigured, setUnconfigured] = useState<boolean>(() => !isSupabaseConfigured());

  const fetchOverviewData = useCallback(async (opts?: { forceRetry?: boolean }) => {
    if (!isSupabaseConfigured()) {
      setUnconfigured(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setUnconfigured(false);

    try {
      const user = await ensureAnonymousSession({ forceRetry: opts?.forceRetry });
      if (!user) {
        const authErr = getLastAuthError();
        setError(
          authErr
            ? `Supabase authentication unavailable: ${authErr}`
            : "Unable to establish anonymous session."
        );
        setLoading(false);
        return;
      }

      const supabase = getSupabaseClient();
      if (!supabase) {
        setError("Supabase client unavailable.");
        setLoading(false);
        return;
      }

      const { data, error: queryError } = await supabase
        .from("call_records")
        .select("*")
        .order("created_at", { ascending: false });

      if (queryError) {
        throw new Error(queryError.message);
      }

      const mapped = ((data || []) as DbCallRecord[]).map(dbRecordToCallRecord);
      setRecords(mapped);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || "Failed to load dashboard metrics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    let isMounted = true;
    async function init() {
      try {
        const user = await ensureAnonymousSession();
        if (!isMounted) return;
        if (!user) {
          const authErr = getLastAuthError();
          setError(
            authErr
              ? `Supabase authentication unavailable: ${authErr}`
              : "Unable to establish anonymous session."
          );
          setLoading(false);
          return;
        }

        const supabase = getSupabaseClient();
        if (!supabase) {
          setError("Supabase client unavailable.");
          setLoading(false);
          return;
        }

        const { data, error: queryError } = await supabase
          .from("call_records")
          .select("*")
          .order("created_at", { ascending: false });

        if (!isMounted) return;
        if (queryError) {
          throw new Error(queryError.message);
        }

        const mapped = ((data || []) as DbCallRecord[]).map(dbRecordToCallRecord);
        setRecords(mapped);
      } catch (err: unknown) {
        if (!isMounted) return;
        const e = err as { message?: string };
        setError(e.message || "Failed to load dashboard metrics.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void init();
    return () => {
      isMounted = false;
    };
  }, []);

  // Derived metrics from actual persisted records
  const totalCalls = records.length;
  const convertedCalls = records.filter((r) => r.outcome === "converted").length;
  const conversionRate =
    totalCalls > 0 ? `${((convertedCalls / totalCalls) * 100).toFixed(1)}%` : "0.0%";
  const interestedLeads = records.filter(
    (r) => r.outcome === "interested" || r.outcome === "demo_requested"
  ).length;
  const followUpsNeeded = records.filter(
    (r) => r.outcome === "follow_up_required"
  ).length;

  const recentCalls = records.slice(0, 5);

  function formatDuration(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  }

  function formatDate(iso: string): string {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  }

  return (
    <div className="page-container">
      {/* Page header */}
      <header className="page-header">
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1 className="page-title">Overview</h1>
            <p className="page-description">
              Real-time sales intelligence and activity metrics derived from your completed calls.
            </p>
          </div>
          <button
            onClick={() => void fetchOverviewData({ forceRetry: true })}
            disabled={loading}
            className="btn btn-secondary btn-sm"
            aria-label="Refresh dashboard data"
          >
            <RefreshCw size={13} className={loading ? "spin" : ""} />
            Refresh
          </button>
        </div>
      </header>

      {/* Unconfigured Alert */}
      {unconfigured && (
        <div
          role="alert"
          style={{
            marginBottom: "1.5rem",
            padding: "1rem 1.25rem",
            background: "var(--surface-base)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            display: "flex",
            gap: "0.75rem",
            alignItems: "flex-start",
          }}
        >
          <AlertCircle size={18} style={{ color: "var(--ink-secondary)", flexShrink: 0, marginTop: "2px" }} />
          <div>
            <p style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: "var(--ink-primary)", margin: "0 0 0.25rem" }}>
              Supabase Not Configured
            </p>
            <p style={{ fontSize: "var(--font-size-xs)", color: "var(--ink-tertiary)", margin: 0, lineHeight: 1.5 }}>
              Dashboard metrics and persistent history require Supabase credentials. Configure{" "}
              <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> (or <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>) to enable live activity calculation.
            </p>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div
          role="alert"
          style={{
            marginBottom: "1.5rem",
            padding: "0.875rem 1rem",
            background: "var(--status-error-bg)",
            border: "1px solid var(--status-error-border)",
            borderRadius: "var(--radius-md)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <AlertCircle size={16} style={{ color: "var(--status-error-ink)" }} />
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--status-error-ink)" }}>{error}</span>
          </div>
          <button
            onClick={() => void fetchOverviewData({ forceRetry: true })}
            className="btn btn-secondary btn-sm"
            style={{ height: "26px", fontSize: "11px" }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Quick action banner */}
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
            Start a new sales conversation
          </h2>
          <p
            style={{
              fontSize: "var(--font-size-sm)",
              color: "var(--ink-tertiary)",
              margin: 0,
            }}
          >
            Launch the Live Call Studio to speak directly with prospects via Gemini Live.
          </p>
        </div>
        <Link href="/call" className="btn btn-primary btn-lg" id="start-call-cta">
          <Phone size={16} strokeWidth={2} />
          Open Live Call
        </Link>
      </div>

      {/* Metric cards */}
      <section aria-labelledby="metrics-heading" style={{ marginBottom: "2rem" }}>
        <h2 id="metrics-heading" className="section-title" style={{ marginBottom: "0.75rem" }}>
          Activity Metrics
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
            value={totalCalls}
            loading={loading}
          />
          <MetricCard
            label="Conversion Rate"
            icon={<TrendingUp size={16} />}
            value={conversionRate}
            loading={loading}
          />
          <MetricCard
            label="Interested Leads"
            icon={<Users size={16} />}
            value={interestedLeads}
            loading={loading}
          />
          <MetricCard
            label="Follow-ups Needed"
            icon={<CheckCircle2 size={16} />}
            value={followUpsNeeded}
            loading={loading}
          />
        </div>
        <p
          style={{
            marginTop: "0.75rem",
            fontSize: "var(--font-size-xs)",
            color: "var(--ink-disabled)",
          }}
        >
          Metrics are computed live from your private, RLS-protected database records.
        </p>
      </section>

      <div
        style={{
          height: "1px",
          background: "var(--border-subtle)",
          margin: "1.5rem 0",
        }}
      />

      {/* Recent calls */}
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
          <Link href="/history" className="btn btn-secondary btn-sm" id="view-all-calls">
            View all ({totalCalls})
            <ArrowRight size={12} strokeWidth={2} />
          </Link>
        </div>

        {recentCalls.length === 0 ? (
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
                  Start a conversation in Live Call Studio to see real records and metrics here.
                </p>
              </div>
              <Link href="/call" className="btn btn-primary" id="empty-start-call">
                <Phone size={14} strokeWidth={2} />
                Start a Call
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {recentCalls.map((call) => {
              const outcomeStyle = call.outcome ? OUTCOME_STYLES[call.outcome] : undefined;

              return (
                <Link
                  key={call.id}
                  href="/history"
                  className="card"
                  style={{
                    padding: "0.875rem 1.25rem",
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "1rem",
                    flexWrap: "wrap",
                    transition: "border-color 0.15s ease",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: "var(--ink-primary)" }}>
                        {call.customer.name || "Prospect"}
                      </span>
                      {call.customer.company && (
                        <span style={{ fontSize: "var(--font-size-xs)", color: "var(--ink-tertiary)" }}>
                          &bull; {call.customer.company}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "2px" }}>
                      <span style={{ fontSize: "11px", color: "var(--ink-tertiary)" }}>
                        {formatDate(call.createdAt || call.startedAt)}
                      </span>
                      <span style={{ fontSize: "11px", color: "var(--ink-tertiary)" }}>&bull;</span>
                      <span style={{ fontSize: "11px", color: "var(--ink-tertiary)" }}>
                        {formatDuration(call.durationSeconds)}
                      </span>
                      {call.productName && (
                        <>
                          <span style={{ fontSize: "11px", color: "var(--ink-tertiary)" }}>&bull;</span>
                          <span style={{ fontSize: "11px", color: "var(--ink-tertiary)" }}>
                            {call.productName}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    {call.recordingPath && (
                      <span
                        title="Recording stored in private bucket"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          fontSize: "11px",
                          color: "var(--accent-600)",
                        }}
                      >
                        <FileAudio size={12} />
                      </span>
                    )}
                    {call.outcome && outcomeStyle && (
                      <span
                        style={{
                          padding: "0.15rem 0.5rem",
                          borderRadius: "9999px",
                          fontSize: "11px",
                          fontWeight: 600,
                          background: outcomeStyle.bg,
                          color: outcomeStyle.color,
                          border: `1px solid ${outcomeStyle.border}`,
                        }}
                      >
                        {SALES_OUTCOME_LABELS[call.outcome]}
                      </span>
                    )}
                    <ArrowRight size={14} style={{ color: "var(--ink-tertiary)" }} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
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
        <h2 id="quick-access-heading" className="section-title" style={{ marginBottom: "0.75rem" }}>
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
            description="Review transcripts, private recordings, and outcomes."
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
  loading?: boolean;
}

function MetricCard({ label, icon, value, loading }: MetricCardProps) {
  return (
    <div className="card" style={{ padding: "1rem 1.25rem" }} aria-label={label}>
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
      {loading ? (
        <div
          style={{
            width: "2.5rem",
            height: "1.5rem",
            background: "var(--surface-base)",
            borderRadius: "var(--radius-sm)",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
          aria-label="Loading metric"
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
