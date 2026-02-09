/**
 * Migration Full-Cycle Simulation (Anvil Fork)
 *
 * Forks mainnet via Anvil, then simulates:
 *   1. Morpho→Fluid migration (authorize → migrate → revoke)
 *   2. Show Fluid position (nftId, collateral, debt)
 *   3. Repay debt + withdraw collateral on Fluid
 *
 * No real transactions — everything runs on a local Anvil fork.
 *
 * Usage:
 *   npx tsx scripts/test-migration.ts
 */

import "dotenv/config";
import { spawn, ChildProcess } from "child_process";
import {
  Address,
  Hex,
  createPublicClient,
  createTestClient,
  createWalletClient,
  http,
  encodeFunctionData,
  keccak256,
  encodeAbiParameters,
  parseAbiParameters,
  numberToHex,
  pad,
  parseUnits,
  formatUnits,
  parseEther,
} from "viem";
import { mainnet } from "viem/chains";
import { MIGRATION_HELPER_ABI, FLUID_VAULT_ABI } from "@/constants/abis";
import {
  MORPHO_ADDRESS,
  MIGRATION_HELPER_ADDRESS,
  MARKET_ID,
  USDT,
  XAUT,
  FLUID_VAULT_XAUT_USDT,
} from "@/constants/addresses";
import { getMorphoMarketData, getOraclePrice } from "@/lib/blockchain/utils";

// ─── Config ──────────────────────────────────────────────────────────────────

const ANVIL_PORT = 8546;
const ANVIL_RPC = `http://127.0.0.1:${ANVIL_PORT}`;
const ALCHEMY_RPC = process.env.RPC_URL!;

const USER = "0x420C599598C04CD13a85cB9d3ED86667e734e74F" as Address;
const MORPHO = MORPHO_ADDRESS as Address;
const HELPER = MIGRATION_HELPER_ADDRESS as Address;
const FLUID_VAULT = FLUID_VAULT_XAUT_USDT as Address;
const FLUID_FACTORY = "0x324c5Dc1fC42c7a4D43d92df1eBA58a54d13Bf2d" as Address;

// ─── Morpho Storage Helpers ──────────────────────────────────────────────────
// Verified layout: slot 2 = position, slot 3 = market, slot 6 = isAuthorized

function mappingSlot(key: Hex, baseSlot: bigint): Hex {
  return keccak256(
    encodeAbiParameters(parseAbiParameters("bytes32, uint256"), [
      pad(key, { size: 32 }),
      baseSlot,
    ]),
  );
}

function nestedMappingSlot(key1: Hex, key2: Hex, baseSlot: bigint): Hex {
  const level1 = mappingSlot(key1, baseSlot);
  return keccak256(
    encodeAbiParameters(parseAbiParameters("bytes32, bytes32"), [
      pad(key2, { size: 32 }),
      level1,
    ]),
  );
}

function getPositionSlots(marketId: Hex, user: Address) {
  const base = nestedMappingSlot(marketId, user as Hex, BigInt(2));
  return {
    supplyShares: base,
    packed: numberToHex(BigInt(base) + BigInt(1), { size: 32 }) as Hex,
  };
}

function getAuthSlot(owner: Address, authorized: Address): Hex {
  return nestedMappingSlot(owner as Hex, authorized as Hex, BigInt(6));
}

function getMarketBorrowSlot(marketId: Hex): Hex {
  const base = mappingSlot(marketId, BigInt(3));
  return numberToHex(BigInt(base) + BigInt(1), { size: 32 }) as Hex;
}

// ─── Anvil Management ────────────────────────────────────────────────────────

function startAnvil(): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    const anvil = spawn("anvil", [
      "--fork-url",
      ALCHEMY_RPC,
      "--port",
      String(ANVIL_PORT),
      "--silent",
    ]);

    anvil.stderr?.on("data", (data: Buffer) => {
      const msg = data.toString();
      if (msg.includes("error") || msg.includes("Error")) {
        reject(new Error(`Anvil error: ${msg}`));
      }
    });

    const checkReady = setInterval(async () => {
      try {
        const res = await fetch(ANVIL_RPC, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "eth_chainId",
            params: [],
          }),
        });
        if (res.ok) {
          clearInterval(checkReady);
          resolve(anvil);
        }
      } catch {
        // not ready yet
      }
    }, 200);

    setTimeout(() => {
      clearInterval(checkReady);
      reject(new Error("Anvil startup timeout"));
    }, 10000);
  });
}

// ─── ABIs ────────────────────────────────────────────────────────────────────

