import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/providers";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "VaultX — Borrow Smart, Swap Secure",
    template: "%s | VaultX",
  },
  description:
    "VaultX is a DeFi lending and swap platform on Ethereum. Deposit gold (XAUt) as collateral, borrow USDT, and swap tokens — all gasless via Account Abstraction.",
  keywords: [
    "DeFi",
    "lending",
    "borrowing",
    "swap",
    "Ethereum",
    "Account Abstraction",
    "EIP-7702",
    "Morpho",
    "XAUt",
    "USDT",
    "gasless",
  ],
  authors: [{ name: "VaultX" }],
  creator: "VaultX",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://vaultx-demo.vercel.app"
  ),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "VaultX",
    title: "VaultX — Borrow Smart, Swap Secure",
    description:
      "Gasless DeFi lending and swaps on Ethereum. Deposit gold, borrow stablecoins, swap tokens.",
  },
  twitter: {
    card: "summary_large_image",
    title: "VaultX — Borrow Smart, Swap Secure",
    description:
      "Gasless DeFi lending and swaps on Ethereum. Deposit gold, borrow stablecoins, swap tokens.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#050505",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${outfit.variable} antialiased font-sans`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
