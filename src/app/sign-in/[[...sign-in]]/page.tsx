import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div id="tv-signin" className="tl-view">
      <div className="signin-mark">🎬</div>
      <div className="flow-h1" style={{ fontSize: "25px" }}>
        Welcome to STARA
      </div>
      <div className="flow-sub" style={{ marginBottom: "8px" }}>
        Sign in to start building your K-content travel route.
      </div>
      <SignIn appearance={{ variables: { colorPrimary: "#ff8f7a" } }} />
      <div className="signin-terms">By continuing, you agree to STARA&apos;s Terms &amp; Privacy Policy.</div>
    </div>
  );
}