const ERC20_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const ERC721_ABI = [
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// ─── Main Simulation ─────────────────────────────────────────────────────────

async function simulate() {
  console.log("\n=== Full Migration Cycle (Anvil Fork) ===\n");

  // ── Phase 0: Fetch market data from mainnet ──
  console.log("[0/5] Fetching market data from mainnet...");
  const { params, state } = await getMorphoMarketData(USER);
  if (!params || !state) throw new Error("Failed to fetch market data");

  const stateArr = state as unknown as readonly bigint[];
  const totalBorrowAssets = stateArr[2];
  const totalBorrowShares = stateArr[3];
  const oraclePrice = await getOraclePrice(params);

  const collateral = parseUnits("1", 6);
  const debt = parseUnits("1500", 6);
  const borrowShares =
    totalBorrowAssets > BigInt(0)
      ? (debt * totalBorrowShares) / totalBorrowAssets + BigInt(1)
      : debt;

  console.log(`   Oracle price: $${oraclePrice.toFixed(2)}`);
  console.log(`   Simulated: 1 XAUt collateral, 1500 USDT debt`);
  console.log(
    `   LTV: ${((1500 / (1 * oraclePrice)) * 100).toFixed(2)}%`,
  );

  // ── Phase 1: Start Anvil fork ──
  console.log("\n[1/5] Starting Anvil fork...");
  const anvil = await startAnvil();
  console.log(`   Anvil running on port ${ANVIL_PORT}`);

  try {
    const transport = http(ANVIL_RPC, { timeout: 120_000 });
    const client = createPublicClient({ chain: mainnet, transport });
    const testClient = createTestClient({
      chain: mainnet,
      mode: "anvil",
      transport,
    });
    const walletClient = createWalletClient({ chain: mainnet, transport });

    // ── Phase 2: Set up Morpho state ──
    console.log("\n[2/5] Setting up Morpho position via storage overrides...");

    const posSlots = getPositionSlots(MARKET_ID, USER);
    const authSlot = getAuthSlot(USER, HELPER);
    const mktBorrowSlot = getMarketBorrowSlot(MARKET_ID);

    const posPacked = (collateral << BigInt(128)) | borrowShares;
    const newTotalBorrowAssets = totalBorrowAssets + debt;
    const newTotalBorrowShares = totalBorrowShares + borrowShares;
    const mktPacked =
      (newTotalBorrowShares << BigInt(128)) | newTotalBorrowAssets;

    await testClient.setStorageAt({
      address: MORPHO,
      index: posSlots.supplyShares,
      value: pad("0x0", { size: 32 }),
    });
    await testClient.setStorageAt({
      address: MORPHO,
      index: posSlots.packed,
      value: numberToHex(posPacked, { size: 32 }),
    });
    await testClient.setStorageAt({
      address: MORPHO,
      index: authSlot,
      value: pad("0x01", { size: 32 }),
    });
    await testClient.setStorageAt({
      address: MORPHO,
      index: mktBorrowSlot,
      value: numberToHex(mktPacked, { size: 32 }),
    });
    await testClient.setBalance({ address: USER, value: parseEther("10") });

    console.log("   Morpho position: 1 XAUt collateral, ~1500 USDT debt");
    console.log("   Authorization: MigrationHelper authorized on Morpho");

    // ── Phase 3: Execute migration ──
    console.log("\n[3/5] Executing migration (Morpho -> Fluid)...");

    const supplyBefore = await client.readContract({
      address: FLUID_FACTORY,
      abi: ERC721_ABI,
      functionName: "totalSupply",
    });
    console.log(`   Fluid NFTs before: ${supplyBefore}`);

    const typedParams = params as unknown as readonly unknown[];
    const marketParams = {
      loanToken: typedParams[0] as Address,
      collateralToken: typedParams[1] as Address,
      oracle: typedParams[2] as Address,
      irm: typedParams[3] as Address,
      lltv: typedParams[4] as bigint,
    };

    await testClient.impersonateAccount({ address: USER });

    const migrateCalldata = encodeFunctionData({
      abi: MIGRATION_HELPER_ABI,
      functionName: "migrate",
      args: [
        {
          user: USER,
          sourceMarket: marketParams,
          repayDebtAmount: BigInt(0),
          repayDebtShares: borrowShares,
          collateralAmount: collateral,
          borrowAmount: debt,
          fluidNftId: BigInt(0),
        },
      ],
    });

    const migrateTxHash = await walletClient.sendTransaction({
      account: USER,
      to: HELPER,
      data: migrateCalldata,
      chain: mainnet,
    });
    const migrateReceipt = await client.waitForTransactionReceipt({
      hash: migrateTxHash,
    });
    console.log(
      `   Migration tx: ${migrateReceipt.status} (gas: ${migrateReceipt.gasUsed})`,
    );
    if (migrateReceipt.status !== "success") {
      throw new Error("Migration transaction reverted!");
    }

    // ── Phase 4: Show Fluid position ──
    console.log("\n[4/5] Querying Fluid position...");

    const supplyAfter = await client.readContract({
      address: FLUID_FACTORY,
      abi: ERC721_ABI,
      functionName: "totalSupply",
    });
    const nftId = supplyAfter;
    console.log(`   Fluid NFTs after: ${supplyAfter}`);
    console.log(`   New position NFT ID: ${nftId}`);

    const nftOwner = await client.readContract({
      address: FLUID_FACTORY,
      abi: ERC721_ABI,
      functionName: "ownerOf",
      args: [nftId],
    });
    console.log(`   NFT owner: ${nftOwner}`);
    console.log(
      `   Owner is MigrationHelper: ${nftOwner.toLowerCase() === HELPER.toLowerCase()}`,
    );

    const helperUsdt = await client.readContract({
      address: USDT as Address,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [HELPER],
    });
    const helperXaut = await client.readContract({
      address: XAUT as Address,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [HELPER],
    });
    console.log(
      `   Helper USDT after migration: ${formatUnits(helperUsdt, 6)}`,
    );
    console.log(
      `   Helper XAUt after migration: ${formatUnits(helperXaut, 6)}`,
    );

    console.log("\n   Fluid Position Summary:");
    console.log(`     Collateral deposited: ${formatUnits(collateral, 6)} XAUt`);
    console.log(`     Debt borrowed: ~${formatUnits(debt, 6)} USDT`);
    console.log(`     NFT ID: ${nftId}`);

    // ── Phase 5: Repay + Withdraw on Fluid ──
    console.log("\n[5/5] Repaying debt + withdrawing collateral on Fluid...");

    // Fund helper with USDT to repay (override USDT storage)
    const repayAmount = debt + parseUnits("50", 6); // debt + buffer for interest
    const usdtBalanceSlot = keccak256(
      encodeAbiParameters(parseAbiParameters("address, uint256"), [
        HELPER,
        BigInt(2),
      ]),
    );
    await testClient.setStorageAt({
      address: USDT as Address,
      index: usdtBalanceSlot,
      value: numberToHex(repayAmount, { size: 32 }),
    });

    const helperUsdtFunded = await client.readContract({
      address: USDT as Address,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [HELPER],
    });
    console.log(
      `   Funded helper with ${formatUnits(helperUsdtFunded, 6)} USDT`,
    );

    // Approve USDT to Fluid vault from helper
    await testClient.impersonateAccount({ address: HELPER });
    await testClient.setBalance({ address: HELPER, value: parseEther("1") });

    const approveTxHash = await walletClient.sendTransaction({
      account: HELPER,
      to: USDT as Address,
      data: encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "approve",
        args: [FLUID_VAULT, repayAmount],
      }),
      chain: mainnet,
    });
    await client.waitForTransactionReceipt({ hash: approveTxHash });

    // Close position: repay all debt + withdraw all collateral
    // Fluid convention: int256.min = max repay/withdraw
    const INT256_MIN = BigInt(
      "-57896044618658097711785492504343953926634992332820282019728792003956564819968",
    );

    const closeTxHash = await walletClient.sendTransaction({
      account: HELPER,
      to: FLUID_VAULT,
      data: encodeFunctionData({
        abi: FLUID_VAULT_ABI,
        functionName: "operate",
        args: [nftId, INT256_MIN, INT256_MIN, USER],
      }),
      chain: mainnet,
    });
    const closeReceipt = await client.waitForTransactionReceipt({
      hash: closeTxHash,
    });
    console.log(
      `   Close position tx: ${closeReceipt.status} (gas: ${closeReceipt.gasUsed})`,
    );
    if (closeReceipt.status !== "success") {
      throw new Error("Close position transaction reverted!");
    }

    // ── Final Balances ──
    console.log("\n── Final Balances ──");

    const userUsdtFinal = await client.readContract({
      address: USDT as Address,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [USER],
    });
    const userXautFinal = await client.readContract({
      address: XAUT as Address,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [USER],
    });
    const helperUsdtFinal = await client.readContract({
      address: USDT as Address,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [HELPER],
    });
    const helperXautFinal = await client.readContract({
      address: XAUT as Address,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [HELPER],
    });

    console.log(`   User  USDT: ${formatUnits(userUsdtFinal, 6)}`);
    console.log(`   User  XAUt: ${formatUnits(userXautFinal, 6)}`);
    console.log(`   Helper USDT: ${formatUnits(helperUsdtFinal, 6)}`);
    console.log(`   Helper XAUt: ${formatUnits(helperXautFinal, 6)}`);

    console.log("\n✅ Full migration cycle complete!");
    console.log(
      "   1. Morpho position closed (debt repaid, collateral withdrawn)",
    );
    console.log(
      "   2. Fluid position opened (collateral deposited, USDT borrowed)",
    );
    console.log(
      "   3. Fluid position closed (debt repaid, collateral back to user)",
    );
  } finally {
    anvil.kill();
    console.log("\n   Anvil stopped.");
  }
}

simulate()
  .then(() => {
    console.log("\n=== Simulation Complete ===\n");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ Simulation failed:", err.message || err);
    if (err.cause) {
      console.error("   Cause:", err.cause.message || err.cause);
    }
    process.exit(1);
  });
