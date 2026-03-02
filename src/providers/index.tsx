"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { wagmiConfig, privyConfig } from "@/config/wallet.config";
import { useState } from "react";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  // During Next.js static prerendering (build time), NEXT_PUBLIC_ vars may be
  // absent. Render children without Privy wrapping — the real value is injected
  // by Vercel at runtime for all actual user-facing requests.
  if (!appId) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  }

  return (
    <PrivyProvider appId={appId} config={privyConfig}>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
          {children}
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
