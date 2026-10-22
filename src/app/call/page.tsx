"use client";

import { useState, useEffect, useRef, startTransition } from "react";
import Link from "next/link";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Clock,
  User,
  Building2,
  Mail,
  AlertCircle,
  CheckCircle2,
  Download,
  Volume2,
  FileAudio,
  Sparkles,
  XCircle,
  Loader2,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import type { CustomerInfo, ProductConfig, CallStatus, CallRecord, SalesOutcome } from "@/types";
import { DEFAULT_PRODUCT_CONFIG, SALES_OUTCOME_LABELS } from "@/types";
import { PRODUCT_CONFIG_STORAGE_KEY } from "@/lib/constants";
import { useLiveSession } from "@/hooks/useLiveSession";
import { saveCompletedCall, retryCallAnalysis } from "@/lib/calls/persistence";

// ─── Call status config ────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  CallStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  idle: {
    label: "Ready",
    color: "var(--ink-tertiary)",
    bg: "var(--surface-base)",
    border: "var(--border-subtle)",
  },
  connecting: {
    label: "Connecting…",
    color: "var(--status-warning-ink)",
    bg: "var(--status-warning-bg)",
    border: "var(--status-warning-border)",
  },
  active: {
    label: "Live with Prospect",
    color: "var(--call-live)",
    bg: "var(--call-live-bg)",
    border: "var(--status-success-border)",
  },
  ended: {
    label: "Call Ended",
    color: "var(--ink-tertiary)",
    bg: "var(--surface-base)",
    border: "var(--border-subtle)",
  },
  error: {
    label: "Call Failed",
    color: "var(--status-error-ink)",
    bg: "var(--status-error-bg)",
    border: "var(--status-error-border)",
  },
};

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

// ─── Default customer ──────────────────────────────────────────────────────

const DEFAULT_CUSTOMER: CustomerInfo = {
  name: "Sarah Chen",
  company: "Apex Technologies",
  email: "sarah.chen@apextech.io",
  phone: "+1 (555) 382-9102",
  notes: "Evaluating project management platforms to consolidate Jira and Slack tasks.",
};

