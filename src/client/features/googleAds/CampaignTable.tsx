import { useMemo, useState } from "react";
import type { CampaignData, CampaignBudgetData } from "./googleAdsTypes";
import {
  useCampaignStatusMutation,
  useBudgetMutation,
} from "./useGoogleAdsData";

type AggregatedCampaign = {
  campaignName: string;
  campaignId: string;
  status: string;
  channelType: string;
  clicks: number;
  impressions: number;
  costUsd: number;
  conversions: number;
  conversionsValue: number;
  ctr: number;
  avgCpc: number;
  cpa: number | null;
};

function aggregateCampaigns(rows: CampaignData): AggregatedCampaign[] {
  const map = new Map<string, AggregatedCampaign>();

  for (const row of rows) {
    const existing = map.get(row.campaignId);
    if (existing) {
      existing.clicks += row.clicks;
      existing.impressions += row.impressions;
      existing.costUsd += row.costUsd;
      existing.conversions += row.conversions;
      existing.conversionsValue += row.conversionsValue;
    } else {
      map.set(row.campaignId, {
        campaignName: row.campaignName,
        campaignId: row.campaignId,
        status: row.status,
        channelType: row.channelType,
        clicks: row.clicks,
        impressions: row.impressions,
        costUsd: row.costUsd,
        conversions: row.conversions,
        conversionsValue: row.conversionsValue,
        ctr: 0,
        avgCpc: 0,
        cpa: null,
      });
    }
  }

  return Array.from(map.values())
    .map((c) => ({
      ...c,
      ctr: c.impressions > 0 ? c.clicks / c.impressions : 0,
      avgCpc: c.clicks > 0 ? c.costUsd / c.clicks : 0,
      cpa: c.conversions > 0 ? c.costUsd / c.conversions : null,
    }))
    .toSorted((a, b) => b.costUsd - a.costUsd);
}

function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatNum(value: number): string {
  return value.toLocaleString();
}

function statusBadge(status: string) {
  const s = status.toLowerCase();
  if (s === "enabled") return "badge-success";
  if (s === "paused") return "badge-warning";
  return "badge-ghost";
}

