import { describe, expect, it } from "vitest";

import { inviteMemberSchema, organizationSettingsSchema, profileSchema, teamSchema } from "@/lib/validation/users";

describe("inviteMemberSchema", () => {
  const validUuid = "11111111-1111-4111-8111-111111111111";

  it("parses a valid payload", () => {
    const result = inviteMemberSchema.parse({ email: "new.tech@example.com", roleId: validUuid });
    expect(result.email).toBe("new.tech@example.com");
  });

  it("rejects an invalid email", () => {
    expect(inviteMemberSchema.safeParse({ email: "not-an-email", roleId: validUuid }).success).toBe(false);
  });

  it("rejects an invalid roleId", () => {
    expect(inviteMemberSchema.safeParse({ email: "x@example.com", roleId: "not-a-uuid" }).success).toBe(false);
  });
});

describe("profileSchema", () => {
  it("parses a valid payload", () => {
    const result = profileSchema.parse({ fullName: "Isabelle Tremblay", locale: "fr" });
    expect(result.locale).toBe("fr");
  });

  it("rejects a full name shorter than 2 characters", () => {
    expect(profileSchema.safeParse({ fullName: "A", locale: "fr" }).success).toBe(false);
  });

  it("rejects an unsupported locale", () => {
    expect(profileSchema.safeParse({ fullName: "Isabelle Tremblay", locale: "es" }).success).toBe(false);
  });
});

describe("organizationSettingsSchema", () => {
  it("parses a valid payload", () => {
    const result = organizationSettingsSchema.parse({
      name: "Recyclage Nordique",
      localeDefault: "fr",
      timezone: "America/Montreal",
    });
    expect(result.timezone).toBe("America/Montreal");
  });

  it("rejects a missing timezone", () => {
    expect(
      organizationSettingsSchema.safeParse({ name: "X", localeDefault: "fr", timezone: "" }).success,
    ).toBe(false);
  });
});

describe("teamSchema", () => {
  it("parses a valid payload", () => {
    expect(teamSchema.parse({ name: "Équipe mécanique" }).name).toBe("Équipe mécanique");
  });

  it("rejects a missing required name", () => {
    expect(teamSchema.safeParse({}).success).toBe(false);
  });
});
