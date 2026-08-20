import Link from "next/link";

export default function HomePage() {
  return (
    <Link
      href="/onboarding/artists"
      className="font-jakarta relative flex min-h-screen flex-1 flex-col items-center justify-center gap-6 overflow-hidden bg-stara-navy px-6 text-center"
      style={{
        backgroundImage:
          "radial-gradient(circle at 80% 0%, rgba(255,143,122,.35), transparent 45%), radial-gradient(circle at 10% 90%, rgba(142,216,255,.25), transparent 45%)",
      }}
    >
      <span className="flex h-24 w-24 items-center justify-center rounded-[28px] bg-gradient-to-br from-stara-coral via-[#ff7a63] to-stara-navy text-4xl shadow-[0_20px_40px_-14px_rgba(255,143,122,0.5)]">
        🎬
      </span>
      <h1 className="font-fraunces text-3xl font-extrabold text-stara-bg">
        STAR<span className="text-stara-coral">A</span>
      </h1>
      <p className="font-space-mono text-[11px] uppercase tracking-[0.16em] text-slate-400">
        Discover Korea,
        <br />
        one scene at a time
      </p>
      <div className="mt-2 flex gap-1.5">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-stara-coral" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-stara-coral [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-stara-coral [animation-delay:300ms]" />
      </div>
      <span className="font-space-mono absolute bottom-10 text-[10px] text-slate-500">
        tap to continue →
      </span>
    </Link>
  );
}
