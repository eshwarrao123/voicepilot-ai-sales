"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Phone,
  Clock,
  User,
  FileAudio,
  Volume2,
  Download,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Sparkles,
  XCircle,
  Play,
  RotateCcw,
} from "lucide-react";
import type { CallRecord, DbCallRecord, SalesOutcome, AnalysisStatus } from "@/types";
import { SALES_OUTCOME_LABELS } from "@/types";
import {
  getSupabaseClient,
  isSupabaseConfigured,
  ensureAnonymousSession,
  getSignedRecordingUrl,
  dbRecordToCallRecord,
} from "@/lib/supabase/client";
import { retryCallAnalysis } from "@/lib/calls/persistence";

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

const STATUS_BADGES: Record<
  AnalysisStatus,
  { label: string; bg: string; color: string }
> = {
  complete: { label: "Analyzed", bg: "#f0fdf4", color: "#15803d" },
  pending: { label: "Pending", bg: "#fffbeb", color: "#b45309" },
  failed: { label: "Analysis Failed", bg: "#fef2f2", color: "#b91c1c" },
};

type DateFilter = "all" | "today" | "week" | "month";
type OutcomeFilter = "all" | SalesOutcome;

export default function HistoryPage() {
  const [records, setRecords] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(() => isSupabaseConfigured());
  const [error, setError] = useState<string | null>(null);
  const [unconfigured, setUnconfigured] = useState<boolean>(() => !isSupabaseConfigured());
  const [filterTimestamp, setFilterTimestamp] = useState<number>(0);

  // Filters
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>("all");

  // Expanded call record ID
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Signed recording URLs cache { [recordId]: signedUrl }
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);

  // In-flight retry tracking
  const [retryingId, setRetryingId] = useState<string | null>(null);

  // Manual refresh handler
  const fetchRecords = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setUnconfigured(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setUnconfigured(false);

    try {
      const user = await ensureAnonymousSession();
      if (!user) {
        setError("Could not establish an anonymous session with Supabase.");
        setLoading(false);
        return;
      }

      const supabase = getSupabaseClient();
      if (!supabase) {
        setError("Supabase client is not available.");
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
      setError(e.message || "Failed to load call history.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load effect avoiding synchronous setState
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    let isMounted = true;
    async function init() {
      try {
        const user = await ensureAnonymousSession();
        if (!isMounted) return;
        if (!user) {
          setError("Could not establish an anonymous session with Supabase.");
          setLoading(false);
          return;
        }

        const supabase = getSupabaseClient();
        if (!supabase) {
          setError("Supabase client is not available.");
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
        setError(e.message || "Failed to load call history.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void init();
    return () => {
      isMounted = false;
    };
  }, []);

  // Request signed recording URL on demand when user plays/expands a record
  const loadSignedAudio = useCallback(
    async (recordId: string, path?: string) => {
      if (!path || signedUrls[recordId]) return;

      setLoadingAudioId(recordId);
      const url = await getSignedRecordingUrl(path, 3600);
      setLoadingAudioId(null);

      if (url) {
        setSignedUrls((prev) => ({ ...prev, [recordId]: url }));
      }
    },
    [signedUrls]
  );

  const toggleExpand = useCallback(
    (record: CallRecord) => {
      if (expandedId === record.id) {
        setExpandedId(null);
      } else {
        setExpandedId(record.id);
        if (record.recordingPath && !signedUrls[record.id]) {
          void loadSignedAudio(record.id, record.recordingPath);
        }
      }
    },
    [expandedId, signedUrls, loadSignedAudio]
  );

  // Retry post-call analysis for a record
  const handleRetryAnalysis = useCallback(
    async (record: CallRecord) => {
      setRetryingId(record.id);
      try {
        const res = await retryCallAnalysis(record);
        if (res.success && res.record) {
          setRecords((prev) =>
            prev.map((r) => (r.id === record.id ? res.record! : r))
          );
        } else {
          alert(`Analysis retry failed: ${res.error || "Unknown error"}`);
        }
      } catch (err: unknown) {
        const e = err as { message?: string };
        alert(`Analysis retry exception: ${e.message || "Failed to retry analysis"}`);
      } finally {
        setRetryingId(null);
      }
    },
    []
  );

  const handleDateFilterChange = (val: DateFilter) => {
    setDateFilter(val);
    setFilterTimestamp(Date.now());
  };

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Date filter
      if (dateFilter !== "all" && filterTimestamp > 0) {
        const recordTime = new Date(r.createdAt || r.startedAt).getTime();
        const diffMs = filterTimestamp - recordTime;
        if (dateFilter === "today" && diffMs > 24 * 60 * 60 * 1000) return false;
        if (dateFilter === "week" && diffMs > 7 * 24 * 60 * 60 * 1000) return false;
        if (dateFilter === "month" && diffMs > 30 * 24 * 60 * 60 * 1000) return false;
      }

      // Outcome filter
      if (outcomeFilter !== "all") {
        if (r.outcome !== outcomeFilter) return false;
      }

      return true;
    });
  }, [records, dateFilter, outcomeFilter, filterTimestamp]);

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
        year: "numeric",
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
            <h1 className="page-title">Call History</h1>
            <p className="page-description">
              Transcripts, private audio recordings, summaries, and outcomes from completed AI sales calls.
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => void fetchRecords()}
              disabled={loading}
              className="btn btn-secondary btn-sm"
              aria-label="Refresh call records"
            >
              <RefreshCw size={13} className={loading ? "spin" : ""} />
              Refresh
            </button>
            <Link href="/call" className="btn btn-primary btn-sm" id="history-new-call">
              <Phone size={13} strokeWidth={2} />
              New Call
            </Link>
          </div>
        </div>
      </header>

      {/* Unconfigured Notice */}
      {unconfigured && (
        <div
          role="alert"
          style={{
            marginBottom: "1.25rem",
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
              Supabase Configuration Required
            </p>
            <p style={{ fontSize: "var(--font-size-xs)", color: "var(--ink-tertiary)", margin: "0 0 0.5rem", lineHeight: 1.5 }}>
              Persistent call storage and private audio recordings require Supabase. Please configure{" "}
              <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in your environment and run the SQL migration located in <code>supabase/migrations/</code>.
            </p>
            <Link href="/call" className="btn btn-secondary btn-sm">
              Try Local Call in Studio →
            </Link>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div
          role="alert"
          style={{
            marginBottom: "1.25rem",
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
            <XCircle size={16} style={{ color: "var(--status-error-ink)" }} />
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--status-error-ink)" }}>{error}</span>
          </div>
          <button onClick={() => void fetchRecords()} className="btn btn-secondary btn-sm" style={{ height: "26px", fontSize: "11px" }}>
            Retry
          </button>
        </div>
      )}

      {/* Real Filter Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          marginBottom: "1.25rem",
          flexWrap: "wrap",
        }}
      >
        {/* Date Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
          <Clock size={13} style={{ color: "var(--ink-tertiary)" }} aria-hidden="true" />
          <select
            id="history-date-filter"
            value={dateFilter}
            onChange={(e) => handleDateFilterChange(e.target.value as DateFilter)}
            className="input"
            style={{ width: "auto", height: "32px", fontSize: "var(--font-size-xs)", padding: "0 0.625rem" }}
            aria-label="Filter calls by date"
          >
            <option value="all">All time</option>
            <option value="today">Today</option>
            <option value="week">Past 7 days</option>
            <option value="month">Past 30 days</option>
          </select>
        </div>

        {/* Outcome Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
          <User size={13} style={{ color: "var(--ink-tertiary)" }} aria-hidden="true" />
          <select
            id="history-outcome-filter"
            value={outcomeFilter}
            onChange={(e) => setOutcomeFilter(e.target.value as OutcomeFilter)}
            className="input"
            style={{ width: "auto", height: "32px", fontSize: "var(--font-size-xs)", padding: "0 0.625rem" }}
            aria-label="Filter calls by outcome"
          >
            <option value="all">All outcomes</option>
            <option value="converted">Converted</option>
            <option value="interested">Interested</option>
            <option value="demo_requested">Demo Requested</option>
            <option value="follow_up_required">Follow-up Required</option>
            <option value="not_interested">Not Interested</option>
            <option value="no_response">No Response</option>
          </select>
        </div>

        <span style={{ fontSize: "var(--font-size-xs)", color: "var(--ink-tertiary)", marginLeft: "auto" }}>
          Showing {filteredRecords.length} {filteredRecords.length === 1 ? "call" : "calls"}
        </span>
      </div>

      {/* Loading State */}
      {loading && records.length === 0 && (
        <div className="card" style={{ padding: "3rem 1rem", textAlign: "center" }}>
          <RefreshCw size={24} className="spin" style={{ color: "var(--accent-600)", margin: "0 auto 0.75rem" }} />
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--ink-secondary)", fontWeight: 500, margin: 0 }}>
            Loading persistent call history…
          </p>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredRecords.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "var(--radius-xl)",
                background: "var(--surface-base)",
                border: "1px solid var(--border-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              aria-hidden="true"
            >
              <Phone size={22} style={{ color: "var(--ink-disabled)" }} />
            </div>
            <div>
              <p
                style={{
                  fontWeight: 600,
                  color: "var(--ink-primary)",
                  fontSize: "var(--font-size-sm)",
                  marginBottom: "0.375rem",
                }}
              >
                {records.length > 0 ? "No calls match current filters" : "No calls on record"}
              </p>
              <p
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--ink-tertiary)",
                  margin: "0 0 0.125rem",
                  maxWidth: "320px",
                }}
              >
                {records.length > 0
                  ? "Try resetting the date or outcome filters above."
                  : "Start a call in the Live Call Studio. Completed conversations will automatically be stored here."}
              </p>
            </div>
            {records.length === 0 && (
              <Link href="/call" className="btn btn-primary" id="empty-history-new-call">
                <Phone size={14} strokeWidth={2} />
                Start Your First Call
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Populated Call Records List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {filteredRecords.map((record) => {
          const isExpanded = expandedId === record.id;
          const outcomeStyle = record.outcome ? OUTCOME_STYLES[record.outcome] : undefined;
          const statusBadge = record.analysisStatus ? STATUS_BADGES[record.analysisStatus] : undefined;
          const signedUrl = signedUrls[record.id];
          const hasRecording = Boolean(record.recordingPath);

          return (
            <div
              key={record.id}
              className="card"
              style={{
                padding: "1.125rem 1.25rem",
                transition: "border-color 0.15s ease",
                border: isExpanded ? "1px solid var(--accent-300)" : undefined,
              }}
            >
              {/* Main Summary Row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "1rem",
                  flexWrap: "wrap",
                  cursor: "pointer",
                }}
                onClick={() => toggleExpand(record)}
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleExpand(record);
                  }
                }}
              >
                {/* Left: Customer & Meta */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      background: "var(--surface-base)",
                      border: "1px solid var(--border-subtle)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--accent-600)",
                      flexShrink: 0,
                    }}
                  >
                    <User size={16} />
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: "var(--ink-primary)" }}>
                        {record.customer.name || "Prospect"}
                      </span>
                      {record.customer.company && (
                        <span style={{ fontSize: "var(--font-size-xs)", color: "var(--ink-tertiary)" }}>
                          &bull; {record.customer.company}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginTop: "2px" }}>
                      <span style={{ fontSize: "11px", color: "var(--ink-tertiary)" }}>
                        {formatDate(record.createdAt || record.startedAt)}
                      </span>
                      <span style={{ fontSize: "11px", color: "var(--ink-tertiary)" }}>&bull;</span>
                      <span style={{ fontSize: "11px", color: "var(--ink-tertiary)" }}>
                        {formatDuration(record.durationSeconds)}
                      </span>
                      {record.productName && (
                        <>
                          <span style={{ fontSize: "11px", color: "var(--ink-tertiary)" }}>&bull;</span>
                          <span style={{ fontSize: "11px", color: "var(--ink-tertiary)", fontWeight: 500 }}>
                            {record.productName}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Outcome Badge & Expand Chevron */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                  {hasRecording && (
                    <span
                      title="Recording stored in private bucket"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        fontSize: "11px",
                        color: "var(--accent-600)",
                        background: "var(--accent-50)",
                        padding: "0.15rem 0.45rem",
                        borderRadius: "4px",
                        border: "1px solid var(--accent-200)",
                      }}
                    >
                      <FileAudio size={12} />
                      Audio
                    </span>
                  )}

                  {record.outcome && outcomeStyle && (
                    <span
                      style={{
                        padding: "0.2rem 0.625rem",
                        borderRadius: "9999px",
                        fontSize: "11px",
                        fontWeight: 600,
                        background: outcomeStyle.bg,
                        color: outcomeStyle.color,
                        border: `1px solid ${outcomeStyle.border}`,
                      }}
                    >
                      {SALES_OUTCOME_LABELS[record.outcome]}
                    </span>
                  )}

                  {statusBadge && record.analysisStatus !== "complete" && (
                    <span
                      style={{
                        padding: "0.2rem 0.5rem",
                        borderRadius: "9999px",
                        fontSize: "10px",
                        fontWeight: 600,
                        background: statusBadge.bg,
                        color: statusBadge.color,
                      }}
                    >
                      {statusBadge.label}
                    </span>
                  )}

                  <div style={{ color: "var(--ink-tertiary)", marginLeft: "0.25rem" }}>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
              </div>

              {/* Summary snippet (when collapsed) */}
              {!isExpanded && record.summary && (
                <p
                  style={{
                    fontSize: "var(--font-size-xs)",
                    color: "var(--ink-secondary)",
                    margin: "0.5rem 0 0 0",
                    lineHeight: 1.4,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {record.summary}
                </p>
              )}

              {/* Expanded Detail Panel */}
              {isExpanded && (
                <div
                  style={{
                    marginTop: "1rem",
                    paddingTop: "1rem",
                    borderTop: "1px solid var(--border-subtle)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                  }}
                >
                  {/* Audio Player Card */}
                  {hasRecording && (
                    <div
                      style={{
                        padding: "0.875rem 1rem",
                        background: "var(--surface-base)",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                          <Volume2 size={14} style={{ color: "var(--accent-600)" }} />
                          <span style={{ fontSize: "var(--font-size-xs)", fontWeight: 600, color: "var(--ink-primary)" }}>
                            Call Recording (Private Bucket)
                          </span>
                        </div>
                        {record.recordingSizeBytes && (
                          <span style={{ fontSize: "11px", color: "var(--ink-tertiary)" }}>
                            {(record.recordingSizeBytes / 1024).toFixed(1)} KB
                          </span>
                        )}
                      </div>

                      {signedUrl ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                          <audio controls src={signedUrl} style={{ width: "100%", height: "32px" }}>
                            Your browser does not support audio playback.
                          </audio>
                          <div>
                            <a
                              href={signedUrl}
                              download={`call-${record.id.slice(0, 8)}.webm`}
                              className="btn btn-secondary btn-sm"
                              style={{ display: "inline-flex", fontSize: "11px", height: "26px", padding: "0 0.625rem" }}
                            >
                              <Download size={12} />
                              Download Audio
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <button
                            onClick={() => void loadSignedAudio(record.id, record.recordingPath)}
                            disabled={loadingAudioId === record.id}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: "11px" }}
                          >
                            <Play size={11} />
                            {loadingAudioId === record.id ? "Generating signed URL…" : "Load Audio Player"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* AI Post-Call Intelligence */}
                  {record.analysisStatus === "complete" ? (
                    <div
                      style={{
                        padding: "1rem",
                        background: "var(--surface-base)",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border-subtle)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.75rem",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                        <Sparkles size={14} style={{ color: "var(--accent-600)" }} />
                        <span style={{ fontSize: "var(--font-size-xs)", fontWeight: 600, color: "var(--ink-primary)" }}>
                          AI Sales Intelligence
                        </span>
                      </div>

                      {record.summary && (
                        <div>
                          <p style={{ fontSize: "10px", fontWeight: 600, color: "var(--ink-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 0.2rem" }}>
                            Summary
                          </p>
                          <p style={{ fontSize: "var(--font-size-xs)", color: "var(--ink-primary)", lineHeight: 1.5, margin: 0 }}>
                            {record.summary}
                          </p>
                        </div>
                      )}

                      {record.outcomeReason && (
                        <div>
                          <p style={{ fontSize: "10px", fontWeight: 600, color: "var(--ink-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 0.2rem" }}>
                            Outcome Rationale
                          </p>
                          <p style={{ fontSize: "var(--font-size-xs)", color: "var(--ink-secondary)", lineHeight: 1.4, margin: 0 }}>
                            {record.outcomeReason}
                          </p>
                        </div>
                      )}

                      {record.customerNeeds && record.customerNeeds.length > 0 && (
                        <div>
                          <p style={{ fontSize: "10px", fontWeight: 600, color: "var(--ink-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 0.25rem" }}>
                            Customer Needs
                          </p>
                          <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
                            {record.customerNeeds.map((need, i) => (
                              <span
                                key={i}
                                style={{
                                  fontSize: "11px",
                                  padding: "0.2rem 0.5rem",
                                  borderRadius: "4px",
                                  background: "var(--surface-sunken)",
                                  border: "1px solid var(--border-subtle)",
                                  color: "var(--ink-secondary)",
                                }}
                              >
                                {need}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {record.objectionsList && record.objectionsList.length > 0 && (
                        <div>
                          <p style={{ fontSize: "10px", fontWeight: 600, color: "var(--ink-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 0.25rem" }}>
                            Objections Voiced
                          </p>
                          <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
                            {record.objectionsList.map((obj, i) => (
                              <span
                                key={i}
                                style={{
                                  fontSize: "11px",
                                  padding: "0.2rem 0.5rem",
                                  borderRadius: "4px",
                                  background: "#fef2f2",
                                  border: "1px solid #fecaca",
                                  color: "#991b1b",
                                }}
                              >
                                {obj}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {record.nextStepsList && record.nextStepsList.length > 0 && (
                        <div>
                          <p style={{ fontSize: "10px", fontWeight: 600, color: "var(--ink-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 0.2rem" }}>
                            Recommended Next Steps
                          </p>
                          <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "var(--font-size-xs)", color: "var(--ink-secondary)", lineHeight: 1.45 }}>
                            {record.nextStepsList.map((step, i) => (
                              <li key={i}>{step}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : record.analysisStatus === "failed" ? (
                    <div
                      style={{
                        padding: "0.875rem 1rem",
                        background: "#fffbeb",
                        border: "1px solid #fde68a",
                        borderRadius: "var(--radius-md)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "0.75rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <AlertCircle size={15} style={{ color: "#d97706" }} />
                        <span style={{ fontSize: "var(--font-size-xs)", color: "#92400e" }}>
                          AI analysis was not completed for this call.
                        </span>
                      </div>
                      <button
                        onClick={() => void handleRetryAnalysis(record)}
                        disabled={retryingId === record.id}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: "11px", height: "26px", padding: "0 0.625rem" }}
                      >
                        <RotateCcw size={11} className={retryingId === record.id ? "spin" : ""} />
                        {retryingId === record.id ? "Retrying…" : "Retry Analysis"}
                      </button>
                    </div>
                  ) : (
                    <p style={{ fontSize: "var(--font-size-xs)", color: "var(--ink-tertiary)", margin: 0 }}>
                      Analysis pending…
                    </p>
                  )}

                  {/* Full Chronological Transcript */}
                  <div>
                    <h3 style={{ fontSize: "var(--font-size-xs)", fontWeight: 600, color: "var(--ink-primary)", marginBottom: "0.5rem" }}>
                      Chronological Transcript ({record.transcript.length} turns)
                    </h3>
                    <div
                      style={{
                        maxHeight: "360px",
                        overflowY: "auto",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.625rem",
                        padding: "0.75rem",
                        background: "var(--surface-sunken)",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      {record.transcript.length === 0 ? (
                        <p style={{ fontSize: "var(--font-size-xs)", color: "var(--ink-tertiary)", margin: 0, textAlign: "center" }}>
                          No speech was transcribed during this call.
                        </p>
                      ) : (
                        record.transcript.map((msg) => (
                          <div
                            key={msg.id}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: msg.speaker === "ai" ? "flex-start" : "flex-end",
                            }}
                          >
                            <span style={{ fontSize: "10px", fontWeight: 600, color: msg.speaker === "ai" ? "var(--accent-600)" : "var(--ink-secondary)", marginBottom: "1px" }}>
                              {msg.speaker === "ai" ? "AI Salesperson" : record.customer.name || "Customer"}
                            </span>
                            <div
                              style={{
                                padding: "0.5rem 0.75rem",
                                borderRadius: "var(--radius-md)",
                                fontSize: "var(--font-size-xs)",
                                lineHeight: 1.45,
                                maxWidth: "85%",
                                background: msg.speaker === "ai" ? "var(--surface-base)" : "var(--accent-50)",
                                border: `1px solid ${msg.speaker === "ai" ? "var(--border-subtle)" : "var(--accent-200)"}`,
                                color: "var(--ink-primary)",
                              }}
                            >
                              {msg.text}
                            </div>
                            <span style={{ fontSize: "9px", color: "var(--ink-disabled)", marginTop: "1px" }}>
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
