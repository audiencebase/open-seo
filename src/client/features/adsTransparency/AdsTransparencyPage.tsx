import { useMemo } from "react";
import { AdsSearchCard } from "./AdsSearchCard";
import { AdvertisersTable } from "./AdvertisersTable";
import { CreativesGrid } from "./CreativesGrid";
import type { AdsTransparencyPageProps } from "./adsTransparencyTypes";
import {
  navigateToAdsSearch,
  navigateToAdsTab,
  useAdsTransparencyData,
} from "./useAdsTransparencyData";

export function AdsTransparencyPage({
  projectId,
  searchState,
  navigate,
}: AdsTransparencyPageProps) {
  const {
    advertisersQuery,
    adsQuery,
    savedAdvertisersQuery,
    savedCreativesQuery,
    advertisersErrorMessage,
    adsErrorMessage,
    saveAdvertiserMutation,
    saveCreativeMutation,
  } = useAdsTransparencyData({ projectId, searchState });

  const savedAdvertiserIds = useMemo(() => {
    const ids = new Set<string>();
    for (const item of savedAdvertisersQuery.data ?? []) {
      ids.add(item.advertiserId);
    }
    return ids;
  }, [savedAdvertisersQuery.data]);

  const savedCreativeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const item of savedCreativesQuery.data ?? []) {
      ids.add(item.creativeId);
    }
    return ids;
  }, [savedCreativesQuery.data]);

  const searchCardInitial = useMemo(
    () => ({
      q: searchState.q,
      mode: searchState.mode,
      loc: searchState.loc,
      platform: searchState.platform,
      format: searchState.format,
      dateFrom: searchState.dateFrom,
      dateTo: searchState.dateTo,
    }),
    [
      searchState.q,
      searchState.mode,
      searchState.loc,
      searchState.platform,
      searchState.format,
      searchState.dateFrom,
      searchState.dateTo,
    ],
  );

  const isFetching =
    advertisersQuery.isFetching || adsQuery.isFetching;

  const activeError =
    searchState.tab === "ads" ? adsErrorMessage : advertisersErrorMessage;

  return (
    <div className="px-4 py-4 pb-24 overflow-auto md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Ads Spy</h1>
          <p className="text-sm text-base-content/70">
            Discover who is advertising on Google and view their ad creatives.
          </p>
        </div>

        <AdsSearchCard
          errorMessage={activeError}
          initialValues={searchCardInitial}
          isFetching={isFetching}
          onSubmit={(values) =>
            navigateToAdsSearch(navigate, {
              q: values.q,
              mode: values.mode,
              loc: values.loc,
            })
          }
        />

        {/* Tab bar (keyword mode only) */}
        {searchState.mode === "keyword" && searchState.q ? (
          <div role="tablist" className="tabs tabs-bordered">
            <button
              role="tab"
              className={`tab ${searchState.tab === "advertisers" ? "tab-active" : ""}`}
              onClick={() => navigateToAdsTab(navigate, "advertisers")}
            >
              Advertisers
            </button>
            <button
              role="tab"
              className={`tab ${searchState.tab === "ads" ? "tab-active" : ""}`}
              onClick={() => navigateToAdsTab(navigate, "ads")}
            >
              Ad Creatives
            </button>
          </div>
        ) : null}

        {/* Body */}
        <AdsBody
          searchState={searchState}
          advertisersQuery={advertisersQuery}
          adsQuery={adsQuery}
          savedAdvertiserIds={savedAdvertiserIds}
          savedCreativeIds={savedCreativeIds}
          onViewAds={(ids) =>
            navigateToAdsTab(navigate, "ads", ids.join(","))
          }
          onSaveAdvertiser={(item) =>
            saveAdvertiserMutation.mutate({
              data: {
                projectId,
                advertiserId: item.advertiserId ?? "",
                advertiserName: item.advertiserName,
                domain: item.domain,
                keyword: searchState.q,
                locationCode: searchState.loc,
                adsCount: item.adsCount,
                verified: item.verified,
              },
            })
          }
          onSaveCreative={(item) =>
            saveCreativeMutation.mutate({
              data: {
                projectId,
                creativeId: item.creativeId ?? "",
                advertiserId: item.advertiserId ?? "",
                title: item.title,
                url: item.url,
                format: item.format,
                previewImage: item.previewImageUrl,
                firstShown: item.firstShown,
                lastShown: item.lastShown,
              },
            })
          }
        />
      </div>
    </div>
  );
}

function AdsBody({
  searchState,
  advertisersQuery,
  adsQuery,
  savedAdvertiserIds,
  savedCreativeIds,
  onViewAds,
  onSaveAdvertiser,
  onSaveCreative,
}: {
  searchState: AdsTransparencyPageProps["searchState"];
  advertisersQuery: ReturnType<
    typeof useAdsTransparencyData
  >["advertisersQuery"];
  adsQuery: ReturnType<typeof useAdsTransparencyData>["adsQuery"];
  savedAdvertiserIds: Set<string>;
  savedCreativeIds: Set<string>;
  onViewAds: (ids: string[]) => void;
  onSaveAdvertiser: (
    item: NonNullable<typeof advertisersQuery.data>[number],
  ) => void;
  onSaveCreative: (
    item: NonNullable<typeof adsQuery.data>[number],
  ) => void;
}) {
  // Empty state
  if (!searchState.q) {
    return (
      <div className="rounded-lg border border-base-300 p-12 text-center text-base-content/50">
        Enter a keyword or domain above to discover competitor ads.
      </div>
    );
  }

  // Advertisers tab (keyword mode)
  if (searchState.tab === "advertisers" && searchState.mode === "keyword") {
    if (advertisersQuery.isLoading) {
      return <LoadingSkeleton label="Searching advertisers..." />;
    }

    if (!advertisersQuery.data || advertisersQuery.data.length === 0) {
      return (
        <div className="rounded-lg border border-base-300 p-8 text-center text-base-content/50">
          No advertisers found for "{searchState.q}".
        </div>
      );
    }

    return (
      <AdvertisersTable
        advertisers={advertisersQuery.data}
        savedIds={savedAdvertiserIds}
        onViewAds={onViewAds}
        onSave={onSaveAdvertiser}
      />
    );
  }

  // Ads tab (either from keyword drill-down or domain mode)
  if (searchState.tab === "ads") {
    if (adsQuery.isLoading) {
      return <LoadingSkeleton label="Loading ad creatives..." />;
    }

    if (!adsQuery.data || adsQuery.data.length === 0) {
      return (
        <div className="rounded-lg border border-base-300 p-8 text-center text-base-content/50">
          No ad creatives found.
        </div>
      );
    }

    return (
      <CreativesGrid
        creatives={adsQuery.data}
        savedIds={savedCreativeIds}
        onSave={onSaveCreative}
      />
    );
  }

  return null;
}

function LoadingSkeleton({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-12">
      <span className="loading loading-spinner loading-md" />
      <span className="text-sm text-base-content/50">{label}</span>
    </div>
  );
}
