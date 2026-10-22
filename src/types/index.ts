/**
 * VoicePilot — Core Domain Types
 *
 * These types define the data contracts for the entire application.
 * They are intentionally simple and flat; avoid premature abstraction.
 */

// ─── Sales Outcome ──────────────────────────────────────────────────────────

export type SalesOutcome =
  | 'converted'
  | 'interested'
  | 'follow_up_required'
  | 'not_interested'
  | 'demo_requested'
  | 'no_response';

export const SALES_OUTCOME_LABELS: Record<SalesOutcome, string> = {
  converted: 'Converted',
  interested: 'Interested',
  follow_up_required: 'Follow-up Required',
  not_interested: 'Not Interested',
  demo_requested: 'Demo Requested',
  no_response: 'No Response',
};

// ─── Transcript ──────────────────────────────────────────────────────────────

export type Speaker = 'ai' | 'customer';

export interface TranscriptMessage {
  id: string;
  speaker: Speaker;
  text: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Whether this is an interim transcription chunk currently streaming */
  isInterim?: boolean;
}

// ─── Product Configuration ───────────────────────────────────────────────────

export interface ProductConfig {
  /** Product display name */
  name: string;
  /** One-paragraph pitch / description */
  description: string;
  /** Key feature bullet points (free text, newline-separated or array) */
  features: string;
  /** Pricing details */
  pricing: string;
  /** Who this product is for */
  targetAudience: string;
  /** Common objections and how to handle them */
  objections: string;
  /** Desired call-to-action (e.g. "Book a free trial") */
  callToAction: string;
}

export const DEFAULT_PRODUCT_CONFIG: ProductConfig = {
  name: 'FlowDesk',
  description:
    'FlowDesk is a modern project management and team collaboration platform built for fast-moving software teams. It replaces scattered task boards, endless Slack threads, and fragmented docs with a single, intelligent workspace.',
  features:
    'Smart task prioritisation with AI-powered workload balancing\nReal-time collaborative docs and wikis\nGitHub, Jira, and Slack integrations\nBuilt-in time tracking and sprint planning\nCustomisable dashboards and reporting',
  pricing:
    'Starter: Free for up to 5 users\nPro: $12 per user / month (billed annually)\nEnterprise: Custom pricing — contact sales',
  targetAudience:
    'Software engineering teams of 5–200 people, product managers, and startup CTOs looking to consolidate tooling and reduce context switching.',
  objections:
    'We already use Jira — FlowDesk integrates with Jira, so teams can migrate gradually without disrupting existing workflows.\nIt looks expensive — most teams recoup the cost within a month through time saved on status updates and fewer missed deadlines.\nWe need something enterprise-grade — FlowDesk offers SOC 2 Type II compliance, SSO, and dedicated account management on Enterprise.',
  callToAction: 'Start a free 14-day Pro trial — no credit card required',
};

// ─── Customer / Lead ─────────────────────────────────────────────────────────

export interface CustomerInfo {
  name: string;
  company: string;
  email: string;
  phone: string;
  /** Brief context about the lead */
  notes: string;
}

// ─── Call Record ─────────────────────────────────────────────────────────────

export type CallStatus = 'idle' | 'connecting' | 'active' | 'ended' | 'error';
export type AnalysisStatus = 'pending' | 'complete' | 'failed';

export interface PostCallAnalysis {
  summary: string;
  customerNeeds: string[];
  objections: string[];
  nextSteps: string[];
  outcome: SalesOutcome;
  outcomeReason: string;
}

export interface CallRecord {
  id: string;
  ownerId?: string;
  createdAt?: string;
  /** ISO 8601 */
  startedAt: string;
  /** ISO 8601, undefined if call is still active */
  endedAt?: string;
  /** Duration in seconds */
  durationSeconds: number;
  customer: CustomerInfo;
  productName?: string;
  productContext?: ProductConfig;
  transcript: TranscriptMessage[];
  /** Signed URL or local preview URL for playback */
  recordingUrl?: string;
  /** Private Supabase Storage object path */
  recordingPath?: string;
  recordingSizeBytes?: number;
  recordingMimeType?: string;
  /** AI-generated summary */
  summary?: string;
  /** Extracted customer needs */
  customerNeeds?: string[];
  /** Extracted objections */
  objectionsList?: string[];
  /** Recommended next steps */
  nextStepsList?: string[];
  /** Sales outcome classification */
  outcome?: SalesOutcome;
  /** Rationale for outcome grounded in transcript */
  outcomeReason?: string;
  /** Analysis lifecycle status */
  analysisStatus?: AnalysisStatus;
  analysisError?: string;
  /** Whether the customer consented to recording */
  recordingConsent: boolean;
}

/** Raw database record shape matching call_records table in Supabase */
export interface DbCallRecord {
  id: string;
  owner_id: string;
  created_at: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  customer_name: string;
  customer_company: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_notes: string | null;
  product_name: string;
  product_context: ProductConfig;
  recording_consent: boolean;
  transcript: TranscriptMessage[];
  recording_path: string | null;
  recording_mime_type: string | null;
  recording_size_bytes: number | null;
  summary: string | null;
  customer_needs: string[] | null;
  objections: string[] | null;
  next_steps: string[] | null;
  outcome: SalesOutcome | null;
  outcome_reason: string | null;
  analysis_status: AnalysisStatus;
  analysis_error: string | null;
}

