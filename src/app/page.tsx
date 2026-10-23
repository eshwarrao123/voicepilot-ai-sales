"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Phone,
  RefreshCw,
  AlertCircle,
  FileAudio,
  ArrowRight,
  TrendingUp,
  Users,
  CheckCircle2,
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
  { bg: string; text: string; border: string }
> = {
  converted:          { bg: "#f0fdf4", text: "#166534", border: "#bbf7d0" },
  interested:         { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  demo_requested:     { bg: "#f5f3ff", text: "#6d28d9", border: "#ddd6fe" },
  follow_up_required: { bg: "#fffbeb", text: "#92400e", border: "#fde68a" },
  not_interested:     { bg: "#fef2f2", text: "#991b1b", border: "#fecaca" },
  no_response:        { bg: "#f9f9f8", text: "#52524e", border: "#e5e5e3" },
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
            ? `Authentication unavailable: ${authErr}`
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

      if (queryError) throw new Error(queryError.message);

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
              ? `Authentication unavailable: ${authErr}`
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
        if (queryError) throw new Error(queryError.message);

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
    return () => { isMounted = false; };
  }, []);

  // Derived metrics
  const totalCalls       = records.length;
  const convertedCalls   = records.filter((r) => r.outcome === "converted").length;
  const conversionRate   = totalCalls > 0 ? `${((convertedCalls / totalCalls) * 100).toFixed(1)}%` : "—";
  const interestedLeads  = records.filter((r) => r.outcome === "interested" || r.outcome === "demo_requested").length;
  const followUpsNeeded  = records.filter((r) => r.outcome === "follow_up_required").length;
  const recentCalls      = records.slice(0, 5);

  function formatDuration(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  }

  function formatDate(iso: string): string {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch { return iso; }
  }

  return (
    <div className="page-container">
      {/* ─── Page header ────────────────────────────────────────────────── */}
      <header className="page-header">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <h1 className="page-title">Overview</h1>
            <p className="page-description">
              Sales activity and real-time intelligence from completed conversations
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <button
              onClick={() => void fetchOverviewData({ forceRetry: true })}
              disabled={loading}
              className="btn btn-secondary btn-sm"
              aria-label="Refresh dashboard data"
            >
              <RefreshCw size={13} className={loading ? "spin" : ""} />
              Refresh
            </button>
            <Link href="/call" className="btn btn-primary" id="start-call-cta">
              <Phone size={14} strokeWidth={2} />
              Open Call Studio
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Alerts ─────────────────────────────────────────────────────── */}
      {unconfigured && (
        <div className="alert alert-info" style={{ marginBottom: "1.5rem" }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "1px" }} />
          <div>
            <p style={{ fontWeight: 600, margin: "0 0 0.25rem", fontSize: "var(--font-size-sm)", color: "var(--ink-primary)" }}>
              Supabase Not Configured
            </p>
            <p style={{ margin: 0, fontSize: "var(--font-size-xs)", color: "var(--ink-secondary)" }}>
              Dashboard metrics require Supabase credentials. Set{" "}
              <code style={{ padding: "0.125rem 0.25rem", background: "var(--surface-sunken)", borderRadius: "3px", fontSize: "11px" }}>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
              <code style={{ padding: "0.125rem 0.25rem", background: "var(--surface-sunken)", borderRadius: "3px", fontSize: "11px" }}>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> to enable persistent call storage.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-error" style={{ marginBottom: "1.5rem", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: "var(--font-size-sm)" }}>{error}</span>
          </div>
          <button
            onClick={() => void fetchOverviewData({ forceRetry: true })}
            className="btn btn-secondary btn-sm"
            style={{ flexShrink: 0 }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ─── Metric strip ────────────────────────────────────────────────── */}
      <section aria-labelledby="metrics-heading" style={{ marginBottom: "2rem" }}>
        <h2 id="metrics-heading" className="section-title" style={{ marginBottom: "0.75rem" }}>
          Activity Metrics
        </h2>
        <div
          className="metrics-grid"
          style={{
            display: "grid",
            gap: "1px",
            background: "var(--border-subtle)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
          }}
        >
          <MetricCell
            label="Total Calls"
            icon={<Phone size={14} />}
            value={loading ? null : totalCalls}
          />
          <MetricCell
            label="Conversion Rate"
            icon={<TrendingUp size={14} />}
            value={loading ? null : conversionRate}
          />
          <MetricCell
            label="Interested Leads"
            icon={<Users size={14} />}
            value={loading ? null : interestedLeads}
          />
          <MetricCell
            label="Follow-ups Needed"
            icon={<CheckCircle2 size={14} />}
            value={loading ? null : followUpsNeeded}
          />
        </div>
      </section>

      {/* ─── Recent calls ────────────────────────────────────────────────── */}
      <section aria-labelledby="recent-heading" style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem", gap: "0.5rem", flexWrap: "wrap" }}>
          <h2 id="recent-heading" className="section-title">Recent Calls</h2>
          <Link href="/history" className="btn btn-secondary btn-sm" id="view-all-calls">
            View all {totalCalls > 0 && `(${totalCalls})`}
            <ArrowRight size={12} strokeWidth={2} />
          </Link>
        </div>

        {recentCalls.length === 0 ? (
          <div className="card" style={{ padding: "2.5rem 1.5rem" }}>
            <div className="empty-state">
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "var(--radius-lg)",
                  background: "var(--surface-sunken)",
                  border: "1px solid var(--border-subtle)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "0.5rem",
                }}
              >
                <Phone size={22} style={{ color: "var(--ink-disabled)" }} aria-hidden="true" />
              </div>
              <div>
                <p style={{ fontWeight: 600, color: "var(--ink-primary)", fontSize: "var(--font-size-sm)", marginBottom: "0.25rem" }}>
                  No calls recorded yet
                </p>
                <p style={{ fontSize: "var(--font-size-sm)", color: "var(--ink-tertiary)", margin: "0 0 1rem" }}>
                  Start a conversation to see real call records and metrics here.
                </p>
              </div>
              <Link href="/call" className="btn btn-primary" id="empty-start-call">
                <Phone size={13} strokeWidth={2} />
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
                  className="call-row"
                  style={{
                    padding: "0.875rem 1rem",
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "1rem",
                    flexWrap: "wrap",
                  }}
                  aria-label={`Call with ${call.customer.name || "Prospect"}`}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0, flex: 1 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "2px" }}>
                        <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: "var(--ink-primary)" }}>
                          {call.customer.name || "Prospect"}
                        </span>
                        {call.customer.company && (
                          <>
                            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--ink-disabled)" }}>·</span>
                            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--ink-tertiary)" }}>
                              {call.customer.company}
                            </span>
                          </>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "var(--font-size-xs)", color: "var(--ink-tertiary)" }}>
                        <span>{formatDate(call.createdAt || call.startedAt)}</span>
                        <span style={{ color: "var(--ink-disabled)" }}>·</span>
                        <span>{formatDuration(call.durationSeconds)}</span>
                        {call.productName && (
                          <>
                            <span style={{ color: "var(--ink-disabled)" }}>·</span>
                            <span>{call.productName}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                    {call.recordingPath && (
                      <span title="Recording available">
                        <FileAudio size={13} style={{ color: "var(--accent-primary)" }} aria-label="Recording available" />
                      </span>
                    )}
                    {call.outcome && outcomeStyle && (
                      <span
                        style={{
                          padding: "0.125rem 0.5rem",
                          borderRadius: "9999px",
                          fontSize: "11px",
                          fontWeight: 600,
                          background: outcomeStyle.bg,
                          color: outcomeStyle.text,
                          border: `1px solid ${outcomeStyle.border}`,
                        }}
                      >
                        {SALES_OUTCOME_LABELS[call.outcome]}
                      </span>
                    )}
                    <ArrowRight size={14} style={{ color: "var(--ink-disabled)" }} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface MetricCellProps {
  label: string;
  icon: React.ReactNode;
  value?: string | number | null;
}

function MetricCell({ label, icon, value }: MetricCellProps) {
  const isLoading = value === null;
  return (
    <div
      style={{
        background: "var(--surface-raised)",
        padding: "1rem 1.125rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
      }}
      aria-label={label}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
        <span style={{ color: "var(--ink-tertiary)", display: "flex" }}>{icon}</span>
        <span className="label" style={{ fontSize: "var(--font-size-xs)", color: "var(--ink-secondary)" }}>
          {label}
        </span>
      </div>
      {isLoading ? (
        <div className="skeleton" style={{ width: "3rem", height: "1.75rem" }} aria-label="Loading metric" />
      ) : (
        <div
          style={{
            fontSize: "var(--font-size-3xl)",
            fontWeight: 700,
            color: "var(--ink-primary)",
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </div>
      )}
    </div>
  );
}
