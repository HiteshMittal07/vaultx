import { Address } from "viem";
import {
  getMorphoMarketData,
  getOraclePrice,
  getBorrowRate,
  getFluidVaultData,
} from "@/lib/blockchain/utils";
import {
  parseUserPosition,
  parseLLTV,
  computePositionMetrics,
} from "@/lib/calculations";
import {
  MORPHO_ADDRESS,
  MARKET_ID,
  FLUID_VAULT_XAUT_USDT,
  FLUID_VAULT_XAUT_USDT_ID,
} from "@/constants/addresses";
import type {
  ProtocolId,
  ProtocolMarket,
  ProtocolPosition,
  ProtocolsOverview,
} from "@/types";

// =============================================================================
// Market Definitions (static config for known XAUt/USDT markets)
// =============================================================================

const MORPHO_MARKET: Omit<ProtocolMarket, "borrowRate"> = {
  protocol: "morpho",
  name: "Morpho Blue XAUt/USDT",
  contractAddress: MORPHO_ADDRESS as Address,
  collateralToken: "XAUt",
  debtToken: "USDT",
  ltv: 77,
  liquidationThreshold: 77,
  liquidationPenalty: 0, // market-driven
  marketId: MARKET_ID,
};

const FLUID_MARKET: Omit<ProtocolMarket, "borrowRate"> = {
  protocol: "fluid",
  name: "Fluid Vault XAUt/USDT",
  contractAddress: FLUID_VAULT_XAUT_USDT as Address,
  collateralToken: "XAUt",
  debtToken: "USDT",
  ltv: 75,
  liquidationThreshold: 80,
  liquidationPenalty: 3,
  marketId: String(FLUID_VAULT_XAUT_USDT_ID),
};

// =============================================================================
// Market Data Fetching
// =============================================================================

/**
 * Fetches live market data for all supported XAUt/USDT protocols.
 */
async function fetchMarkets(): Promise<ProtocolMarket[]> {
  const markets: ProtocolMarket[] = [];

  // Morpho: fetch live borrow rate
  try {
    const { params, state } = await getMorphoMarketData(
      "0x0000000000000000000000000000000000000000" as Address,
    );
    let borrowRate = "0.00";
    if (params && state) {
      borrowRate = await getBorrowRate(params, state);
    }
    markets.push({ ...MORPHO_MARKET, borrowRate: `${borrowRate}%` });
  } catch {
    markets.push({ ...MORPHO_MARKET, borrowRate: "N/A" });
  }

  // Fluid: fetch live data from API
  try {
    const fluidData = await getFluidVaultData();
    const borrowRate = fluidData
      ? (fluidData.borrowRate * 100).toFixed(2)
      : "N/A";
    markets.push({
      ...FLUID_MARKET,
      borrowRate: fluidData ? `${borrowRate}%` : "N/A",
      ...(fluidData && {
        ltv: fluidData.collateralFactor * 100,
        liquidationThreshold: fluidData.liquidationThreshold * 100,
        liquidationPenalty: fluidData.liquidationPenalty * 100,
      }),
    });
  } catch {
    markets.push({ ...FLUID_MARKET, borrowRate: "N/A" });
  }

  return markets;
}

// =============================================================================
// Position Fetching
// =============================================================================

/**
 * Fetches user positions across all supported protocols.
 */
async function fetchPositions(
  userAddress: Address,
): Promise<ProtocolPosition[]> {
  const positions: ProtocolPosition[] = [];

  // Morpho position
  try {
    const { params, state, position } = await getMorphoMarketData(userAddress);
    if (params && state && position) {
      const posArr = position as unknown as readonly bigint[];
      const stateArr = state as unknown as readonly bigint[];
      const paramsArr = params as unknown as readonly unknown[];

      const { userCollateral, userBorrow } = parseUserPosition(
        posArr,
        stateArr,
      );

      if (userCollateral > 0 || userBorrow > 0) {
        const lltv = parseLLTV(paramsArr);
        const oraclePrice = await getOraclePrice(params);
        const { currentLTV } = computePositionMetrics(
          userCollateral,
          userBorrow,
          oraclePrice,
          lltv,
        );

        positions.push({
          protocol: "morpho",
          marketId: MARKET_ID,
          collateral: userCollateral,
          debt: userBorrow,
          ltv: currentLTV,
        });
      }
    }
  } catch (error) {
    console.error("Error fetching Morpho position:", error);
  }

  // Fluid: positions require NFT ID lookup (not available without indexer)
  // Can be added via Fluid API later

  return positions;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Fetches complete protocol overview: all markets + user positions.
 */
export async function getProtocolsOverview(
  userAddress?: Address,
): Promise<ProtocolsOverview> {
  const [markets, positions] = await Promise.all([
    fetchMarkets(),
    userAddress
      ? fetchPositions(userAddress)
      : Promise.resolve([] as ProtocolPosition[]),
  ]);

  return { markets, positions };
}

/**
 * Returns list of supported protocol IDs.
 */
export function getSupportedProtocols(): ProtocolId[] {
  return ["morpho", "fluid"];
}
