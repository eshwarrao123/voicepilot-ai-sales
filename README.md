# VoicePilot — AI Sales Studio

VoicePilot is a complete, data-driven AI voice sales application built for the Sankar Group internship assessment. It conducts genuine, bidirectional real-time voice conversations with prospects, displays live transcripts, records dual-participant audio with consent, securely persists call records and private recordings in Supabase under Row Level Security, generates structured post-call intelligence using Gemini, and provides real activity metrics and call history.

---

## Technology Stack

| Layer | Implementation |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 + Vanilla CSS Design System |
| Real-Time Voice | Official `@google/genai` SDK — Gemini Live WebSocket (`gemini-3.8-live`, `v1alpha`) |
| Audio Pipeline | Web Audio API (16kHz PCM downsampler, 24kHz gapless playback queue, mixer) + `MediaRecorder` |
| Database & RLS | Supabase PostgreSQL with Row Level Security (RLS) policies |
| Authentication | Supabase Anonymous Auth (browser session persistence without registration forms) |
| Audio Storage | Private Supabase Storage bucket (`call-recordings`) with short-lived signed URLs |
| Sales Intelligence | Gemini (`gemini-3.8-flash`) server-side structured JSON analysis |
| Testing | Playwright E2E and component specification test suite |

---

## Architecture & Data Flow

```
+-----------------------------------------------------------------------------------------+
|                                    BROWSER CLIENT                                       |
|                                                                                         |
|  [Microphone 16kHz PCM]   --->   useLiveSession (WebSocket)   <---   [Gemini Live Audio]|
|           |                                                                 |           |
|           +----------------->   AudioMixer (Combined Stream) <--------------+           |
|                                            |                                            |
|                                   MediaRecorder (.webm)                                 |
|                                            |                                            |
|                                  Call Ended Trigger                                     |
+--------------------------------------------|--------------------------------------------+
                                             |
             +-------------------------------+-------------------------------+
             |                                                               |
             v                                                               v
+--------------------------+                                    +--------------------------+
|  Supabase Storage Bucket |                                    | Next.js Route Handler    |
|     (call-recordings)    |                                    |   (/api/calls/analyze)   |
|                          |                                    |                          |
|  Upload dual-track audio |                                    | Structured text analysis |
|  Path: {uid}/{callId}    |                                    | Model: gemini-3.8-flash  |
|  Strict RLS Access       |                                    | Enforce 6 typed outcomes |
+--------------------------+                                    +--------------------------+
             |                                                               |
             +-------------------------------+-------------------------------+
                                             |
                                             v
                          +------------------------------------+
                          |       Supabase PostgreSQL          |
                          |          (call_records)            |
                          |                                    |
                          |  - Call metadata & timestamps      |
                          |  - Full transcript JSONB           |
                          |  - Storage recording path          |
                          |  - AI summary, needs & objections  |
                          |  - Permitted sales outcome         |
                          |  - Owner-scoped RLS policies       |
                          +------------------------------------+
                                             |
                   +-------------------------+-------------------------+
                   |                                                   |
                   v                                                   v
        +----------------------+                            +----------------------+
        |     Overview (/)     |                            |  Call History (/history) |
        |                      |                            |                      |
        | - Total Calls count  |                            | - Filterable records |
        | - Conversion rate    |                            | - Full transcripts   |
        | - Interested leads   |                            | - AI summaries       |
        | - Follow-ups needed  |                            | - Signed audio player|
        | - Recent calls list  |                            | - Download actions   |
        +----------------------+                            +----------------------+
```

---

## Prerequisites

