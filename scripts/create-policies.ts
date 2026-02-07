/**
 * One-time script to create Privy policies for the server signer.
 *
 * Run with: npx tsx scripts/create-policies.ts
 *
 * After running, copy the output policy ID and set it as
 * NEXT_PUBLIC_PRIVY_POLICY_ID in your .env file.
 */

import "dotenv/config";
import { PrivyClient } from "@privy-io/node";
import {
  MORPHO_ADDRESS,
  SWAP_ROUTER_02,
  V3_QUOTER,
  USDT0,
  XAUT0,
} from "../src/constants/addresses";

const privy = new PrivyClient({
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  appSecret: process.env.APP_SECRET!,
});

async function main() {
  console.log("Creating VaultX server signer policy...\n");

  const policy = await privy.policies().create({
    name: "VaultX Allowed Contracts",
    version: "1.0",
    chain_type: "ethereum",
    rules: [
      {
        name: "Allow Morpho Blue",
        method: "eth_sendTransaction",
        action: "ALLOW",
        conditions: [
          {
            field_source: "ethereum_transaction",
            field: "to",
            operator: "eq",
            value: MORPHO_ADDRESS,
          },
        ],
      },
      {
        name: "Allow Uniswap V3 Router",
        method: "eth_sendTransaction",
        action: "ALLOW",
        conditions: [
          {
            field_source: "ethereum_transaction",
            field: "to",
            operator: "eq",
            value: SWAP_ROUTER_02,
          },
        ],
      },
      {
        name: "Allow USDT approvals",
        method: "eth_sendTransaction",
        action: "ALLOW",
        conditions: [
          {
            field_source: "ethereum_transaction",
            field: "to",
            operator: "eq",
            value: USDT0,
          },
        ],
      },
      {
        name: "Allow XAUt approvals",
        method: "eth_sendTransaction",
        action: "ALLOW",
        conditions: [
          {
            field_source: "ethereum_transaction",
            field: "to",
            operator: "eq",
            value: XAUT0,
          },
        ],
      },
      {
        name: "Allow Uniswap V3 Quoter",
        method: "eth_sendTransaction",
        action: "ALLOW",
        conditions: [
          {
            field_source: "ethereum_transaction",
            field: "to",
            operator: "eq",
            value: V3_QUOTER,
          },
        ],
      },
      {
        name: "Limit native value per transaction",
        method: "eth_sendTransaction",
        action: "ALLOW",
        conditions: [
          {
            field_source: "ethereum_transaction",
            field: "value",
            operator: "lte",
            value: "1000000000", // ~1 Gwei limit on native ETH value
          },
        ],
      },
    ],
  });

  console.log("Policy created successfully!");
  console.log(`Policy ID: ${policy.id}`);
  console.log(`\nAdd this to your .env file:`);
  console.log(`NEXT_PUBLIC_PRIVY_POLICY_ID=${policy.id}`);
}

main().catch((error) => {
  console.error("Failed to create policy:", error);
  process.exit(1);
});
