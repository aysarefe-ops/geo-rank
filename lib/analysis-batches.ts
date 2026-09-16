import type { ScrapeRun } from "@/components/dashboard/types";
import { calculateGeoRankScore } from "@/lib/geo-rank-score";

export type CurrentAnalysisRuns = {
  runs: ScrapeRun[];
  analysisId: string | null;
  isLegacy: boolean;
};

export type AnalysisBatchSummary = {
  analysisId: string;
  timestamp: string | null;
  completedResponses: number;
  score: number;
  aiVisibility: number;
  citationRate: number;
  providerCoverage: number;
  mentionConsistency: number;
};

export type AnalysisBatchComparison = {
  current: AnalysisBatchSummary;
  previous: AnalysisBatchSummary;
  differences: {
    score: number;
    aiVisibility: number;
    citationRate: number;
    providerCoverage: number;
    mentionConsistency: number;
    completedResponses: number;
  };
};

/**
 * Select the newest explicit analysis batch by its latest run timestamp.
 * When no batch IDs exist, return every run to preserve legacy/demo behavior.
 */
export function selectCurrentAnalysisRuns(
  runs: ScrapeRun[],
): CurrentAnalysisRuns {
  const batchedRuns = runs.filter((run) => Boolean(run.analysisId));

  if (batchedRuns.length === 0) {
    return { runs, analysisId: null, isLegacy: true };
  }

  let latestAnalysisId = batchedRuns[0].analysisId as string;
  let latestTimestamp = Number.NEGATIVE_INFINITY;

  batchedRuns.forEach((run) => {
    const timestamp = Date.parse(run.createdAt);
    if (!Number.isNaN(timestamp) && timestamp > latestTimestamp) {
      latestTimestamp = timestamp;
      latestAnalysisId = run.analysisId as string;
    }
  });

  return {
    runs: runs.filter((run) => run.analysisId === latestAnalysisId),
    analysisId: latestAnalysisId,
    isLegacy: false,
  };
}

/**
 * Resolve an explicitly selected analysis batch, falling back to the latest
 * available analysis when the selection is missing or no longer exists.
 */
export function selectAnalysisRuns(
  runs: ScrapeRun[],
  selectedAnalysisId: string | null,
): CurrentAnalysisRuns {
  if (!selectedAnalysisId) return selectCurrentAnalysisRuns(runs);

  const selectedRuns = runs.filter(
    (run) => run.analysisId === selectedAnalysisId,
  );

  if (selectedRuns.length === 0) return selectCurrentAnalysisRuns(runs);

  return {
    runs: selectedRuns,
    analysisId: selectedAnalysisId,
    isLegacy: false,
  };
}

function newestValidTimestamp(runs: ScrapeRun[]): string | null {
  let newestTimestamp: string | null = null;
  let newestTime = Number.NEGATIVE_INFINITY;

  runs.forEach((run) => {
    const time = Date.parse(run.createdAt);
    if (!Number.isNaN(time) && time > newestTime) {
      newestTime = time;
      newestTimestamp = run.createdAt;
    }
  });

  return newestTimestamp;
}

export function summarizeAnalysisBatches(
  runs: ScrapeRun[],
  targetWebsites: string[],
): AnalysisBatchSummary[] {
  const batches = new Map<string, ScrapeRun[]>();

  runs.forEach((run) => {
    const analysisId = run.analysisId?.trim();
    if (!analysisId) return;
    const batch = batches.get(analysisId) ?? [];
    batch.push(run);
    batches.set(analysisId, batch);
  });

  return [...batches.entries()]
    .map(([analysisId, batchRuns]) => {
      const breakdown = calculateGeoRankScore(batchRuns, { targetWebsites });
      return {
        analysisId,
        timestamp: newestValidTimestamp(batchRuns),
        completedResponses: breakdown.completedRuns,
        score: breakdown.score,
        aiVisibility: breakdown.aiVisibility,
        citationRate: breakdown.citationRate,
        providerCoverage: breakdown.providerCoverage,
        mentionConsistency: breakdown.mentionConsistency,
      };
    })
    .sort((a, b) => {
      const aTime = a.timestamp ? Date.parse(a.timestamp) : Number.NEGATIVE_INFINITY;
      const bTime = b.timestamp ? Date.parse(b.timestamp) : Number.NEGATIVE_INFINITY;
      return bTime - aTime || a.analysisId.localeCompare(b.analysisId);
    });
}

/**
 * Compare the two newest usable summaries. Summaries without a valid timestamp
 * or completed response are excluded because they cannot form a reliable
 * chronological comparison.
 */
export function compareLatestAnalysisBatches(
  summaries: AnalysisBatchSummary[],
): AnalysisBatchComparison | null {
  const [current, previous] = summaries.filter(
    (summary) =>
      summary.completedResponses > 0 && summary.timestamp !== null,
  );

  if (!current || !previous) return null;

  return {
    current,
    previous,
    differences: {
      score: current.score - previous.score,
      aiVisibility: current.aiVisibility - previous.aiVisibility,
      citationRate: current.citationRate - previous.citationRate,
      providerCoverage:
        current.providerCoverage - previous.providerCoverage,
      mentionConsistency:
        current.mentionConsistency - previous.mentionConsistency,
      completedResponses:
        current.completedResponses - previous.completedResponses,
    },
  };
}
