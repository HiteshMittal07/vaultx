"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, QrCode, Info, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import QRCode from "react-qr-code";
import Image from "next/image";
import { Address } from "viem";
import { publicClient } from "@/lib/blockchain/client";
import { LOGOS } from "@/constants/config";

interface DepositSectionProps {
  address?: string;
}

export function DepositSection({ address }: DepositSectionProps) {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [isSmartAccount, setIsSmartAccount] = useState(false);

  useEffect(() => {
    async function checkSmartAccount() {
      if (!address) return;
      try {
        const bytecode = await publicClient.getBytecode({
          address: address as Address,
        });
        setIsSmartAccount(!!bytecode && bytecode !== "0x");
      } catch (error) {
        console.error("Error checking smart account:", error);
      }
    }
    checkSmartAccount();
  }, [address]);

  const network = { name: "Ethereum Mainnet", color: "bg-blue-500" };

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0A0A0A] p-1 h-full min-h-[400px]"
    >
      <div className="absolute top-0 left-0 p-32 bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative z-10 p-6 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center p-1.5 overflow-hidden">
                <Image
                  src="/eth-logo.svg"
                  alt="Ethereum"
                  width={25}
                  height={25}
                  className="w-full h-full bg-white rounded-md"
                />
              </div>
              <h3 className="text-lg font-bold text-white">Deposit</h3>
            </div>
            <p className="text-sm text-zinc-400">Fund your Smart Wallet.</p>
          </div>
          <div className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold text-blue-400 flex items-center gap-1.5 uppercase tracking-wider">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            {network.name}
          </div>
        </div>

        {/* Deposit Details - flex-grow to push QR code down if needed, or justify-start */}
        <div className="space-y-6 flex-grow">
          {/* Asset Selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Asset
            </label>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 transition-colors hover:border-white/10">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-white flex items-center justify-center overflow-hidden shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                  <Image
                    src={LOGOS.USDT}
                    alt="USDT"
                    width={36}
                    height={36}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <div className="text-sm font-bold text-white leading-tight">
                    Tether USD
                  </div>
                  <div className="text-xs text-zinc-500 uppercase tracking-tighter font-medium">
                    USDT
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 italic">
                  On Network
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
                  <Image
                    src="/eth-logo.svg"
                    alt="Arb"
                    width={12}
                    height={12}
                    className="bg-white rounded-md"
                  />
                  <span className="text-[10px] font-bold text-zinc-300">
                    Ethereum
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Address Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Wallet Address
              </label>
              {address && (
                <button
                  onClick={() => setShowQr(!showQr)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 transition-colors font-medium"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  {showQr ? "Hide QR" : "Show QR"}
                </button>
              )}
            </div>

            <div
              className={cn(
                "group relative flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5 transition-all duration-300 cursor-pointer shadow-inner",
                copied
                  ? "border-emerald-500/50 bg-emerald-500/5 ring-1 ring-emerald-500/20"
                  : "hover:border-white/10 hover:bg-white/5",
              )}
              onClick={handleCopy}
            >
              <div className="flex items-center gap-2 overflow-hidden mr-2">
                <code className="text-xs text-zinc-300 font-mono truncate max-w-[120px] lg:max-w-[150px]">
                  {address || "Loading address..."}
                </code>
                {isSmartAccount && (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                    <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-tighter">
                      Smart
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {copied ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                    <Check className="h-3.5 w-3.5" /> Copied
                  </span>
                ) : (
                  <Copy className="h-3.5 w-3.5 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                )}
              </div>
            </div>

            {/* Warning / Info */}
            <div className="flex gap-2.5 items-start py-2.5 px-3.5 rounded-xl bg-orange-500/5 border border-orange-500/10">
              <Info className="h-3.5 w-3.5 text-orange-400/80 mt-0.5 shrink-0" />
              <p className="text-[10px] text-orange-400/70 leading-relaxed font-medium">
                Send only <strong className="text-orange-300">USDT</strong> via{" "}
                <strong className="text-orange-300">Ethereum Mainnet</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* QR Code Expansion */}
        <AnimatePresence>
          {showQr && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="relative mt-6 flex flex-col items-center justify-center p-6 bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/10 shadow-3xl">
                {/* Decorative corners */}
                <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-emerald-500/40 rounded-tl-lg" />
                <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-emerald-500/40 rounded-tr-lg" />
                <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-emerald-500/40 rounded-bl-lg" />
                <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-emerald-500/40 rounded-br-lg" />

                {address ? (
                  <div className="relative p-3 bg-white rounded-2xl border-4 border-emerald-500/20 shadow-2xl">
                    <div className="p-1 bg-white">
                      <QRCode
                        value={address}
                        size={140}
                        level="H"
                        style={{
                          height: "auto",
                          maxWidth: "100%",
                          width: "100%",
                        }}
                      />
                    </div>
                    {/* Center Logo Placeholder */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white p-1 rounded-lg flex items-center justify-center shadow-md border border-emerald-500/30">
                      <div className="w-full h-full bg-emerald-500 rounded-md flex items-center justify-center overflow-hidden">
                        <span className="text-[10px] font-bold text-black">
                          VX
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-32 w-32 bg-white/5 rounded-lg flex items-center justify-center border border-white/5">
                    <span className="text-zinc-500 text-xs text-center px-4">
                      Address loading...
                    </span>
                  </div>
                )}
                <p className="mt-5 text-[10px] uppercase tracking-[0.3em] text-emerald-400 font-bold">
                  Scan to Deposit
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
