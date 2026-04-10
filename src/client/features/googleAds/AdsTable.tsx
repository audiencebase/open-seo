import type { AdData } from "./googleAdsTypes";

function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

function adStrengthBadge(strength: string) {
  const s = strength.toLowerCase();
  if (s === "excellent") return "badge-success";
  if (s === "good") return "badge-info";
  if (s === "average") return "badge-warning";
  if (s === "poor") return "badge-error";
  return "badge-ghost";
}

function statusBadge(status: string) {
  const s = status.toLowerCase();
  if (s === "enabled") return "badge-success";
  if (s === "paused") return "badge-warning";
  return "badge-ghost";
}

export function AdsTable({ data }: { data: AdData }) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-base-300 p-8 text-center text-base-content/50">
        No RSA ad data found for this date range.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((ad) => (
        <div
          key={ad.adId}
          className="rounded-lg border border-base-300 bg-base-100 p-4"
        >
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`badge badge-sm ${statusBadge(ad.status)}`}>
              {ad.status.toLowerCase()}
            </span>
            <span
              className={`badge badge-sm ${adStrengthBadge(ad.adStrength)}`}
            >
              {ad.adStrength.replace(/_/g, " ").toLowerCase()}
            </span>
            <span className="text-xs text-base-content/50">
              {ad.campaignName} / {ad.adGroupName}
            </span>
          </div>

          {/* Headlines */}
          <div className="mb-2">
            <p className="text-xs font-medium text-base-content/50 mb-1">
              Headlines ({ad.headlines.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {ad.headlines.map((h, i) => (
                <span
                  key={i}
                  className="rounded-md border border-base-300 bg-base-200 px-2 py-0.5 text-xs"
                >
                  {h}
                </span>
              ))}
            </div>
          </div>

          {/* Descriptions */}
          <div className="mb-3">
            <p className="text-xs font-medium text-base-content/50 mb-1">
              Descriptions ({ad.descriptions.length})
            </p>
            <div className="space-y-1">
              {ad.descriptions.map((d, i) => (
                <p key={i} className="text-xs text-base-content/70">
                  {d}
                </p>
              ))}
            </div>
          </div>

          {/* Metrics row */}
          <div className="flex flex-wrap gap-4 border-t border-base-300 pt-2 text-xs">
            <span>
              <span className="text-base-content/50">Clicks:</span>{" "}
              <span className="font-mono font-medium">
                {ad.clicks.toLocaleString()}
              </span>
            </span>
            <span>
              <span className="text-base-content/50">Impr:</span>{" "}
              <span className="font-mono font-medium">
                {ad.impressions.toLocaleString()}
              </span>
            </span>
            <span>
              <span className="text-base-content/50">CTR:</span>{" "}
              <span className="font-mono font-medium">
                {`${(ad.ctr * 100).toFixed(1)}%`}
              </span>
            </span>
            <span>
              <span className="text-base-content/50">Cost:</span>{" "}
              <span className="font-mono font-medium">
                {formatUsd(ad.costUsd)}
              </span>
            </span>
            <span>
              <span className="text-base-content/50">Conv:</span>{" "}
              <span className="font-mono font-medium">
                {ad.conversions.toFixed(1)}
              </span>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
