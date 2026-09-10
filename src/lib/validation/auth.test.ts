import { describe, expect, it } from "vitest";

import { createOrganizationSchema, loginSchema, signupSchema } from "@/lib/validation/auth";

describe("loginSchema", () => {
  it("parses a valid payload", () => {
    const result = loginSchema.parse({ email: "user@example.com", password: "anything" });
    expect(result).toEqual({ email: "user@example.com", password: "anything" });
  });

  it("rejects an invalid email", () => {
    const result = loginSchema.safeParse({ email: "not-an-email", password: "x" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty password", () => {
    const result = loginSchema.safeParse({ email: "user@example.com", password: "" });
    expect(result.success).toBe(false);
  });
});

describe("signupSchema", () => {
  const valid = {
    fullName: "Isabelle Tremblay",
    email: "isabelle@example.com",
    password: "Password1234",
    confirmPassword: "Password1234",
  };

  it("parses a valid payload", () => {
    const result = signupSchema.parse(valid);
    expect(result.fullName).toBe("Isabelle Tremblay");
  });

  it("rejects a password missing an uppercase letter", () => {
    const result = signupSchema.safeParse({ ...valid, password: "password1234", confirmPassword: "password1234" });
    expect(result.success).toBe(false);
  });

  it("rejects a password shorter than 10 characters", () => {
    const result = signupSchema.safeParse({ ...valid, password: "Ab1", confirmPassword: "Ab1" });
    expect(result.success).toBe(false);
  });

  it("rejects mismatched password confirmation, on the confirmPassword path", () => {
    const result = signupSchema.safeParse({ ...valid, confirmPassword: "Different1234" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["confirmPassword"]);
    }
  });

  it("rejects a full name shorter than 2 characters", () => {
    const result = signupSchema.safeParse({ ...valid, fullName: "A" });
    expect(result.success).toBe(false);
  });
});

describe("createOrganizationSchema", () => {
  it("parses a valid name", () => {
    expect(createOrganizationSchema.parse({ name: "Recyclage Nordique" })).toEqual({ name: "Recyclage Nordique" });
  });

  it("rejects a name that is too short", () => {
    expect(createOrganizationSchema.safeParse({ name: "A" }).success).toBe(false);
  });

  it("trims whitespace from the name", () => {
    expect(createOrganizationSchema.parse({ name: "  Groupe Nord  " }).name).toBe("Groupe Nord");
  });
});
