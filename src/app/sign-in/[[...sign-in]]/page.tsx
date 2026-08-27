import { SignIn } from "@clerk/nextjs";
import { Pill } from "@/components/ui/kroute";
import { BORDER, CREAM, PINK, SHADOW, WHITE } from "@/lib/kroute-tokens";

export default function Page() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: CREAM,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "52px 24px 32px",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: WHITE,
          border: BORDER,
          boxShadow: SHADOW,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 28,
          marginBottom: 20,
        }}
      >
        🎬
      </div>
      <h1 style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 26, textAlign: "center" }}>
        Welcome to STARA
      </h1>
      <div style={{ marginTop: 10 }}>
        <Pill bg="#E8FFF4" style={{ fontSize: 12, border: "2px solid #B2EDD4" }}>
          YOUR K-TRAVEL PASSPORT ✨
        </Pill>
      </div>
      <div style={{ marginTop: 24, width: "100%", maxWidth: 360 }}>
        <SignIn appearance={{ variables: { colorPrimary: PINK } }} />
      </div>
      <p style={{ marginTop: "auto", paddingTop: 20, textAlign: "center", fontSize: 12, color: "#aaa", fontWeight: 500 }}>
        By continuing, you agree to STARA&apos;s Terms &amp; Privacy Policy.
      </p>
    </div>
  );
}
