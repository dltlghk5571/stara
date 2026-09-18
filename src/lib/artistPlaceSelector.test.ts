import { describe, expect, it } from "vitest";
import { placesForArtists } from "./artistPlaceSelector";
import { DUMMY_ARTIST_PLACES } from "@/data/__fixtures__/dummyPlaces";

describe("placesForArtists", () => {
  it("아티스트 하나를 선택하면 그 아티스트의 장소만 돌려준다", () => {
    const result = placesForArtists(DUMMY_ARTIST_PLACES, ["artist-01"]);
    expect(result.map((p) => p.id).sort()).toEqual([
      "place-01-food",
      "place-01-photo",
      "place-01-third",
    ]);
  });

  it("여러 아티스트를 선택하면 두 아티스트의 장소를 합쳐 돌려준다", () => {
    const result = placesForArtists(DUMMY_ARTIST_PLACES, ["artist-01", "artist-02"]);
    expect(result.every((p) => p.artistIds.includes("artist-01") || p.artistIds.includes("artist-02"))).toBe(true);
    expect(result.length).toBe(6);
  });

  it("두 선택 아티스트가 공유하는 장소는 한 번만 나온다", () => {
    // place-05-third는 fixture에서 artist-05/artist-06 공동 장소로 만들어져 있다.
    const result = placesForArtists(DUMMY_ARTIST_PLACES, ["artist-05", "artist-06"]);
    expect(result.filter((p) => p.id === "place-05-third")).toHaveLength(1);
  });

  it("매칭되는 장소가 없는 아티스트는 빈 배열을 돌려준다", () => {
    expect(placesForArtists(DUMMY_ARTIST_PLACES, ["artist-no-such-id"])).toEqual([]);
  });

  it("선택이 비어있으면 빈 배열을 돌려준다(전체 보기 정책은 호출부 책임)", () => {
    expect(placesForArtists(DUMMY_ARTIST_PLACES, [])).toEqual([]);
  });
});
