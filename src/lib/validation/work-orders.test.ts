import { describe, expect, it } from "vitest";

import { closeWorkOrderSchema, timeLogSchema, workOrderSchema } from "@/lib/validation/work-orders";

describe("workOrderSchema", () => {
  const valid = {
    title: "Fuite hydraulique — Presse à ballots",
    type: "corrective" as const,
    priority: "critical" as const,
    requiresLockout: false,
  };

  it("parses a valid payload", () => {
    const result = workOrderSchema.parse(valid);
    expect(result.title).toBe(valid.title);
  });

  it("rejects a missing required title", () => {
    const { title: _title, ...rest } = valid;
    void _title;
    expect(workOrderSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects an invalid priority enum value", () => {
    expect(workOrderSchema.safeParse({ ...valid, priority: "urgent" }).success).toBe(false);
  });

  it("coerces estimateHours from a form string to a number", () => {
    const result = workOrderSchema.parse({ ...valid, estimateHours: "2.5" });
    expect(result.estimateHours).toBe(2.5);
  });

  it("rejects a negative estimateHours", () => {
    expect(workOrderSchema.safeParse({ ...valid, estimateHours: "-1" }).success).toBe(false);
  });
});

describe("timeLogSchema", () => {
  it("parses a valid payload", () => {
    const result = timeLogSchema.parse({ startedAt: "2026-01-15T08:00", endedAt: "2026-01-15T09:00" });
    expect(result.startedAt).toBe("2026-01-15T08:00");
  });

  it("rejects a missing startedAt", () => {
    expect(timeLogSchema.safeParse({ startedAt: "", endedAt: "2026-01-15T09:00" }).success).toBe(false);
  });
});

describe("closeWorkOrderSchema", () => {
  it("parses a valid payload — resolution is required to close", () => {
    const result = closeWorkOrderSchema.parse({ resolution: "Courroie remplacée.", followUpRequired: false });
    expect(result.resolution).toBe("Courroie remplacée.");
  });

  it("rejects an empty resolution — the whole point of this schema", () => {
    expect(closeWorkOrderSchema.safeParse({ resolution: "", followUpRequired: false }).success).toBe(false);
  });

  it("rejects a resolution that is only whitespace (trimmed to empty)", () => {
    expect(closeWorkOrderSchema.safeParse({ resolution: "   ", followUpRequired: false }).success).toBe(false);
  });
});
