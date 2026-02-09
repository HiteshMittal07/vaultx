export const ERC20_ABI = [
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
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const MORPHO_ABI = [
  {
    inputs: [
      {
        components: [
          { internalType: "address", name: "loanToken", type: "address" },
          { internalType: "address", name: "collateralToken", type: "address" },
          { internalType: "address", name: "oracle", type: "address" },
          { internalType: "address", name: "irm", type: "address" },
          { internalType: "uint256", name: "lltv", type: "uint256" },
        ],
        internalType: "struct MarketParams",
        name: "marketParams",
        type: "tuple",
      },
      { internalType: "uint256", name: "assets", type: "uint256" },
      { internalType: "uint256", name: "shares", type: "uint256" },
      { internalType: "address", name: "onBehalf", type: "address" },
      { internalType: "address", name: "receiver", type: "address" },
    ],
    name: "borrow",
    outputs: [
      { internalType: "uint256", name: "", type: "uint256" },
      { internalType: "uint256", name: "", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "Id", name: "", type: "bytes32" }],
    name: "idToMarketParams",
    outputs: [
      { internalType: "address", name: "loanToken", type: "address" },
      { internalType: "address", name: "collateralToken", type: "address" },
      { internalType: "address", name: "oracle", type: "address" },
      { internalType: "address", name: "irm", type: "address" },
      { internalType: "uint256", name: "lltv", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "Id", name: "", type: "bytes32" }],
    name: "market",
    outputs: [
      { internalType: "uint128", name: "totalSupplyAssets", type: "uint128" },
      { internalType: "uint128", name: "totalSupplyShares", type: "uint128" },
      { internalType: "uint128", name: "totalBorrowAssets", type: "uint128" },
      { internalType: "uint128", name: "totalBorrowShares", type: "uint128" },
      { internalType: "uint128", name: "lastUpdate", type: "uint128" },
      { internalType: "uint128", name: "fee", type: "uint128" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "Id", name: "", type: "bytes32" },
      { internalType: "address", name: "", type: "address" },
    ],
    name: "position",
    outputs: [
      { internalType: "uint256", name: "supplyShares", type: "uint256" },
      { internalType: "uint128", name: "borrowShares", type: "uint128" },
      { internalType: "uint128", name: "collateral", type: "uint128" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          { internalType: "address", name: "loanToken", type: "address" },
          { internalType: "address", name: "collateralToken", type: "address" },
          { internalType: "address", name: "oracle", type: "address" },
          { internalType: "address", name: "irm", type: "address" },
          { internalType: "uint256", name: "lltv", type: "uint256" },
        ],
        internalType: "struct MarketParams",
        name: "marketParams",
        type: "tuple",
      },
      { internalType: "uint256", name: "assets", type: "uint256" },
      { internalType: "address", name: "onBehalf", type: "address" },
      { internalType: "bytes", name: "data", type: "bytes" },
    ],
    name: "supplyCollateral",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          { internalType: "address", name: "loanToken", type: "address" },
          { internalType: "address", name: "collateralToken", type: "address" },
          { internalType: "address", name: "oracle", type: "address" },
          { internalType: "address", name: "irm", type: "address" },
          { internalType: "uint256", name: "lltv", type: "uint256" },
        ],
        internalType: "struct MarketParams",
        name: "marketParams",
        type: "tuple",
      },
      { internalType: "uint256", name: "assets", type: "uint256" },
      { internalType: "uint256", name: "shares", type: "uint256" },
      { internalType: "address", name: "onBehalf", type: "address" },
      { internalType: "bytes", name: "data", type: "bytes" },
    ],
    name: "repay",
    outputs: [
      { internalType: "uint256", name: "", type: "uint256" },
      { internalType: "uint256", name: "", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          { internalType: "address", name: "loanToken", type: "address" },
          { internalType: "address", name: "collateralToken", type: "address" },
          { internalType: "address", name: "oracle", type: "address" },
          { internalType: "address", name: "irm", type: "address" },
          { internalType: "uint256", name: "lltv", type: "uint256" },
        ],
        internalType: "struct MarketParams",
        name: "marketParams",
        type: "tuple",
      },
      { internalType: "uint256", name: "assets", type: "uint256" },
      { internalType: "address", name: "onBehalf", type: "address" },
      { internalType: "address", name: "receiver", type: "address" },
    ],
    name: "withdrawCollateral",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "authorized", type: "address" },
      { internalType: "bool", name: "newIsAuthorized", type: "bool" },
    ],
    name: "setAuthorization",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export const IRM_ABI = [
  {
    type: "function",
    name: "borrowRateView",
    inputs: [
      {
        name: "marketParams",
        type: "tuple",
        components: [
          { name: "loanToken", type: "address" },
          { name: "collateralToken", type: "address" },
          { name: "oracle", type: "address" },
          { name: "irm", type: "address" },
          { name: "lltv", type: "uint256" },
        ],
      },
      {
        name: "market",
        type: "tuple",
        components: [
          { name: "totalSupplyAssets", type: "uint128" },
          { name: "totalSupplyShares", type: "uint128" },
          { name: "totalBorrowAssets", type: "uint128" },
          { name: "totalBorrowShares", type: "uint128" },
          { name: "lastUpdate", type: "uint128" },
          { name: "fee", type: "uint128" },
        ],
      },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export const ROUTER_ABI = [
  {
    inputs: [
      {
        components: [
          { internalType: "address", name: "tokenIn", type: "address" },
          { internalType: "address", name: "tokenOut", type: "address" },
          { internalType: "uint24", name: "fee", type: "uint24" },
          { internalType: "address", name: "recipient", type: "address" },
          { internalType: "uint256", name: "deadline", type: "uint256" },
          { internalType: "uint256", name: "amountIn", type: "uint256" },
          {
            internalType: "uint256",
            name: "amountOutMinimum",
            type: "uint256",
          },
          {
            internalType: "uint160",
            name: "sqrtPriceLimitX96",
            type: "uint160",
          },
        ],
        internalType: "struct ISwapRouter.ExactInputSingleParams",
        name: "params",
        type: "tuple",
      },
    ],
    name: "exactInputSingle",
    outputs: [{ internalType: "uint256", name: "amountOut", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
] as const;

export const QUOTER_ABI = [
  {
    inputs: [
      { internalType: "address", name: "tokenIn", type: "address" },
      { internalType: "address", name: "tokenOut", type: "address" },
      { internalType: "uint24", name: "fee", type: "uint24" },
      { internalType: "uint256", name: "amountIn", type: "uint256" },
      { internalType: "uint160", name: "sqrtPriceLimitX96", type: "uint160" },
    ],
    name: "quoteExactInputSingle",
    outputs: [{ internalType: "uint256", name: "amountOut", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export const ORACLE_ABI = [
  {
    type: "function",
    name: "price",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

// ─── Fluid Vault ABI (VaultT1 core functions) ──────────────────────────────

export const FLUID_VAULT_ABI = [
  {
    inputs: [
      {
        components: [
          { internalType: "address", name: "liquidity", type: "address" },
          { internalType: "address", name: "factory", type: "address" },
          {
            internalType: "address",
            name: "adminImplementation",
            type: "address",
          },
          {
            internalType: "address",
            name: "secondaryImplementation",
            type: "address",
          },
          { internalType: "address", name: "supplyToken", type: "address" },
          { internalType: "address", name: "borrowToken", type: "address" },
          { internalType: "uint8", name: "supplyDecimals", type: "uint8" },
          { internalType: "uint8", name: "borrowDecimals", type: "uint8" },
          { internalType: "uint256", name: "vaultId", type: "uint256" },
          {
            internalType: "bytes32",
            name: "liquiditySupplyExchangePriceSlot",
            type: "bytes32",
          },
          {
            internalType: "bytes32",
            name: "liquidityBorrowExchangePriceSlot",
            type: "bytes32",
          },
          {
            internalType: "bytes32",
            name: "liquidityUserSupplySlot",
            type: "bytes32",
          },
          {
            internalType: "bytes32",
            name: "liquidityUserBorrowSlot",
            type: "bytes32",
          },
        ],
        internalType: "struct Structs.ConstantViews",
        name: "constants_",
        type: "tuple",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [
      { internalType: "uint256", name: "colLiquidated", type: "uint256" },
      { internalType: "uint256", name: "debtLiquidated", type: "uint256" },
    ],
    name: "FluidLiquidateResult",
    type: "error",
  },
  {
    inputs: [{ internalType: "uint256", name: "errorId_", type: "uint256" }],
    name: "FluidLiquidityCalcsError",
    type: "error",
  },
  {
    inputs: [{ internalType: "uint256", name: "errorId_", type: "uint256" }],
    name: "FluidSafeTransferError",
    type: "error",
  },
  {
    inputs: [{ internalType: "uint256", name: "errorId_", type: "uint256" }],
    name: "FluidVaultError",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "colAbsorbedRaw_",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "debtAbsorbedRaw_",
        type: "uint256",
      },
    ],
    name: "LogAbsorb",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "liquidator_",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "colAmt_",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "debtAmt_",
        type: "uint256",
      },
      { indexed: false, internalType: "address", name: "to_", type: "address" },
    ],
    name: "LogLiquidate",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "user_",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "nftId_",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "int256",
        name: "colAmt_",
        type: "int256",
      },
      {
        indexed: false,
        internalType: "int256",
        name: "debtAmt_",
        type: "int256",
      },
      { indexed: false, internalType: "address", name: "to_", type: "address" },
    ],
    name: "LogOperate",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "int256",
        name: "colAmt_",
        type: "int256",
      },
      {
        indexed: false,
        internalType: "int256",
        name: "debtAmt_",
        type: "int256",
      },
    ],
    name: "LogRebalance",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "supplyExPrice_",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "borrowExPrice_",
        type: "uint256",
      },
    ],
    name: "LogUpdateExchangePrice",
    type: "event",
  },
  { stateMutability: "nonpayable", type: "fallback" },
  {
    inputs: [],
    name: "LIQUIDITY",
    outputs: [
      { internalType: "contract IFluidLiquidity", name: "", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "VAULT_FACTORY",
    outputs: [
      {
        internalType: "contract IFluidVaultFactory",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "VAULT_ID",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "constantsView",
    outputs: [
      {
        components: [
          { internalType: "address", name: "liquidity", type: "address" },
          { internalType: "address", name: "factory", type: "address" },
          {
            internalType: "address",
            name: "adminImplementation",
            type: "address",
          },
          {
            internalType: "address",
            name: "secondaryImplementation",
            type: "address",
          },
          { internalType: "address", name: "supplyToken", type: "address" },
          { internalType: "address", name: "borrowToken", type: "address" },
          { internalType: "uint8", name: "supplyDecimals", type: "uint8" },
          { internalType: "uint8", name: "borrowDecimals", type: "uint8" },
          { internalType: "uint256", name: "vaultId", type: "uint256" },
          {
            internalType: "bytes32",
            name: "liquiditySupplyExchangePriceSlot",
            type: "bytes32",
          },
          {
            internalType: "bytes32",
            name: "liquidityBorrowExchangePriceSlot",
            type: "bytes32",
          },
          {
            internalType: "bytes32",
            name: "liquidityUserSupplySlot",
            type: "bytes32",
          },
          {
            internalType: "bytes32",
            name: "liquidityUserBorrowSlot",
            type: "bytes32",
          },
        ],
        internalType: "struct Structs.ConstantViews",
        name: "constantsView_",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "int256", name: "positionTick_", type: "int256" },
      { internalType: "uint256", name: "positionTickId_", type: "uint256" },
      { internalType: "uint256", name: "positionRawDebt_", type: "uint256" },
      { internalType: "uint256", name: "tickData_", type: "uint256" },
    ],
    name: "fetchLatestPosition",
    outputs: [
      { internalType: "int256", name: "", type: "int256" },
      { internalType: "uint256", name: "", type: "uint256" },
      { internalType: "uint256", name: "positionRawCol_", type: "uint256" },
      { internalType: "uint256", name: "branchId_", type: "uint256" },
      { internalType: "uint256", name: "branchData_", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "debtAmt_", type: "uint256" },
      { internalType: "uint256", name: "colPerUnitDebt_", type: "uint256" },
      { internalType: "address", name: "to_", type: "address" },
      { internalType: "bool", name: "absorb_", type: "bool" },
    ],
    name: "liquidate",
    outputs: [
      { internalType: "uint256", name: "actualDebtAmt_", type: "uint256" },
      { internalType: "uint256", name: "actualColAmt_", type: "uint256" },
    ],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "token_", type: "address" },
      { internalType: "uint256", name: "amount_", type: "uint256" },
      { internalType: "bytes", name: "data_", type: "bytes" },
    ],
    name: "liquidityCallback",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "nftId_", type: "uint256" },
      { internalType: "int256", name: "newCol_", type: "int256" },
      { internalType: "int256", name: "newDebt_", type: "int256" },
      { internalType: "address", name: "to_", type: "address" },
    ],
    name: "operate",
    outputs: [
      { internalType: "uint256", name: "", type: "uint256" },
      { internalType: "int256", name: "", type: "int256" },
      { internalType: "int256", name: "", type: "int256" },
    ],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes32", name: "slot_", type: "bytes32" }],
    name: "readFromStorage",
    outputs: [{ internalType: "uint256", name: "result_", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "rebalance",
    outputs: [
      { internalType: "int256", name: "supplyAmt_", type: "int256" },
      { internalType: "int256", name: "borrowAmt_", type: "int256" },
    ],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "vaultVariables2_", type: "uint256" },
    ],
    name: "updateExchangePrices",
    outputs: [
      { internalType: "uint256", name: "liqSupplyExPrice_", type: "uint256" },
      { internalType: "uint256", name: "liqBorrowExPrice_", type: "uint256" },
      { internalType: "uint256", name: "vaultSupplyExPrice_", type: "uint256" },
      { internalType: "uint256", name: "vaultBorrowExPrice_", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "updateExchangePricesOnStorage",
    outputs: [
      { internalType: "uint256", name: "liqSupplyExPrice_", type: "uint256" },
      { internalType: "uint256", name: "liqBorrowExPrice_", type: "uint256" },
      { internalType: "uint256", name: "vaultSupplyExPrice_", type: "uint256" },
      { internalType: "uint256", name: "vaultBorrowExPrice_", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
];

// ─── MigrationHelper ABI ────────────────────────────────────────────────────

export const MIGRATION_HELPER_ABI = [
  {
    inputs: [
      { internalType: "address", name: "_morpho", type: "address" },
      { internalType: "address", name: "_fluidVault", type: "address" },
      { internalType: "address", name: "_loanToken", type: "address" },
      { internalType: "address", name: "_collateralToken", type: "address" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      {
        indexed: false,
        internalType: "uint256",
        name: "debtRepaid",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "collateralMigrated",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "debtBorrowed",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "fluidNftId",
        type: "uint256",
      },
    ],
    name: "MigrationExecuted",
    type: "event",
  },
  {
    inputs: [],
    name: "COLLATERAL_TOKEN",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "FLUID_VAULT",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "LOAN_TOKEN",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "MORPHO",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          { internalType: "address", name: "user", type: "address" },
          {
            components: [
              { internalType: "address", name: "loanToken", type: "address" },
              {
                internalType: "address",
                name: "collateralToken",
                type: "address",
              },
              { internalType: "address", name: "oracle", type: "address" },
              { internalType: "address", name: "irm", type: "address" },
              { internalType: "uint256", name: "lltv", type: "uint256" },
            ],
            internalType: "struct IMorpho.MarketParams",
            name: "sourceMarket",
            type: "tuple",
          },
          { internalType: "uint256", name: "repayDebtAmount", type: "uint256" },
          { internalType: "uint256", name: "repayDebtShares", type: "uint256" },
          {
            internalType: "uint256",
            name: "collateralAmount",
            type: "uint256",
          },
          { internalType: "uint256", name: "borrowAmount", type: "uint256" },
          { internalType: "uint256", name: "fluidNftId", type: "uint256" },
        ],
        internalType: "struct MigrationHelper.MigrationParams",
        name: "params",
        type: "tuple",
      },
    ],
    name: "migrate",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "bytes", name: "data", type: "bytes" },
    ],
    name: "onMorphoFlashLoan",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "rescueTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
