import type { GoogleAdsTab } from "@/types/schemas/googleAds";
import type {
  getAccountSummary,
  getCampaignPerformance,
  getSearchTermReport,
  getKeywordPerformance,
  getAdGroupPerformance,
  getAdPerformance,
  getNegativeKeywords,
  getConversionActions,
  getCampaignBudgets,
  checkGoogleAdsAuth,
} from "@/serverFunctions/googleAds";

export type AuthStatus = Awaited<ReturnType<typeof checkGoogleAdsAuth>>;
export type AccountSummaryData = Awaited<ReturnType<typeof getAccountSummary>>;
export type CampaignData = Awaited<ReturnType<typeof getCampaignPerformance>>;
export type SearchTermData = Awaited<ReturnType<typeof getSearchTermReport>>;
export type KeywordData = Awaited<ReturnType<typeof getKeywordPerformance>>;
export type AdGroupData = Awaited<ReturnType<typeof getAdGroupPerformance>>;
export type AdData = Awaited<ReturnType<typeof getAdPerformance>>;
export type NegativeKeywordData = Awaited<ReturnType<typeof getNegativeKeywords>>;
export type ConversionActionData = Awaited<ReturnType<typeof getConversionActions>>;
export type CampaignBudgetData = Awaited<ReturnType<typeof getCampaignBudgets>>;

export type GoogleAdsSearchState = {
  dateFrom: string;
  dateTo: string;
  tab: GoogleAdsTab;
};

export type GoogleAdsNavigate = (args: {
  search: (prev: Record<string, unknown>) => Record<string, unknown>;
  replace: boolean;
}) => void;

export type GoogleAdsPageProps = {
  projectId: string;
  searchState: GoogleAdsSearchState;
  navigate: GoogleAdsNavigate;
};
