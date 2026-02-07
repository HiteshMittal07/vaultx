import { ReactNode } from "react";

interface RiskCardProps {
  icon: ReactNode;
  title: string;
  description: string;
}

export function RiskCard({ icon, title, description }: RiskCardProps) {
  return (
    <div className="p-4 rounded-2xl bg-zinc-900/40 border border-white/5">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm font-medium text-zinc-200">{title}</span>
      </div>
      <p className="text-xs text-zinc-500 leading-relaxed">{description}</p>
    </div>
  );
}
