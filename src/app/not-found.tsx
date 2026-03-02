import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-8xl font-extrabold text-emerald-400 mb-4">404</p>
        <h1 className="text-2xl font-bold text-white mb-2">Page not found</h1>
        <p className="text-zinc-400 text-sm mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-black transition-all hover:bg-emerald-400 hover:scale-105 active:scale-95 inline-block"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
