# VaultX

**VaultX** is a DeFi lending and swap platform on **Ethereum** with a fully gasless UX powered by Account Abstraction (EIP-7702). Users sign up with email, deposit collateral, borrow stablecoins, and swap tokens — without ever holding ETH for gas.

The backend exposes a complete API surface for both **interactive** (user-signed) and **offline** (agent-driven) transaction execution, making it suitable for autonomous DeFi agents.

---

## Features

- **Email Onboarding** — Privy authentication, no browser wallet required
- **Smart Accounts** — Biconomy Nexus (EIP-7702) upgrades EOAs into smart accounts
- **Gasless Transactions** — Backend relay sponsors all gas fees
- **Lending & Borrowing** — Morpho Blue integration (XAUt collateral → USDT loans)
- **Token Swaps** — Uniswap V3 with slippage protection
- **Real-Time Oracles** — Pyth Network price feeds for XAUt and USDT
- **Offline Execution** — Internal API for agents to execute transactions on behalf of users
- **Protocol Migration** — Automated Morpho → Fluid vault migration via flash loans
- **Protocol Discovery** — API to compare lending rates across Morpho and Fluid
- **Security Hardening** — Rate limiting, Zod validation, address ownership checks, audit logging
- **Agent Policy Management** — Users can approve/revoke agent delegation from the UI

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript, React 19 |
| Styling | Tailwind CSS 4, Framer Motion |
| Blockchain | Viem 2.x |
| Auth | Privy (@privy-io/react-auth + @privy-io/node) |
| Account Abstraction | Biconomy Nexus (EIP-7702) |
| Lending | Morpho Blue, Fluid (Instadapp) |
| Swaps | Uniswap V3 (Quoter + SwapRouter) |
| Oracles | Pyth Network (Hermes API) |
| Database | MongoDB |
| Validation | Zod |
| State Management | TanStack React Query |
| Testing | Vitest |

---

## Architecture

```
src/
├── app/                          # Next.js pages + API routes
│   ├── borrow/                   # Lending market UI
│   ├── swap/                     # Token swap UI
│   ├── dashboard/                # Portfolio overview
│   ├── policy/                   # Agent delegation management
│   └── api/                      # Backend endpoints (see API Reference)
│       ├── aa/execute/           # UserOp relay (online)
│       ├── aa/execute-offline/   # Agent execution (offline)
│       ├── borrow/prepare/       # Build borrow UserOps
│       ├── swap/prepare/         # Build swap UserOps
│       ├── swap/quote/           # Uniswap V3 quotes
│       ├── migrate/prepare/       # Morpho → Fluid migration UserOps
│       ├── protocols/            # Protocol rate comparison
│       ├── cron/monitor-positions/ # Position monitoring + auto-migration
│       ├── balances/             # Token balances
│       ├── positions/            # Morpho user positions
│       ├── history/              # Transaction history
│       ├── market/               # Morpho market data
│       └── prices/               # Pyth oracle prices
├── components/                   # UI components
│   ├── borrow/                   # Lending interface + sub-components
│   ├── swap/                     # Swap interface + sub-components
│   ├── dashboard/                # Portfolio dashboard
│   └── ui/                       # Shared UI (Navbar, Toast, Skeleton)
├── services/
│   ├── account-abstraction/      # UserOp creation, signing, relay
│   ├── api/                      # Borrow, swap, migration, policy service layers
│   └── privy/                    # Privy server-side utilities
├── hooks/                        # React hooks
│   ├── useTransactionExecution   # Gasless TX orchestration
│   ├── useDelegationStatus       # Agent delegation state
│   └── queries/                  # React Query hooks (positions, balances, etc.)
├── lib/                          # Utilities
│   ├── blockchain/               # Viem client + helpers
│   ├── auth.ts                   # Token verification + address ownership
│   ├── validation.ts             # Zod request schemas
│   ├── rate-limit.ts             # Sliding-window rate limiter
│   ├── audit.ts                  # Security audit logging
│   ├── mongodb.ts                # Database connection
│   └── calculations.ts           # Pure math (LTV, liquidation, etc.)
├── constants/                    # ABIs, contract addresses, config
├── providers/                    # React context providers
└── types/                        # TypeScript type definitions
```

