import { Address } from "viem";

// =============================================================================
// Token Types
// =============================================================================

export type TokenSymbol = "USDT0" | "XAUt0";

export interface TokenInfo {
  symbol: TokenSymbol;
  address: Address;
  decimals: number;
}

// =============================================================================
// Price Types
// =============================================================================

export interface PythPrices {
  XAUt0: number;
  USDT0: number;
}

// =============================================================================
// Transaction History Types
// =============================================================================

export type TransactionType =
  | "swap"
  | "supply"
  | "borrow"
  | "repay"
  | "withdraw";

export type TransactionStatus = "pending" | "success" | "failed";
export type ExecutedBy = "user" | "vaultx-agent";

export interface TransactionHistoryItem {
  id: string;
  type: TransactionType;
  timestamp: string;
  status: TransactionStatus;
  executedBy: ExecutedBy;
  // Swap-specific fields (addresses, resolved to symbols on frontend)
  tokenIn?: string;
  tokenOut?: string;
  amountIn?: string;
  amountOut?: string;
  // Borrow-specific fields
  supply?: string;
  borrow?: string;
  repay?: string;
  withdraw?: string;
}

// =============================================================================
// Notification Types
// =============================================================================

export type NotificationType = "success" | "error";

export interface Notification {
  type: NotificationType;
  message: string;
  txHash?: string;
}

// =============================================================================
// Morpho Market Types
// =============================================================================

/**
 * Morpho Market Parameters (from idToMarketParams)
 * Index mapping:
 * [0] loanToken (Address)
 * [1] collateralToken (Address)
 * [2] oracle (Address)
 * [3] irm (Address - Interest Rate Model)
 * [4] lltv (bigint - Liquidation LTV in 18 decimals)
 */
export interface MorphoMarketParams {
  loanToken: Address;
  collateralToken: Address;
  oracle: Address;
  irm: Address;
  lltv: bigint;
}

/**
 * Morpho Market State (from market())
 * Index mapping:
 * [0] totalSupplyAssets (bigint)
 * [1] totalSupplyShares (bigint)
 * [2] totalBorrowAssets (bigint)
 * [3] totalBorrowShares (bigint)
 * [4] lastUpdate (bigint)
 * [5] fee (bigint)
 */
export interface MorphoMarketState {
  totalSupplyAssets: bigint;
  totalSupplyShares: bigint;
  totalBorrowAssets: bigint;
  totalBorrowShares: bigint;
  lastUpdate: bigint;
  fee: bigint;
}

/**
 * Morpho User Position (from position())
 * Index mapping:
 * [0] supplyShares (bigint)
 * [1] borrowShares (bigint)
 * [2] collateral (bigint)
 */
export interface MorphoUserPosition {
  supplyShares: bigint;
  borrowShares: bigint;
  collateral: bigint;
}

export interface MorphoMarketData {
  params: MorphoMarketParams | null;
  state: MorphoMarketState | null;
  position: MorphoUserPosition | null;
}

// Raw tuple types from contract (for type-safe array access)
export type MorphoMarketParamsRaw = readonly [
  Address, // loanToken
  Address, // collateralToken
  Address, // oracle
  Address, // irm
  bigint, // lltv
];

export type MorphoMarketStateRaw = readonly [
  bigint, // totalSupplyAssets
  bigint, // totalSupplyShares
  bigint, // totalBorrowAssets
  bigint, // totalBorrowShares
  bigint, // lastUpdate
  bigint, // fee
];

export type MorphoUserPositionRaw = readonly [
  bigint, // supplyShares
  bigint, // borrowShares
  bigint, // collateral
];

// =============================================================================
// Borrow Dashboard Types
// =============================================================================

export type SidebarMode = "borrow" | "repay";
export type ActionType = "borrow" | "repay";
export type BorrowTab = "Overview" | "Your Position" | "Activity";

export interface UserBalances {
  loan: string;
  collateral: string;
}

export interface BorrowFormState {
  supplyAmount: string;
  borrowAmount: string;
  repayAmount: string;
  withdrawAmount: string;
  repayMax: boolean;
  withdrawMax: boolean;
}

export interface BorrowMetrics {
  currentLTV: number;
  projectedLTV: number;
  lltv: number;
  userCollateral: number;
  userBorrow: number;
  projectedCollateral: number;
  projectedBorrow: number;
  maxWithdrawable: number;
  liquidationPrice: number;
  percentDropToLiquidation: number;
}

export interface MarketMetrics {
  totalMarketSize: number;
  totalLiquidity: number;
  borrowedFunds: number;
  borrowRate: string;
  utilization: string;
  oraclePrice: number;
}

// =============================================================================
// Swap Types
// =============================================================================

export interface SwapSettings {
  slippage: string;
  deadlineMinutes: string;
}

export interface SwapQuote {
  amountOut: string;
  priceImpact?: number;
}

// =============================================================================
// Component Prop Types
// =============================================================================

export interface MetricStatProps {
  label: string;
  value: string;
  subValue?: string;
  isLoading?: boolean;
  info?: string;
}

export interface RiskCardProps {
  label: string;
  value: string;
  description: string;
  severity: "safe" | "warning" | "danger";
  icon?: React.ReactNode;
}

export interface MarketAttributeProps {
  label: string;
  value: string | React.ReactNode;
  info?: string;
}

// =============================================================================
// Action Handler Types
// =============================================================================

export interface BorrowActionOverrides {
  supply?: string;
  borrow?: string;
  repay?: string;
  withdraw?: string;
  type?: ActionType;
  actionId?: string;
  repayMax?: boolean;
  withdrawMax?: boolean;
}

export type HandleBorrowAction = (
  overrides?: BorrowActionOverrides,
) => Promise<void>;

// =============================================================================
// API Types (for backend integration)
// =============================================================================

export interface PrepareSwapRequest {
  tokenIn: Address;
  tokenOut: Address;
  amountIn: string;
  slippage: string;
  deadline: string;
}

export interface PrepareSwapResponse {
  unsignedUserOp?: object;
  txHash?: string;
  error?: string;
}

export interface PrepareBorrowRequest {
  action: "supply" | "borrow" | "repay" | "withdraw";
  amount: string;
  max?: boolean;
}

export interface PrepareBorrowResponse {
  unsignedUserOp?: object;
  txHash?: string;
  error?: string;
}

export interface UserPositionResponse {
  collateral: number;
  borrow: number;
  ltv: number;
  liquidationPrice: number;
}

export interface AuthVerifyRequest {
  privyToken: string;
}

export interface AuthVerifyResponse {
  userId: string;
  walletAddress: Address;
  hasAuthKey: boolean;
  authKeyId?: string;
}

// =============================================================================
// Authorization Key Types
// =============================================================================

export interface AuthorizationKeyPolicy {
  maxAmountPerTx: bigint;
  allowedTokens: Address[];
  cooldownSeconds: number;
}

export interface SwapPolicy extends AuthorizationKeyPolicy {
  type: "swap";
}

export interface BorrowPolicy {
  type: "borrow";
  maxLTV: number;
  allowedActions: Array<"supply" | "borrow" | "repay" | "withdraw">;
}

export type ExecutionPolicy = SwapPolicy | BorrowPolicy;
