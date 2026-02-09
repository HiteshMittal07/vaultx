/**
 * Migration Service — Builds UserOp calls for atomic Morpho→Fluid position migration.
 *
 * The UserOp contains 3 calls:
 *   1. morpho.setAuthorization(migrationHelper, true)  — authorize helper
 *   2. migrationHelper.migrate(params)                 — flash loan + migrate
 *   3. morpho.setAuthorization(migrationHelper, false) — revoke authorization
 *
 * The MigrationHelper contract handles the flash loan callback internally:
 *   - Flash borrows USDT from Morpho (free)
 *   - Repays user's Morpho debt
 *   - Withdraws user's XAUt collateral
 *   - Deposits XAUt + borrows USDT on Fluid via operate()
 *   - Repays flash loan
 */

import {
  Address,
  encodeFunctionData,
  parseUnits,
  formatUnits,
  Call,
} from "viem";
import { getMorphoMarketData, getOraclePrice } from "@/lib/blockchain/utils";
import { parseUserPosition } from "@/lib/calculations";
import { MORPHO_ABI, MIGRATION_HELPER_ABI } from "@/constants/abis";
import {
  MORPHO_ADDRESS,
  MIGRATION_HELPER_ADDRESS,
} from "@/constants/addresses";
import type { MorphoMarketParamsRaw } from "@/types";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MigrationRequest {
  userAddress: Address;
  /** 0 = create new Fluid position, or existing NFT ID */
  fluidNftId?: bigint;
  /** If true, borrows slightly less on Fluid to account for rate differences */
  borrowBufferBps?: number;
}

export interface MigrationCalculation {
  debtToRepay: number;
  collateralToMigrate: number;
  borrowOnFluid: number;
  estimatedUSDTValue: number;
  oraclePrice: number;
  currentLTV: number;
}

export interface MigrationCallsResult {
  calls: Call[];
  calculation: MigrationCalculation;
}

// ─── Build Migration Calls ──────────────────────────────────────────────────

/**
 * Builds the full set of UserOp calls for Morpho→Fluid migration.
 *
 * @returns 3 calls: authorize → migrate → revoke
 */
export async function buildMigrationCalls(
  request: MigrationRequest,
): Promise<MigrationCallsResult> {
  const { userAddress, fluidNftId = BigInt(0), borrowBufferBps = 0 } = request;

  // 1. Fetch current Morpho position
  const { params, state, position } = await getMorphoMarketData(userAddress);

  if (!params || !state || !position) {
    throw new Error("Failed to fetch Morpho market data");
  }

  const posArr = position as unknown as readonly bigint[];
  const stateArr = state as unknown as readonly bigint[];
  const typedMarketParams = params as unknown as MorphoMarketParamsRaw;

  // Parse position values
  const { userCollateral, userBorrow } = parseUserPosition(posArr, stateArr);

  if (userCollateral <= 0) {
    throw new Error("No collateral to migrate");
  }
  if (userBorrow <= 0) {
    throw new Error("No debt to migrate");
  }

  const oraclePrice = await getOraclePrice(params);

  // Calculate amounts (in raw token units, 6 decimals for both USDT and XAUt)
  const debtAmountRaw = parseUnits(userBorrow.toFixed(6), 6);
  const collateralAmountRaw = posArr[2] as bigint; // Use exact on-chain collateral value
  const borrowShares = posArr[1] as bigint; // Use exact shares for full repay

  // Borrow on Fluid: same as debt repaid, minus optional buffer
  const borrowOnFluid =
    borrowBufferBps > 0
      ? (userBorrow * (10000 - borrowBufferBps)) / 10000
      : userBorrow;
  const borrowAmountRaw = parseUnits(userBorrow.toFixed(6), 6);

  // Compute current LTV
  const currentLTV =
    oraclePrice > 0 ? (userBorrow / (userCollateral * oraclePrice)) * 100 : 0;

  // 2. Build the 3 UserOp calls

  // Call 1: Authorize MigrationHelper on Morpho
  const authorizeCall: Call = {
    to: MORPHO_ADDRESS as Address,
    data: encodeFunctionData({
      abi: MORPHO_ABI,
      functionName: "setAuthorization",
      args: [MIGRATION_HELPER_ADDRESS as Address, true],
    }),
    value: BigInt(0),
  };

  // Call 2: Execute migration (triggers flash loan internally)
  const migrateCall: Call = {
    to: MIGRATION_HELPER_ADDRESS as Address,
    data: encodeFunctionData({
      abi: MIGRATION_HELPER_ABI,
      functionName: "migrate",
      args: [
        {
          user: userAddress,
          sourceMarket: {
            loanToken: typedMarketParams[0],
            collateralToken: typedMarketParams[1],
            oracle: typedMarketParams[2],
            irm: typedMarketParams[3],
            lltv: typedMarketParams[4],
          },
          repayDebtAmount: BigInt(0),
          repayDebtShares: borrowShares,
          collateralAmount: collateralAmountRaw,
          borrowAmount: borrowAmountRaw,
          fluidNftId: fluidNftId,
        },
      ],
    }),
    value: BigInt(0),
  };

  // Call 3: Revoke MigrationHelper authorization (security)
  const revokeCall: Call = {
    to: MORPHO_ADDRESS as Address,
    data: encodeFunctionData({
      abi: MORPHO_ABI,
      functionName: "setAuthorization",
      args: [MIGRATION_HELPER_ADDRESS as Address, false],
    }),
    value: BigInt(0),
  };

  return {
    calls: [authorizeCall, migrateCall, revokeCall],
    calculation: {
      debtToRepay: userBorrow,
      collateralToMigrate: userCollateral,
      borrowOnFluid: borrowOnFluid,
      estimatedUSDTValue: userCollateral * oraclePrice,
      oraclePrice,
      currentLTV,
    },
  };
}
