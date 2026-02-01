import { arbitrum } from "viem/chains";

export const DEFAULT_FEE = 500;

export const LOGOS = {
  USDT0: "https://cdn.morpho.org/assets/logos/usdt0.svg",
  XAUt0: "https://cdn.morpho.org/assets/logos/xaut0.svg",
} as const;

export const APP_CONFIG = {
  name: "VaultX",
  chain: arbitrum,
  defaultSlippage: "5.0",
  defaultDeadline: "30",
  pythPriceFeedIds: {
    XAUt0: "0x44465e17d2e9d390e70c999d5a11fda4f092847fcd2e3e5aa089d96c98a30e67",
    USDT0: "0xcfc1303ea9f083b1b4f99e1369fb9d2611f3230d5ea33a6abf2f86071c089fdc",
  },
};

export { arbitrum };
