import { describe, expect, it } from "vitest";
import {
  formatCompactNumber,
  formatIDR,
  formatPercent,
  formatSignedIDR,
  formatUsdPerMillion,
} from "./currency";
import { formatDate, formatDateTime, formatRelativeTime } from "./date";
import { estimateTokens, formatTokenCount } from "./tokens";
import { isMaskedApiKey, maskApiKey } from "./api-key";

function normalize(value: string): string {
  return value.replace(/\u00A0/g, " ");
}

describe("currency formatters", () => {
  it("formats IDR without decimals", () => {
    expect(normalize(formatIDR(1_250_000))).toBe("Rp 1.250.000");
  });

  it("keeps the sign for signed IDR values", () => {
    expect(normalize(formatSignedIDR(50_000))).toBe("+Rp 50.000");
    expect(normalize(formatSignedIDR(-50_000))).toBe("-Rp 50.000");
  });

  it("formats USD per 1M tokens with an explicit unit", () => {
    expect(normalize(formatUsdPerMillion(0.6))).toBe("US$0,60 / 1M token");
    expect(formatUsdPerMillion(null)).toBe("Tidak tersedia");
  });

  it("formats compact numbers and percentages", () => {
    expect(normalize(formatCompactNumber(1_500_000))).toBe("1,5 jt");
    expect(formatPercent(1.8)).toBe("1,8%");
  });
});

describe("token formatters", () => {
  it("formats small token counts with thousands separators", () => {
    expect(formatTokenCount(1_234)).toBe("1.234 token");
  });

  it("formats large token counts compactly", () => {
    expect(normalize(formatTokenCount(1_500_000))).toBe("1,5 jt token");
  });

  it("estimates tokens deterministically", () => {
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("a".repeat(40))).toBe(10);
  });
});

describe("date formatters", () => {
  it("formats date-time in Asia/Jakarta with WIB label", () => {
    expect(formatDateTime("2026-11-13T09:00:00.000Z")).toBe(
      "13 Nov 2026, 16.00 WIB",
    );
  });

  it("formats dates in Asia/Jakarta", () => {
    expect(formatDate("2026-11-13T09:00:00.000Z")).toBe("13 Nov 2026");
  });

  it("formats relative time against an injected clock", () => {
    const now = new Date("2026-11-13T09:00:00.000Z");
    expect(formatRelativeTime("2026-11-13T08:30:00.000Z", now)).toBe(
      "30 menit lalu",
    );
    expect(formatRelativeTime("2026-11-13T08:00:00.000Z", now)).toBe(
      "1 jam lalu",
    );
    expect(formatRelativeTime("2026-11-01T09:00:00.000Z", now)).toBe(
      "1 Nov 2026",
    );
  });
});

describe("API key masking", () => {
  it("shows only a short prefix and a fixed mask", () => {
    expect(maskApiKey("AZL-Ab12Cd34efghijkl")).toBe("AZL-Ab12Cd34••••");
    expect(isMaskedApiKey("AZL-Ab12Cd34••••")).toBe(true);
    expect(isMaskedApiKey("AZL-Ab12Cd34efghijkl")).toBe(false);
  });
});
