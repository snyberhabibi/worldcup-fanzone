import { describe, it, expect } from "vitest";
import {
  digitsOnly,
  normalizePhone,
  isValidUSPhone,
  isTestPhone,
  formatPhone,
  maskPhone,
  sanitizeFirstName,
} from "@/lib/format";

describe("digitsOnly", () => {
  it("strips all non-digits", () => {
    expect(digitsOnly("(469) 555-0100")).toBe("4695550100");
    expect(digitsOnly("+1 469.555.0100 ext")).toBe("14695550100");
  });
  it("handles empty / nullish", () => {
    expect(digitsOnly("")).toBe("");
    expect(digitsOnly(undefined as unknown as string)).toBe("");
  });
});

describe("normalizePhone", () => {
  it("keeps a clean 10-digit number", () => {
    expect(normalizePhone("4693165859")).toBe("4693165859");
  });
  it("drops a leading country-code 1", () => {
    expect(normalizePhone("14693165859")).toBe("4693165859");
    expect(normalizePhone("+1 (469) 316-5859")).toBe("4693165859");
  });
  it("truncates to the first 10 digits", () => {
    expect(normalizePhone("46931658590000")).toBe("4693165859");
  });
  it("is idempotent", () => {
    const once = normalizePhone("+1 (469) 316-5859");
    expect(normalizePhone(once)).toBe(once);
  });
});

describe("isValidUSPhone", () => {
  it("accepts a valid NANP number", () => {
    expect(isValidUSPhone("4693165859")).toBe(true);
    expect(isValidUSPhone("+1 (214) 555-1234")).toBe(true);
  });
  it("accepts reserved 555 numbers (valid NANP, used for load tests)", () => {
    expect(isValidUSPhone("4695550100")).toBe(true);
  });
  it("rejects area code or exchange starting with 0 or 1", () => {
    expect(isValidUSPhone("0693165859")).toBe(false); // area starts 0
    expect(isValidUSPhone("1693165859")).toBe(false); // area starts 1
    expect(isValidUSPhone("4691165859")).toBe(false); // exchange starts 1
  });
  it("rejects wrong length", () => {
    expect(isValidUSPhone("469316585")).toBe(false);
    expect(isValidUSPhone("")).toBe(false);
  });
});

describe("isTestPhone", () => {
  it("flags the reserved 555 exchange", () => {
    expect(isTestPhone("4695550100")).toBe(true);
    expect(isTestPhone("(469) 555-9999")).toBe(true);
    expect(isTestPhone("+1 469 555 0000")).toBe(true);
  });
  it("does not flag a real exchange", () => {
    expect(isTestPhone("4693165859")).toBe(false); // exchange 316
    expect(isTestPhone("2145551234")).toBe(true); // exchange 555
    expect(isTestPhone("2141234567")).toBe(false);
  });
});

describe("formatPhone", () => {
  it("formats progressively as digits are entered", () => {
    expect(formatPhone("469")).toBe("469");
    expect(formatPhone("469316")).toBe("(469) 316");
    expect(formatPhone("4693165859")).toBe("(469) 316-5859");
  });
});

describe("maskPhone", () => {
  it("reveals only the last 4 of a full number", () => {
    expect(maskPhone("4693165859")).toBe("(•••) •••-5859");
  });
  it("fully masks anything that isn't a clean 10-digit number", () => {
    expect(maskPhone("46931")).toBe("(•••) •••-••••");
    expect(maskPhone("")).toBe("(•••) •••-••••");
  });
});

describe("sanitizeFirstName", () => {
  it("trims and collapses whitespace", () => {
    expect(sanitizeFirstName("  Yusuf   R  ")).toBe("Yusuf R");
  });
  it("strips control characters", () => {
    expect(sanitizeFirstName("Yu\x00su\x1ff")).toBe("Yusuf");
  });
  it("strips a leading formula-injection character (Sheets safety)", () => {
    expect(sanitizeFirstName("=cmd")).toBe("cmd");
    expect(sanitizeFirstName("+1234")).toBe("1234");
    expect(sanitizeFirstName("@name")).toBe("name");
  });
  it("caps length at 24", () => {
    expect(sanitizeFirstName("a".repeat(50))).toHaveLength(24);
  });
});
