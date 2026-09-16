export type Provider =
  | "chatgpt"
  | "perplexity"
  | "copilot"
  | "gemini"
  | "google_ai";

export type ScrapeRun = {
  /** Groups successful provider results created by one dashboard analysis. */
  analysisId?: string;
  provider: Provider;
  prompt: string;
  answer: string;
  sources: string[];
  createdAt: string;
  /** 0-100 visibility score based on brand mention, position, sentiment */
  visibilityScore: number;
  /** Detected sentiment of the response toward the brand */
  sentiment: "positive" | "neutral" | "negative" | "not-mentioned";
  /** Brand names/aliases that were found in the answer */
  brandMentions: string[];
  /** Competitor names found in the answer */
  competitorMentions: string[];
  /** ISO country code the run was executed in (Bright Data geolocation) */
  country?: string;
};

/** Structured section inside a battlecard */
type BattlecardSection = {
  heading: string;
  points: string[];
};

export type Battlecard = {
  competitor: string;
  sentiment: "positive" | "neutral" | "negative";
  summary: string;
  /** Structured sections: strengths, weaknesses, pricing, AI visibility, etc. */
  sections?: BattlecardSection[];
};

export type AuditCheck = {
  id: string;
  label: string;
  category: "discovery" | "structure" | "content" | "technical" | "rendering";
  pass: boolean;
  value: string;
  detail: string;
};

export type AuditReport = {
  url: string;
  score: number;
  checks: AuditCheck[];
  /** Legacy fields kept for backward compat */
  llmsTxtPresent: boolean;
  schemaMentions: number;
  blufDensity: number;
  pass: {
    llmsTxt: boolean;
    schema: boolean;
    bluf: boolean;
  };
};

export type BrandConfig = {
  brandName: string;
  brandAliases: string;
  /** Multiple brand/company website URLs */
  websites: string[];
  industry: string;
  keywords: string;
  description: string;
};

/** Workspace for multi-brand tracking */
export type Workspace = {
  id: string;
  brandName: string;
  createdAt: string;
};

export const ALL_PROVIDERS: Provider[] = [
  "chatgpt",
  "perplexity",
  "copilot",
  "gemini",
  "google_ai",
];

export const PROVIDER_LABELS: Record<Provider, string> = {
  chatgpt: "ChatGPT",
  perplexity: "Perplexity",
  copilot: "Copilot",
  gemini: "Gemini",
  google_ai: "Google AI",
};

/** Complete ISO 3166-1 alpha-2 country/territory codes. */
const ISO_ALPHA_2_CODES = [
  "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AS", "AT", "AU", "AW", "AX", "AZ",
  "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS", "BT", "BV", "BW", "BY", "BZ",
  "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN", "CO", "CR", "CU", "CV", "CW", "CX", "CY", "CZ",
  "DE", "DJ", "DK", "DM", "DO", "DZ",
  "EC", "EE", "EG", "EH", "ER", "ES", "ET",
  "FI", "FJ", "FK", "FM", "FO", "FR",
  "GA", "GB", "GD", "GE", "GF", "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GS", "GT", "GU", "GW", "GY",
  "HK", "HM", "HN", "HR", "HT", "HU",
  "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IR", "IS", "IT",
  "JE", "JM", "JO", "JP",
  "KE", "KG", "KH", "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ",
  "LA", "LB", "LC", "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY",
  "MA", "MC", "MD", "ME", "MF", "MG", "MH", "MK", "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW", "MX", "MY", "MZ",
  "NA", "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR", "NU", "NZ",
  "OM",
  "PA", "PE", "PF", "PG", "PH", "PK", "PL", "PM", "PN", "PR", "PS", "PT", "PW", "PY",
  "QA",
  "RE", "RO", "RS", "RU", "RW",
  "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS", "ST", "SV", "SX", "SY", "SZ",
  "TC", "TD", "TF", "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO", "TR", "TT", "TV", "TW", "TZ",
  "UA", "UG", "UM", "US", "UY", "UZ",
  "VA", "VC", "VE", "VG", "VI", "VN", "VU",
  "WF", "WS",
  "YE", "YT",
  "ZA", "ZM", "ZW",
] as const;

const countryDisplayNames = new Intl.DisplayNames(["en"], { type: "region" });

/** Countries available for geo-scoped AI-visibility tracking. */
export const COUNTRIES: { code: string; label: string }[] =
  ISO_ALPHA_2_CODES.map((code) => ({
    code,
    label:
      code === "TR" ? "Türkiye" : (countryDisplayNames.of(code) ?? code),
  })).sort((a, b) => a.label.localeCompare(b.label, "en"));

