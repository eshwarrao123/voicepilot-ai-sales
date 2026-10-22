import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { CallRecord, DbCallRecord } from "@/types";

let browserClient: SupabaseClient | null = null;
let sessionPromise: Promise<User | null> | null = null;

/**
 * Resolve the Supabase publishable / anon key.
 * Prefers the modern NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (value begins with
 * "sb_publishable_") and falls back to the legacy NEXT_PUBLIC_SUPABASE_ANON_KEY
 * so that existing deployments are not broken.
 */
function resolveSupabaseKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Check if the public Supabase environment variables are available.
 * Accepts either the modern publishable key or the legacy anon key.
 * Does not throw; allows graceful UI degradation when unconfigured.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && resolveSupabaseKey());
}

/**
 * Get or create the singleton browser Supabase client.
 * Returns null if environment variables are not configured.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (typeof window === "undefined") {
    // Return a lightweight client for SSR if configured
    if (!isSupabaseConfigured()) return null;
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      resolveSupabaseKey()!
    );
  }

  if (browserClient) {
    return browserClient;
  }

  if (!isSupabaseConfigured()) {
    return null;
  }

  browserClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    resolveSupabaseKey()!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    }
  );

  return browserClient;
}

/**
 * Ensure a persistent anonymous user session exists for this browser.
 * Deduplicates concurrent calls (e.g. React Strict Mode or parallel component mounts)
 * using a shared in-flight promise to prevent duplicate user account creation.
 */
export async function ensureAnonymousSession(): Promise<User | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const client = getSupabaseClient();
  if (!client) return null;

  // If a sign-in or session check is already in-flight, return the shared promise
  if (sessionPromise) {
    return sessionPromise;
  }

  sessionPromise = (async () => {
    try {
      // 1. Check existing persisted session in localStorage
      const {
        data: { session },
        error: sessionError,
      } = await client.auth.getSession();

      if (sessionError) {
        console.warn("Supabase session retrieval warning:", sessionError.message);
      }

      if (session?.user) {
        return session.user;
      }

      // 2. Perform anonymous sign-in if no active session
      const { data, error: anonError } = await client.auth.signInAnonymously();
      if (anonError) {
        console.error("Supabase anonymous sign-in failed:", anonError.message);
        return null;
      }

      return data?.user ?? null;
    } catch (err) {
      console.error("Unexpected error initializing anonymous Supabase session:", err);
      return null;
    } finally {
      sessionPromise = null;
    }
  })();

  return sessionPromise;
}

/**
 * Generate a short-lived signed URL for audio recording playback or download.
 * Expiration defaults to 1 hour (3600 seconds).
 */
export async function getSignedRecordingUrl(
  path: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client || !path) return null;

  try {
    const { data, error } = await client.storage
      .from("call-recordings")
      .createSignedUrl(path, expiresInSeconds);

    if (error || !data?.signedUrl) {
      console.error("Failed to generate signed URL for recording:", error?.message);
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    console.error("Error generating signed recording URL:", err);
    return null;
  }
}

/**
 * Transform a database row into the domain CallRecord model.
 */
export function dbRecordToCallRecord(db: DbCallRecord): CallRecord {
  return {
    id: db.id,
    ownerId: db.owner_id,
    createdAt: db.created_at,
    startedAt: db.started_at,
    endedAt: db.ended_at ?? undefined,
    durationSeconds: db.duration_seconds,
    customer: {
      name: db.customer_name,
      company: db.customer_company ?? "",
      email: db.customer_email ?? "",
      phone: db.customer_phone ?? "",
      notes: db.customer_notes ?? "",
    },
    productName: db.product_name,
    productContext: db.product_context,
    transcript: db.transcript ?? [],
    recordingPath: db.recording_path ?? undefined,
    recordingSizeBytes: db.recording_size_bytes ?? undefined,
    recordingMimeType: db.recording_mime_type ?? undefined,
    summary: db.summary ?? undefined,
    customerNeeds: db.customer_needs ?? [],
    objectionsList: db.objections ?? [],
    nextStepsList: db.next_steps ?? [],
    outcome: db.outcome ?? undefined,
    outcomeReason: db.outcome_reason ?? undefined,
    analysisStatus: db.analysis_status,
    analysisError: db.analysis_error ?? undefined,
    recordingConsent: db.recording_consent,
  };
}