### Transaction Flow

**Online (user-signed):**
```
UI Action → /api/borrow/prepare (or /api/swap/prepare)
         → Returns unsigned UserOp
         → User signs via Privy signer
         → /api/aa/execute relays to chain
         → Transaction confirmed
```

**Offline (agent-driven):**
```
Agent → /api/aa/execute-offline (with X-Internal-Key)
     → Backend builds calls, validates against policy
     → Signs via Privy server-side signer
     → Relays to chain
     → Transaction confirmed + audit logged
```

**Auto-Migration (cron-driven):**
```
GitHub Actions (every 10 min) → GET /api/cron/monitor-positions
  → Discover users from transaction_history
  → For each user with active Morpho position:
      1. Compare Morpho vs Fluid borrowing rates
      2. If Fluid rate is lower by ≥ 0.5%:
         → Flash-loan USDT to repay Morpho debt
         → Withdraw XAUt collateral from Morpho
         → Open Fluid vault position (supply XAUt + borrow USDT)
         → Repay flash loan
         (atomic via MigrationHelper contract)
      3. Log result to migration_log + audit_log
```

---

## Getting Started

### Prerequisites

- Node.js 18+ (20+ recommended)
- pnpm

### Installation

```bash
git clone https://github.com/HiteshMittal07/vaultx.git
cd vaultx
pnpm install
```

### Environment Variables