export default function LiveCallPage() {
  const [customer, setCustomer] = useState<CustomerInfo>(DEFAULT_CUSTOMER);
  const [productConfig, setProductConfig] = useState<ProductConfig>(DEFAULT_PRODUCT_CONFIG);
  const [recordingConsent, setRecordingConsent] = useState(false);

  // Persistence lifecycle states
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "partial_failure" | "error" | "unconfigured"
  >("idle");
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [savedRecord, setSavedRecord] = useState<CallRecord | null>(null);
  const [isRetryingAnalysis, setIsRetryingAnalysis] = useState(false);
  const saveTriggeredRef = useRef<boolean>(false);

  // Load configured product from localStorage (setup page persistence)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(PRODUCT_CONFIG_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        startTransition(() => {
          setProductConfig({ ...DEFAULT_PRODUCT_CONFIG, ...parsed });
        });
      }
    } catch {
      // Use defaults
    }
  }, []);

  const {
    status,
    statusDetail,
    error,
    transcript,
    elapsedSeconds,
    isMuted,
    recording,
    startedAt,
    startCall,
    endCall,
    toggleMute,
    resetCall,
    clearError,
  } = useLiveSession();

  const isActive = status === "active";
  const isConnecting = status === "connecting";
  const isIdle = status === "idle";
  const isEnded = status === "ended";
  const statusConfig = STATUS_CONFIG[status];

  // Auto-save completed call to Supabase Storage and PostgreSQL
  useEffect(() => {
    if (status !== "ended" || saveTriggeredRef.current) {
      return;
    }

    saveTriggeredRef.current = true;
    const callId = crypto.randomUUID();

    const persistCall = async () => {
      // Allow recorder blob a brief moment to settle if needed
      await new Promise((resolve) => setTimeout(resolve, 250));

      setSaveStatus("saving");
      setSaveNotice(null);

      const recBlob = recording?.blob || null;

      const res = await saveCompletedCall({
        callId,
        customer,
        product: productConfig,
        consent: recordingConsent,
        startedAt: startedAt || new Date(Date.now() - elapsedSeconds * 1000).toISOString(),
        endedAt: new Date().toISOString(),
        durationSeconds: elapsedSeconds,
        transcript,
        recordingBlob: recBlob,
      });

      if (res.success) {
        setSavedRecord(res.record);
        if (res.notice) {
          setSaveStatus("partial_failure");
          setSaveNotice(res.notice);
        } else {
          setSaveStatus("saved");
        }
      } else {
        if (res.unconfigured) {
          setSaveStatus("unconfigured");
          setSaveNotice(res.error);
        } else {
          setSaveStatus("error");
          setSaveNotice(res.error);
        }
      }
    };

    void persistCall();
  }, [
    status,
    recording,
    customer,
    productConfig,
    recordingConsent,
    startedAt,
    elapsedSeconds,
    transcript,
  ]);

  async function handleRetryAnalysis() {
    if (!savedRecord) return;
    setIsRetryingAnalysis(true);
    const res = await retryCallAnalysis(savedRecord, productConfig);
    setIsRetryingAnalysis(false);
    if (res.success && res.record) {
      setSavedRecord(res.record);
      setSaveStatus("saved");
      setSaveNotice(null);
    } else {
      setSaveNotice(res.error || "Retry analysis failed.");
    }
  }

  function formatElapsed(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function handleStart() {
    saveTriggeredRef.current = false;
    setSaveStatus("idle");
    setSaveNotice(null);
    setSavedRecord(null);
    void startCall({
      customer,
      product: productConfig,
      consent: recordingConsent,
    });
  }

  function handleReset() {
    saveTriggeredRef.current = false;
    setSaveStatus("idle");
    setSaveNotice(null);
    setSavedRecord(null);
    resetCall();
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
            <h1 className="page-title">Live Call Studio</h1>
            <p className="page-description">
              Real-time voice sales assistant — Active campaign:{" "}
              <strong>{productConfig.name}</strong>
            </p>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "var(--font-size-xs)",
              color: "var(--ink-secondary)",
              background: "var(--surface-base)",
              padding: "0.375rem 0.75rem",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <Sparkles size={13} style={{ color: "var(--accent-600)" }} />
            <span>Gemini Live Voice Engine</span>
          </div>
        </div>
      </header>

      {/* Error alert banner */}
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
            gap: "0.75rem",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", gap: "0.625rem", alignItems: "flex-start" }}>
            <AlertCircle
              size={16}
              style={{ color: "var(--status-error-ink)", flexShrink: 0, marginTop: "2px" }}
              aria-hidden="true"
            />
            <div>
              <p
                style={{
                  fontSize: "var(--font-size-sm)",
                  fontWeight: 600,
                  color: "var(--status-error-ink)",
                  margin: "0 0 0.125rem 0",
                }}
              >
                Call Notice
              </p>
              <p
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--status-error-ink)",
                  margin: 0,
                  lineHeight: 1.4,
                }}
              >
                {error}
              </p>
            </div>
          </div>
          <button
            onClick={clearError}
            aria-label="Dismiss alert"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--status-error-ink)",
              padding: 0,
            }}
          >
            <XCircle size={16} />
          </button>
        </div>
      )}

      {/* Main Grid */}
      <div
        className="live-call-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 1.2fr)",
          gap: "1.25rem",
          alignItems: "start",
        }}
      >
        {/* ─── Left Column: Controls & Context ─────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Call Status & Controls Card */}
          <div className="card" style={{ padding: "1.25rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "1rem",
                gap: "0.5rem",
              }}
            >
              <h2 className="section-title">Call Status</h2>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.25rem 0.625rem",
                  borderRadius: "9999px",
                  border: `1px solid ${statusConfig.border}`,
                  background: statusConfig.bg,
                }}
                role="status"
                aria-label={`Call status: ${statusConfig.label}`}
              >
                {isActive && <span className="live-dot" aria-hidden="true" />}
                {isConnecting && (
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "var(--status-warning-ink)",
                      animation: "pulse-dot 1.5s ease-in-out infinite",
                    }}
                    aria-hidden="true"
                  />
                )}
                <span
                  style={{
                    fontSize: "var(--font-size-xs)",
                    fontWeight: 600,
                    color: statusConfig.color,
                  }}
                >
                  {statusConfig.label}
                </span>
              </div>
            </div>

            {/* Status detail & Duration */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "1.25rem",
                padding: "0.625rem 0.875rem",
                background: "var(--surface-base)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Clock
                  size={14}
                  style={{ color: "var(--ink-tertiary)" }}
                  aria-hidden="true"
                />
                <span
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: "var(--font-size-xl)",
                    fontWeight: 700,
                    color: isActive ? "var(--ink-primary)" : "var(--ink-disabled)",
                    letterSpacing: "-0.02em",
                  }}
                  aria-label={`Elapsed time: ${formatElapsed(elapsedSeconds)}`}
                >
                  {formatElapsed(elapsedSeconds)}
                </span>
              </div>
              <span
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--ink-secondary)",
                  fontWeight: 500,
                }}
              >
                {statusDetail}
              </span>
            </div>

            {/* Call action buttons */}
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {(isIdle || status === "error") && (
                <button
                  id="start-call-btn"
                  className="btn btn-primary"
                  onClick={handleStart}
                  aria-label="Start voice call"
                  style={{ flex: 1 }}
                >
                  <Phone size={14} strokeWidth={2} />
                  Start Call
                </button>
              )}

              {isConnecting && (
                <button
                  id="cancel-call-btn"
                  className="btn btn-secondary"
                  onClick={endCall}
                  aria-label="Cancel connecting"
                  style={{ flex: 1 }}
                >
                  <PhoneOff size={14} strokeWidth={2} />
                  Cancel
                </button>
              )}

              {isActive && (
                <>
                  <button
                    id="mute-btn"
                    className="btn btn-secondary"
                    onClick={toggleMute}
                    aria-pressed={isMuted}
                    aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
                  >
                    {isMuted ? (
                      <MicOff size={14} strokeWidth={2} />
                    ) : (
                      <Mic size={14} strokeWidth={2} />
                    )}
                    {isMuted ? "Unmute" : "Mute"}
                  </button>
                  <button
                    id="end-call-btn"
                    className="btn btn-danger"
                    onClick={endCall}
                    aria-label="End call"
                    style={{ flex: 1 }}
                  >
                    <PhoneOff size={14} strokeWidth={2} />
                    End Call
                  </button>
                </>
              )}

              {isEnded && (
                <button
                  id="new-call-btn"
                  className="btn btn-secondary"
                  onClick={handleReset}
                  aria-label="Start another call"
                  style={{ flex: 1 }}
                >
                  New Call
                </button>
              )}
            </div>

            {/* Persistence & Save State Indicators */}
            {isEnded && (
              <div style={{ marginTop: "1rem" }}>
                {saveStatus === "saving" && (
                  <div
                    role="status"
                    style={{
                      padding: "0.75rem 0.875rem",
                      background: "var(--accent-50)",
                      border: "1px solid var(--accent-200)",
                      borderRadius: "var(--radius-md)",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.625rem",
                    }}
                  >
                    <Loader2 size={15} className="spin" style={{ color: "var(--accent-600)", flexShrink: 0 }} />
                    <span style={{ fontSize: "var(--font-size-xs)", color: "var(--ink-secondary)", fontWeight: 500 }}>
                      Persisting conversation, uploading audio &amp; generating AI sales intelligence…
                    </span>
                  </div>
                )}

                {saveStatus === "saved" && (
                  <div
                    style={{
                      padding: "0.75rem 0.875rem",
                      background: "#ecfdf5",
                      border: "1px solid #a7f3d0",
                      borderRadius: "var(--radius-md)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.5rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <CheckCircle2 size={15} style={{ color: "#059669", flexShrink: 0 }} />
                      <span style={{ fontSize: "var(--font-size-xs)", fontWeight: 600, color: "#065f46" }}>
                        Saved to Supabase database &amp; private storage
                      </span>
                    </div>
                    <Link
                      href="/history"
                      style={{
                        fontSize: "var(--font-size-xs)",
                        color: "var(--accent-600)",
                        fontWeight: 600,
                        textDecoration: "none",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                      }}
                    >
                      History <ArrowRight size={11} />
                    </Link>
                  </div>
                )}

                {saveStatus === "partial_failure" && (
                  <div
                    style={{
                      padding: "0.75rem 0.875rem",
                      background: "#fffbeb",
                      border: "1px solid #fde68a",
                      borderRadius: "var(--radius-md)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <AlertCircle size={15} style={{ color: "#d97706", flexShrink: 0 }} />
                        <span style={{ fontSize: "var(--font-size-xs)", color: "#92400e", fontWeight: 600 }}>
                          Partially Saved
                        </span>
                      </div>
                      {savedRecord?.analysisStatus === "failed" && (
                        <button
                          onClick={handleRetryAnalysis}
                          disabled={isRetryingAnalysis}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: "11px", height: "26px", padding: "0 0.5rem" }}
                        >
                          <RefreshCw size={11} className={isRetryingAnalysis ? "spin" : ""} />
                          {isRetryingAnalysis ? "Retrying…" : "Retry AI Analysis"}
                        </button>
                      )}
                    </div>
                    {saveNotice && (
                      <p style={{ fontSize: "11px", color: "#92400e", margin: "0.375rem 0 0 0", lineHeight: 1.4 }}>
                        {saveNotice}
                      </p>
                    )}
                  </div>
                )}

                {saveStatus === "unconfigured" && (
                  <div
                    style={{
                      padding: "0.75rem 0.875rem",
                      background: "var(--surface-base)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-md)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                      <AlertCircle size={14} style={{ color: "var(--ink-tertiary)", flexShrink: 0 }} />
                      <span style={{ fontSize: "var(--font-size-xs)", fontWeight: 600, color: "var(--ink-secondary)" }}>
                        Local Browser Session Only
                      </span>
                    </div>
                    <p style={{ fontSize: "11px", color: "var(--ink-tertiary)", margin: 0, lineHeight: 1.4 }}>
                      Supabase credentials are not configured. The recording and transcript are available in this local session, but will not persist to the database. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable cloud persistence.
                    </p>
                  </div>
                )}

                {saveStatus === "error" && (
                  <div
                    style={{
                      padding: "0.75rem 0.875rem",
                      background: "var(--status-error-bg)",
                      border: "1px solid var(--status-error-border)",
                      borderRadius: "var(--radius-md)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <AlertCircle size={14} style={{ color: "var(--status-error-ink)", flexShrink: 0 }} />
                      <span style={{ fontSize: "var(--font-size-xs)", fontWeight: 600, color: "var(--status-error-ink)" }}>
                        Failed to persist to Supabase
                      </span>
                    </div>
                    <p style={{ fontSize: "11px", color: "var(--status-error-ink)", margin: "0.25rem 0 0", lineHeight: 1.4 }}>
                      {saveNotice}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI Post-Call Intelligence Card */}
          {isEnded && savedRecord && savedRecord.analysisStatus === "complete" && (
            <div className="card" style={{ padding: "1.25rem" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "0.875rem",
                  gap: "0.5rem",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Sparkles size={16} style={{ color: "var(--accent-600)" }} />
                  <h2 className="section-title">Sales Intelligence</h2>
                </div>
                {savedRecord.outcome && (
                  <span
                    style={{
                      padding: "0.25rem 0.625rem",
                      borderRadius: "9999px",
                      fontSize: "var(--font-size-xs)",
                      fontWeight: 600,
                      background: OUTCOME_STYLES[savedRecord.outcome]?.bg || "var(--surface-base)",
                      color: OUTCOME_STYLES[savedRecord.outcome]?.color || "var(--ink-secondary)",
                      border: `1px solid ${OUTCOME_STYLES[savedRecord.outcome]?.border || "var(--border-subtle)"}`,
                    }}
                  >
                    {SALES_OUTCOME_LABELS[savedRecord.outcome]}
                  </span>
                )}
              </div>

              {savedRecord.summary && (
                <div style={{ marginBottom: "0.875rem" }}>
                  <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--ink-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 0.25rem 0" }}>
                    Summary
                  </p>
                  <p style={{ fontSize: "var(--font-size-xs)", color: "var(--ink-primary)", lineHeight: 1.5, margin: 0 }}>
                    {savedRecord.summary}
                  </p>
                </div>
              )}

              {savedRecord.outcomeReason && (
                <div style={{ marginBottom: "0.875rem", padding: "0.5rem 0.75rem", background: "var(--surface-base)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
                  <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--ink-secondary)", margin: "0 0 0.2rem 0" }}>
                    Classification Rationale
                  </p>
                  <p style={{ fontSize: "var(--font-size-xs)", color: "var(--ink-tertiary)", margin: 0, lineHeight: 1.4 }}>
                    {savedRecord.outcomeReason}
                  </p>
                </div>
              )}

              {savedRecord.customerNeeds && savedRecord.customerNeeds.length > 0 && (
                <div style={{ marginBottom: "0.75rem" }}>
                  <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--ink-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 0.35rem 0" }}>
                    Identified Needs
                  </p>
                  <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
                    {savedRecord.customerNeeds.map((need, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: "11px",
                          padding: "0.2rem 0.5rem",
                          borderRadius: "4px",
                          background: "var(--surface-base)",
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

              {savedRecord.nextStepsList && savedRecord.nextStepsList.length > 0 && (
                <div>
                  <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--ink-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 0.25rem 0" }}>
                    Recommended Next Steps
                  </p>
                  <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "var(--font-size-xs)", color: "var(--ink-secondary)", lineHeight: 1.5 }}>
                    {savedRecord.nextStepsList.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Recording Consent Card */}
          <div className="card" style={{ padding: "1.25rem" }}>
            <h2 className="section-title" style={{ marginBottom: "0.75rem" }}>
              Recording Consent
            </h2>
            <label
              htmlFor="recording-consent"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.625rem",
                cursor: isActive || isConnecting ? "not-allowed" : "pointer",
              }}
            >
              <input
                id="recording-consent"
                type="checkbox"
                checked={recordingConsent}
                disabled={isActive || isConnecting}
                onChange={(e) => setRecordingConsent(e.target.checked)}
                style={{ marginTop: "3px", accentColor: "var(--accent-600)", width: "16px", height: "16px" }}
                aria-describedby="consent-hint"
              />
              <div>
                <span
                  style={{
                    fontSize: "var(--font-size-sm)",
                    fontWeight: 600,
                    color: "var(--ink-primary)",
                    display: "block",
                    marginBottom: "0.25rem",
                  }}
                >
                  I confirm customer consent for call recording
                </span>
                <span
                  id="consent-hint"
                  style={{
                    fontSize: "var(--font-size-xs)",
                    color: "var(--ink-tertiary)",
                    lineHeight: 1.4,
                    display: "block",
                  }}
                >
                  Recording captures both customer microphone and AI responses into a single combined
                  track. Consent must be explicitly confirmed before starting.
                </span>
              </div>
            </label>

            {/* Recording active indicator */}
            {isActive && (
              <div
                style={{
                  marginTop: "0.875rem",
                  padding: "0.5rem 0.75rem",
                  background: "var(--status-error-bg)",
                  border: "1px solid var(--status-error-border)",
                  borderRadius: "var(--radius-md)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
                role="status"
              >
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#dc2626",
                    flexShrink: 0,
                    animation: "pulse-dot 1.5s ease-in-out infinite",
                  }}
                  aria-hidden="true"
                />
                <span
                  style={{
                    fontSize: "var(--font-size-xs)",
                    fontWeight: 600,
                    color: "var(--status-error-ink)",
                  }}
                >
                  Dual-track recording active
                </span>
              </div>
            )}
          </div>

          {/* Recording Playback & Download Card (when call is ended) */}
          {isEnded && (
            <div className="card" style={{ padding: "1.25rem" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "0.75rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <FileAudio size={16} style={{ color: "var(--accent-600)" }} />
                  <h2 className="section-title">Call Recording</h2>
                </div>
                {recording && (
                  <span
                    style={{
                      fontSize: "var(--font-size-xs)",
                      color: "var(--ink-tertiary)",
                      fontWeight: 500,
                    }}
                  >
                    {recording.durationSeconds}s · {(recording.sizeBytes / 1024).toFixed(1)} KB
                  </span>
                )}
              </div>

              {recording ? (
                <div>
                  <p
                    style={{
                      fontSize: "var(--font-size-xs)",
                      color: "var(--ink-secondary)",
                      marginBottom: "0.75rem",
                      lineHeight: 1.4,
                    }}
                  >
                    Combined recording includes both customer speech and AI salesperson speech.
                  </p>

                  <audio
                    controls
                    src={recording.url}
                    style={{ width: "100%", marginBottom: "0.75rem", height: "36px" }}
                  >
                    Your browser does not support audio playback.
                  </audio>

                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <a
                      href={recording.url}
                      download={`voicepilot-call-${new Date().toISOString().slice(0, 10)}.webm`}
                      className="btn btn-primary btn-sm"
                      style={{ textDecoration: "none" }}
                    >
                      <Download size={13} />
                      Download Recording (.webm)
                    </a>
                  </div>

                  <p
                    style={{
                      fontSize: "11px",
                      color: "var(--ink-disabled)",
                      marginTop: "0.75rem",
                      lineHeight: 1.4,
                    }}
                  >
                    {savedRecord?.recordingPath
                      ? `* Preserved to private Supabase Storage at: ${savedRecord.recordingPath}`
                      : saveStatus === "saving"
                      ? "* Uploading audio recording to private Supabase Storage…"
                      : saveStatus === "unconfigured"
                      ? "* Note: Stored in browser memory. Configure Supabase credentials to enable cloud persistence."
                      : "* Audio recording captured dual tracks (customer + AI)."}
                  </p>
                </div>
              ) : (
                <p
                  style={{
                    fontSize: "var(--font-size-xs)",
                    color: "var(--ink-tertiary)",
                    margin: 0,
                  }}
                >
                  Call ended without a usable recording.
                </p>
              )}
            </div>
          )}

          {/* Customer Details Form Card */}
          <div className="card" style={{ padding: "1.25rem" }}>
            <h2 className="section-title" style={{ marginBottom: "0.875rem" }}>
              Prospect Details
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <FieldRow
                id="customer-name"
                label="Prospect Name"
                placeholder="Sarah Chen"
                icon={<User size={13} />}
                value={customer.name}
                onChange={(v) => setCustomer((c) => ({ ...c, name: v }))}
                disabled={isActive || isConnecting}
                required
              />
              <FieldRow
                id="customer-company"
                label="Company"
                placeholder="Apex Technologies"
                icon={<Building2 size={13} />}
                value={customer.company}
                onChange={(v) => setCustomer((c) => ({ ...c, company: v }))}
                disabled={isActive || isConnecting}
              />
              <FieldRow
                id="customer-email"
                label="Email"
                placeholder="sarah.chen@apextech.io"
                type="email"
                icon={<Mail size={13} />}
                value={customer.email}
                onChange={(v) => setCustomer((c) => ({ ...c, email: v }))}
                disabled={isActive || isConnecting}
              />
              <div className="field-group">
                <label className="field-label" htmlFor="customer-notes">
                  Prospect Context &amp; Needs
                </label>
                <textarea
                  id="customer-notes"
                  className="input"
                  rows={2}
                  value={customer.notes}
                  onChange={(e) => setCustomer((c) => ({ ...c, notes: e.target.value }))}
                  disabled={isActive || isConnecting}
                  placeholder="Key background notes the AI can use to personalize the pitch…"
                  style={{ resize: "vertical", fontSize: "var(--font-size-xs)" }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ─── Right Column: Live Transcript Stream ────────────────────────── */}
        <div className="card" style={{ padding: "1.25rem", minHeight: "560px", display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1rem",
              paddingBottom: "0.75rem",
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Volume2 size={16} style={{ color: "var(--accent-600)" }} />
              <h2 className="section-title">Live Transcript</h2>
            </div>
            <span
              style={{
                fontSize: "var(--font-size-xs)",
                color: "var(--ink-tertiary)",
              }}
            >
              {transcript.length} {transcript.length === 1 ? "turn" : "turns"}
            </span>
          </div>

          {/* Transcript Scroll Area */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "0.875rem",
            }}
            role="log"
            aria-live="polite"
            aria-label="Conversation transcript"
          >
            {transcript.length === 0 ? (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  padding: "2rem 1rem",
                  color: "var(--ink-tertiary)",
                }}
              >
                <Volume2
                  size={32}
                  style={{ color: "var(--ink-disabled)", marginBottom: "0.75rem" }}
                  aria-hidden="true"
                />
                <p
                  style={{
                    fontSize: "var(--font-size-sm)",
                    fontWeight: 600,
                    color: "var(--ink-secondary)",
                    marginBottom: "0.25rem",
                  }}
                >
                  {isConnecting
                    ? "Establishing voice connection…"
                    : isActive
                    ? "Listening for speech…"
                    : "No conversation active"}
                </p>
                <p
                  style={{
                    fontSize: "var(--font-size-xs)",
                    color: "var(--ink-tertiary)",
                    maxWidth: "280px",
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {isConnecting
                    ? "Microphone and Gemini Live stream are synchronizing."
                    : isActive
                    ? "The AI sales assistant will greet the customer. Speak into your microphone to reply."
                    : "Confirm customer consent and start the call to view live speech transcription."}
                </p>
              </div>
            ) : (
              transcript.map((msg) => (
                <div
                  key={msg.id}
                  className={`transcript-message ${msg.speaker}`}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: msg.speaker === "ai" ? "flex-start" : "flex-end",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: msg.speaker === "ai" ? "var(--accent-600)" : "var(--ink-secondary)",
                      marginBottom: "0.25rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.375rem",
                    }}
                  >
                    <span>{msg.speaker === "ai" ? "AI Salesperson (Alex)" : customer.name || "Customer"}</span>
                    {msg.isInterim && (
                      <span
                        style={{
                          fontSize: "10px",
                          color: "var(--ink-tertiary)",
                          fontStyle: "italic",
                        }}
                      >
                        (speaking…)
                      </span>
                    )}
                  </div>

                  <div
                    className="transcript-bubble"
                    style={{
                      padding: "0.625rem 0.875rem",
                      borderRadius: "var(--radius-lg)",
                      fontSize: "var(--font-size-sm)",
                      lineHeight: 1.5,
                      maxWidth: "85%",
                      background:
                        msg.speaker === "ai"
                          ? "var(--surface-base)"
                          : "var(--accent-50)",
                      border: `1px solid ${
                        msg.speaker === "ai"
                          ? "var(--border-subtle)"
                          : "var(--accent-200)"
                      }`,
                      color: "var(--ink-primary)",
                      opacity: msg.isInterim ? 0.85 : 1,
                    }}
                  >
                    {msg.text}
                  </div>

                  <div
                    style={{
                      fontSize: "10px",
                      color: "var(--ink-disabled)",
                      marginTop: "0.25rem",
                    }}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer link to history when ended */}
          {isEnded && (
            <div
              style={{
                marginTop: "1rem",
                paddingTop: "0.75rem",
                borderTop: "1px solid var(--border-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                <CheckCircle2 size={13} style={{ color: "var(--status-success-ink)" }} />
                <span style={{ fontSize: "var(--font-size-xs)", color: "var(--ink-secondary)" }}>
                  {saveStatus === "saved"
                    ? "Call persisted to Supabase."
                    : saveStatus === "saving"
                    ? "Persisting to database…"
                    : saveStatus === "unconfigured"
                    ? "Call completed (local session only)."
                    : "Call completed."}
                </span>
              </div>
              <Link
                href="/history"
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--accent-600)",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Go to Call History →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── FieldRow Component ───────────────────────────────────────────────────

interface FieldRowProps {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  required?: boolean;
  type?: string;
  icon?: React.ReactNode;
}

function FieldRow({
  id,
  label,
  placeholder,
  value,
  onChange,
  disabled,
  required,
  type = "text",
  icon,
}: FieldRowProps) {
  return (
    <div className="field-group">
      <label className="field-label" htmlFor={id}>
        {icon && (
          <span
            style={{
              display: "inline-flex",
              verticalAlign: "middle",
              marginRight: "0.25rem",
              color: "var(--ink-tertiary)",
            }}
          >
            {icon}
          </span>
        )}
        {label}
        {required && (
          <span aria-label="required" style={{ color: "#dc2626", marginLeft: "2px" }}>
            *
          </span>
        )}
      </label>
      <input
        id={id}
        type={type}
        className="input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        aria-required={required}
        style={{ fontSize: "var(--font-size-xs)" }}
      />
    </div>
  );
}
