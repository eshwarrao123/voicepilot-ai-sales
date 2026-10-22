# VoicePilot — AI Sales Studio

VoicePilot is an AI-powered voice sales assistant built for the Sankar Group internship assessment. It conducts real, bidirectional voice conversations with prospects, displays a live speech transcript, records calls with customer consent into a combined dual-track audio file, provides immediate audio playback/download, and establishes the foundation for AI summaries and sales outcome classification.

---

## Technology Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 + CSS Design System |
| Icons | lucide-react |
| Voice AI | Official `@google/genai` SDK — Gemini Live WebSocket |
| Audio Pipeline | Web Audio API (PCM 16kHz capture, 24kHz playback, mixer) + MediaRecorder |
| Persistence | Supabase PostgreSQL + Storage *(Phase 3)* |
| Deployment | Vercel *(planned)* |

---

## Prerequisites

- Node.js ≥ 20
- npm ≥ 10
- A modern desktop or mobile browser with microphone support (Chrome, Edge, Safari, Firefox)
- A Google Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)

---

## Installation

```bash
git clone https://github.com/eshwarrao123/voicepilot-ai-sales.git
cd voicepilot-ai-sales
npm install
```

---

## Environment Configuration

Create a `.env.local` file in the project root:

```bash
cp .env.example .env.local
```

Add your Gemini API key:

```dotenv
GEMINI_API_KEY=your_actual_gemini_api_key_here
GEMINI_LIVE_MODEL=gemini-3.8-live
```

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes (Phase 2) | Server-side only. Used exclusively by `/api/live/token` to mint short-lived ephemeral tokens. Never bundled into browser assets. |
| `GEMINI_LIVE_MODEL` | Optional | Defaults to `gemini-3.8-live`. Can be set to `gemini-2.0-flash-exp` or other supported Live models. |
| `NEXT_PUBLIC_SUPABASE_URL` | Phase 3 | Supabase project URL for database persistence. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Phase 3 | Supabase public anon key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Phase 3 | Server-side key for storage uploads and summary jobs. |

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
| `npm run dev` | Start development server with Turbopack |
| `npm run build` | Build production bundle |
| `npm run start` | Serve production build |
| `npm run lint` | Run ESLint check |

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── live/
│   │       └── token/
│   │           └── route.ts  # Ephemeral token provisioning route (server-side only)
│   ├── layout.tsx            # Root layout with Inter font and AppShell
│   ├── globals.css           # Design tokens, accessible component classes
│   ├── page.tsx              # Overview dashboard
│   ├── call/
│   │   ├── layout.tsx        # Call studio metadata
│   │   └── page.tsx          # Live Call Studio (real voice session UI)
│   ├── history/
│   │   └── page.tsx          # Call History view
│   └── setup/
│       ├── layout.tsx        # Product setup metadata
│       └── page.tsx          # Product Setup form (FlowDesk configuration)
├── components/
│   └── layout/
│       └── AppShell.tsx      # Persistent responsive navigation
├── hooks/
│   └── useLiveSession.ts     # Complete Gemini Live session coordinator & lifecycle hook
├── lib/
│   ├── audio/
│   │   ├── pcm.ts            # Float32 <-> Int16 PCM conversions, downsampling, base64
│   │   └── audioMixer.ts     # Web Audio mixer, 24kHz playback, combined MediaRecorder
│   ├── constants.ts          # Navigation items, storage keys, badge styles
│   └── utils.ts              # Formatters and ID generators
└── types/
    └── index.ts              # Domain types: ProductConfig, CallRecord, SalesOutcome, etc.
```

---

## Implemented Capabilities (Phases 1 & 2)

- [x] **Secure Ephemeral Token Provisioning (`/api/live/token`)**:
  - The permanent `GEMINI_API_KEY` stays on the server.
  - Ephemeral tokens are minted using `@google/genai` `ai.authTokens.create` with `uses: 1` and 30-minute expiration.
  - Constraints lock in audio response modalities, natural voice configuration (`Aoede`), and transcription configs.
- [x] **Dynamic AI Salesperson Persona**:
  - Automatically loads the configured product from the Product Setup page (FlowDesk by default).
  - Prompts the model to introduce itself as an AI sales assistant, ask discovery questions, handle objections strictly based on confirmed product facts, and steer toward the call to action.
- [x] **Bidirectional Audio Engine**:
  - Captures browser microphone, downsamples to 16kHz 16-bit linear PCM, and streams real-time audio chunks via WebSocket.
  - Decodes and plays incoming 24kHz PCM audio chunks gaplessly using the Web Audio API.
  - Automatic barge-in / interruption handling: immediately cancels queued audio playback when the customer speaks over the AI.
- [x] **Live Speech Transcription**:
  - Displays real-time customer and AI speech in a dedicated conversational transcript panel.
  - Distinguishes streaming / interim speech with an active speaking indicator.
- [x] **Recording Consent Enforcement**:
  - Mandatory confirmation checkbox: *"I confirm that the customer has been informed and has explicitly consented to this call being recorded."*
  - The call cannot be started without explicit consent.
- [x] **Dual-Participant Recording**:
  - Uses a Web Audio `MediaStreamAudioDestinationNode` to mix the customer's microphone stream and the AI's playback audio into a single unified stream.
  - The user's microphone is **not** looped back to their speakers (preventing echo/feedback).
  - MediaRecorder records the mixed stream into a playable `.webm` file.
  - HTML audio player preview and one-click download after call completion.

---

## Reserved for Future Phases

### Phase 3 — Database Persistence & AI Analysis
- Store completed call records and transcripts in Supabase PostgreSQL (`call_records` table).
- Automatically upload recorded `.webm` audio files to private Supabase Storage buckets with signed URL playback.
- Run post-call LLM analysis to generate structured call summaries, customer needs, and objection logs.
- Classify final sales outcome into one of the 6 typed categories (`Converted`, `Interested`, `Follow-up Required`, `Not Interested`, `Demo Requested`, `No Response`).
- Populate the Call History page with searchable, filterable call records.

### Phase 4 — Production Polish & Deployment
- Deploy to Vercel with environment variables.
- User authentication and role-based access.

---

## How to Test the Voice Engine

1. **Verify Credentials**:
   - Ensure `GEMINI_API_KEY` is set in your `.env.local` file.
   - If not set, clicking "Start Call" will cleanly report that the key is missing without crashing or faking a connection.
2. **Launch Development Server**:
   ```bash
   npm run dev
   ```
3. **Open Live Call Studio**:
   - Navigate to [http://localhost:3000/call](http://localhost:3000/call).
   - Enter a prospect name (e.g., "Sarah Chen").
   - Check the **Recording Consent** checkbox.
   - Click **Start Call**.
4. **Grant Microphone Permission**:
   - The browser will prompt for microphone access. Allow it.
5. **Conduct Voice Conversation**:
   - The AI will introduce itself ("Hello Sarah! I'm Alex, an AI sales assistant with FlowDesk...").
   - Speak into your microphone to respond.
   - Watch the transcript stream live with customer speech and AI speech.
   - Try interrupting the AI while it speaks to verify barge-in.
6. **End Call & Verify Recording**:
   - Click **End Call**.
   - Review the completed call recording card:
     - Listen to the playback preview in the `<audio>` player to hear both your voice and the AI's voice.
     - Click **Download Recording (.webm)** to verify the downloaded file is playable.
