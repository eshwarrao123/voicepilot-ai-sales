"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Clock,
  User,
  Building2,
  MessageSquare,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import type { CustomerInfo, TranscriptMessage } from "@/types";

// ─── Call status display ───────────────────────────────────────────────────

type LocalCallStatus = "idle" | "starting" | "active" | "ended";

const STATUS_CONFIG: Record<
  LocalCallStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  idle: {
    label: "Ready",
    color: "var(--ink-tertiary)",
    bg: "var(--surface-base)",
    border: "var(--border-subtle)",
  },
  starting: {
    label: "Connecting…",
    color: "var(--status-warning-ink)",
    bg: "var(--status-warning-bg)",
    border: "var(--status-warning-border)",
  },
  active: {
    label: "Live",
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
};

// ─── Default customer ──────────────────────────────────────────────────────

const DEFAULT_CUSTOMER: CustomerInfo = {
  name: "",
  company: "",
  email: "",
  phone: "",
  notes: "",
};

// ─── Main component ────────────────────────────────────────────────────────

export default function LiveCallPage() {
  const [status, setStatus] = useState<LocalCallStatus>("idle");
  const [customer, setCustomer] = useState<CustomerInfo>(DEFAULT_CUSTOMER);
  const [recordingConsent, setRecordingConsent] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  // Elapsed timer — runs only when call is active.
  // Reset happens in handleStartCall / handleReset, not inside the effect,
  // to avoid the react-hooks/set-state-in-effect lint rule.
  useEffect(() => {
    if (status !== "active") return;
    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  const isActive = status === "active";
  const isIdle = status === "idle" || status === "ended";
  const statusConfig = STATUS_CONFIG[status];

  function handleStartCall() {
    if (!customer.name.trim()) {
      alert("Please enter a customer name before starting the call.");
      return;
    }
    setStatus("starting");
    setTranscript([]);
    setElapsedSeconds(0);
    // Phase 2: replace this stub with real Gemini Live session init.
    // For now we just stay in "starting" state to show the UI truthfully.
    // DO NOT auto-transition to "active" — the real voice pipeline must do that.
  }

  function handleEndCall() {
    setStatus("ended");
    setIsMuted(false);
  }

  function handleReset() {
    setStatus("idle");
    setTranscript([]);
    setElapsedSeconds(0);
    setCustomer(DEFAULT_CUSTOMER);
    setRecordingConsent(false);
  }

  function formatElapsed(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  return (
    <div className="page-container">
      {/* Page header */}
      <header className="page-header">
        <h1 className="page-title">Live Call</h1>
        <p className="page-description">
          AI voice sales assistant workspace — FlowDesk campaign.
        </p>
      </header>

      {/* Phase notice */}
      <div
        role="status"
        aria-live="polite"
        style={{
          marginBottom: "1.5rem",
          padding: "0.75rem 1rem",
          background: "var(--status-warning-bg)",
          border: "1px solid var(--status-warning-border)",
          borderRadius: "var(--radius-md)",
          display: "flex",
          gap: "0.625rem",
          alignItems: "flex-start",
        }}
      >
        <AlertCircle
          size={15}
          style={{ color: "var(--status-warning-ink)", flexShrink: 0, marginTop: "1px" }}
          aria-hidden="true"
        />
        <p
          style={{
            fontSize: "var(--font-size-xs)",
            color: "var(--status-warning-ink)",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          <strong>Phase 1 — Interface only.</strong> The voice engine, microphone session,
          live transcription, and recording are not yet connected. These will be wired up
          in Phase 2. Clicking &ldquo;Start Call&rdquo; will enter the connecting state but
          no actual call will be placed.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: "1rem",
          alignItems: "start",
        }}
      >
        {/* ─── Left column ─────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Call status card */}
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
                {isActive && (
                  <span className="live-dot" aria-hidden="true" />
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

            {/* Duration */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "1.25rem",
              }}
            >
              <Clock size={14} style={{ color: "var(--ink-tertiary)" }} aria-hidden="true" />
              <span
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: "var(--font-size-2xl)",
                  fontWeight: 700,
                  color: isActive ? "var(--ink-primary)" : "var(--ink-disabled)",
                  letterSpacing: "-0.02em",
                }}
                aria-label={`Elapsed time: ${formatElapsed(elapsedSeconds)}`}
              >
                {formatElapsed(elapsedSeconds)}
              </span>
            </div>

            {/* Call controls */}
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {isIdle && (
                <button
                  id="start-call-btn"
                  className="btn btn-primary"
                  onClick={handleStartCall}
                  aria-label="Start call"
                >
                  <Phone size={14} strokeWidth={2} />
                  Start Call
                </button>
              )}

              {status === "starting" && (
                <button
                  id="cancel-call-btn"
                  className="btn btn-secondary"
                  onClick={handleEndCall}
                  aria-label="Cancel connecting"
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
                    onClick={() => setIsMuted((m) => !m)}
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
                    onClick={handleEndCall}
                    aria-label="End call"
                  >
                    <PhoneOff size={14} strokeWidth={2} />
                    End Call
                  </button>
                </>
              )}

              {status === "ended" && (
                <button
                  id="new-call-btn"
                  className="btn btn-secondary"
                  onClick={handleReset}
                  aria-label="Start a new call"
                >
                  New Call
                </button>
              )}
            </div>
          </div>

          {/* Recording consent */}
          <div className="card" style={{ padding: "1.25rem" }}>
            <h2 className="section-title" style={{ marginBottom: "0.75rem" }}>
              Recording
            </h2>
            <label
              htmlFor="recording-consent"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.625rem",
                cursor: isActive ? "not-allowed" : "pointer",
              }}
            >
              <input
                id="recording-consent"
                type="checkbox"
                checked={recordingConsent}
                disabled={isActive}
                onChange={(e) => setRecordingConsent(e.target.checked)}
                style={{ marginTop: "2px", accentColor: "var(--accent-600)" }}
                aria-describedby="consent-hint"
              />
              <div>
                <span
                  style={{
                    fontSize: "var(--font-size-sm)",
                    fontWeight: 500,
                    color: "var(--ink-primary)",
                    display: "block",
                    marginBottom: "0.125rem",
                  }}
                >
                  Customer has consented to call recording
                </span>
                <span
                  id="consent-hint"
                  style={{
                    fontSize: "var(--font-size-xs)",
                    color: "var(--ink-tertiary)",
                  }}
                >
                  Recording will be enabled only with explicit consent. This must
                  be confirmed before starting the call.
                </span>
              </div>
            </label>

            {recordingConsent && (
              <div
                style={{
                  marginTop: "0.75rem",
                  padding: "0.5rem 0.75rem",
                  background: isActive
                    ? "var(--status-error-bg)"
                    : "var(--surface-base)",
                  border: `1px solid ${
                    isActive
                      ? "var(--status-error-border)"
                      : "var(--border-subtle)"
                  }`,
                  borderRadius: "var(--radius-md)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
                role="status"
                aria-live="polite"
              >
                {isActive ? (
                  <>
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
                      Recording active
                    </span>
                  </>
                ) : (
                  <span
                    style={{
                      fontSize: "var(--font-size-xs)",
                      color: "var(--ink-tertiary)",
                    }}
                  >
                    Recording will start when the call begins.
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Customer details */}
          <div className="card" style={{ padding: "1.25rem" }}>
            <h2 className="section-title" style={{ marginBottom: "0.875rem" }}>
              Customer Details
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <FieldRow
                id="customer-name"
                label="Name"
                placeholder="Alex Johnson"
                icon={<User size={13} />}
                value={customer.name}
                onChange={(v) => setCustomer((c) => ({ ...c, name: v }))}
                disabled={isActive}
                required
              />
              <FieldRow
                id="customer-company"
                label="Company"
                placeholder="Acme Corp"
                icon={<Building2 size={13} />}
                value={customer.company}
                onChange={(v) => setCustomer((c) => ({ ...c, company: v }))}
                disabled={isActive}
              />
              <FieldRow
                id="customer-email"
                label="Email"
                placeholder="alex@acmecorp.com"
                type="email"
                value={customer.email}
                onChange={(v) => setCustomer((c) => ({ ...c, email: v }))}
                disabled={isActive}
              />
              <FieldRow
                id="customer-phone"
                label="Phone"
                placeholder="+1 555 000 0000"
                type="tel"
                value={customer.phone}
                onChange={(v) => setCustomer((c) => ({ ...c, phone: v }))}
                disabled={isActive}
              />
              <div className="field-group">
                <label className="field-label" htmlFor="customer-notes">
                  Notes
                </label>
                <textarea
                  id="customer-notes"
                  className="input"
                  placeholder="Context about this lead — previous interactions, priorities, etc."
                  value={customer.notes}
                  onChange={(e) =>
                    setCustomer((c) => ({ ...c, notes: e.target.value }))
                  }
                  disabled={isActive}
                  rows={3}
                  aria-label="Customer notes"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ─── Right column — Transcript ────────────────────────────────── */}
        <div className="card" style={{ padding: "1.25rem", minHeight: "500px", display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1rem",
            }}
          >
            <h2 className="section-title">
              Live Transcript
            </h2>
            {isActive && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                  fontSize: "var(--font-size-xs)",
                  color: "var(--call-live)",
                  fontWeight: 500,
                }}
                aria-live="polite"
              >
                <span className="live-dot" aria-hidden="true" />
                Live
              </div>
            )}
          </div>

          {/* Transcript area */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
            }}
            className="scrollable"
            role="log"
            aria-label="Call transcript"
            aria-live="polite"
          >
            {transcript.length === 0 ? (
              <div className="empty-state" style={{ flex: 1 }}>
                <MessageSquare
                  size={32}
                  className="empty-state-icon"
                  aria-hidden="true"
                />
                <div>
                  <p
                    style={{
                      fontWeight: 600,
                      fontSize: "var(--font-size-sm)",
                      color: "var(--ink-secondary)",
                      marginBottom: "0.25rem",
                    }}
                  >
                    {status === "idle" || status === "ended"
                      ? "No transcript"
                      : "Waiting for conversation…"}
                  </p>
                  <p
                    style={{
                      fontSize: "var(--font-size-xs)",
                      color: "var(--ink-tertiary)",
                      margin: 0,
                    }}
                  >
                    {status === "idle"
                      ? "Start a call to see the live transcript appear here."
                      : status === "ended"
                      ? "No conversation was recorded in this session."
                      : "Transcript will stream here once the voice session connects."}
                  </p>
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                  padding: "0.25rem 0",
                }}
              >
                {transcript.map((msg) => (
                  <div
                    key={msg.id}
                    className={`transcript-message ${msg.speaker}`}
                  >
                    <div className="transcript-bubble">{msg.text}</div>
                    <div className="transcript-meta">
                      {msg.speaker === "ai" ? "AI" : "Customer"} ·{" "}
                      {new Date(msg.timestamp).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Disconnected / ended state */}
          {(status === "idle" || status === "ended") && transcript.length === 0 && (
            <div
              style={{
                marginTop: "1rem",
                paddingTop: "1rem",
                borderTop: "1px solid var(--border-subtle)",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              {status === "ended" ? (
                <CheckCircle
                  size={14}
                  style={{ color: "var(--ink-tertiary)" }}
                  aria-hidden="true"
                />
              ) : null}
              <span
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--ink-tertiary)",
                }}
              >
                {status === "ended"
                  ? "Call session closed."
                  : "No active session."}
              </span>
              {status === "ended" && (
                <Link
                  href="/history"
                  style={{
                    marginLeft: "auto",
                    fontSize: "var(--font-size-xs)",
                    color: "var(--accent-600)",
                    fontWeight: 500,
                    textDecoration: "none",
                  }}
                >
                  View History →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Responsive: on narrow screens stack columns */}
      <style>{`
        @media (max-width: 768px) {
          .live-call-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

// ─── FieldRow ──────────────────────────────────────────────────────────────

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
      />
    </div>
  );
}
