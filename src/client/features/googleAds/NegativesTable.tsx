import type { NegativeKeywordData } from "./googleAdsTypes";

function matchTypeBadge(matchType: string): string {
  const mt = matchType.toLowerCase();
  if (mt === "exact") return "badge-info";
  if (mt === "phrase") return "badge-accent";
  return "badge-ghost";
}

export function NegativesTable({ data }: { data: NegativeKeywordData }) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-base-300 p-8 text-center text-base-content/50">
        No negative keywords found.
      </div>
    );
  }

  // Group by campaign
  const byCampaign = new Map<string, typeof data>();
  for (const row of data) {
    const key = row.campaignName || "Unknown Campaign";
    const existing = byCampaign.get(key) ?? [];
    existing.push(row);
    byCampaign.set(key, existing);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-base-300 bg-base-100 p-3">
        <span className="text-sm font-medium">
          {data.length} negative keyword{data.length !== 1 ? "s" : ""} across{" "}
          {byCampaign.size} campaign{byCampaign.size !== 1 ? "s" : ""}
        </span>
      </div>

      {Array.from(byCampaign.entries()).map(([campaignName, keywords]) => (
        <div
          key={campaignName}
          className="rounded-lg border border-base-300 bg-base-100"
        >
          <div className="border-b border-base-300 px-4 py-2">
            <h3 className="text-sm font-medium">{campaignName}</h3>
            <p className="text-xs text-base-content/50">
              {keywords.length} negative{keywords.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Keyword</th>
                  <th className="text-center">Match Type</th>
                </tr>
              </thead>
              <tbody>
                {keywords.map((row) => (
                  <tr key={row.criterionId} className="hover">
                    <td className="font-mono text-sm">{row.keyword}</td>
                    <td className="text-center">
                      <span
                        className={`badge badge-sm ${matchTypeBadge(row.matchType)}`}
                      >
                        {row.matchType.toLowerCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
