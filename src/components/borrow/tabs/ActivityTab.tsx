import { RefreshCw, ExternalLink } from "lucide-react";

export function ActivityTab({ history }: { history: any[] }) {
  return (
    <div className="space-y-6 pt-4">
      <h3 className="text-xl text-white font-light">Your Transactions</h3>
      <div className="rounded-3xl border border-white/5 bg-zinc-900/20 overflow-hidden min-h-[300px]">
        {history.filter((tx) => tx.type !== "swap").length === 0 ? (
          <div className="flex items-center justify-center h-[300px]">
            <span className="text-zinc-500 text-sm">
              No transactions found.
            </span>
          </div>
        ) : (
          <div className="w-full">
            {history
              .filter((tx) => tx.type !== "swap")
              .map((tx, i) => (
                <div
                  key={i}
                  className="p-4 border-b border-white/5 last:border-b-0 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <RefreshCw className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium capitalize">
                        {tx.type} Successful
                      </p>
                      <p className="text-zinc-500 text-xs">{tx.timestamp}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <a
                      href={`https://arbiscan.io/tx/${tx.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 text-xs hover:underline flex items-center gap-1"
                    >
                      View on Arbiscan <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
