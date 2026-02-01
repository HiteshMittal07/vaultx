import { Address, formatUnits } from "viem";
import { publicClient } from "./client";
import { ERC20_ABI } from "@/constants/abis";
import { MORPHO_ABI, IRM_ABI, ORACLE_ABI } from "@/constants/abis";
import { MORPHO_ADDRESS, MARKET_ID } from "@/constants/addresses";
/**
 * Fetches the raw BigInt balance of an ERC20 token for a given address.
 */
export async function getTokenBalance(
  tokenAddress: Address,
  userAddress: Address,
): Promise<bigint> {
  try {
    const balance = await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [userAddress],
    });
    return balance as bigint;
  } catch (error) {
    console.error(`Error fetching balance for token ${tokenAddress}:`, error);
    return BigInt(0);
  }
}

/**
 * Fetches and formats the balance of an ERC20 token.
 */
export async function getFormattedTokenBalance(
  tokenAddress: Address,
  userAddress: Address,
  decimals: number = 18,
): Promise<string> {
  const balance = await getTokenBalance(tokenAddress, userAddress);
  return formatUnits(balance, decimals);
}

/**
 * Fetches multiple token balances in parallel.
 */
export async function getTokenBalances(
  userAddress: Address,
  tokenAddresses: Address[],
): Promise<bigint[]> {
  return Promise.all(
    tokenAddresses.map((token) => getTokenBalance(token, userAddress)),
  );
}

/**
 * Fetches Morpho market parameters for a given market ID.
 */
export async function getMorphoMarketParams(marketId: Address = MARKET_ID) {
  try {
    const params = await publicClient.readContract({
      address: MORPHO_ADDRESS,
      abi: MORPHO_ABI,
      functionName: "idToMarketParams",
      args: [marketId],
    });
    return params;
  } catch (error) {
    console.error("Error fetching market params:", error);
    return null;
  }
}

/**
 * Fetches Morpho market state for a given market ID.
 */
export async function getMorphoMarketState(marketId: Address = MARKET_ID) {
  try {
    const state = await publicClient.readContract({
      address: MORPHO_ADDRESS,
      abi: MORPHO_ABI,
      functionName: "market",
      args: [marketId],
    });
    return state;
  } catch (error) {
    console.error("Error fetching market state:", error);
    return null;
  }
}

/**
 * Fetches user position in a Morpho market.
 */
export async function getMorphoUserPosition(
  userAddress: Address,
  marketId: Address = MARKET_ID,
) {
  try {
    const position = await publicClient.readContract({
      address: MORPHO_ADDRESS,
      abi: MORPHO_ABI,
      functionName: "position",
      args: [marketId, userAddress],
    });
    return position;
  } catch (error) {
    console.error("Error fetching user position:", error);
    return null;
  }
}

/**
 * Fetches all Morpho market data in parallel.
 */
export async function getMorphoMarketData(
  userAddress: Address,
  marketId: Address = MARKET_ID,
) {
  const [params, state, position] = await Promise.all([
    getMorphoMarketParams(marketId),
    getMorphoMarketState(marketId),
    getMorphoUserPosition(userAddress, marketId),
  ]);

  return { params, state, position };
}

/**
 * Fetches oracle price from market params.
 */
export async function getOraclePrice(marketParams: any): Promise<number> {
  try {
    if (
      !marketParams ||
      (marketParams as any)[2] === "0x0000000000000000000000000000000000000000"
    ) {
      return 0;
    }

    const price = await publicClient.readContract({
      address: (marketParams as any)[2] as Address,
      abi: ORACLE_ABI,
      functionName: "price",
      args: [],
    });

    return Number(formatUnits(price as bigint, 36));
  } catch (error) {
    console.error("Error fetching oracle price:", error);
    return 0;
  }
}

/**
 * Fetches borrow rate from IRM (Interest Rate Model).
 */
export async function getBorrowRate(
  marketParams: any,
  marketState: any,
): Promise<string> {
  try {
    if (
      !marketParams ||
      (marketParams as any)[3] === "0x0000000000000000000000000000000000000000"
    ) {
      return "0.00";
    }

    const rate = await publicClient.readContract({
      address: (marketParams as any)[3] as Address,
      abi: IRM_ABI,
      functionName: "borrowRateView",
      args: [marketParams, marketState],
    });

    const bRate = Number(rate) / 1e18;
    const secondsPerYear = 60 * 60 * 24 * 365;
    const apr = Math.exp(Number(bRate) * secondsPerYear) - 1;
    return (apr * 100).toFixed(2);
  } catch (error) {
    console.error("Error fetching borrow rate:", error);
    return "0.00";
  }
}

/**
 * Fetches latest price from Pyth Hermes API.
 */
export async function getLatestPythPrice(priceId: string): Promise<number> {
  try {
    const response = await fetch(
      `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${priceId}`,
    );
    if (!response.ok) {
      throw new Error("Failed to fetch price data");
    }
    const data = await response.json();
    const priceData = data.parsed[0].price;
    return Number(priceData.price) * Math.pow(10, priceData.expo);
  } catch (error) {
    console.error("Error fetching Pyth price:", error);
    return 0;
  }
}

export function calculateBorrowAssets(
  borrowShares: bigint | number,
  totalBorrowAssets: bigint | number,
  totalBorrowShares: bigint | number,
): number {
  const shares = Number(borrowShares);
  const assets = Number(totalBorrowAssets);
  const totalShares = Number(totalBorrowShares);

  if (totalShares === 0 || shares === 0) return 0;

  return (shares * assets) / totalShares / 1e6;
}