export const COUNTRY_LABELS: Record<string, string> = Object.fromEntries(
  COUNTRIES.map((c) => [c.code, c.label]),
);

function normalizeCountryLookup(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const LEGACY_COUNTRY_ALIASES: Record<string, string> = {
  england: "GB",
  "great britain": "GB",
  uk: "GB",
  "united states of america": "US",
  usa: "US",
  turkey: "TR",
  turkiye: "TR",
  "czech republic": "CZ",
  "cape verde": "CV",
  swaziland: "SZ",
  macedonia: "MK",
  russia: "RU",
  vietnam: "VN",
  "viet nam": "VN",
  bolivia: "BO",
  brunei: "BN",
  iran: "IR",
  laos: "LA",
  moldova: "MD",
  palestine: "PS",
  syria: "SY",
  tanzania: "TZ",
  venezuela: "VE",
};

const COUNTRY_CODES_BY_NAME = new Map<string, string>([
  ...COUNTRIES.map(
    ({ code, label }) => [normalizeCountryLookup(label), code] as const,
  ),
  ...Object.entries(LEGACY_COUNTRY_ALIASES),
]);

/** Convert saved ISO codes or legacy country names into an ISO alpha-2 code. */
export function normalizeCountryCode(
  value: unknown,
  fallback = "US",
): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;

  const upperCode = trimmed.toUpperCase();
  if (Object.prototype.hasOwnProperty.call(COUNTRY_LABELS, upperCode)) {
    return upperCode;
  }

  return COUNTRY_CODES_BY_NAME.get(normalizeCountryLookup(trimmed)) ?? fallback;
}

/** A drift alert generated when visibility changes significantly between auto-runs */
export type DriftAlert = {
  id: string;
  prompt: string;
  provider: Provider;
  oldScore: number;
  newScore: number;
  delta: number;
  createdAt: string;
  dismissed: boolean;
};

/** Schedule interval value in milliseconds */
export type ScheduleInterval = 3600000 | 21600000 | 43200000 | 86400000;

export const SCHEDULE_OPTIONS: {
  value: ScheduleInterval;
  label: string;
  desc: string;
}[] = [
  { value: 3600000, label: "Every Hour", desc: "Run once per hour" },
  { value: 21600000, label: "Every 6 Hours", desc: "Run 4× per day" },
  { value: 43200000, label: "Every 12 Hours", desc: "Run 2× per day" },
  { value: 86400000, label: "Daily", desc: "Once per day" },
];

/** Computed delta for a prompt+provider pair between runs */
export type RunDelta = {
  prompt: string;
  provider: Provider;
  currentScore: number;
  previousScore: number;
  delta: number;
  currentRun: ScrapeRun;
  previousRun: ScrapeRun;
};

/** Structured competitor with optional aliases and websites */
export type Competitor = {
  name: string;
  aliases: string[];
  websites: string[];
};

/** A tracking prompt with optional tags for grouping/filtering */
export type TaggedPrompt = {
  text: string;
  tags: string[];
};

export type AppState = {
  brand: BrandConfig;
  provider: Provider;
  /** Multiple providers selected for parallel runs */
  activeProviders: Provider[];
  /** Active country (2-letter code) for geo-scoped AI-visibility tracking */
  country: string;
  prompt: string;
  customPrompts: TaggedPrompt[];
  personas: string;
  fanoutPrompts: string[];
  niche: string;
  nicheQueries: string[];
  cronExpr: string;
  githubWorkflow: string;
  competitors: Competitor[];
  battlecards: Battlecard[];
  runs: ScrapeRun[];
  auditUrl: string;
  auditReport: AuditReport | null;
  /** In-app scheduling */
  scheduleEnabled: boolean;
  scheduleIntervalMs: ScheduleInterval;
  lastScheduledRun: string | null;
  /** Drift alerts from auto-runs */
  driftAlerts: DriftAlert[];
};

export const tabs = [
  "Project Settings",
  "Prompt Hub",
  "Persona Fan-Out",
  "Niche Explorer",
  "Responses",
  "Visibility Analytics",
  "Citations",
  "Citation Opportunities",
  "Competitor Battlecards",
  "AEO Audit",
  "SRO Analysis",
  "Automation",
  "Documentation",
] as const;

export type TabKey = (typeof tabs)[number];
