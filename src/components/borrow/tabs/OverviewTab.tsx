import {
  Scale,
  ShieldAlert,
  Droplets,
  Users,
  AlertTriangle,
} from "lucide-react";
import { MarketAttribute } from "../components/MarketAttribute";
import { RiskCard } from "../components/RiskCard";
import { LOGOS } from "@/constants/config";
import { USDT0, XAUT0 } from "@/constants/addresses";

interface OverviewTabProps {
  utilization: string;
  oraclePrice: number;
  lltv: number;
}

export function OverviewTab({ utilization, oraclePrice, lltv }: OverviewTabProps) {
  return (
    <div className="space-y-12">
      <div>
        <h3 className="text-zinc-400 font-medium mb-6">Market Attributes</h3>
        <div className="grid grid-cols-2 gap-x-20 gap-y-6">
          <MarketAttribute
            label="Collateral"
            value="XAUt0"
            logo={LOGOS.XAUt0}
            href={`https://arbiscan.io/address/${XAUT0}`}
          />
          <MarketAttribute
            label="Oracle price"
            value={`XAUt0 / USDT0 = ${oraclePrice.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`}
            simpleValue
          />
          <MarketAttribute
            label="Loan"
            value="USDT0"
            logo={LOGOS.USDT0}
            href={`https://arbiscan.io/address/${USDT0}`}
          />
          <MarketAttribute label="Created on" value="2026-01-09" simpleValue />
          <MarketAttribute
            label="Liquidation LTV"
            value={`${lltv.toFixed(0)}%`}
            simpleValue
            hasInfo
            infoText="The Loan-to-Value ratio at which your position becomes eligible for liquidation."
          />
          <MarketAttribute
            label="Utilization"
            value={utilization}
            simpleValue
            hasInfo
            infoText="The percentage of the total pool that is currently being borrowed by all users."
          />
        </div>
      </div>

      <div className="pt-8 border-t border-zinc-800/50">
        <div className="flex items-center gap-2 mb-6">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <h3 className="text-xl font-medium text-white">
            Risk Considerations
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RiskCard
            icon={<Scale className="h-4 w-4 text-amber-500" />}
            title="Liquidation Risk"
            description={`If your LTV exceeds ${lltv.toFixed(0)}%, your collateral (XAUt0) can be seized. Maintain a safe margin.`}
          />
          <RiskCard
            icon={<ShieldAlert className="h-4 w-4 text-blue-500" />}
            title="Oracle Risk"
            description="Relies on an external price feed. Inaccurate data can lead to premature liquidations."
          />
          <RiskCard
            icon={<Droplets className="h-4 w-4 text-emerald-500" />}
            title="Liquidity Risk"
            description="Low liquidity may impact rates or prevent borrowing further USDT0."
          />
          <RiskCard
            icon={<Users className="h-4 w-4 text-purple-500" />}
            title="Counterparty Risk"
            description="Exposure to XAUt0 and USDT0. Risks include stablecoin de-pegging."
          />
        </div>
      </div>
    </div>
  );
}
