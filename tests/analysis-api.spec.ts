import { test, expect } from "@playwright/test";

test.describe("Post-Call Analysis Endpoint (/api/calls/analyze)", () => {
  test("Rejects requests with missing or non-array transcript", async ({ request }) => {
    const res = await request.post("/api/calls/analyze", {
      data: {
        product: { name: "FlowDesk" },
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Missing or invalid 'transcript'");
  });

  test("Deterministically classifies empty or silent customer transcript as no_response", async ({ request }) => {
    // Only AI spoke, customer never provided a verbal response
    const res = await request.post("/api/calls/analyze", {
      data: {
        transcript: [
          {
            id: "msg-1",
            speaker: "ai",
            text: "Hello! This is Alex calling from FlowDesk. How are you today?",
            timestamp: new Date().toISOString(),
          },
        ],
        product: {
          name: "FlowDesk",
          description: "Collaboration platform",
        },
        customer: {
          name: "Sarah Chen",
          company: "Apex Tech",
        },
      },
    });

    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.analysis).toBeDefined();
    expect(data.analysis.outcome).toBe("no_response");
    expect(data.analysis.outcomeReason).toContain("No meaningful customer speech");
    expect(Array.isArray(data.analysis.customerNeeds)).toBe(true);
    expect(Array.isArray(data.analysis.objections)).toBe(true);
    expect(Array.isArray(data.analysis.nextSteps)).toBe(true);
  });

  test("Enforces maximum turn limits to prevent payload abuse", async ({ request }) => {
    const hugeTranscript = Array.from({ length: 501 }, (_, i) => ({
      id: `msg-${i}`,
      speaker: i % 2 === 0 ? ("ai" as const) : ("customer" as const),
      text: "turn text",
      timestamp: new Date().toISOString(),
    }));

    const res = await request.post("/api/calls/analyze", {
      data: {
        transcript: hugeTranscript,
      },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("exceeds maximum supported turn limit");
  });
});
