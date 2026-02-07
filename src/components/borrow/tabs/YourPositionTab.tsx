import Image from "next/image";
import { cn } from "@/lib/utils";
import { LOGOS } from "@/constants/config";
import { PythPrices } from "@/types";

interface YourPositionTabProps {
  userCollateral: number;
  userBorrow: number;
  currentLTV: number;
  lltv: number;
  pythPrices: PythPrices;
  liquidationPrice: number;
  percentDropToLiquidation: number;
  utilization: string;
}

export function YourPositionTab({
  userCollateral,
  userBorrow,
  currentLTV,
  lltv,
  pythPrices,
  liquidationPrice,
  percentDropToLiquidation,
  utilization,
}: YourPositionTabProps) {
  return (
    <div className="space-y-8 sm:space-y-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-20 gap-y-10 pt-4">
        {/* Left Column Stats */}
        <div className="space-y-6">
          <div className="flex justify-between items-center border-b border-zinc-800/50 pb-4">
            <span className="text-zinc-400 text-sm">Collateral</span>
            <div className="flex items-center gap-2">
              <Image src={LOGOS.XAUt0} alt="XAUt0" width={16} height={16} />
              <span className="text-white font-medium">
                {userCollateral < 0.0001
                  ? "< 0.0001"
                  : userCollateral.toFixed(4)}{" "}
                XAUt0
              </span>
              <span className="text-zinc-500 text-xs">
                ${(userCollateral * pythPrices.XAUt0).toFixed(2)}
              </span>
            </div>
          </div>
          <div className="flex justify-between items-center border-b border-zinc-800/50 pb-4">
            <span className="text-zinc-400 text-sm">Loan</span>
            <div className="flex items-center gap-2">
              <Image src={LOGOS.USDT0} alt="USDT0" width={16} height={16} />
              <span className="text-white font-medium">
                {userBorrow.toFixed(2)} USDT0
              </span>
              <span className="text-zinc-500 text-xs">
                ${(userBorrow * pythPrices.USDT0).toFixed(2)}
              </span>
            </div>
          </div>
          <div className="flex justify-between items-center border-b border-zinc-800/50 pb-4">
            <span className="text-zinc-400 text-sm">LTV / Liquidation LTV</span>
            <span className="text-white font-medium">
              {currentLTV > 0 ? currentLTV.toFixed(2) : "-"}% /{" "}
              {lltv.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Right Column Stats */}
        <div className="space-y-6">
          <div className="flex justify-between items-center border-b border-zinc-800/50 pb-4">
            <span className="text-zinc-400 text-sm">Liquidation price</span>
            <span className="text-white font-medium">
              {liquidationPrice > 0
                ? liquidationPrice.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })
                : "-"}
            </span>
          </div>
          <div className="flex justify-between items-center border-b border-zinc-800/50 pb-4">
            <span className="text-zinc-400 text-sm">% drop to liquidation</span>
            <span
              className={cn(
                "font-medium",
                percentDropToLiquidation < 10 ? "text-red-400" : "text-white",
              )}
            >
              {percentDropToLiquidation > 0
                ? `${percentDropToLiquidation.toFixed(2)}%`
                : "-"}
            </span>
          </div>
          <div className="flex justify-between items-center border-b border-zinc-800/50 pb-4">
            <span className="text-zinc-400 text-sm flex items-center gap-1">
              Utilization
            </span>
            <span className="text-white font-medium">{utilization}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
