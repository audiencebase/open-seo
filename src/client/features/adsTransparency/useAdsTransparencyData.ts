import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AdsTransparencyPageProps,
  AdsSearchState,
} from "./adsTransparencyTypes";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import {
  searchAdvertisers,
  searchAds,
  saveAdvertiser,
  removeSavedAdvertiser,
  saveCreative,
  removeSavedCreative,
  getSavedAdvertisers,
  getSavedCreatives,
} from "@/serverFunctions/adsTransparency";

type UseAdsTransparencyDataArgs = {
  projectId: string;
  searchState: AdsSearchState;
};

export function useAdsTransparencyData({
  projectId,
  searchState,
}: UseAdsTransparencyDataArgs) {
  const queryClient = useQueryClient();
  const hasQuery = Boolean(searchState.q.trim());
  const advIdsList = useMemo(
    () =>
      searchState.advIds
        ? searchState.advIds.split(",").filter(Boolean)
        : [],
    [searchState.advIds],
  );

  const advertisersQuery = useQuery({
    queryKey: [
      "adsAdvertisers",
      projectId,
      searchState.q,
      searchState.loc,
    ],
    enabled: hasQuery && searchState.mode === "keyword",
    queryFn: () =>
      searchAdvertisers({
        data: {
          projectId,
          keyword: searchState.q.trim(),
          locationCode: searchState.loc,
        },
      }),
  });

  const adsQuery = useQuery({
    queryKey: [
      "adsCreatives",
      projectId,
      searchState.advIds,
      searchState.q,
      searchState.mode,
      searchState.loc,
      searchState.platform,
      searchState.format,
      searchState.dateFrom,
      searchState.dateTo,
    ],
    enabled:
      searchState.tab === "ads" &&
      (advIdsList.length > 0 ||
        (searchState.mode === "domain" && hasQuery)),
    queryFn: () =>
      searchAds({
        data: {
          projectId,
          ...(advIdsList.length > 0
            ? { advertiserIds: advIdsList }
            : { target: searchState.q.trim() }),
          locationCode: searchState.loc || undefined,
          platform: searchState.platform || undefined,
          format: searchState.format || undefined,
          dateFrom: searchState.dateFrom || undefined,
          dateTo: searchState.dateTo || undefined,
        },
      }),
  });

  const savedAdvertisersQuery = useQuery({
    queryKey: ["savedAdvertisers", projectId],
    queryFn: () => getSavedAdvertisers({ data: { projectId } }),
  });

  const savedCreativesQuery = useQuery({
    queryKey: ["savedCreatives", projectId],
    queryFn: () => getSavedCreatives({ data: { projectId } }),
  });

  const saveAdvertiserMutation = useMutation({
    mutationFn: saveAdvertiser,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["savedAdvertisers", projectId],
      });
    },
  });

  const removeAdvertiserMutation = useMutation({
    mutationFn: removeSavedAdvertiser,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["savedAdvertisers", projectId],
      });
    },
  });

  const saveCreativeMutation = useMutation({
    mutationFn: saveCreative,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["savedCreatives", projectId],
      });
    },
  });

  const removeCreativeMutation = useMutation({
    mutationFn: removeSavedCreative,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["savedCreatives", projectId],
      });
    },
  });

  const advertisersErrorMessage = advertisersQuery.error
    ? getStandardErrorMessage(
        advertisersQuery.error,
        "Could not search advertisers.",
      )
    : null;

  const adsErrorMessage = adsQuery.error
    ? getStandardErrorMessage(adsQuery.error, "Could not search ads.")
    : null;

  return {
    advertisersQuery,
    adsQuery,
    savedAdvertisersQuery,
    savedCreativesQuery,
    advertisersErrorMessage,
    adsErrorMessage,
    saveAdvertiserMutation,
    removeAdvertiserMutation,
    saveCreativeMutation,
    removeCreativeMutation,
  };
}

export function navigateToAdsSearch(
  navigate: AdsTransparencyPageProps["navigate"],
  values: { q: string; mode: AdsSearchState["mode"]; loc: number },
) {
  navigate({
    search: (prev) => ({
      ...prev,
      q: values.q,
      mode: values.mode === "keyword" ? undefined : values.mode,
      loc: values.loc === 2840 ? undefined : values.loc,
      tab: values.mode === "domain" ? "ads" : undefined,
      advIds: undefined,
    }),
    replace: true,
  });
}

export function navigateToAdsTab(
  navigate: AdsTransparencyPageProps["navigate"],
  tab: AdsSearchState["tab"],
  advIds?: string,
) {
  navigate({
    search: (prev) => ({
      ...prev,
      tab: tab === "advertisers" ? undefined : tab,
      advIds: advIds || prev.advIds,
    }),
    replace: true,
  });
}
