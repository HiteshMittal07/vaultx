export default function BorrowLoading() {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
        <p className="text-sm text-zinc-500 animate-pulse">Loading market data…</p>
      </div>
    </div>
  );
}
