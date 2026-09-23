import { describe, expect, it } from "vitest";
import { assertCertSerial, formatCertSerial, nextCertSerial, parseCertSerial } from "@/lib/serial";

describe("VCA cert serials", () => {
  it("parses VCA-26-0101", () => {
    expect(parseCertSerial("VCA-26-0101")).toBe(101);
    expect(parseCertSerial("vca-26-0101")).toBe(101);
    expect(formatCertSerial(101)).toBe("VCA-26-0101");
  });

  it("rejects the old uuid and letter formats", () => {
    expect(parseCertSerial("VCA-D-ABC")).toBeNull();
    expect(parseCertSerial("VCA-26-A-0001")).toBeNull();
    expect(parseCertSerial("VCA-26-101")).toBeNull();
  });

  it("starts the sequence at 0101 and skips occupied numbers", () => {
    expect(nextCertSerial([])).toBe("VCA-26-0101");
    expect(nextCertSerial(["VCA-26-0101", "VCA-26-0103"])).toBe("VCA-26-0104");
  });

  it("does not allow numbers below the opening serial", () => {
    expect(() => assertCertSerial("VCA-26-0100")).toThrow(/0101/);
    expect(assertCertSerial(" vca-26-0101 ")).toBe("VCA-26-0101");
  });
});
