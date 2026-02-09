# VaultX

DeFi lending + swap platform on Ethereum. Gasless UX via Account Abstraction (ERC-4337).

## Commands

```bash
pnpm dev      # Start dev server
pnpm build    # Production build
pnpm lint     # ESLint check
pnpm test     # Run vitest tests
```

## Git Branches

| Branch                                  | Purpose                                            |
| --------------------------------------- | -------------------------------------------------- |
| `master`                                | **Active** — Production-ready code                 |
| `refactor-chain-ops-to-backend`         | **Merged** — Blockchain calls moved to API routes  |
| `backend-offline-transaction-execution` | **Merged** — Backend offline transaction execution |

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · Viem · Privy Auth · Biconomy Nexus

## Architecture

```
src/
├── app/              # Pages + API routes
│   ├── borrow/       # Lending market UI
│   ├── swap/         # Token swap UI
│   ├── dashboard/    # Portfolio overview
│   └── api/          # Backend endpoints
│       ├── aa/execute/      # UserOp relayer
│       ├── borrow/          # Borrow operations
│       ├── history/         # Transaction history
│       ├── market/          # Morpho market data
│       ├── positions/       # User position data
│       ├── prices/          # Pyth oracle prices
│       ├── balances/        # Token balances
│       └── swap/            # Quote + prepare
├── components/       # UI (borrow/, swap/, ui/, layout/)
├── services/
│   ├── account-abstraction/  # UserOp creation, signing, execution
│   ├── api/                  # API service layers (borrow, swap)
│   └── privy/                # Privy auth utilities
├── hooks/            # useTransactionExecution, usePythPrices, queries/
├── lib/              # blockchain/client.ts, calculations.ts
├── config/           # App configuration
├── providers/        # React context providers
├── types/            # TypeScript type definitions
└── constants/        # abis.ts, addresses.ts, config.ts
```

## Core Patterns

**Gasless TX Flow:**  
UI action → `aa.service.ts` prepares UserOp → Privy signs → `/api/aa/execute` relays to Bundler

**Data Flow:**  
Components → hooks (`usePosition`, `useMarketData`) → `/api/*` routes → blockchain calls

**State:** React Query for server state, Context for feature state (`BorrowContext`)

## Key Files

- `services/account-abstraction/aa.service.ts` — Core AA logic
- `services/api/borrow.service.ts` — Borrow operations service layer
- `services/api/swap.service.ts` — Swap operations service layer
- `hooks/useTransactionExecution.ts` — Gasless TX hook
- `components/borrow/BorrowDashboard.tsx` — Main lending interface
- `lib/calculations.ts` — Market/position math (pure functions)
- `constants/addresses.ts` — Contract addresses (Morpho, Uniswap, tokens)

## Protocols

- **Lending:** Morpho Blue (XAUt collateral → USDT loans)
- **Swaps:** Uniswap V3
- **Oracles:** Pyth Network
- **AA:** Biconomy Nexus + custom bundler
