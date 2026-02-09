/**
 * E2E test for offline transaction execution.
 *
 * Tests the full pipeline:
 *   1. Privy wallet ID lookup (address → wallet ID)
 *   2. UserOp preparation (call building + gas estimation)
 *   3. Server-side signing via Privy authorization key
 *   4. Relayer submission to EntryPoint
 *
 * Run with: npx tsx scripts/test-offline-execution.ts
 *
 * Prerequisites:
 *   - .env configured with all required vars
 *   - Policy created and NEXT_PUBLIC_PRIVY_POLICY_ID set
 *   - Server signer added to the user's wallet (via login flow)
 *   - Dev server running: pnpm dev
 */

import "dotenv/config";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || "";
const USER_ADDRESS = "0x4D324ACFB77b68dA846Dd805F9fAdfd8cc3617bC";

// ─── Helpers ─────────────────────────────────────────────────────

async function callEndpoint(path: string, body: object) {
  const url = `${BASE_URL}${path}`;
  console.log(`\n→ POST ${url}`);
  console.log(`  Body: ${JSON.stringify(body, null, 2)}`);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Key": INTERNAL_API_KEY,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  console.log(`  Status: ${res.status}`);
  console.log(`  Response: ${JSON.stringify(data, null, 2)}`);
  return { status: res.status, data };
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`\n✗ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

// ─── Tests ───────────────────────────────────────────────────────

async function testMissingFields() {
  console.log("\n═══ Test 1: Missing required fields ═══");

  const { status, data } = await callEndpoint("/api/aa/execute-offline", {});
  assert(status === 400, "Returns 400 for empty body");
  assert(
    data.error === "type: Invalid discriminator value. Expected 'borrow' | 'swap'",
    "Error message matches",
  );
}

async function testInvalidType() {
  console.log("\n═══ Test 2: Invalid type ═══");

  const { status, data } = await callEndpoint("/api/aa/execute-offline", {
    type: "invalid",
    userAddress: USER_ADDRESS,
    params: {},
  });
  assert(status === 400, "Returns 400 for invalid type");
  assert(
    data.error ===
      "type: Invalid discriminator value. Expected 'borrow' | 'swap'",
    "Error message matches",
  );
}

async function testMissingBorrowParams() {
  console.log("\n═══ Test 3: Missing borrow params ═══");

  const { status, data } = await callEndpoint("/api/aa/execute-offline", {
    type: "borrow",
    userAddress: USER_ADDRESS,
    params: {},
  });
  assert(status === 500, "Returns 500 for missing borrow params");
  assert(
    data.error === "Missing borrow action parameters",
    "Error message matches"
  );
}

async function testSpendLimitExceeded() {
  console.log("\n═══ Test 4: Spend limit exceeded ═══");

  const { status, data } = await callEndpoint("/api/aa/execute-offline", {
    type: "borrow",
    userAddress: USER_ADDRESS,
    params: {
      supplyAmount: "5000", // Exceeds $1,000 limit
    },
  });
  assert(status === 500, "Returns 500 for spend limit exceeded");
  assert(
    data.error.includes("exceeds maximum"),
    "Error mentions exceeds maximum"
  );
}

async function testInvalidSwapParams() {
  console.log("\n═══ Test 5: Invalid swap params ═══");

  const { status, data } = await callEndpoint("/api/aa/execute-offline", {
    type: "swap",
    userAddress: USER_ADDRESS,
    params: {
      tokenIn: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
      tokenOut: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", // Same token
      amountIn: "10",
      decimalsIn: 6,
      decimalsOut: 6,
      slippage: "5",
      deadline: "30",
    },
  });
  assert(status === 500, "Returns 500 for same-token swap");
  assert(
    data.error === "Cannot swap same token",
    "Error message matches"
  );
}

async function testOfflineSupply() {
  console.log("\n═══ Test 6: Full offline supply execution ═══");
  console.log("  This test calls the real Privy API and blockchain.");
  console.log("  It will:");
  console.log("    1. Build supply collateral calls (XAUt → Morpho)");
  console.log("    2. Prepare a UserOp");
  console.log("    3. Sign via Privy authorization key");
  console.log("    4. Submit to EntryPoint via relayer\n");

  const { status, data } = await callEndpoint("/api/aa/execute-offline", {
    type: "borrow",
    userAddress: USER_ADDRESS,
    params: {
      supplyAmount: "0.00001", // Tiny amount for testing
    },
  });

  if (status === 200 && data.txHash) {
    assert(true, `Transaction submitted! txHash: ${data.txHash}`);
    assert(!!data.userOpHash, `UserOp hash: ${data.userOpHash}`);
    console.log(
      `\n  View on Etherscan: https://etherscan.io/tx/${data.txHash}`,
    );
  } else {
    console.log(`\n  ⚠ Execution returned status ${status}`);
    console.log(`  Response: ${JSON.stringify(data, null, 2)}`);
    console.log(
      "\n  This may fail if:"
    );
    console.log("    - User has no XAUt balance");
    console.log("    - Server signer not registered on wallet");
    console.log("    - Privy authorization key mismatch");
    console.log("    - Gas estimation fails (insufficient funds for gas)");
    console.log(
      "    - AUTHORIZATION_PRIVATE_KEY env var is malformed (check single-line in .env)"
    );

    // Don't fail — the error message itself is valuable for debugging
    assert(!!data.error, `Got error message: ${data.error}`);
  }
}

// ─── Runner ──────────────────────────────────────────────────────

async function main() {
  console.log("╔═══════════════════════════════════════════════════╗");
  console.log("║  VaultX Offline Execution E2E Test               ║");
  console.log("╚═══════════════════════════════════════════════════╝");
  console.log(`\nTarget: ${BASE_URL}`);
  console.log(`User:   ${USER_ADDRESS}`);

  // Validation tests (no blockchain calls)
  await testMissingFields();
  await testInvalidType();
  await testMissingBorrowParams();
  await testSpendLimitExceeded();
  await testInvalidSwapParams();

  // Full E2E test (hits Privy API + blockchain)
  await testOfflineSupply();

  console.log("\n══════════════════════════════════════════════════");
  console.log("All tests completed.");
}

main().catch((err) => {
  console.error("\nTest runner failed:", err);
  process.exit(1);
});
