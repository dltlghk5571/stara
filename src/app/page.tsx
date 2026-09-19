import Link from "next/link";
import { cookies } from "next/headers";
import { KButton, Pill } from "@/components/ui/kroute";
import { LocaleToggle, parseLocale, LOCALE_COOKIE, getDictionary, translate } from "@/i18n";
import { BLACK, BORDER, CYAN, PINK, SHADOW, YELLOW } from "@/lib/kroute-tokens";

export default async function HomePage() {
  const d = getDictionary(parseLocale((await cookies()).get(LOCALE_COOKIE)?.value));
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
          top: 16,
          right: 16,
          zIndex: 5,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 8,
        }}
      >
        <LocaleToggle />
        <Pill bg={YELLOW} style={{ fontSize: 12, padding: "5px 16px", letterSpacing: 0.5 }}>
          {translate(d, "splash.passportPill")}
        </Pill>
      </div>
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

      <div className="kr-aFadeUp" style={{ width: "100%", maxWidth: 320 }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- 로컬 브랜드 자산, next/image 최적화 대상 아님 */}
        <img
          src="/stara-full-transparent.png"
          alt="STARA — Follow Your Star"
          style={{ width: "100%", height: "auto", display: "block" }}
        />
      </div>

      <div className="kr-aFadeUp kr-aD3 kr-hidden0" style={{ marginTop: 20, width: "100%", maxWidth: 270 }}>
        <div
          style={{
            background: "#FFF9E6",
            border: BORDER,
            borderRadius: 20,
            boxShadow: SHADOW,
            padding: 24,
            textAlign: "center",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- 로컬 브랜드 자산, next/image 최적화 대상 아님 */}
          <img
            src="/stara-objects-transparent.png"
            alt=""
            className="kr-aFloat"
            style={{ width: "100%", height: "auto", display: "block" }}
          />
        </div>
      </div>

      <div className="kr-aFadeUp kr-aD4 kr-hidden0" style={{ marginTop: 24, width: "100%", maxWidth: 280 }}>
        <Link href={`/sign-in?redirect_url=${encodeURIComponent("/onboarding/artists")}`}>
          <KButton bg={CYAN} color={BLACK}>
            {translate(d, "splash.cta")}
          </KButton>
        </Link>
      </div>
      <p
        className="kr-aFadeUp kr-aD5 kr-hidden0"
        style={{ marginTop: 14, fontFamily: "Nunito", fontSize: 12, color: "rgba(255,255,255,.7)", fontWeight: 600 }}
      >
        {translate(d, "splash.version")}
      </p>
    </div>
  );
}
