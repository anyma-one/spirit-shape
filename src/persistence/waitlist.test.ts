import { describe, expect, it } from "vitest";
import { isValidEmail } from "./waitlist";

describe("isValidEmail", () => {
  it("accepts ordinary addresses", () => {
    expect(isValidEmail("a@b.co")).toBe(true);
    expect(isValidEmail("first.last+tag@sub.example.com")).toBe(true);
    expect(isValidEmail("  trimmed@example.com  ")).toBe(true); // trimmed before test
  });

  it("rejects obvious non-addresses", () => {
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("nope")).toBe(false);
    expect(isValidEmail("no-at.example.com")).toBe(false);
    expect(isValidEmail("no@domain")).toBe(false); // no dot in domain
    expect(isValidEmail("has space@example.com")).toBe(false);
    expect(isValidEmail("two@@example.com")).toBe(false);
  });

  it("rejects absurdly long input", () => {
    expect(isValidEmail(`${"x".repeat(250)}@example.com`)).toBe(false);
  });
});
