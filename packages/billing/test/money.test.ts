import assert from "node:assert/strict";
import test from "node:test";
import {
  addIdr,
  calculateUsageCostIdr,
  compareIdr,
  parseIdrAmount,
  subtractIdr,
  toIdrAmount,
} from "../src/money.js";

test("IDR amounts remain integer strings without Number conversion", () => {
  assert.equal(addIdr("999999999999999999", "1"), "1000000000000000000");
  assert.equal(compareIdr("100", "99"), 1);
  assert.equal(subtractIdr("100", "99"), "1");
  assert.equal(toIdrAmount(parseIdrAmount("123456789012345678901234567890")), "123456789012345678901234567890");
  assert.throws(() => subtractIdr("10", "11"), /cannot become negative/);
  assert.throws(() => parseIdrAmount("1.5"), /non-negative integer/);
});

test("usage charge uses decimal fixed-point arithmetic and rounds positive sub-rupiah up", () => {
  const result = calculateUsageCostIdr({
    promptPriceUsdPerToken: "0.000001",
    completionPriceUsdPerToken: "0.000002",
    promptTokens: 1000,
    completionTokens: 500,
    usdToIdrRate: "16000.123456789012345678901234",
    markupBasisPoints: 1500,
    fixedFeeIdr: "25",
  });
  assert.equal(result.providerCostIdr, "32");
  assert.equal(result.customerChargeIdr, "62");
  assert.equal(result.markupBasisPoints, 1500);
});

test("unknown or malformed prices, FX, token counts and markup are rejected", () => {
  assert.throws(() => calculateUsageCostIdr({
    promptPriceUsdPerToken: "unknown",
    completionPriceUsdPerToken: "0",
    promptTokens: 1,
    completionTokens: 0,
    usdToIdrRate: "16000",
    markupBasisPoints: 0,
  }));
  assert.throws(() => calculateUsageCostIdr({
    promptPriceUsdPerToken: "0",
    completionPriceUsdPerToken: "0",
    promptTokens: -1,
    completionTokens: 0,
    usdToIdrRate: "16000",
    markupBasisPoints: 0,
  }));
  assert.throws(() => calculateUsageCostIdr({
    promptPriceUsdPerToken: "0",
    completionPriceUsdPerToken: "0",
    promptTokens: 0,
    completionTokens: 0,
    usdToIdrRate: "0",
    markupBasisPoints: 0,
  }));
});
