import { useState } from "react";
import type { SearchTermData, CampaignBudgetData } from "./googleAdsTypes";
import { useAddNegativeMutation } from "./useGoogleAdsData";

function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function SearchTermsTable({
  data,
  budgets,
  projectId,
}: {
  data: SearchTermData;
  budgets?: CampaignBudgetData;
  projectId: string;
}) {
  const addNegativeMutation = useAddNegativeMutation(projectId);
  const [addingNegative, setAddingNegative] = useState<{
    searchTerm: string;
    campaignId: string;
    matchType: "BROAD" | "PHRASE" | "EXACT";
  } | null>(null);

  // Build campaign name -> id map from budgets (which has campaign data)
  const campaignIdMap = new Map<string, string>();
  if (budgets) {
    for (const b of budgets) {
      campaignIdMap.set(b.campaignName, b.campaignId);
    }
  }

  function handleAddNegative(searchTerm: string, campaignName: string) {
    const campaignId = campaignIdMap.get(campaignName);
    if (!campaignId) return;
    setAddingNegative({
      searchTerm,
      campaignId,
      matchType: "EXACT",
    });
  }

  function confirmAddNegative() {
    if (!addingNegative) return;
    addNegativeMutation.mutate(
      {
        campaignId: addingNegative.campaignId,
        keywordText: addingNegative.searchTerm,
        matchType: addingNegative.matchType,
      },
      { onSuccess: () => setAddingNegative(null) },
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-base-300 p-8 text-center text-base-content/50">
        No search terms found for this date range.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Add Negative confirmation */}
      {addingNegative ? (
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-3">
          <p className="text-sm font-medium">
            Add &quot;{addingNegative.searchTerm}&quot; as negative keyword?
          </p>
          <div className="mt-2 flex items-center gap-2">
            <select
              className="select select-bordered select-xs"
              value={addingNegative.matchType}
              onChange={(e) =>
                setAddingNegative({
                  ...addingNegative,
                  matchType: e.target.value as "BROAD" | "PHRASE" | "EXACT",
                })
              }
            >
              <option value="EXACT">Exact</option>
              <option value="PHRASE">Phrase</option>
              <option value="BROAD">Broad</option>
            </select>
            <button
              className="btn btn-warning btn-xs"
              onClick={confirmAddNegative}
              disabled={addNegativeMutation.isPending}
            >
              {addNegativeMutation.isPending ? "Adding..." : "Confirm"}
            </button>
            <button
              className="btn btn-ghost btn-xs"
              onClick={() => setAddingNegative(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {addNegativeMutation.isSuccess ? (
        <div className="rounded-lg border border-success/30 bg-success/10 p-2 text-xs text-success">
          Negative keyword added successfully.
        </div>
      ) : null}
      {addNegativeMutation.isError ? (
        <div className="rounded-lg border border-error/30 bg-error/10 p-2 text-xs text-error">
          Failed to add negative keyword. Check API permissions.
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-base-300">
        <table className="table table-sm">
          <thead>
            <tr>
              <th>Search Term</th>
              <th>Campaign</th>
              <th>Ad Group</th>
              <th className="text-right">Clicks</th>
              <th className="text-right">Impr.</th>
              <th className="text-right">CTR</th>
              <th className="text-right">Cost</th>
              <th className="text-right">Conv.</th>
              <th className="text-right">CPA</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => {
              const hasCampaignId = campaignIdMap.has(row.campaignName);
              const isWastedSpend =
                row.costUsd > 0 && row.conversions === 0 && row.clicks >= 3;

              return (
                <tr
                  key={idx}
                  className={`hover ${isWastedSpend ? "bg-error/5" : ""}`}
                >
                  <td className="max-w-sm truncate font-medium">
                    {row.searchTerm}
                  </td>
                  <td className="max-w-xs truncate text-xs text-base-content/60">
                    {row.campaignName}
                  </td>
                  <td className="max-w-xs truncate text-xs text-base-content/60">
                    {row.adGroupName}
                  </td>
                  <td className="text-right font-mono">
                    {row.clicks.toLocaleString()}
                  </td>
                  <td className="text-right font-mono">
                    {row.impressions.toLocaleString()}
                  </td>
                  <td className="text-right font-mono">{formatPct(row.ctr)}</td>
                  <td className="text-right font-mono">
                    {formatUsd(row.costUsd)}
                  </td>
                  <td className="text-right font-mono">
                    {row.conversions.toFixed(1)}
                  </td>
                  <td className="text-right font-mono">
                    {row.cpa != null ? formatUsd(row.cpa) : "-"}
                  </td>
                  <td className="text-center">
                    {hasCampaignId ? (
                      <button
                        className="btn btn-ghost btn-xs text-error"
                        onClick={() =>
                          handleAddNegative(row.searchTerm, row.campaignName)
                        }
                        title="Add as negative keyword"
                      >
                        Neg
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