- Node.js ≥ 20
- npm ≥ 10
- A modern desktop or mobile browser with microphone support (Chrome, Edge, Safari, Firefox)
- A Google Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)
- A free [Supabase](https://supabase.com) account and project

---

## Manual Supabase Setup Guide

To enable persistent call records and private recording storage, configure your Supabase project in the Supabase Dashboard:

### 1. Create a Supabase Project
1. Log in to [Supabase](https://supabase.com/dashboard).
2. Click **New Project**, choose an organization, set a project name (e.g. `voicepilot-sales`), and set a secure database password.
3. Wait for the project infrastructure to provision.

### 2. Enable Anonymous Sign-Ins
VoicePilot uses Supabase Anonymous Auth so internship assessors and demo users can interact immediately without entering an email or password:
1. In your Supabase Dashboard, navigate to **Authentication** -> **Providers**.
2. Scroll to the **Anonymous Sign-ins** provider.
3. Toggle **Enable Anonymous Sign-ins** to **ON** and click **Save**.

> **Note on Anonymous Sessions**: Anonymous identities are persisted in browser `localStorage`. Calls made in one browser profile are preserved across route changes and page refreshes. Clearing browser storage generates a fresh anonymous identity.

### 3. Apply the Database Migration
1. In your Supabase Dashboard, open the **SQL Editor** from the left navigation.
2. Click **New Query**.
3. Open the migration file in this repository:
   `supabase/migrations/20261022153000_call_records_and_storage.sql`
4. Copy the entire contents of that SQL file into the SQL Editor.
5. Click **Run** to execute the script.
6. Verify in **Table Editor** that `public.call_records` exists, and in **Storage** that the private bucket `call-recordings` was created.

---

## Environment Configuration

Configure the required variables in your local environment file (e.g. `.env.local`):

```dotenv
# Gemini API credentials (Server-Side Only)
GEMINI_API_KEY=your_actual_gemini_api_key_here
GEMINI_LIVE_MODEL=gemini-3.8-live
GEMINI_ANALYSIS_MODEL=gemini-3.8-flash

# Supabase Public Configuration (Browser & Server)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_public_key_here
```

### Environment Variable Reference

| Variable | Scope | Required | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | Server | Yes | Used exclusively by `/api/live/token` and `/api/calls/analyze`. Never exposed to client bundles. |
| `GEMINI_LIVE_MODEL` | Server | Optional | Voice model for real-time Live WebSocket calls. Defaults to `gemini-3.8-live`. |
| `GEMINI_ANALYSIS_MODEL` | Server | Optional | Text model for post-call structured intelligence. Defaults to `gemini-3.8-flash`. |
| `NEXT_PUBLIC_SUPABASE_URL` | Client/Server | Yes | Your Supabase project URL (e.g. `https://xyz.supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client/Server | Yes | Your Supabase public anonymous/publishable key. Safe for browser usage under RLS. |

> **Security Note**: Never expose `SUPABASE_SERVICE_ROLE_KEY` or `GEMINI_API_KEY` in client code. Row Level Security policies enforce that anonymous users can only access their own call rows and storage objects matching their `auth.uid()`.

---

## Local Development & Validation

### Start the Next.js Application
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

### Run Verification & Quality Checks
```bash
# Type check TypeScript definitions
npx tsc --noEmit

# Run ESLint validation
npm run lint

# Build optimized production bundle
npm run build

# Execute Playwright browser test suite
npx playwright test
```

---

## Verifying a Completed Voice Call End-to-End

1. **Product Setup**:
   - Navigate to **Product Setup** (`/setup`) to customize the product pitch, objections, and call-to-action (defaults to FlowDesk).
2. **Start Live Call**:
   - Go to **Live Call Studio** (`/call`).
   - Enter prospect name (e.g. "Sarah Chen") and company.
   - Confirm **Recording Consent** and click **Start Call**.
   - Speak with the AI salesperson Alex and discuss features and objections.
3. **End & Persist**:
   - Click **End Call**.
   - Watch the persistence lifecycle:
     - Saving state indicator appears.
     - Mixed dual-track audio (`.webm`) uploads to private storage `{owner_id}/{call_id}.webm`.
     - Server triggers structured post-call analysis via `gemini-3.8-flash`.
     - Full record is saved to `call_records`.
     - Sales Intelligence card displays outcome badge, summary, needs, and next steps.
4. **Call History & Playback**:
   - Navigate to **Call History** (`/history`).
   - The saved record appears immediately.
   - Expand the record to view the chronological transcript and AI intelligence.
   - Click to play the audio: VoicePilot generates a short-lived signed URL (valid for 1 hour).
   - Test date and outcome filters.
5. **Overview Metrics**:
   - Navigate to **Overview** (`/`).
   - Total Calls, Conversion Rate, Interested Leads, and Follow-ups Needed reflect the actual saved database records.

---

## Sales Outcome Classification Rules

Post-call intelligence enforces strict classification into one of six domain categories:

| Outcome | Criteria |
|---|---|
| `converted` | The customer explicitly agreed to purchase or committed to buy on the call. |
| `interested` | The customer expressed clear interest but has not yet booked a demo or finalized purchase. |
| `demo_requested` | The customer explicitly agreed to or requested a demonstration or product walkthrough. |
| `follow_up_required` | A follow-up call, email, or meeting was identified as the required next step. |
| `not_interested` | The customer explicitly declined, expressed lack of fit, or rejected the pitch. |
| `no_response` | The call connected, but no verbal customer response was captured (handled deterministically). |

---

## Partial Failure Resiliency

- **Analysis Failure**: If an AI request fails or times out, the call record and recording are still safely preserved with `analysis_status = 'failed'`. A **Retry Analysis** action is provided on both the Call Studio page and Call History.
- **Unconfigured Supabase**: If Supabase credentials have not been configured, the application degrades gracefully. The call audio and transcript remain playable in local browser session memory, with clear instructions to configure environment keys.
- **Rollback Protection**: If database insertion fails after storage upload, VoicePilot attempts safe rollback of the orphaned storage file.
