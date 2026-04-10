import type { AdGroupData } from "./googleAdsTypes";

function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

function statusBadge(status: string) {
  const s = status.toLowerCase();
  if (s === "enabled") return "badge-success";
  if (s === "paused") return "badge-warning";
  return "badge-ghost";
}

export function AdGroupsTable({ data }: { data: AdGroupData }) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-base-300 p-8 text-center text-base-content/50">
        No ad group data found for this date range.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-base-300">
      <table className="table table-sm">
        <thead>
          <tr>
            <th>Ad Group</th>
            <th>Campaign</th>
            <th className="text-center">Status</th>
            <th className="text-right">Clicks</th>
            <th className="text-right">Impr.</th>
            <th className="text-right">CTR</th>
            <th className="text-right">Avg CPC</th>
            <th className="text-right">Cost</th>
            <th className="text-right">Conv.</th>
            <th className="text-right">CPA</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={`${row.adGroupId}-${row.campaignId}`} className="hover">
              <td className="max-w-xs truncate font-medium">
                {row.adGroupName}
              </td>
              <td className="max-w-xs truncate text-xs text-base-content/60">
                {row.campaignName}
              </td>
              <td className="text-center">
                <span className={`badge badge-sm ${statusBadge(row.status)}`}>
                  {row.status.toLowerCase()}
                </span>
              </td>
              <td className="text-right font-mono">
                {row.clicks.toLocaleString()}
              </td>
              <td className="text-right font-mono">
                {row.impressions.toLocaleString()}
              </td>
              <td className="text-right font-mono">
                {`${(row.ctr * 100).toFixed(1)}%`}
              </td>
              <td className="text-right font-mono">{formatUsd(row.avgCpc)}</td>
              <td className="text-right font-mono">{formatUsd(row.costUsd)}</td>
              <td className="text-right font-mono">
                {row.conversions.toFixed(1)}
              </td>
              <td className="text-right font-mono">
                {row.cpa != null ? formatUsd(row.cpa) : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
