import Link from "next/link";

export default function HomePage() {
  return (
    <div id="tv-splash" className="tl-view">
      <div className="splash-mark">🎬</div>
      <div className="splash-word">
        STAR<span>A</span>
      </div>
      <div className="splash-tag">
        Discover Korea,
        <br />
        one scene at a time
      </div>
      <div className="splash-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <Link
        href={`/sign-in?redirect_url=${encodeURIComponent("/onboarding/artists")}`}
        className="splash-tap"
      >
        tap to continue →
      </Link>
    </div>
  );
}
