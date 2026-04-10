import { useMemo, useState } from "react";
import { AccountDashboard } from "./AccountDashboard";
import { CampaignTable } from "./CampaignTable";
import { AdGroupsTable } from "./AdGroupsTable";
import { AdsTable } from "./AdsTable";
import { SearchTermsTable } from "./SearchTermsTable";
import { KeywordsTable } from "./KeywordsTable";
import { NegativesTable } from "./NegativesTable";
import { ConversionsTable } from "./ConversionsTable";
import { ChangeLogTable } from "./ChangeLogTable";
import type { GoogleAdsPageProps } from "./googleAdsTypes";
import type { GoogleAdsTab } from "@/types/schemas/googleAds";
import {
  navigateToGadsTab,
  navigateToGadsDateRange,
  useGoogleAdsData,
} from "./useGoogleAdsData";

function getDefaultDateRange(): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const dateTo = now.toISOString().slice(0, 10);
  const from = new Date(now);
  from.setDate(from.getDate() - 30);
  const dateFrom = from.toISOString().slice(0, 10);
  return { dateFrom, dateTo };
}

const TABS: { id: GoogleAdsTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "campaigns", label: "Campaigns" },
  { id: "ad-groups", label: "Ad Groups" },
  { id: "ads", label: "Ad Copy" },
  { id: "search-terms", label: "Search Terms" },
  { id: "keywords", label: "Keywords" },
  { id: "negatives", label: "Negatives" },
  { id: "conversions", label: "Conversions" },
  { id: "change-log", label: "Change Log" },
];

// Tabs that don't need a date range
const DATE_INDEPENDENT_TABS = new Set<GoogleAdsTab>([
  "negatives",
  "conversions",
  "change-log",
]);

export function GoogleAdsPage({
  projectId,
  searchState,
  navigate,
}: GoogleAdsPageProps) {
  const defaults = useMemo(getDefaultDateRange, []);
  const dateFrom = searchState.dateFrom || defaults.dateFrom;
  const dateTo = searchState.dateTo || defaults.dateTo;

  const effectiveState = useMemo(
    () => ({ ...searchState, dateFrom, dateTo }),
    [searchState, dateFrom, dateTo],
  );

  const {
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
    isLoading,
    isFetching,
  } = useGoogleAdsData({ projectId, searchState: effectiveState });

  const [localFrom, setLocalFrom] = useState(dateFrom);
  const [localTo, setLocalTo] = useState(dateTo);

  function handleApplyDates() {
    navigateToGadsDateRange(navigate, localFrom, localTo);
  }

  const needsDateRange = !DATE_INDEPENDENT_TABS.has(effectiveState.tab);

  return (
    <div className="px-4 py-4 pb-24 overflow-auto md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto max-w-7xl space-y-4">
        {/* Header + Auth status */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold">Google Ads</h1>
            <p className="text-sm text-base-content/70">
              Campaign management, analytics, and optimization.
            </p>
          </div>
          {authQuery.data ? (
            <div
              className={`rounded-lg border px-3 py-1.5 text-xs ${
                authQuery.data.authenticated
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-error/30 bg-error/10 text-error"
              }`}
            >
              {authQuery.data.authenticated ? (
                <>
                  Connected: {authQuery.data.accountName} (
                  {authQuery.data.customerId})
                </>
              ) : (
                <>Auth failed: {authQuery.data.error}</>
              )}
            </div>
          ) : authQuery.isLoading ? (
            <span className="loading loading-spinner loading-xs" />
          ) : null}
        </div>

        {/* Date range picker (hidden for date-independent tabs) */}
        {needsDateRange ? (
          <div className="card bg-base-100 border border-base-300">
            <div className="card-body py-3">
              <div className="flex flex-wrap items-end gap-3">
                <label className="form-control">
                  <span className="label-text mb-1 text-xs">From</span>
                  <input
                    type="date"
                    className="input input-bordered input-sm"
                    value={localFrom}
                    onChange={(e) => setLocalFrom(e.target.value)}
                  />
                </label>
                <label className="form-control">
                  <span className="label-text mb-1 text-xs">To</span>
                  <input
                    type="date"
                    className="input input-bordered input-sm"
                    value={localTo}
                    onChange={(e) => setLocalTo(e.target.value)}
                  />
                </label>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleApplyDates}
                  disabled={isFetching}
                >
                  {isFetching ? "Loading..." : "Apply"}
                </button>
                <div className="flex gap-1">
                  {[7, 14, 30, 90].map((days) => (
                    <button
                      key={days}
                      className="btn btn-ghost btn-xs"
                      onClick={() => {
                        const to = new Date();
                        const from = new Date();
                        from.setDate(from.getDate() - days);
                        const f = from.toISOString().slice(0, 10);
                        const t = to.toISOString().slice(0, 10);
                        setLocalFrom(f);
                        setLocalTo(t);
                        navigateToGadsDateRange(navigate, f, t);
                      }}
                    >
                      {days}d
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Tab bar */}
        <div role="tablist" className="tabs tabs-bordered">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              className={`tab ${effectiveState.tab === tab.id ? "tab-active" : ""}`}
              onClick={() => navigateToGadsTab(navigate, tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Error */}
        {errorMessage ? (
          <div className="rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error">
            {errorMessage}
          </div>
        ) : null}

        {/* Body */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 p-12">
            <span className="loading loading-spinner loading-md" />
            <span className="text-sm text-base-content/50">
              Loading Google Ads data...
            </span>
          </div>
        ) : effectiveState.tab === "overview" && overviewQuery.data ? (
          <AccountDashboard data={overviewQuery.data} />
        ) : effectiveState.tab === "campaigns" && campaignsQuery.data ? (
          <CampaignTable
            data={campaignsQuery.data}
            budgets={budgetsQuery.data}
            projectId={projectId}
          />
        ) : effectiveState.tab === "ad-groups" && adGroupsQuery.data ? (
          <AdGroupsTable data={adGroupsQuery.data} />
        ) : effectiveState.tab === "ads" && adsQuery.data ? (
          <AdsTable data={adsQuery.data} />
        ) : effectiveState.tab === "search-terms" && searchTermsQuery.data ? (
          <SearchTermsTable
            data={searchTermsQuery.data}
            budgets={budgetsQuery.data}
            projectId={projectId}
          />
        ) : effectiveState.tab === "keywords" && keywordsQuery.data ? (
          <KeywordsTable data={keywordsQuery.data} />
        ) : effectiveState.tab === "negatives" && negativesQuery.data ? (
          <NegativesTable data={negativesQuery.data} />
        ) : effectiveState.tab === "conversions" && conversionsQuery.data ? (
          <ConversionsTable data={conversionsQuery.data} />
        ) : effectiveState.tab === "change-log" ? (
          <ChangeLogTable projectId={projectId} />
        ) : !errorMessage && needsDateRange ? (
          <div className="rounded-lg border border-base-300 p-12 text-center text-base-content/50">
            Select a date range and click Apply to load data.
          </div>
        ) : null}
      </div>
    </div>
  );
}
