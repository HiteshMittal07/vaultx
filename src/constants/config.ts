import { mainnet } from "viem/chains";

/** Single source of truth for the active chain. Change only here. */
export const PROJECT_CHAIN = mainnet;

export const DEFAULT_FEE = 500;

export const LOGOS = {
  USDT: "https://cdn.morpho.org/assets/logos/usdt.svg",
  XAUt: "https://cdn.morpho.org/assets/logos/xaut.svg",
} as const;

export const APP_CONFIG = {
  name: "VaultX",
  chain: PROJECT_CHAIN,
  defaultSlippage: "5.0",
  defaultDeadline: "30",
  pythPriceFeedIds: {
    XAUt: "0x44465e17d2e9d390e70c999d5a11fda4f092847fcd2e3e5aa089d96c98a30e67",
    USDT: "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b",
  },
};
