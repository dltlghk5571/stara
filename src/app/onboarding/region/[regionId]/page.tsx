import { notFound } from "next/navigation";
import { getRegionById } from "@/data/regions";
import { getArtistById } from "@/data/artists";
import { ARTIST_PLACES } from "@/data/places";
import { placesForArtists } from "@/lib/artistPlaceSelector";
import RegionDetailClient from "./RegionDetailClient";

interface Props {
  params: Promise<{ regionId: string }>;
  searchParams: Promise<{ artists?: string }>;
}

export default async function OnboardingRegionDetailPage({ params, searchParams }: Props) {
  const { regionId } = await params;
  const { artists } = await searchParams;
  const region = getRegionById(regionId);
  if (!region) notFound();

  const artist = region.representativeArtistId
    ? getArtistById(region.representativeArtistId)
    : undefined;
  const representativeArtist =
    artist && region.representativeArtistId
      ? {
          name: artist.name,
          nameEn: artist.nameEn,
          initials: artist.nameEn.slice(0, 2).toUpperCase(),
          // 이 지역(regionId) 안의 장소만 센다 — 안 그러면 다른 지역에도 있는 아티스트일 때
          // "이 지역 촬영지 수"에 엉뚱한 지역 장소까지 같이 세어져 부풀려진다.
          spotCount: placesForArtists(
            ARTIST_PLACES.filter((p) => p.regionId === region.id),
            [region.representativeArtistId]
          ).length,
        }
      : null;

  return (
    <RegionDetailClient
      region={region}
      representativeArtist={representativeArtist}
      artistsParam={artists ?? ""}
    />
  );
}