Copy the example and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description | Required |
|---|---|---|
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy app ID from [dashboard.privy.io](https://dashboard.privy.io) | Yes |
| `NEXT_PUBLIC_AUTHORIZATION_KEY_ID` | Quorum ID for the EIP-7702 authorization signer | Yes |
| `APP_SECRET` | Privy app secret for server-side token verification | Yes |
| `PRIVATE_KEY` | Hex private key (`0x...`) for the relay wallet that submits UserOps | Yes |
| `AUTHORIZATION_PRIVATE_KEY` | ECDSA private key (PEM format) for signing EIP-7702 authorizations | Yes |
| `MONGODB_URI` | MongoDB connection string (`mongodb+srv://...`) | Yes |
| `INTERNAL_API_KEY` | API key for internal-only endpoints (offline execution) | Yes |
| `CRON_SECRET` | Secret for cron endpoint auth (`openssl rand -base64 32`). Add to GitHub Secrets. | Yes |
| `RPC_URL` | Ethereum RPC endpoint for server-side blockchain calls | Yes |
| `NEXT_PUBLIC_RPC_URL` | Ethereum RPC endpoint for client-side blockchain calls | Yes |

### Run

```bash
pnpm dev       # Start dev server at http://localhost:3000
pnpm build     # Production build
pnpm lint      # ESLint check
pnpm test      # Run vitest tests
```

---

## API Reference

All authenticated endpoints require a Privy access token in the `Authorization` header:
```
Authorization: Bearer <privy_access_token>
```

The offline execution endpoint uses an internal API key instead:
```
X-Internal-Key: <INTERNAL_API_KEY>
```

### Authentication & Security

| Mechanism | Description |
|---|---|
| **Bearer Auth** | Privy access token verification via `verifyAuth()` |
| **Address Ownership** | Validates the queried address belongs to the authenticated user |
| **Internal Key** | `X-Internal-Key` header for internal-only endpoints |
| **Rate Limiting** | Sliding-window limiter (execute: 5/min, prepare: 10/min per user) |
| **Input Validation** | Zod schemas on all mutation endpoints |
| **Audit Logging** | Security events written to MongoDB `audit_log` collection |

---

### Public Endpoints

#### `GET /api/market`

Returns Morpho Blue market data. No authentication required.

**Response:**
```json
{
  "totalMarketSize": "1500000.00",
  "totalLiquidity": "800000.00",
  "borrowedFunds": "700000.00",
  "utilization": "0.4667",
  "borrowRate": "0.0342",
  "oraclePrice": 2945.50,
  "lltv": "0.77",
  "timestamp": 1707350400000
}
```

---

#### `GET /api/prices`

Returns current Pyth oracle prices for XAUt and USDT. No authentication required.

**Response:**
```json
{
  "XAUt": {
    "price": 2945.50,
    "publishTime": 1707350400,
    "exponent": -8,
    "confidence": 1.25
  },
  "USDT": {
    "price": 1.0001,
    "publishTime": 1707350400,
    "exponent": -8,
    "confidence": 0.0002
  },
  "timestamp": 1707350400000
}
```

---

#### `GET /api/swap/quote`

Returns a Uniswap V3 quote. No authentication required.

**Query Parameters:**

| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `tokenIn` | `Address` | Yes | — | Input token address |
| `tokenOut` | `Address` | Yes | — | Output token address |
| `amountIn` | `string` | Yes | — | Amount in human-readable units |
| `decimalsIn` | `number` | No | `6` | Input token decimals |
| `decimalsOut` | `number` | No | `6` | Output token decimals |

**Response:**
```json
{
  "amountOut": "3412.580000",
  "timestamp": 1707350400000
}
```

---

### Authenticated Endpoints

All endpoints below require `Authorization: Bearer <token>`.

#### `GET /api/balances`

Returns USDT and XAUt balances for the authenticated user's address.

**Query Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `address` | `Address` | Yes | Wallet address (must belong to authenticated user) |

**Response:**
```json
{
  "usdt": {
    "raw": "1500000000",
    "formatted": "1500.000000",
    "decimals": 6
  },
  "xaut": {
    "raw": "500000",
    "formatted": "0.500000",
    "decimals": 6
  },
  "timestamp": 1707350400000
}
```

---

#### `GET /api/positions`

Returns the user's Morpho lending position with risk metrics.

**Query Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `address` | `Address` | Yes | Wallet address (must belong to authenticated user) |

**Response:**
```json
{
  "userCollateral": "500000",
  "userBorrow": "750000000",
  "currentLTV": 0.51,
  "lltv": "0.77",
  "liquidationPrice": 1948.05,
  "percentDropToLiquidation": 33.85,
  "maxWithdrawable": "150000",
  "oraclePrice": 2945.50,
  "hasPosition": true,
  "timestamp": 1707350400000
}
```

---

#### `GET /api/history`

Returns transaction history for the authenticated user.

**Query Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `walletAddress` | `Address` | Yes | Wallet address (must belong to authenticated user) |

**Response:**
```json
[
  {
    "id": "0xabc...123",
    "txHash": "0xabc...123",
    "action": "borrow",
    "executedBy": "user",
    "status": "success",
    "timestamp": "2025-02-08T12:00:00.000Z"
  }
]
```

---

#### `POST /api/history`

Saves a transaction history entry.

**Request Body:**
```json
{
  "walletAddress": "0x...",
  "action": "borrow",
  "txHash": "0xabc...123",
  "executedBy": "vaultx-agent",
  "status": "success"
}
```

**Response:**
```json
{ "success": true }
```

---

### Transaction Endpoints

#### `POST /api/borrow/prepare`

Builds an unsigned UserOp for lending operations. Rate limited to **10 req/min** per user.

**Request Body:**
```json
{
  "userAddress": "0x...",
  "authorization": {},

  "action": "supply",
  "amount": "1.5",
  "max": false,

  "supplyAmount": "1.5",
  "borrowAmount": "1000",
  "repayAmount": "500",
  "withdrawAmount": "0.5",
  "repayMax": false,
  "withdrawMax": false
}
```

Use either single-action mode (`action` + `amount`) or combined mode (`supplyAmount`, `borrowAmount`, etc.) for batched operations.

| Field | Type | Required | Description |
|---|---|---|---|
| `userAddress` | `Address` | Yes | User's wallet address |
| `authorization` | `object` | No | EIP-7702 authorization (for first-time smart account setup) |
| `action` | `string` | No | `"supply"` \| `"borrow"` \| `"repay"` \| `"withdraw"` |
| `amount` | `string` | No | Amount in human-readable units |
| `max` | `boolean` | No | Use maximum available amount |
| `supplyAmount` | `string` | No | Supply amount (combined mode) |
| `borrowAmount` | `string` | No | Borrow amount (combined mode) |
| `repayAmount` | `string` | No | Repay amount (combined mode) |
| `withdrawAmount` | `string` | No | Withdraw amount (combined mode) |
| `repayMax` | `boolean` | No | Repay full debt |
| `withdrawMax` | `boolean` | No | Withdraw all collateral |

**Response:**
```json
{
  "unsignedUserOp": {
    "sender": "0x...",
    "nonce": "1",
    "callData": "0x...",
    "callGasLimit": "200000",
    "verificationGasLimit": "100000",
    "preVerificationGas": "50000",
    "maxFeePerGas": "0",
    "maxPriorityFeePerGas": "0",
    "signature": "0x"
  }
}
```

---

#### `POST /api/swap/prepare`

Builds an unsigned UserOp for a token swap. Rate limited to **10 req/min** per user.

**Request Body:**
```json
{
  "tokenIn": "0x...",
  "tokenOut": "0x...",
  "amountIn": "100",
  "decimalsIn": 6,
  "decimalsOut": 6,
  "slippage": "5.0",
  "deadline": "30",
  "userAddress": "0x...",
  "authorization": {}
}
```

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `tokenIn` | `Address` | Yes | — | Input token address |
| `tokenOut` | `Address` | Yes | — | Output token address |
| `amountIn` | `string` | Yes | — | Amount to swap |
| `userAddress` | `Address` | Yes | — | User's wallet address |
| `decimalsIn` | `number` | No | `6` | Input token decimals |
| `decimalsOut` | `number` | No | `6` | Output token decimals |
| `slippage` | `string` | No | `"5.0"` | Slippage tolerance (%) |
| `deadline` | `string` | No | `"30"` | TX deadline (minutes) |
| `authorization` | `object` | No | — | EIP-7702 authorization |

**Response:**
```json
{
  "unsignedUserOp": { "..." },
  "quote": {
    "amountOut": "3412.580000",
    "amountOutMinimum": "3242.951000"
  }
}
```

---

#### `POST /api/aa/execute`

Relays a signed UserOp to the blockchain. Rate limited to **5 req/min** per user.

**Request Body:**
```json
{
  "userOp": {
    "sender": "0x...",
    "nonce": "1",
    "callData": "0x...",
    "callGasLimit": "200000",
    "verificationGasLimit": "100000",
    "preVerificationGas": "50000",
    "maxFeePerGas": "0",
    "maxPriorityFeePerGas": "0",
    "signature": "0xsigned..."
  },
  "authorization": {}
}
```

**Response:**
```json
{ "txHash": "0xabc...123" }
```

---

### Offline Execution (For Agents)

#### `POST /api/aa/execute-offline`

Executes transactions on behalf of users without their real-time signature. Intended for autonomous agents operating under a delegated policy.

**Auth:** Requires `X-Internal-Key` header (not Bearer token).

**Request Body:**
```json
{
  "type": "borrow",
  "userAddress": "0x...",
  "params": {
    "action": "supply",
    "amount": "1.5"
  }
}
```

**Borrow params:**

| Field | Type | Description |
|---|---|---|
| `action` | `string` | `"supply"` \| `"borrow"` \| `"repay"` \| `"withdraw"` |
| `amount` | `string` | Amount in human-readable units |
| `max` | `boolean` | Use maximum available amount |
| `supplyAmount` | `string` | Supply amount (combined mode) |
| `borrowAmount` | `string` | Borrow amount (combined mode) |
| `repayAmount` | `string` | Repay amount (combined mode) |
| `withdrawAmount` | `string` | Withdraw amount (combined mode) |
| `repayMax` | `boolean` | Repay full debt |
| `withdrawMax` | `boolean` | Withdraw all collateral |

**Swap params:**

| Field | Type | Required | Description |
|---|---|---|---|
| `tokenIn` | `Address` | Yes | Input token address |
| `tokenOut` | `Address` | Yes | Output token address |
| `amountIn` | `string` | Yes | Amount to swap |
| `decimalsIn` | `number` | No | Input token decimals |
| `decimalsOut` | `number` | No | Output token decimals |
| `slippage` | `string` | No | Slippage tolerance (%) |
| `deadline` | `string` | No | TX deadline (minutes) |

**Response:**
```json
{
  "txHash": "0xabc...123",
  "userOpHash": "0xdef...456"
}
```

**Security:**
- Validated against a backend policy (contract allowlist + selector allowlist)
- Application-level spend limit of **1000 per transaction**
- All executions are audit-logged to MongoDB
- Input validated with Zod schema (`ExecuteOfflineSchema`)

---

### Auto-Migration (Cron)

#### `GET /api/cron/monitor-positions`

Monitors all VaultX users' Morpho positions and triggers migration to Fluid when borrowing rates are more favorable. Runs every 10 minutes via GitHub Actions.

**Auth:** Requires `Authorization: Bearer <CRON_SECRET>`.

**Response:**
```json
{
  "success": true,
  "summary": {
    "usersChecked": 5,
    "migrationsTriggered": 1,
    "skipped": 2,
    "errors": 0
  },
  "timestamp": "2026-02-08T18:00:00.000Z"
}
```

**Migration logic:**
- Compares Morpho vs Fluid borrow rates for each user
- Triggers when Fluid rate is lower by ≥ 0.5%
- Uses `MigrationHelper` contract with Morpho flash loans
- Atomically moves collateral + debt from Morpho to Fluid
- 1-hour cooldown between migrations per user
- Results logged to `migration_log` and `transaction_history` collections

---

### Protocol Comparison

#### `GET /api/protocols`

Returns current lending rates from Morpho and Fluid for XAUt/USDT markets. No authentication required.

**Response:**
```json
{
  "protocols": [
    { "name": "Morpho Blue", "borrowRate": 0.0342, "supplyRate": 0.021 },
    { "name": "Fluid", "borrowRate": 0.028, "supplyRate": 0.018 }
  ],
  "timestamp": 1707350400000
}
```

---

### Error Responses

All endpoints return errors in a consistent format:

```json
{ "error": "Description of what went wrong" }
```

| Status | Meaning |
|---|---|
| `400` | Invalid request (missing/malformed fields) |
| `401` | Unauthorized (missing or invalid auth token/key) |
| `403` | Forbidden (address ownership mismatch or policy violation) |
| `429` | Rate limited (includes `Retry-After` header) |
| `500` | Server error |

---

## Contract Addresses (Ethereum)

| Contract | Address |
|---|---|
| Morpho Blue | `0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb` |
| Fluid Vault (XAUt/USDT) | `0xEce156BeD5aF2621b80b87ff4fE8fD3A929E3644` |
| MigrationHelper | `0x00A90cCAf7DACb39f29953691a0A8371038cF746` |
| Uniswap V3 Quoter | `0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6` |
| Uniswap V3 SwapRouter | `0xE592427A0AEce92De3Edee1F18E0157C05861564` |
| USDT | `0xdAC17F958D2ee523a2206206994597C13D831ec7` |
| XAUt | `0x68749665FF8D2d112Fa859AA293F07A622782F38` |

---

## License

This project is licensed under the MIT License.
