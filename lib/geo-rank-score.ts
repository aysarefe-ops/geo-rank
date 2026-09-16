import type { ScrapeRun } from "@/components/dashboard/types";

export type GeoRankInterpretation =
  | "Low visibility"
  | "Developing visibility"
  | "Strong visibility"
  | "Very strong visibility";

export type GeoRankScoreBreakdown = {
  score: number;
  aiVisibility: number;
  citationRate: number;
  providerCoverage: number;
  mentionConsistency: number;
  completedRuns: number;
  mentioningRuns: number;
  citingRuns: number;
  completedProviders: number;
  mentioningProviders: number;
  totalDistinctPrompts: number;
  mentioningDistinctPrompts: number;
  interpretation: GeoRankInterpretation;
};

type GeoRankScoreOptions = {
  targetWebsites: string[];
};

const clampPercentage = (value: number) =>
  Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));

function percentage(part: number, total: number): number {
  return total > 0 ? clampPercentage((part / total) * 100) : 0;
}

function normalizeHostname(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(
      /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)
        ? trimmed
        : `https://${trimmed}`,
    );
    return url.hostname.toLowerCase().replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

export function isCompletedGeoRankRun(run: ScrapeRun): boolean {
  return run.answer.trim().length > 0;
}

export function runCitesTargetWebsite(
  run: ScrapeRun,
  targetWebsites: string[],
): boolean {
  const targetDomains = targetWebsites
    .map(normalizeHostname)
    .filter((domain): domain is string => domain !== null);

  return run.sources.some((source) => {
    const sourceDomain = normalizeHostname(source);
    if (!sourceDomain) return false;
    return targetDomains.some(
      (targetDomain) =>
        sourceDomain === targetDomain ||
        sourceDomain.endsWith(`.${targetDomain}`),
    );
  });
}

function interpretScore(score: number): GeoRankInterpretation {
  if (score < 40) return "Low visibility";
  if (score < 60) return "Developing visibility";
  if (score < 80) return "Strong visibility";
  return "Very strong visibility";
}

/**
 * Calculate a deterministic 0–100 GEO Rank score from successful analysis runs.
 * Failed provider calls are not stored as ScrapeRun records; a non-empty answer
 * is additionally required before a stored run is treated as completed.
 */
export function calculateGeoRankScore(
  runs: ScrapeRun[],
  { targetWebsites }: GeoRankScoreOptions,
): GeoRankScoreBreakdown {
  const completedRuns = runs.filter(isCompletedGeoRankRun);

  if (completedRuns.length === 0) {
    return {
      score: 0,
      aiVisibility: 0,
      citationRate: 0,
      providerCoverage: 0,
      mentionConsistency: 0,
      completedRuns: 0,
      mentioningRuns: 0,
      citingRuns: 0,
      completedProviders: 0,
      mentioningProviders: 0,
      totalDistinctPrompts: 0,
      mentioningDistinctPrompts: 0,
      interpretation: "Low visibility",
    };
  }

  const hasBrandMention = (run: ScrapeRun) =>
    (run.brandMentions?.length ?? 0) > 0;
  const mentionedRuns = completedRuns.filter(hasBrandMention);
  const aiVisibilityRaw = percentage(
    mentionedRuns.length,
    completedRuns.length,
  );

  const citedRuns = completedRuns.filter((run) =>
    runCitesTargetWebsite(run, targetWebsites),
  );
  const citationRateRaw = percentage(citedRuns.length, completedRuns.length);

  const completedProviderSet = new Set(
    completedRuns.map((run) => run.provider),
  );
  const mentioningProviderSet = new Set(
    mentionedRuns.map((run) => run.provider),
  );
  const providerCoverageRaw = percentage(
    mentioningProviderSet.size,
    completedProviderSet.size,
  );

  const completedPrompts = new Set(
    completedRuns.map((run) => run.prompt.trim()).filter(Boolean),
  );
  const mentionedPrompts = new Set(
    mentionedRuns.map((run) => run.prompt.trim()).filter(Boolean),
  );
  const mentionConsistencyRaw = percentage(
    mentionedPrompts.size,
    completedPrompts.size,
  );

  const roundedScore = Math.round(
    clampPercentage(
      aiVisibilityRaw * 0.4 +
        citationRateRaw * 0.3 +
        providerCoverageRaw * 0.2 +
        mentionConsistencyRaw * 0.1,
    ),
  );

  return {
    score: roundedScore,
    aiVisibility: Math.round(aiVisibilityRaw),
    citationRate: Math.round(citationRateRaw),
    providerCoverage: Math.round(providerCoverageRaw),
    mentionConsistency: Math.round(mentionConsistencyRaw),
    completedRuns: completedRuns.length,
    mentioningRuns: mentionedRuns.length,
    citingRuns: citedRuns.length,
    completedProviders: completedProviderSet.size,
    mentioningProviders: mentioningProviderSet.size,
    totalDistinctPrompts: completedPrompts.size,
    mentioningDistinctPrompts: mentionedPrompts.size,
    interpretation: interpretScore(roundedScore),
  };
}
