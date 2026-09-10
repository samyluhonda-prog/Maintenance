import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("cn", () => {
  it("joins plain class name strings", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("drops falsy values (undefined, null, false, empty string)", () => {
    expect(cn("a", undefined, null, false, "", "b")).toBe("a b");
  });

  it("supports conditional object syntax from clsx", () => {
    expect(cn("base", { active: true, disabled: false })).toBe("base active");
  });

  it("resolves conflicting Tailwind utility classes, keeping the last one (tailwind-merge)", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
    expect(cn("text-sm", "text-lg")).toBe("text-lg");
  });

  it("merges arrays of class values", () => {
    expect(cn(["a", "b"], "c")).toBe("a b c");
  });
});
