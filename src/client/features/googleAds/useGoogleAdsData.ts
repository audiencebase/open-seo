import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { GoogleAdsSearchState, GoogleAdsPageProps } from "./googleAdsTypes";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import {
  checkGoogleAdsAuth,
  getAccountSummary,
  getCampaignPerformance,
  getSearchTermReport,
  getKeywordPerformance,
  getAdGroupPerformance,
  getAdPerformance,
  getNegativeKeywords,
  getConversionActions,
  getCampaignBudgets,
  updateCampaignStatus,
  updateCampaignBudget,
  addNegativeKeyword,
} from "@/serverFunctions/googleAds";

type UseGoogleAdsDataArgs = {
  projectId: string;
  searchState: GoogleAdsSearchState;
};

export function useGoogleAdsData({
  projectId,
  searchState,
}: UseGoogleAdsDataArgs) {
  const hasDateRange =
    Boolean(searchState.dateFrom) && Boolean(searchState.dateTo);

  const authQuery = useQuery({
    queryKey: ["gadsAuth", projectId],
    queryFn: () => checkGoogleAdsAuth({ data: { projectId } }),
    staleTime: 5 * 60_000,
  });

  const overviewQuery = useQuery({
    queryKey: [
      "gadsOverview",
      projectId,
      searchState.dateFrom,
      searchState.dateTo,
    ],
    enabled: hasDateRange && searchState.tab === "overview",
    queryFn: () =>
      getAccountSummary({
        data: {
          projectId,
          dateFrom: searchState.dateFrom,
          dateTo: searchState.dateTo,
        },
      }),
  });

  const campaignsQuery = useQuery({
    queryKey: [
      "gadsCampaigns",
      projectId,
      searchState.dateFrom,
      searchState.dateTo,
    ],
    enabled: hasDateRange && searchState.tab === "campaigns",
    queryFn: () =>
      getCampaignPerformance({
        data: {
          projectId,
          dateFrom: searchState.dateFrom,
          dateTo: searchState.dateTo,
        },
      }),
  });

  const adGroupsQuery = useQuery({
    queryKey: [
      "gadsAdGroups",
      projectId,
      searchState.dateFrom,
      searchState.dateTo,
    ],
    enabled: hasDateRange && searchState.tab === "ad-groups",
    queryFn: () =>
      getAdGroupPerformance({
        data: {
          projectId,
          dateFrom: searchState.dateFrom,
          dateTo: searchState.dateTo,
          limit: 100,
        },
      }),
  });

  const adsQuery = useQuery({
    queryKey: [
      "gadsAds",
      projectId,
      searchState.dateFrom,
      searchState.dateTo,
    ],
    enabled: hasDateRange && searchState.tab === "ads",
    queryFn: () =>
      getAdPerformance({
        data: {
          projectId,
          dateFrom: searchState.dateFrom,
          dateTo: searchState.dateTo,
          limit: 50,
        },
      }),
  });

  const searchTermsQuery = useQuery({
    queryKey: [
      "gadsSearchTerms",
      projectId,
      searchState.dateFrom,
      searchState.dateTo,
    ],
    enabled: hasDateRange && searchState.tab === "search-terms",
    queryFn: () =>
      getSearchTermReport({
        data: {
          projectId,
          dateFrom: searchState.dateFrom,
          dateTo: searchState.dateTo,
          limit: 100,
        },
      }),
  });

  const keywordsQuery = useQuery({
    queryKey: [
      "gadsKeywords",
      projectId,
      searchState.dateFrom,
      searchState.dateTo,
    ],
    enabled: hasDateRange && searchState.tab === "keywords",
    queryFn: () =>
      getKeywordPerformance({
        data: {
          projectId,
          dateFrom: searchState.dateFrom,
          dateTo: searchState.dateTo,
          limit: 100,
        },
      }),
  });

  const negativesQuery = useQuery({
    queryKey: ["gadsNegatives", projectId],
    enabled: searchState.tab === "negatives",
    queryFn: () => getNegativeKeywords({ data: { projectId } }),
  });

  const conversionsQuery = useQuery({
    queryKey: ["gadsConversions", projectId],
    enabled: searchState.tab === "conversions",
    queryFn: () => getConversionActions({ data: { projectId } }),
  });

  const budgetsQuery = useQuery({
    queryKey: ["gadsBudgets", projectId],
    enabled: searchState.tab === "campaigns",
    queryFn: () => getCampaignBudgets({ data: { projectId } }),
  });

  // We only care about loading/error state from the active tab's query.
  // The change-log tab manages its own query internally.
  const activeQuery = (() => {
    switch (searchState.tab) {
      case "overview":
        return overviewQuery;
      case "campaigns":
        return campaignsQuery;
      case "ad-groups":
        return adGroupsQuery;
      case "ads":
        return adsQuery;
      case "search-terms":
        return searchTermsQuery;
      case "keywords":
        return keywordsQuery;
      case "negatives":
        return negativesQuery;
      case "conversions":
        return conversionsQuery;
      case "change-log":
        // Managed internally by ChangeLogTable
        return { error: null, isLoading: false, isFetching: false };
    }
  })();

  const errorMessage = activeQuery.error
    ? getStandardErrorMessage(activeQuery.error, "Could not load Google Ads data.")
    : null;

  return {
    authQuery,
    overviewQuery,
    campaignsQuery,
    adGroupsQuery,
    adsQuery,
    searchTermsQuery,
    keywordsQuery,
    negativesQuery,
    conversionsQuery,
    budgetsQuery,
    errorMessage,
    isLoading: activeQuery.isLoading,
    isFetching: activeQuery.isFetching,
  };
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

export function useCampaignStatusMutation(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { campaignId: string; newStatus: "ENABLED" | "PAUSED" }) =>
      updateCampaignStatus({
        data: { projectId, ...args },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["gadsCampaigns"] });
      void queryClient.invalidateQueries({ queryKey: ["gadsBudgets"] });
    },
  });
}

export function useBudgetMutation(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { budgetId: string; newDailyBudgetUsd: number }) =>
      updateCampaignBudget({
        data: { projectId, ...args },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["gadsBudgets"] });
      void queryClient.invalidateQueries({ queryKey: ["gadsCampaigns"] });
    },
  });
}

export function useAddNegativeMutation(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      campaignId: string;
      keywordText: string;
      matchType: "BROAD" | "PHRASE" | "EXACT";
    }) =>
      addNegativeKeyword({
        data: { projectId, ...args },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["gadsNegatives"] });
      void queryClient.invalidateQueries({ queryKey: ["gadsSearchTerms"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Navigation helpers
// ---------------------------------------------------------------------------

export function navigateToGadsTab(
  navigate: GoogleAdsPageProps["navigate"],
  tab: GoogleAdsSearchState["tab"],
) {
  navigate({
    search: (prev) => ({
      ...prev,
      tab: tab === "overview" ? undefined : tab,
    }),
    replace: true,
  });
}

export function navigateToGadsDateRange(
  navigate: GoogleAdsPageProps["navigate"],
  dateFrom: string,
  dateTo: string,
) {
  navigate({
    search: (prev) => ({
      ...prev,
      dateFrom,
      dateTo,
    }),
    replace: true,
  });
}
