/**
 * Backend policy validation for offline transaction execution.
 *
 * Validates every Call object against a strict allowlist before signing.
 * This replaces Privy's policy engine (which doesn't support personal_sign).
 *
 * Security layers enforced here:
 *   1. Contract address allowlist — only known DeFi contracts
 *   2. Function selector allowlist — only known safe functions per contract
 *   3. Native value limit — no ETH transfers
 *   4. Call count limit — prevent gas griefing
 */

import { Address, Hex, getAddress, slice } from "viem";
import {
  MORPHO_ADDRESS,
  SWAP_ROUTER_02,
  USDT0,
  XAUT0,
} from "@/constants/addresses";

// ─── Function Selectors (first 4 bytes of keccak256 of function signature) ────

const SELECTORS = {
  // ERC20
  approve: "0x095ea7b3" as Hex, // approve(address,uint256)

  // Morpho Blue
  supplyCollateral: "0x238d6579" as Hex, // supplyCollateral(MarketParams,uint256,address,bytes)
  borrow: "0x50d8cd4b" as Hex, // borrow(MarketParams,uint256,uint256,address,address)
  repay: "0x20b76e81" as Hex, // repay(MarketParams,uint256,uint256,address,bytes)
  withdrawCollateral: "0x8720316d" as Hex, // withdrawCollateral(MarketParams,uint256,address,address)

  // Uniswap V3
  exactInputSingle: "0x414bf389" as Hex, // exactInputSingle(ExactInputSingleParams)
} as const;

// ─── Per-Contract Allowed Functions ──────────────────────────────────────────

type AllowedContract = {
  name: string;
  selectors: readonly Hex[];
  /** If set, approve() calls to this token are only allowed for these spenders */
  allowedApproveSpenders?: readonly Address[];
};

const ALLOWED_CONTRACTS: Record<string, AllowedContract> = {
  [getAddress(MORPHO_ADDRESS)]: {
    name: "Morpho Blue",
    selectors: [
      SELECTORS.supplyCollateral,
      SELECTORS.borrow,
      SELECTORS.repay,
      SELECTORS.withdrawCollateral,
    ],
  },
  [getAddress(SWAP_ROUTER_02)]: {
    name: "Uniswap V3 Router",
    selectors: [SELECTORS.exactInputSingle],
  },
  [getAddress(USDT0)]: {
    name: "USDT",
    selectors: [SELECTORS.approve],
    allowedApproveSpenders: [
      getAddress(MORPHO_ADDRESS),
      getAddress(SWAP_ROUTER_02),
    ],
  },
  [getAddress(XAUT0)]: {
    name: "XAUt",
    selectors: [SELECTORS.approve],
    allowedApproveSpenders: [
      getAddress(MORPHO_ADDRESS),
      getAddress(SWAP_ROUTER_02),
    ],
  },
};

/** Maximum native ETH value allowed per call (in wei). */
const MAX_NATIVE_VALUE = BigInt(0); // No native ETH transfers

/** Maximum number of calls allowed in a single UserOp. */
const MAX_CALLS_PER_OP = 10;

// ─── Types ───────────────────────────────────────────────────────────────────

interface Call {
  to: Address;
  data?: Hex;
  value?: bigint;
}

interface PolicyResult {
  valid: boolean;
  error?: string;
}

// ─── Validation ──────────────────────────────────────────────────────────────

/**
 * Validates an array of calls against the backend policy.
 * Must be called BEFORE signing the UserOp.
 */
export function validateCallsAgainstPolicy(calls: Call[]): PolicyResult {
  if (calls.length === 0) {
    return { valid: false, error: "Empty call array" };
  }

  if (calls.length > MAX_CALLS_PER_OP) {
    return {
      valid: false,
      error: `Too many calls (${calls.length}). Maximum is ${MAX_CALLS_PER_OP}`,
    };
  }

  for (let i = 0; i < calls.length; i++) {
    const call = calls[i];
    const result = validateSingleCall(call, i);
    if (!result.valid) {
      return result;
    }
  }

  return { valid: true };
}

function validateSingleCall(call: Call, index: number): PolicyResult {
  const prefix = `Call[${index}]`;

  // 1. Check native value
  if (call.value && call.value > MAX_NATIVE_VALUE) {
    return {
      valid: false,
      error: `${prefix}: Native ETH transfers not allowed (value: ${call.value})`,
    };
  }

  // 2. Check contract allowlist
  const checksumTo = getAddress(call.to);
  const contract = ALLOWED_CONTRACTS[checksumTo];

  if (!contract) {
    return {
      valid: false,
      error: `${prefix}: Contract ${call.to} is not in the allowlist`,
    };
  }

  // 3. Check function selector
  if (!call.data || call.data.length < 10) {
    return {
      valid: false,
      error: `${prefix}: Missing or invalid calldata for ${contract.name}`,
    };
  }

  const selector = slice(call.data, 0, 4);
  const isAllowed = contract.selectors.some(
    (s) => s.toLowerCase() === selector.toLowerCase()
  );

  if (!isAllowed) {
    return {
      valid: false,
      error: `${prefix}: Function selector ${selector} not allowed on ${contract.name}`,
    };
  }

  // 4. For approve() calls, validate the spender
  if (
    selector.toLowerCase() === SELECTORS.approve.toLowerCase() &&
    contract.allowedApproveSpenders
  ) {
    const spenderResult = validateApproveSpender(
      call.data,
      contract.allowedApproveSpenders,
      contract.name,
      prefix
    );
    if (!spenderResult.valid) {
      return spenderResult;
    }
  }

  return { valid: true };
}

/**
 * Extracts the spender address from approve(address,uint256) calldata
 * and checks it against the allowlist.
 */
function validateApproveSpender(
  data: Hex,
  allowedSpenders: readonly Address[],
  contractName: string,
  prefix: string
): PolicyResult {
  // approve(address,uint256) calldata layout:
  // 4 bytes selector + 32 bytes address (left-padded) + 32 bytes amount
  if (data.length < 74) {
    // 0x + 8 selector + 64 address = 74 chars minimum
    return {
      valid: false,
      error: `${prefix}: Invalid approve calldata on ${contractName}`,
    };
  }

  // Extract spender: bytes 4-36 (the address is in the last 20 bytes of the 32-byte word)
  const spenderHex = ("0x" + data.slice(34, 74)) as Address;

  try {
    const spender = getAddress(spenderHex);
    const isAllowed = allowedSpenders.some(
      (s) => getAddress(s) === spender
    );

    if (!isAllowed) {
      return {
        valid: false,
        error: `${prefix}: Approve spender ${spender} not allowed on ${contractName}`,
      };
    }
  } catch {
    return {
      valid: false,
      error: `${prefix}: Invalid spender address in approve call on ${contractName}`,
    };
  }

  return { valid: true };
}
