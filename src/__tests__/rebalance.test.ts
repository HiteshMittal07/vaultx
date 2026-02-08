import { describe, it, expect } from "vitest";
import { calculateRebalanceAmount } from "@/services/api/rebalance.service";

describe("calculateRebalanceAmount", () => {
  // Calibrated to real XAUt0/USDT0 Morpho market on Arbitrum:
  //   Oracle price: ~$4,970/XAUt
  //   LLTV: 77%
  //   Typical test positions: 0.00001 XAUT supply
  const defaults = {
    userCollateral: 1.0,
    userBorrow: 2500,
    oraclePrice: 4970,
    lltv: 77,
    maxWithdrawable: 0.347,
  };

  it("returns ~50% of maxWithdrawable by default", () => {
    const result = calculateRebalanceAmount(
      defaults.userCollateral,
      defaults.userBorrow,
      defaults.oraclePrice,
      defaults.lltv,
      defaults.maxWithdrawable,
    );
    expect(result.error).toBeUndefined();
    // 50% of 0.347 * 0.99 = ~0.1718
    expect(result.withdrawAmount).toBeGreaterThan(0.1);
    expect(result.withdrawAmount).toBeLessThan(0.2);
  });

  it("respects custom withdrawFraction", () => {
    const result = calculateRebalanceAmount(
      defaults.userCollateral,
      defaults.userBorrow,
      defaults.oraclePrice,
      defaults.lltv,
      defaults.maxWithdrawable,
      0.25,
    );
    expect(result.error).toBeUndefined();
    expect(result.withdrawAmount).toBeCloseTo(defaults.maxWithdrawable * 0.99 * 0.25, 3);
  });

  it("errors when collateral too small", () => {
    // Below MIN_COLLATERAL (0.00001)
    const result = calculateRebalanceAmount(
      0.000001, 0.05, 4970, 77, 0.0000001,
    );
    expect(result.error).toBe("Collateral too small to rebalance");
    expect(result.withdrawAmount).toBe(0);
  });

  it("errors when borrow too small", () => {
    // Below MIN_BORROW (0.01)
    const result = calculateRebalanceAmount(
      1.0, 0.005, 4970, 77, 0.347,
    );
    expect(result.error).toBe("Borrow too small to rebalance");
    expect(result.withdrawAmount).toBe(0);
  });

  it("errors when no withdrawal room available", () => {
    // maxWithdrawable below MIN_WITHDRAW_AMOUNT (0.000001)
    const result = calculateRebalanceAmount(
      1.0, 3800, 4970, 77, 0.0000001,
    );
    expect(result.error).toBe("No safe withdrawal room available");
    expect(result.withdrawAmount).toBe(0);
  });

  it("caps at MAX_REBALANCE_USDT (900) equivalent", () => {
    // Large position: 10 XAUT at $4970, maxWithdrawable=5
    // 100% of 5 * 0.99 = 4.95 XAUT = ~$24,601 >> $900 cap
    const result = calculateRebalanceAmount(
      10.0, 20000, 4970, 77, 5.0, 1.0,
    );
    expect(result.error).toBeUndefined();
    // Should be capped: 900 / 4970 ≈ 0.1811
    expect(result.withdrawAmount).toBeCloseTo(900 / 4970, 3);
  });

  it("returns full fraction when under the cap", () => {
    // Small position: 50% of 0.001 * 0.99 = 0.000495 XAUT = ~$2.46 (under $900)
    const result = calculateRebalanceAmount(
      0.01, 10, 4970, 77, 0.001,
    );
    expect(result.error).toBeUndefined();
    expect(result.withdrawAmount).toBeCloseTo(0.001 * 0.99 * 0.5, 6);
  });

  it("errors when calculated withdrawal is below minimum", () => {
    // 50% of 0.0000015 * 0.99 < MIN_WITHDRAW_AMOUNT (0.000001)
    const result = calculateRebalanceAmount(
      0.0001, 0.1, 4970, 77, 0.0000015,
    );
    expect(result.error).toBe("Calculated withdrawal too small");
    expect(result.withdrawAmount).toBe(0);
  });
});
