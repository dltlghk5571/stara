import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div id="tv-signin" className="tl-view">
      <div className="signin-mark">🎬</div>
      <div className="flow-h1" style={{ fontSize: "25px" }}>
        Join STARA
      </div>
      <div className="flow-sub" style={{ marginBottom: "8px" }}>
        몇 초면 가입 끝 — 바로 루트를 만들어보세요.
      </div>
      <SignUp appearance={{ variables: { colorPrimary: "#ff8f7a" } }} />
      <div className="signin-terms">By continuing, you agree to STARA&apos;s Terms &amp; Privacy Policy.</div>
    </div>
  );
}
