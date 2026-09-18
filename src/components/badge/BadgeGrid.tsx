"use client";

import { BADGE_CATEGORY_STYLE, type BadgeCategoryId } from "@/data/badges";
import type { BadgeProgress } from "@/lib/badges";
import { KCard, Pill } from "@/components/ui/kroute";
import { useT, useLocale, type Locale, type TFunction } from "@/i18n";

const CATEGORY_ORDER: BadgeCategoryId[] = ["food", "shopping", "culture", "activity", "landmark", "kpop"];

function badgeTitle(p: BadgeProgress, locale: Locale): string {
  return locale === "ko" ? p.definition.titleKo : p.definition.titleEn;
}

function badgeDescription(p: BadgeProgress, locale: Locale): string {
  return locale === "ko" ? p.definition.descriptionKo : p.definition.descriptionEn;
}

/** 6개 카테고리 × Lv.1/Lv.2 = 12개 배지를 카테고리 섹션으로 묶어 보여준다. 스탬프처럼
 *  "장소마다 하나씩"이 아니라, 계정 전체 누적 방문 수(count)가 threshold를 넘으면 그
 *  배지가 잠금 해제된다(BadgeProgress는 서버에서 계산되어 내려온다). */
export default function BadgeGrid({ progress }: { progress: BadgeProgress[] }) {
  const t = useT();
  const { locale } = useLocale();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingBottom: 8 }}>
      {CATEGORY_ORDER.map((categoryId) => {
        const style = BADGE_CATEGORY_STYLE[categoryId];
        const tiers = progress
          .filter((p) => p.definition.categoryId === categoryId)
          .sort((a, b) => a.definition.tier - b.definition.tier);
        return (
          <div key={categoryId}>
            <p
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontFamily: "Outfit",
                fontWeight: 900,
                fontSize: 12,
                letterSpacing: 0.5,
                color: "#666",
                marginBottom: 8,
              }}
            >
              <span>{style.icon}</span>
              {locale === "ko" ? style.labelKo : style.labelEn}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {tiers.map((p) => (
                <BadgeCard key={p.definition.id} progress={p} color={style.color} icon={style.icon} locale={locale} t={t} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BadgeCard({
  progress,
  color,
  icon,
  locale,
  t,
}: {
  progress: BadgeProgress;
  color: string;
  icon: string;
  locale: Locale;
  t: TFunction;
}) {
  const { definition, count, earned } = progress;
  const isGoldTier = earned && definition.tier === 2;

  return (
    <KCard style={{ padding: 0, overflow: "hidden", border: isGoldTier ? "2.5px solid #E8B923" : undefined }}>
      <div
        style={{
          background: earned ? `${color}22` : "#F5F5F5",
          padding: "16px 10px 12px",
          textAlign: "center",
          borderBottom: "2.5px solid #111111",
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            margin: "0 auto",
            background: earned ? color : "#ddd",
            border: `2.5px solid ${isGoldTier ? "#E8B923" : "#111111"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            filter: earned ? "none" : "grayscale(1) opacity(.5)",
            position: "relative",
          }}
        >
          {icon}
          <span
            style={{
              position: "absolute",
              bottom: -4,
              right: -4,
              fontFamily: "Outfit",
              fontWeight: 900,
              fontSize: 8,
              background: "#111111",
              color: "#fff",
              borderRadius: 6,
              padding: "1px 4px",
            }}
          >
            LV.{definition.tier}
          </span>
        </div>
      </div>
      <div style={{ padding: "8px 10px 10px", textAlign: "center" }}>
        <p style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 12, marginBottom: 2, color: earned ? "#111" : "#666" }}>
          {badgeTitle(progress, locale)}
        </p>
        <p style={{ fontFamily: "Nunito", fontSize: 10, color: "#888", marginBottom: 6, lineHeight: 1.3, minHeight: 26 }}>
          {badgeDescription(progress, locale)}
        </p>
        {earned ? (
          <Pill bg={color} color="#fff" style={{ fontSize: 10, padding: "3px 10px" }}>
            {t("badges.earned")}
          </Pill>
        ) : (
          <Pill bg="#e8e8e8" color="#666" style={{ fontSize: 10, padding: "3px 10px", border: "2px solid #ddd" }}>
            {t("badges.progress", { count, threshold: definition.threshold })}
          </Pill>
        )}
      </div>
    </KCard>
  );
}
