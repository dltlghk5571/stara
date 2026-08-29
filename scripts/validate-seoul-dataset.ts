// 서울 파이프라인 데이터 정합성 검증. 실행: npx tsx scripts/validate-seoul-dataset.ts [sourceDir]
import { readFileSync } from "node:fs";
import { join } from "node:path";

const sourceDir = process.argv[2] ?? "previewdata";

interface PipelineArtist {
  artist_id: string;
}
interface PipelinePlace {
  place_id: string;
  city_id: string;
  artist_ids: string[];
  place_name_ko: string;
  place_name_en: string;
  place_category: string;
  latitude: number;
  longitude: number;
}

const KNOWN_CATEGORIES = new Set([
  "food",
  "shopping",
  "culture",
  "activity",
  "landmark_observatory",
  "kpop",
]);

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

const artists = readJson<PipelineArtist[]>(join(sourceDir, "artists.json"));
const places = readJson<PipelinePlace[]>(join(sourceDir, "places.json"));
const seoulPlaces = places.filter((p) => p.city_id === "seoul");
const artistIdSet = new Set(artists.map((a) => a.artist_id));

const errors: string[] = [];

// 중복 place_id
const idCounts = new Map<string, number>();
for (const p of seoulPlaces) idCounts.set(p.place_id, (idCounts.get(p.place_id) ?? 0) + 1);
for (const [id, count] of idCounts) if (count > 1) errors.push(`duplicate place_id: ${id} (${count}x)`);

for (const p of seoulPlaces) {
  if (!p.place_id) errors.push(`missing place_id`);
  if (!p.place_name_ko || !p.place_name_en) errors.push(`${p.place_id}: missing name (ko/en)`);
  if (typeof p.latitude !== "number" || typeof p.longitude !== "number") {
    errors.push(`${p.place_id}: missing lat/lng`);
  }
  if (!KNOWN_CATEGORIES.has(p.place_category)) {
    errors.push(`${p.place_id}: unknown place_category "${p.place_category}"`);
  }
  if (p.artist_ids.length === 0) errors.push(`${p.place_id}: empty artist_ids`);
  for (const aid of p.artist_ids) {
    if (!artistIdSet.has(aid)) errors.push(`${p.place_id}: unknown artist_id "${aid}"`);
  }
}

if (errors.length > 0) {
  console.error(`Validation FAILED — ${errors.length} issue(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(`Validation OK — ${seoulPlaces.length} Seoul places, ${artists.length} artists checked.`);
