import { describe, expect, it } from "vitest";

import { requestSchema, reviewRequestSchema } from "@/lib/validation/requests";

describe("requestSchema", () => {
  const valid = {
    title: "Bruit anormal sur le convoyeur A1",
    urgency: "medium" as const,
    isEquipmentDown: false,
    submit: true,
  };

  it("parses a valid payload", () => {
    const result = requestSchema.parse(valid);
    expect(result.title).toBe(valid.title);
    expect(result.submit).toBe(true);
  });

  it("rejects a missing required title", () => {
    const { title: _title, ...rest } = valid;
    void _title;
    expect(requestSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects an invalid urgency enum value", () => {
    expect(requestSchema.safeParse({ ...valid, urgency: "extreme" }).success).toBe(false);
  });

  it("requires isEquipmentDown/submit to be actual booleans, not the strings a raw form would send", () => {
    expect(requestSchema.safeParse({ ...valid, isEquipmentDown: "false" as unknown as boolean }).success).toBe(false);
  });
});

describe("reviewRequestSchema", () => {
  it("parses a valid approval decision", () => {
    expect(reviewRequestSchema.parse({ decision: "approved" }).decision).toBe("approved");
  });

  it("rejects an invalid decision value", () => {
    expect(reviewRequestSchema.safeParse({ decision: "maybe" }).success).toBe(false);
  });
});
