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
          spotCount: placesForArtists(ARTIST_PLACES, [region.representativeArtistId!]).length,
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
