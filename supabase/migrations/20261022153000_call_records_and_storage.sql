-- ==============================================================================
-- VoicePilot AI Sales — Call Records and Storage Migration
-- Migration: 20261022153000_call_records_and_storage.sql
--
-- Features:
-- 1. Persistent call_records table with RLS scoped to auth.uid()
-- 2. Support for Supabase Anonymous Auth (authenticated Postgres role with stable UUID)
-- 3. Strict check constraints for sales outcomes and post-call analysis status
-- 4. Private storage bucket 'call-recordings' with owner-scoped path security
-- ==============================================================================

-- Enable UUID extension if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── 1. Call Records Table ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.call_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
    
    -- Prospect details
    customer_name TEXT NOT NULL,
    customer_company TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    customer_notes TEXT,
    
    -- Product Context Snapshot
    product_name TEXT NOT NULL,
    product_context JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Consent & Recording
    recording_consent BOOLEAN NOT NULL DEFAULT false,
    transcript JSONB NOT NULL DEFAULT '[]'::jsonb,
    recording_path TEXT,
    recording_mime_type TEXT DEFAULT 'audio/webm',
    recording_size_bytes BIGINT,
    
    -- AI Post-Call Intelligence
    summary TEXT,
    customer_needs JSONB DEFAULT '[]'::jsonb,
    objections JSONB DEFAULT '[]'::jsonb,
    next_steps JSONB DEFAULT '[]'::jsonb,
    
    -- Outcome & Rationale (nullable until analysis completes)
    outcome TEXT CHECK (
        outcome IS NULL OR outcome IN (
            'converted',
            'interested',
            'follow_up_required',
            'not_interested',
            'demo_requested',
            'no_response'
        )
    ),
    outcome_reason TEXT,
    
    -- Analysis Lifecycle Status
    analysis_status TEXT NOT NULL DEFAULT 'pending' CHECK (
        analysis_status IN ('pending', 'complete', 'failed')
    ),
    analysis_error TEXT
);

-- ─── 2. Performance Indexes ──────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_call_records_owner_created 
    ON public.call_records (owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_call_records_owner_outcome 
    ON public.call_records (owner_id, outcome);

CREATE INDEX IF NOT EXISTS idx_call_records_status 
    ON public.call_records (owner_id, analysis_status);

-- ─── 3. Row Level Security (RLS) for call_records ───────────────────────────

ALTER TABLE public.call_records ENABLE ROW LEVEL SECURITY;

-- Anonymous users act via the 'authenticated' Postgres role in Supabase Auth.
-- Each policy ensures users can ONLY view, insert, update, or delete rows where owner_id matches auth.uid().

DROP POLICY IF EXISTS "Users can view their own call records" ON public.call_records;
CREATE POLICY "Users can view their own call records"
    ON public.call_records
    FOR SELECT
    TO authenticated
    USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can insert their own call records" ON public.call_records;
CREATE POLICY "Users can insert their own call records"
    ON public.call_records
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can update their own call records" ON public.call_records;
CREATE POLICY "Users can update their own call records"
    ON public.call_records
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can delete their own call records" ON public.call_records;
CREATE POLICY "Users can delete their own call records"
    ON public.call_records
    FOR DELETE
    TO authenticated
    USING (auth.uid() = owner_id);

-- ─── 4. Private Storage Bucket: call-recordings ──────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'call-recordings',
    'call-recordings',
    false, -- Strictly private: requires signed URLs for download/playback
    52428800, -- 50MB maximum recording file size
    ARRAY['audio/webm', 'audio/ogg', 'audio/wav', 'audio/mp4', 'audio/x-matroska']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['audio/webm', 'audio/ogg', 'audio/wav', 'audio/mp4', 'audio/x-matroska'];

-- ─── 5. Storage RLS Policies ────────────────────────────────────────────────
-- Recordings are strictly scoped to the owner folder: {owner_uuid}/{call_uuid}.webm

DROP POLICY IF EXISTS "Users can upload their own recordings" ON storage.objects;
CREATE POLICY "Users can upload their own recordings"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'call-recordings'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Users can view and download their own recordings" ON storage.objects;
CREATE POLICY "Users can view and download their own recordings"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'call-recordings'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Users can update their own recordings" ON storage.objects;
CREATE POLICY "Users can update their own recordings"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'call-recordings'
        AND (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
        bucket_id = 'call-recordings'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Users can delete their own recordings" ON storage.objects;
CREATE POLICY "Users can delete their own recordings"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'call-recordings'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );
