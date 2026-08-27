import Link from "next/link";
import { KButton, Pill } from "@/components/ui/kroute";
import { BLACK, BORDER, CYAN, PINK, SHADOW, YELLOW } from "@/lib/kroute-tokens";

export default function HomePage() {
  return (
    <div
      style={{
        height: "100dvh",
        background: PINK,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -80,
          right: -80,
          width: 240,
          height: 240,
          borderRadius: "50%",
          border: "3px solid rgba(0,0,0,.12)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -60,
          left: -60,
          width: 200,
          height: 200,
          borderRadius: "50%",
          border: "3px solid rgba(0,0,0,.12)",
        }}
      />

      <div className="kr-aFadeUp" style={{ position: "absolute", top: 60, left: "50%", transform: "translateX(-50%)" }}>
        <Pill bg={YELLOW} style={{ fontSize: 12, padding: "5px 16px", letterSpacing: 0.5 }}>
          K-TRAVEL PASSPORT
        </Pill>
      </div>

      <div className="kr-aFadeUp" style={{ marginBottom: 4, position: "relative" }}>
        <div style={{ position: "absolute", top: -20, left: -28, fontSize: 22, color: CYAN }}>✦</div>
        <div style={{ position: "absolute", top: -8, right: -24, fontSize: 14, color: YELLOW }}>✦</div>
        <h1
          style={{
            fontFamily: "Outfit",
            fontWeight: 900,
            fontSize: 64,
            lineHeight: 1,
            color: BLACK,
            letterSpacing: "-3px",
            textAlign: "center",
          }}
        >
          ✦STARA
        </h1>
      </div>
      <p
        className="kr-aFadeUp kr-aD2 kr-hidden0"
        style={{
          marginTop: 4,
          fontFamily: "Caveat",
          fontWeight: 700,
          fontSize: 22,
          color: CYAN,
          fontStyle: "italic",
          textAlign: "center",
        }}
      >
        스타 따라, K-culture 여행 ✦
      </p>

      <div className="kr-aFadeUp kr-aD3 kr-hidden0" style={{ marginTop: 28, width: "100%", maxWidth: 270 }}>
        <div
          style={{
            background: "#FFF9E6",
            border: BORDER,
            borderRadius: 20,
            boxShadow: SHADOW,
            padding: 20,
            textAlign: "center",
            position: "relative",
          }}
        >
          <div style={{ position: "absolute", top: 10, left: 14, fontSize: 18, opacity: 0.5 }}>☕</div>
          <div style={{ position: "absolute", top: 10, right: 14, fontSize: 18, opacity: 0.5 }}>📸</div>
          <div style={{ fontSize: 60 }} className="kr-aFloat">
            🎬
          </div>
          <p style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 15, marginTop: 8, color: BLACK }}>
            KOREA ADVENTURE
          </p>
          <p style={{ fontFamily: "Caveat", fontSize: 15, color: "#888", fontStyle: "italic", marginTop: 2 }}>
            스탬프를 모으고 · 루트를 완성하세요
          </p>
        </div>
      </div>

      <div className="kr-aFadeUp kr-aD4 kr-hidden0" style={{ marginTop: 24, width: "100%", maxWidth: 280 }}>
        <Link href={`/sign-in?redirect_url=${encodeURIComponent("/onboarding/artists")}`}>
          <KButton bg={CYAN} color={BLACK}>
            START EXPEDITION 🚀
          </KButton>
        </Link>
      </div>
      <p
        className="kr-aFadeUp kr-aD5 kr-hidden0"
        style={{ marginTop: 14, fontFamily: "Nunito", fontSize: 12, color: "rgba(255,255,255,.7)", fontWeight: 600 }}
      >
        v1.0.0 · Made with K-Love 💕
      </p>
    </div>
  );
}
