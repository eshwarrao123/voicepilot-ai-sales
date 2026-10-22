import {
  getSupabaseClient,
  isSupabaseConfigured,
  ensureAnonymousSession,
  getLastAuthError,
  dbRecordToCallRecord,
} from "@/lib/supabase/client";
import type { CustomerInfo, ProductConfig, TranscriptMessage, CallRecord, DbCallRecord, PostCallAnalysis } from "@/types";

export interface SaveCallParams {
  callId: string;
  customer: CustomerInfo;
  product: ProductConfig;
  consent: boolean;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  transcript: TranscriptMessage[];
  recordingBlob: Blob | null;
}

export type PersistenceResult =
  | { success: true; record: CallRecord; notice?: string }
  | { success: false; error: string; unconfigured?: boolean; partialRecord?: Partial<CallRecord> };

/**
 * Persists a completed voice call to Supabase:
 * 1. Verifies anonymous user identity
 * 2. Uploads dual-participant audio to private storage: {owner_id}/{call_id}.webm
 * 3. Triggers structured post-call AI analysis
 * 4. Inserts comprehensive call record into PostgreSQL under RLS
 * 5. Handles partial failures gracefully (e.g. analysis failure does not discard transcript/recording)
 */
export async function saveCompletedCall(params: SaveCallParams): Promise<PersistenceResult> {
  const {
    callId,
    customer,
    product,
    consent,
    startedAt,
    endedAt,
    durationSeconds,
    transcript,
    recordingBlob,
  } = params;

  // 1. Check if Supabase credentials are configured
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      unconfigured: true,
      error:
        "Supabase credentials (NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY) are not configured. The conversation and recording are preserved in local browser session only.",
    };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      success: false,
      unconfigured: true,
      error: "Failed to initialize Supabase client.",
    };
  }

  // 2. Ensure persistent anonymous user session
  const user = await ensureAnonymousSession();
  if (!user) {
    const authErr = getLastAuthError();
    return {
      success: false,
      error: authErr
        ? `Unable to save call: Supabase authentication unavailable (${authErr}).`
        : "Unable to establish an anonymous Supabase user session for storage.",
    };
  }

  let recordingPath: string | null = null;
  let recordingSizeBytes: number | null = null;
  let uploadNotice: string | undefined;

  // 3. Upload recording to private storage bucket if available
  if (recordingBlob && recordingBlob.size > 0) {
    const filePath = `${user.id}/${callId}.webm`;
    try {
      const { error: uploadErr } = await supabase.storage
        .from("call-recordings")
        .upload(filePath, recordingBlob, {
          contentType: "audio/webm",
          upsert: true,
        });

      if (uploadErr) {
        console.warn("Audio storage upload failed:", uploadErr.message);
        uploadNotice = `Audio storage upload failed (${uploadErr.message}). Transcript and intelligence preserved.`;
      } else {
        recordingPath = filePath;
        recordingSizeBytes = recordingBlob.size;
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      console.warn("Exception during audio recording upload:", e);
      uploadNotice = "Audio storage upload encountered an unexpected error. Transcript preserved.";
    }
  }

  // 4. Request structured post-call AI analysis from server endpoint
  let analysis: PostCallAnalysis | null = null;
  let analysisError: string | null = null;

  try {
    const analysisRes = await fetch("/api/calls/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript,
        product,
        customer,
      }),
    });

    if (analysisRes.ok) {
      const resData = await analysisRes.json();
      if (resData.success && resData.analysis) {
        analysis = resData.analysis as PostCallAnalysis;
      } else {
        analysisError = "Analysis endpoint returned unexpected data format.";
      }
    } else {
      const errData = await analysisRes.json().catch(() => ({}));
      analysisError = errData.error || `Analysis request failed with status ${analysisRes.status}.`;
    }
  } catch (err: unknown) {
    const e = err as { message?: string };
    console.warn("Exception requesting AI analysis:", e);
    analysisError = e.message || "Failed to contact analysis server.";
  }

  // 5. Insert call record into Supabase PostgreSQL
  const dbPayload = {
    id: callId,
    owner_id: user.id,
    started_at: startedAt,
    ended_at: endedAt,
    duration_seconds: durationSeconds,
    customer_name: customer.name || "Customer",
    customer_company: customer.company || null,
    customer_email: customer.email || null,
    customer_phone: customer.phone || null,
    customer_notes: customer.notes || null,
    product_name: product.name,
    product_context: product,
    recording_consent: consent,
    transcript: transcript,
    recording_path: recordingPath,
    recording_mime_type: "audio/webm",
    recording_size_bytes: recordingSizeBytes,
    summary: analysis?.summary || null,
    customer_needs: analysis?.customerNeeds || [],
    objections: analysis?.objections || [],
    next_steps: analysis?.nextSteps || [],
    outcome: analysis?.outcome || null,
    outcome_reason: analysis?.outcomeReason || null,
    analysis_status: analysis ? "complete" : "failed",
    analysis_error: analysisError,
  };

  try {
    const { data, error: insertError } = await supabase
      .from("call_records")
      .insert(dbPayload)
      .select()
      .single();

    if (insertError) {
      console.warn("[VoicePilot Supabase] Failed to insert call record:", insertError.message);

      // Attempt safe rollback of uploaded audio file if row insert fails
      if (recordingPath) {
        try {
          await supabase.storage.from("call-recordings").remove([recordingPath]);
        } catch {
          // Ignore storage cleanup errors on insert failure
        }
      }

      return {
        success: false,
        error: `Database insertion failed: ${insertError.message}`,
      };
    }

    const savedRecord = dbRecordToCallRecord(data as DbCallRecord);
    const combinedNotice = [uploadNotice, analysisError ? `AI summary unavailable: ${analysisError}` : null]
      .filter(Boolean)
      .join(" ");

    return {
      success: true,
      record: savedRecord,
      notice: combinedNotice || undefined,
    };
  } catch (err: unknown) {
    const e = err as { message?: string };
    return {
      success: false,
      error: `Unexpected error saving record: ${e.message || "Unknown error"}`,
    };
  }
}

/**
 * Retries structured AI analysis for an existing call record and updates the database row.
 */
export async function retryCallAnalysis(
  record: CallRecord,
  product?: ProductConfig
): Promise<{ success: boolean; record?: CallRecord; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, error: "Supabase client is not available." };
  }

  try {
    const analysisRes = await fetch("/api/calls/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript: record.transcript,
        product: product || record.productContext,
        customer: record.customer,
      }),
    });

    if (!analysisRes.ok) {
      const errData = await analysisRes.json().catch(() => ({}));
      return {
        success: false,
        error: errData.error || `Analysis failed with HTTP ${analysisRes.status}`,
      };
    }

    const { analysis } = (await analysisRes.json()) as { analysis: PostCallAnalysis };

    const { data, error: updateError } = await supabase
      .from("call_records")
      .update({
        summary: analysis.summary,
        customer_needs: analysis.customerNeeds,
        objections: analysis.objections,
        next_steps: analysis.nextSteps,
        outcome: analysis.outcome,
        outcome_reason: analysis.outcomeReason,
        analysis_status: "complete",
        analysis_error: null,
      })
      .eq("id", record.id)
      .select()
      .single();

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true, record: dbRecordToCallRecord(data as DbCallRecord) };
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { success: false, error: e.message || "Failed to retry analysis." };
  }
}
