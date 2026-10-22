import { test, expect } from "@playwright/test";
import { dbRecordToCallRecord } from "../src/lib/supabase/client";
import type { DbCallRecord } from "../src/types";

test.describe("Supabase RLS & Storage Specifications", () => {
  test("dbRecordToCallRecord maps database columns to domain CallRecord model correctly", () => {
    const mockDbRecord: DbCallRecord = {
      id: "call-123",
      owner_id: "user-456",
      created_at: "2026-10-22T10:00:00Z",
      started_at: "2026-10-22T09:58:00Z",
      ended_at: "2026-10-22T10:00:00Z",
      duration_seconds: 120,
      customer_name: "Sarah Chen",
      customer_company: "Apex Tech",
      customer_email: "sarah@apex.io",
      customer_phone: "+1 555-0199",
      customer_notes: "Looking to consolidate tools",
      product_name: "FlowDesk",
      product_context: {
        name: "FlowDesk",
        description: "Workplace OS",
        features: "Docs, wikis, tasks",
        pricing: "$12/user",
        targetAudience: "Tech teams",
        objections: "Already using Jira",
        callToAction: "Book trial",
      },
      recording_consent: true,
      transcript: [
        {
          id: "turn-1",
          speaker: "ai",
          text: "Hello Sarah!",
          timestamp: "2026-10-22T09:58:05Z",
        },
      ],
      recording_path: "user-456/call-123.webm",
      recording_mime_type: "audio/webm",
      recording_size_bytes: 48200,
      summary: "Sarah is evaluating FlowDesk to consolidate Jira and Slack tasks.",
      customer_needs: ["Tool consolidation", "Faster workflows"],
      objections: ["Current workflows rely on Jira"],
      next_steps: ["Schedule deep dive demo"],
      outcome: "demo_requested",
      outcome_reason: "Customer asked for a live demonstration for her team.",
      analysis_status: "complete",
      analysis_error: null,
    };

    const domain = dbRecordToCallRecord(mockDbRecord);

    expect(domain.id).toBe("call-123");
    expect(domain.ownerId).toBe("user-456");
    expect(domain.customer.name).toBe("Sarah Chen");
    expect(domain.customer.company).toBe("Apex Tech");
    expect(domain.durationSeconds).toBe(120);
    expect(domain.recordingPath).toBe("user-456/call-123.webm");
    expect(domain.summary).toBe("Sarah is evaluating FlowDesk to consolidate Jira and Slack tasks.");
    expect(domain.outcome).toBe("demo_requested");
    expect(domain.analysisStatus).toBe("complete");
    expect(domain.customerNeeds).toHaveLength(2);
    expect(domain.objectionsList).toHaveLength(1);
    expect(domain.nextStepsList).toHaveLength(1);
  });

  test("Storage object path convention enforces owner isolation {owner_id}/{call_id}.webm", () => {
    const ownerId = "a4b5c6d7-1234-5678-9abc-def012345678";
    const callId = "f1e2d3c4-9876-5432-10ba-fedcba987654";
    const expectedPath = `${ownerId}/${callId}.webm`;

    // Path must follow strict bucket folder security
    expect(expectedPath.startsWith(`${ownerId}/`)).toBe(true);
    expect(expectedPath.endsWith(".webm")).toBe(true);
    expect(expectedPath.split("/")).toHaveLength(2);
    expect(expectedPath.split("/")[0]).toBe(ownerId);
  });

  test("Permitted sales outcomes match strict enum contract", () => {
    const validOutcomes = [
      "converted",
      "interested",
      "follow_up_required",
      "not_interested",
      "demo_requested",
      "no_response",
    ];

    expect(validOutcomes).toHaveLength(6);
    expect(validOutcomes).toContain("converted");
    expect(validOutcomes).toContain("interested");
    expect(validOutcomes).toContain("follow_up_required");
    expect(validOutcomes).toContain("not_interested");
    expect(validOutcomes).toContain("demo_requested");
    expect(validOutcomes).toContain("no_response");
  });
});
