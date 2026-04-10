import type { KeywordData } from "./googleAdsTypes";

function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

function qsBadge(qs: number | null): string {
  if (qs == null) return "badge-ghost";
  if (qs >= 7) return "badge-success";
  if (qs >= 5) return "badge-warning";
  return "badge-error";
}

function matchTypeBadge(matchType: string): string {
  const mt = matchType.toLowerCase();
  if (mt === "exact") return "badge-info";
  if (mt === "phrase") return "badge-accent";
  return "badge-ghost";
}

export function KeywordsTable({ data }: { data: KeywordData }) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-base-300 p-8 text-center text-base-content/50">
        No keyword data found for this date range.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-base-300">
      <table className="table table-sm">
        <thead>
          <tr>
            <th>Keyword</th>
            <th className="text-center">Match</th>
            <th className="text-center">QS</th>
            <th>Campaign</th>
            <th className="text-right">Clicks</th>
            <th className="text-right">Impr.</th>
            <th className="text-right">Avg CPC</th>
            <th className="text-right">Cost</th>
            <th className="text-right">Conv.</th>
            <th className="text-right">CPA</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx} className="hover">
              <td className="max-w-sm truncate font-medium">{row.keyword}</td>
              <td className="text-center">
                <span
                  className={`badge badge-sm ${matchTypeBadge(row.matchType)}`}
                >
                  {row.matchType.toLowerCase()}
                </span>
              </td>
              <td className="text-center">
                {row.qualityScore != null ? (
                  <span className={`badge badge-sm ${qsBadge(row.qualityScore)}`}>
                    {row.qualityScore}/10
                  </span>
                ) : (
                  <span className="text-base-content/30">-</span>
                )}
              </td>
              <td className="max-w-xs truncate text-xs text-base-content/60">
                {row.campaignName}
              </td>
              <td className="text-right font-mono">
                {row.clicks.toLocaleString()}
              </td>
              <td className="text-right font-mono">
                {row.impressions.toLocaleString()}
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
