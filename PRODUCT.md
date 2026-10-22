# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS v4, Lucide React

## Users

SDRs (Sales Development Representatives), Account Executives, and Sales Leads evaluating or using AI voice agents for inbound lead qualification and outbound customer discovery.

## Product Purpose

VoicePilot is an AI Sales Studio designed to conduct real, synchronous voice conversations with prospects, provide a live transcript, record calls with verified consent, summarize discussions, classify sales outcomes, and preserve call history for continuous sales coaching and pipeline management.

## Positioning

Unlike generic AI voice wrappers or synthetic demo dashboards, VoicePilot couples real-time conversational voice intelligence (Gemini Live) directly to editable product knowledge and objection-handling playbooks (demonstrated with FlowDesk SaaS), yielding structured CRM-ready call records and transparent sales classification.

## Operating Context

Modern desktop and tablet browsers used in office and remote sales environments. Fast-paced discovery workflows requiring low cognitive load, instantaneous visual feedback on call state, and legible live transcription.

## Capabilities and Constraints

- **Phase 1 (Current)**: Application shell, responsive navigation layout, Overview dashboard with honest zero-data states, Live Call workspace scaffold, Call History schema preview, typed FlowDesk product configuration with browser persistence.
- **Phase 2 (Next)**: Real-time Gemini Live Web Audio streaming, bidirectional microphone session, live transcript streaming, customer-consented audio recording.
- **Phase 3 (Planned)**: Supabase PostgreSQL persistence, Supabase Storage for private call audio recordings, AI conversation summary, objection extraction, and sales outcome classification.
- **Security & Privacy Constraints**: Permanent Gemini API keys and Supabase service role keys must never touch client code. Explicit consent is required prior to recording.

## Brand Commitments

- Polished, deliberate sales-operations aesthetic: crisp slate/ink typography, neutral light surfaces, and a restrained teal/blue accent.
- Strictly no generic AI purple gradients, glowing borders, or fabricated metrics.

## Evidence on Hand

- Default demonstration product playbook: FlowDesk SaaS project collaboration platform (`src/types/index.ts`).
- Defined 6 sales outcome categories: Converted, Interested, Follow-up Required, Not Interested, Demo Requested, No Response.

## Product Principles

1. **Truth in Interface**: Never simulate call connectivity, fake transcripts, or fabricate metrics. An empty state is honest and clear.
2. **Explicit Consent**: Call recording is strictly gated behind clear customer consent controls and visible indicators.
3. **Clarity under Pressure**: High-contrast, scannable layouts tailored for real-time sales interactions.
4. **Pragmatic Simplicity**: Prefer web standards and clean component structure over premature architectural layers.
