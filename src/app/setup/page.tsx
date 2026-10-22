"use client";

import { useState, useEffect, startTransition } from "react";
import { Save, RotateCcw, CheckCircle2, AlertCircle, Info } from "lucide-react";
import type { ProductConfig } from "@/types";
import { DEFAULT_PRODUCT_CONFIG } from "@/types";
import { PRODUCT_CONFIG_STORAGE_KEY } from "@/lib/constants";

type SaveState = "idle" | "saving" | "saved" | "error";

function loadConfig(): ProductConfig {
  if (typeof window === "undefined") return DEFAULT_PRODUCT_CONFIG;
  try {
    const raw = localStorage.getItem(PRODUCT_CONFIG_STORAGE_KEY);
    if (!raw) return DEFAULT_PRODUCT_CONFIG;
    return { ...DEFAULT_PRODUCT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PRODUCT_CONFIG;
  }
}

function getInitialConfig(): ProductConfig {
  // Called once by useState lazy initializer — safe to read localStorage here.
  return loadConfig();
}

function saveConfig(config: ProductConfig): void {
  localStorage.setItem(PRODUCT_CONFIG_STORAGE_KEY, JSON.stringify(config));
}

export default function ProductSetupPage() {
  const [config, setConfig] = useState<ProductConfig>(DEFAULT_PRODUCT_CONFIG);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [hasChanges, setHasChanges] = useState(false);
  // isHydrated tracks whether we have loaded localStorage values.
  // We use a separate flag to avoid hydration mismatch on SSR.
  const [isHydrated, setIsHydrated] = useState(false);

  // Load persisted config after mount. Wrapped in startTransition as
  // recommended by the react-hooks/set-state-in-effect lint rule so React
  // can treat these as non-urgent state updates from an external system.
  useEffect(() => {
    const loaded = getInitialConfig();
    startTransition(() => {
      setConfig(loaded);
      setIsHydrated(true);
    });
  }, []); // empty: load once after mount

  function handleChange(field: keyof ProductConfig, value: string) {
    setConfig((c) => ({ ...c, [field]: value }));
    setHasChanges(true);
    setSaveState("idle");
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveState("saving");
    try {
      saveConfig(config);
      setSaveState("saved");
      setHasChanges(false);
      setTimeout(() => setSaveState("idle"), 2500);
    } catch {
      setSaveState("error");
    }
  }

  function handleReset() {
    if (
      !hasChanges ||
      window.confirm(
        "Reset to default FlowDesk configuration? Unsaved changes will be lost."
      )
    ) {
      setConfig(DEFAULT_PRODUCT_CONFIG);
      localStorage.removeItem(PRODUCT_CONFIG_STORAGE_KEY);
      setHasChanges(false);
      setSaveState("idle");
    }
  }

  const fields: Array<{
    key: keyof ProductConfig;
    label: string;
    hint: string;
    placeholder: string;
    multiline?: boolean;
    rows?: number;
  }> = [
    {
      key: "name",
      label: "Product Name",
      hint: "The name the AI will use when referring to the product.",
      placeholder: "FlowDesk",
    },
    {
      key: "description",
      label: "Description",
      hint: "One-paragraph pitch the AI will open with.",
      placeholder: "A modern project management platform…",
      multiline: true,
      rows: 3,
    },
    {
      key: "features",
      label: "Features & Benefits",
      hint: "Key selling points — one per line.",
      placeholder: "Smart task prioritisation\nReal-time collaboration\n…",
      multiline: true,
      rows: 5,
    },
    {
      key: "pricing",
      label: "Pricing",
      hint: "Tiers, prices, and billing terms.",
      placeholder: "Starter: Free\nPro: $12/user/month\n…",
      multiline: true,
      rows: 3,
    },
    {
      key: "targetAudience",
      label: "Target Audience",
      hint: "Describe the ideal customer the AI will tailor its pitch to.",
      placeholder: "Software teams of 5–200 people…",
      multiline: true,
      rows: 2,
    },
    {
      key: "objections",
      label: "Common Objections & Responses",
      hint: "Anticipated pushback and how the AI should respond — one objection per paragraph.",
      placeholder: "We already use Jira — FlowDesk integrates with Jira…\n\nIt looks expensive — most teams recoup…",
      multiline: true,
      rows: 6,
    },
    {
      key: "callToAction",
      label: "Call to Action",
      hint: "The specific next step the AI should steer the customer toward.",
      placeholder: "Start a free 14-day Pro trial — no credit card required",
    },
  ];

  return (
    <div className="page-container">
      {/* Page header */}
      <header className="page-header">
        <h1 className="page-title">Product Setup</h1>
        <p className="page-description">
          Configure the product knowledge used by the AI sales assistant.
        </p>
      </header>

      {/* Persistence notice */}
      <div
        style={{
          marginBottom: "1.5rem",
          padding: "0.75rem 1rem",
          background: "var(--surface-base)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          display: "flex",
          gap: "0.625rem",
          alignItems: "flex-start",
        }}
        role="note"
        aria-label="Storage notice"
      >
        <Info
          size={14}
          style={{ color: "var(--ink-tertiary)", flexShrink: 0, marginTop: "1px" }}
          aria-hidden="true"
        />
        <p
          style={{
            fontSize: "var(--font-size-xs)",
            color: "var(--ink-tertiary)",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          <strong>Local storage only.</strong> Changes are saved in your browser and
          have not yet been connected to Supabase. Settings will persist across page
          reloads but will not sync across devices or browsers until Phase 3
          persistence is implemented.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} aria-label="Product configuration form" noValidate>
        <div className="card" style={{ padding: "1.5rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1.25rem",
              gap: "0.75rem",
              flexWrap: "wrap",
            }}
          >
            <h2
              style={{
                fontSize: "var(--font-size-base)",
                fontWeight: 600,
                color: "var(--ink-primary)",
              }}
            >
              FlowDesk
            </h2>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "0.2rem 0.5rem",
                border: "1px solid var(--border-subtle)",
                borderRadius: "9999px",
                fontSize: "var(--font-size-xs)",
                color: "var(--ink-tertiary)",
                background: "var(--surface-base)",
              }}
            >
              Demo product
            </div>
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
          >
            {fields.map(({ key, label, hint, placeholder, multiline, rows }) => (
              <div key={key} className="field-group">
                <label className="field-label" htmlFor={`field-${key}`}>
                  {label}
                </label>
                {hint && (
                  <span
                    className="field-hint"
                    id={`hint-${key}`}
                    style={{ marginBottom: "0.25rem" }}
                  >
                    {hint}
                  </span>
                )}
                {multiline ? (
                  <textarea
                    id={`field-${key}`}
                    className="input"
                    placeholder={placeholder}
                    value={isHydrated ? config[key] : ""}
                    onChange={(e) => handleChange(key, e.target.value)}
                    rows={rows ?? 3}
                    aria-describedby={hint ? `hint-${key}` : undefined}
                  />
                ) : (
                  <input
                    id={`field-${key}`}
                    type="text"
                    className="input"
                    placeholder={placeholder}
                    value={isHydrated ? config[key] : ""}
                    onChange={(e) => handleChange(key, e.target.value)}
                    aria-describedby={hint ? `hint-${key}` : undefined}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Form actions */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              marginTop: "1.5rem",
              paddingTop: "1.25rem",
              borderTop: "1px solid var(--border-subtle)",
              flexWrap: "wrap",
            }}
          >
            <button
              type="submit"
              id="save-product-config"
              className="btn btn-primary"
              disabled={saveState === "saving" || !hasChanges}
              aria-live="polite"
            >
              <Save size={14} strokeWidth={2} />
              {saveState === "saving" ? "Saving…" : "Save Changes"}
            </button>

            <button
              type="button"
              id="reset-product-config"
              className="btn btn-secondary"
              onClick={handleReset}
              aria-label="Reset to default configuration"
            >
              <RotateCcw size={13} strokeWidth={2} />
              Reset to Default
            </button>

            {/* Save feedback */}
            {saveState === "saved" && (
              <div
                role="status"
                aria-live="polite"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                  fontSize: "var(--font-size-xs)",
                  color: "var(--status-success-ink)",
                  fontWeight: 500,
                }}
              >
                <CheckCircle2 size={13} aria-hidden="true" />
                Saved to local storage
              </div>
            )}

            {saveState === "error" && (
              <div
                role="alert"
                aria-live="assertive"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                  fontSize: "var(--font-size-xs)",
                  color: "var(--status-error-ink)",
                  fontWeight: 500,
                }}
              >
                <AlertCircle size={13} aria-hidden="true" />
                Could not save — check browser storage permissions
              </div>
            )}

            {hasChanges && saveState === "idle" && (
              <span
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--ink-tertiary)",
                }}
                role="status"
                aria-live="polite"
              >
                Unsaved changes
              </span>
            )}
          </div>
        </div>
      </form>

      {/* Future integration note */}
      <div
        style={{
          marginTop: "1.25rem",
          padding: "0.875rem 1rem",
          background: "var(--surface-base)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
        }}
      >
        <h3
          style={{
            fontSize: "var(--font-size-xs)",
            fontWeight: 600,
            color: "var(--ink-tertiary)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: "0.5rem",
          }}
        >
          Phase 2+ Integration
        </h3>
        <ul
          style={{
            margin: 0,
            paddingLeft: "1rem",
            fontSize: "var(--font-size-xs)",
            color: "var(--ink-tertiary)",
            lineHeight: 1.7,
          }}
        >
          <li>
            This configuration will be read by the Gemini Live system prompt to
            instruct the AI sales persona.
          </li>
          <li>
            Settings will be stored in Supabase when database integration lands
            in Phase 3.
          </li>
          <li>
            Multiple products / campaigns will be selectable per call session.
          </li>
        </ul>
      </div>
    </div>
  );
}
