import type { Metadata } from "next";
import Link from "next/link";
import { History, Phone, Clock, User } from "lucide-react";

export const metadata: Metadata = {
  title: "Call History",
  description: "Review past AI sales call records, transcripts, and outcomes.",
};

export default function HistoryPage() {
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
              Transcripts, recordings, summaries, and outcomes from completed AI sales calls.
            </p>
          </div>
          <Link href="/call" className="btn btn-primary" id="history-new-call">
            <Phone size={14} strokeWidth={2} />
            New Call
          </Link>
        </div>
      </header>

      {/* Planned record structure — informational */}
      <section
        aria-labelledby="schema-heading"
        style={{ marginBottom: "1.5rem" }}
      >
        <div
          style={{
            padding: "1rem 1.25rem",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            background: "var(--surface-base)",
          }}
        >
          <h2
            id="schema-heading"
            style={{
              fontSize: "var(--font-size-xs)",
              fontWeight: 600,
              color: "var(--ink-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: "0.75rem",
            }}
          >
            Each call record will include
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: "0.5rem",
            }}
          >
            {PLANNED_FIELDS.map((field) => (
              <div
                key={field.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                }}
              >
                <div
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "var(--border-default)",
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                />
                <span
                  style={{
                    fontSize: "var(--font-size-xs)",
                    color: "var(--ink-secondary)",
                  }}
                >
                  {field.label}
                </span>
              </div>
            ))}
          </div>
          <p
            style={{
              marginTop: "0.75rem",
              fontSize: "var(--font-size-xs)",
              color: "var(--ink-disabled)",
            }}
          >
            Call records will be stored in Supabase and linked to audio recordings
            in Phase 2–3.
          </p>
        </div>
      </section>

      {/* Filter bar placeholder */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
          <Clock
            size={13}
            style={{ color: "var(--ink-tertiary)" }}
            aria-hidden="true"
          />
          <span
            style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--ink-tertiary)",
              fontWeight: 500,
            }}
          >
            All time
          </span>
        </div>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
          }}
        >
          <User
            size={13}
            style={{ color: "var(--ink-tertiary)" }}
            aria-hidden="true"
          />
          <span
            style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--ink-tertiary)",
            }}
          >
            All outcomes
          </span>
        </div>
      </div>

      {/* Empty state */}
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
            <History
              size={22}
              style={{ color: "var(--ink-disabled)" }}
            />
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
              No calls on record
            </p>
            <p
              style={{
                fontSize: "var(--font-size-sm)",
                color: "var(--ink-tertiary)",
                margin: "0 0 0.125rem",
                maxWidth: "320px",
              }}
            >
              Completed calls will appear here with their full transcript,
              summary, and outcome classification.
            </p>
          </div>
          <Link
            href="/call"
            className="btn btn-primary"
            id="empty-history-new-call"
          >
            <Phone size={14} strokeWidth={2} />
            Start Your First Call
          </Link>
        </div>
      </div>

      {/* Coming-in-phase-2 note */}
      <p
        style={{
          marginTop: "1.25rem",
          fontSize: "var(--font-size-xs)",
          color: "var(--ink-disabled)",
          textAlign: "center",
        }}
      >
        Audio playback, AI summaries, and Supabase persistence are planned for
        Phase 2–3.
      </p>
    </div>
  );
}

const PLANNED_FIELDS = [
  { label: "Date & time" },
  { label: "Customer name" },
  { label: "Company" },
  { label: "Duration" },
  { label: "Full transcript" },
  { label: "Audio recording" },
  { label: "AI summary" },
  { label: "Customer needs" },
  { label: "Objections raised" },
  { label: "Next steps" },
  { label: "Sales outcome" },
];