export function CampaignTable({
  data,
  budgets,
  projectId,
}: {
  data: CampaignData;
  budgets?: CampaignBudgetData;
  projectId: string;
}) {
  const campaigns = useMemo(() => aggregateCampaigns(data), [data]);
  const statusMutation = useCampaignStatusMutation(projectId);
  const budgetMutation = useBudgetMutation(projectId);

  const [editingBudget, setEditingBudget] = useState<{
    budgetId: string;
    campaignId: string;
    value: string;
  } | null>(null);

  const budgetMap = useMemo(() => {
    const map = new Map<string, { budgetId: string; budgetAmountUsd: number }>();
    if (budgets) {
      for (const b of budgets) {
        map.set(b.campaignId, {
          budgetId: b.budgetId,
          budgetAmountUsd: b.budgetAmountUsd,
        });
      }
    }
    return map;
  }, [budgets]);

  const totals = useMemo(() => {
    const t = {
      clicks: 0,
      impressions: 0,
      costUsd: 0,
      conversions: 0,
      conversionsValue: 0,
    };
    for (const c of campaigns) {
      t.clicks += c.clicks;
      t.impressions += c.impressions;
      t.costUsd += c.costUsd;
      t.conversions += c.conversions;
      t.conversionsValue += c.conversionsValue;
    }
    return t;
  }, [campaigns]);

  function handleToggleStatus(campaignId: string, currentStatus: string) {
    const newStatus = currentStatus === "ENABLED" ? "PAUSED" : "ENABLED";
    statusMutation.mutate({ campaignId, newStatus });
  }

  function handleBudgetSave() {
    if (!editingBudget) return;
    const newBudget = parseFloat(editingBudget.value);
    if (isNaN(newBudget) || newBudget <= 0) return;
    budgetMutation.mutate(
      { budgetId: editingBudget.budgetId, newDailyBudgetUsd: newBudget },
      { onSuccess: () => setEditingBudget(null) },
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="Spend" value={formatUsd(totals.costUsd)} />
        <StatCard label="Clicks" value={formatNum(totals.clicks)} />
        <StatCard label="Impressions" value={formatNum(totals.impressions)} />
        <StatCard label="Conversions" value={totals.conversions.toFixed(1)} />
        <StatCard
          label="Avg CPA"
          value={
            totals.conversions > 0
              ? formatUsd(totals.costUsd / totals.conversions)
              : "-"
          }
        />
      </div>

      {/* Mutation status */}
      {statusMutation.isPending ? (
        <div className="rounded-lg border border-info/30 bg-info/10 p-2 text-xs text-info">
          Updating campaign status...
        </div>
      ) : null}
      {statusMutation.isError ? (
        <div className="rounded-lg border border-error/30 bg-error/10 p-2 text-xs text-error">
          Failed to update status. Check API permissions.
        </div>
      ) : null}
      {statusMutation.isSuccess ? (
        <div className="rounded-lg border border-success/30 bg-success/10 p-2 text-xs text-success">
          Campaign {statusMutation.data.newStatus.toLowerCase()} successfully.
        </div>
      ) : null}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-base-300">
        <table className="table table-sm">
          <thead>
            <tr>
              <th>Campaign</th>
              <th className="text-center">Status</th>
              <th className="text-center">Type</th>
              <th className="text-right">Budget/day</th>
              <th className="text-right">Clicks</th>
              <th className="text-right">Impr.</th>
              <th className="text-right">CTR</th>
              <th className="text-right">Avg CPC</th>
              <th className="text-right">Cost</th>
              <th className="text-right">Conv.</th>
              <th className="text-right">CPA</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => {
              const budget = budgetMap.get(c.campaignId);
              const isEditingThisBudget =
                editingBudget?.campaignId === c.campaignId;

              return (
                <tr key={c.campaignId} className="hover">
                  <td className="max-w-xs truncate font-medium">
                    {c.campaignName}
                  </td>
                  <td className="text-center">
                    <span
                      className={`badge badge-sm ${statusBadge(c.status)}`}
                    >
                      {c.status.toLowerCase()}
                    </span>
                  </td>
                  <td className="text-center text-xs text-base-content/60">
                    {c.channelType.replace("_", " ").toLowerCase()}
                  </td>
                  <td className="text-right">
                    {isEditingThisBudget ? (
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          className="input input-bordered input-xs w-20"
                          value={editingBudget.value}
                          onChange={(e) =>
                            setEditingBudget({
                              ...editingBudget,
                              value: e.target.value,
                            })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleBudgetSave();
                            if (e.key === "Escape") setEditingBudget(null);
                          }}
                        />
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={handleBudgetSave}
                          disabled={budgetMutation.isPending}
                        >
                          Save
                        </button>
                      </div>
                    ) : budget ? (
                      <button
                        className="btn btn-ghost btn-xs font-mono"
                        onClick={() =>
                          setEditingBudget({
                            budgetId: budget.budgetId,
                            campaignId: c.campaignId,
                            value: budget.budgetAmountUsd.toFixed(2),
                          })
                        }
                      >
                        {formatUsd(budget.budgetAmountUsd)}
                      </button>
                    ) : (
                      <span className="text-base-content/30">-</span>
                    )}
                  </td>
                  <td className="text-right font-mono">
                    {formatNum(c.clicks)}
                  </td>
                  <td className="text-right font-mono">
                    {formatNum(c.impressions)}
                  </td>
                  <td className="text-right font-mono">{formatPct(c.ctr)}</td>
                  <td className="text-right font-mono">
                    {formatUsd(c.avgCpc)}
                  </td>
                  <td className="text-right font-mono font-medium">
                    {formatUsd(c.costUsd)}
                  </td>
                  <td className="text-right font-mono">
                    {c.conversions.toFixed(1)}
                  </td>
                  <td className="text-right font-mono">
                    {c.cpa != null ? formatUsd(c.cpa) : "-"}
                  </td>
                  <td className="text-center">
                    <button
                      className={`btn btn-xs ${
                        c.status === "ENABLED"
                          ? "btn-warning btn-outline"
                          : "btn-success btn-outline"
                      }`}
                      onClick={() =>
                        handleToggleStatus(c.campaignId, c.status)
                      }
                      disabled={statusMutation.isPending}
                    >
                      {c.status === "ENABLED" ? "Pause" : "Enable"}
                    </button>
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-base-300 bg-base-100 p-3">
      <p className="text-xs text-base-content/50">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
