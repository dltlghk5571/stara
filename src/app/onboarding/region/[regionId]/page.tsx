import { notFound } from "next/navigation";
import { getRegionById } from "@/data/regions";
import { getArtistById } from "@/data/artists";
import { ARTIST_PLACES } from "@/data/places";
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
          nameEn: artist.nameEn,
          initials: artist.nameEn.slice(0, 2).toUpperCase(),
          spotCount: ARTIST_PLACES.filter((p) =>
            p.artistIds.includes(region.representativeArtistId!)
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
