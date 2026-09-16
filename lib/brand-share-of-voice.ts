import type { ScrapeRun } from "@/components/dashboard/types";
import { isCompletedGeoRankRun } from "@/lib/geo-rank-score";

export type TrackedBrand = {
  name: string;
  isTarget: boolean;
};

export type ShareOfVoiceEntry = TrackedBrand & {
  mentionCount: number;
  shareOfVoice: number;
};

function normalizeBrandName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function brandKey(value: string): string {
  return normalizeBrandName(value).toLowerCase();
}

export function normalizeCompetitorNames(
  value: string,
  targetBrand: string,
): string[] {
  const targetKey = brandKey(targetBrand);
  const seen = new Set<string>();

  return value
    .split(",")
    .map(normalizeBrandName)
    .filter((name) => {
      const key = brandKey(name);
      if (!key || key === targetKey || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function createTrackedBrands(
  targetBrand: string,
  competitorNames: string[],
): TrackedBrand[] {
  const normalizedTarget = normalizeBrandName(targetBrand);
  const targetKey = brandKey(normalizedTarget);
  const seen = new Set<string>();
  const brands: TrackedBrand[] = [];

  if (targetKey) {
    seen.add(targetKey);
    brands.push({ name: normalizedTarget, isTarget: true });
  }

  competitorNames.forEach((competitor) => {
    const name = normalizeBrandName(competitor);
    const key = brandKey(name);
    if (!key || seen.has(key)) return;
    seen.add(key);
    brands.push({ name, isTarget: false });
  });

  return brands;
}

function brandPattern(name: string): RegExp {
  const escaped = normalizeBrandName(name)
    .split(" ")
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s+");

  return new RegExp(
    `(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`,
    "iu",
  );
}

export function detectTrackedBrands(
  answer: string,
  trackedBrands: TrackedBrand[],
): TrackedBrand[] {
  if (!answer.trim()) return [];
  return trackedBrands.filter((brand) => brandPattern(brand.name).test(answer));
}

export function calculateAiShareOfVoice(
  runs: ScrapeRun[],
  trackedBrands: TrackedBrand[],
): ShareOfVoiceEntry[] {
  const counts = new Map(trackedBrands.map((brand) => [brand.name, 0]));

  runs.filter(isCompletedGeoRankRun).forEach((run) => {
    detectTrackedBrands(run.answer, trackedBrands).forEach((brand) => {
      counts.set(brand.name, (counts.get(brand.name) ?? 0) + 1);
    });
  });

  const totalAppearances = [...counts.values()].reduce(
    (total, count) => total + count,
    0,
  );

  return trackedBrands
    .map((brand) => {
      const mentionCount = counts.get(brand.name) ?? 0;
      return {
        ...brand,
        mentionCount,
        shareOfVoice:
          totalAppearances > 0
            ? (mentionCount / totalAppearances) * 100
            : 0,
      };
    })
    .sort(
      (a, b) =>
        b.mentionCount - a.mentionCount ||
        Number(b.isTarget) - Number(a.isTarget) ||
        a.name.localeCompare(b.name),
    );
}
