# VoicePilot — AI Sales Studio

VoicePilot is an AI-powered voice sales assistant built for the Sankar Group internship assessment. It conducts real voice conversations with prospects, displays a live transcript, records calls with consent, generates AI summaries, classifies sales outcomes, and preserves a searchable call history.

---

## Technology Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 + custom CSS design system |
| Icons | lucide-react |
| Voice AI | `@google/genai` — Gemini Live *(Phase 2)* |
| Persistence | Supabase PostgreSQL + Storage *(Phase 3)* |
| Deployment | Vercel *(planned)* |

---

## Prerequisites

- Node.js ≥ 20
- npm ≥ 10
- A modern browser with microphone support (for Phase 2+)

---

## Installation

```bash
git clone <repository-url>
cd voicepilot-ai-sales
npm install
```

---

## Environment Configuration

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

| Variable | Required | Notes |
|---|---|---|
| `GEMINI_API_KEY` | Phase 2 | Server-side only. Never expose in browser code. |
| `NEXT_PUBLIC_SUPABASE_URL` | Phase 3 | Public — safe in client code. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Phase 3 | Public — safe in client code. |
| `SUPABASE_SERVICE_ROLE_KEY` | Phase 3 | Server-side only. Never expose in browser code. |

> `.env.local` is excluded from Git via `.gitignore`. Do **not** commit real credentials.

---

## Local Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build production bundle |
| `npm run start` | Serve production build |
| `npm run lint` | Run ESLint |

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout (Inter font, AppShell)
│   ├── globals.css         # Design system — tokens, component classes
│   ├── page.tsx            # Overview dashboard
│   ├── call/
│   │   ├── layout.tsx      # Metadata for call route
│   │   └── page.tsx        # Live Call workspace (client)
│   ├── history/
│   │   └── page.tsx        # Call History (server)
│   └── setup/
│       ├── layout.tsx      # Metadata for setup route
│       └── page.tsx        # Product Setup form (client)
├── components/
│   └── layout/
│       └── AppShell.tsx    # Sidebar navigation (client)
├── lib/
│   ├── constants.ts        # Nav items, storage keys, badge classes
│   └── utils.ts            # Duration, date, ID utilities
└── types/
    └── index.ts            # Domain types: ProductConfig, CallRecord, etc.
```

---

## Implemented Capabilities (Phase 1)

- ✅ Responsive application shell with sidebar navigation
- ✅ Overview page with honest empty states (no fabricated metrics)
- ✅ Live Call workspace: customer details, call controls, elapsed timer, recording consent panel, transcript panel
- ✅ Call History page with planned-schema preview and empty state
- ✅ Product Setup form (FlowDesk) with localStorage persistence, save/reset, and field validation states
- ✅ Typed domain models: `ProductConfig`, `CallRecord`, `TranscriptMessage`, `SalesOutcome`
- ✅ Design system: CSS custom properties, component classes, accessible focus styles, reduced-motion support
- ✅ `.env.example` with documented variable names

---

## Reserved for Future Phases

### Phase 2 — Voice Engine
- Gemini Live API integration via `@google/genai`
- Microphone capture and streaming using browser Web Audio / MediaStream APIs
- Short-lived ephemeral token generation (server-side Route Handler) to avoid exposing `GEMINI_API_KEY` in client code
- Live transcript streaming into the call workspace
- Combined call recording (AI + customer) using MediaRecorder
- Elapsed-timer lifecycle tied to real session state
- Mute/unmute wired to the microphone track

### Phase 3 — Persistence & AI Analysis
- Supabase schema: `call_records`, `transcripts`, `product_configs`
- AI-generated conversation summary and objection/need extraction via Gemini
- Sales-outcome classification (`SalesOutcome` enum is already typed)
- Audio upload to Supabase Storage with private signed URLs for playback
- Call History populated with real records, filterable by outcome and date

### Phase 4 — Deployment & Polish
- Vercel deployment with environment variables set in dashboard
- Authentication (Supabase Auth or Clerk)
- Multi-product / campaign switching
- Performance: streamed Server Components, optimised bundle

---

## Security Notes

- `GEMINI_API_KEY` must **never** appear in browser bundles or be returned by API responses. Generate short-lived ephemeral tokens server-side.
- `SUPABASE_SERVICE_ROLE_KEY` must remain server-side only.
- Call recordings require explicit customer consent — the UI enforces this through the recording-consent checkbox.
- Audio files in Supabase Storage will use private buckets with signed URLs; they will never be publicly accessible.

---

## Manual Verification Checklist (Phase 1)

- [ ] `npm run dev` starts without errors
- [ ] Root route `/` loads the Overview page
- [ ] Navigation reaches `/call`, `/history`, and `/setup`
- [ ] Active nav link is highlighted correctly
- [ ] Product Setup form loads FlowDesk defaults
- [ ] Editing a field and saving shows "Saved to local storage" feedback
- [ ] Reset to Default restores original values
- [ ] Live Call start requires a customer name
- [ ] Recording consent checkbox is present and labelled
- [ ] Transcript panel shows correct empty-state copy per call status
- [ ] Layout does not overflow at 375px viewport width
- [ ] Focus indicators are visible on all interactive elements
- [ ] No runtime errors in browser console
