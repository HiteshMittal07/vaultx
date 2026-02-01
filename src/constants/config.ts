import { arbitrum } from "viem/chains";

export const DEFAULT_FEE = 500;

export const LOGOS = {
  USDT0: "https://cdn.morpho.org/assets/logos/usdt0.svg",
  XAUT0: "https://cdn.morpho.org/assets/logos/xaut0.svg",
} as const;

export const APP_CONFIG = {
  name: "VaultX",
  chain: arbitrum,
  defaultSlippage: "5.0",
  defaultDeadline: "30",
};

export { arbitrum };
