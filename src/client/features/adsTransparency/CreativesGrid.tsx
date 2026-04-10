import { Bookmark, ExternalLink } from "lucide-react";
import type { CreativeData } from "./adsTransparencyTypes";

type CreativeRow = CreativeData[number];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatBadge(format: string | null): string {
  if (!format) return "unknown";
  return format;
}

export function CreativesGrid({
  creatives,
  savedIds,
  onSave,
}: {
  creatives: CreativeData;
  savedIds: Set<string>;
  onSave: (creative: CreativeRow) => void;
}) {
  if (creatives.length === 0) {
    return (
      <div className="rounded-lg border border-base-300 p-8 text-center text-base-content/50">
        No ad creatives found.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <span className="text-sm text-base-content/60">
        {creatives.length} creative{creatives.length !== 1 ? "s" : ""} found
      </span>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {creatives.map((creative, idx) => (
          <CreativeCard
            key={creative.creativeId ?? idx}
            creative={creative}
            isSaved={
              creative.creativeId
                ? savedIds.has(creative.creativeId)
                : false
            }
            onSave={() => onSave(creative)}
          />
        ))}
      </div>
    </div>
  );
}

function CreativeCard({
  creative,
  isSaved,
  onSave,
}: {
  creative: CreativeRow;
  isSaved: boolean;
  onSave: () => void;
}) {
  const transparencyUrl = creative.url;

  return (
    <div className="card bg-base-100 border border-base-300 overflow-hidden">
      {/* Preview image */}
      {creative.previewImageUrl ? (
        <figure className="bg-base-200 p-2">
          <img
            src={creative.previewImageUrl}
            alt="Ad preview"
            className="w-full rounded object-contain"
            style={{
              maxHeight: "200px",
            }}
            loading="lazy"
          />
        </figure>
      ) : (
        <div className="flex h-24 items-center justify-center bg-base-200 text-sm text-base-content/40">
          No preview available
        </div>
      )}

      <div className="card-body gap-2 p-4">
        {/* Title + format */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-medium line-clamp-2">
            {creative.title ?? "Unknown Advertiser"}
          </h3>
          <span
            className={`badge badge-sm shrink-0 ${
              creative.format === "text"
                ? "badge-info"
                : creative.format === "image"
                  ? "badge-success"
                  : creative.format === "video"
                    ? "badge-warning"
                    : "badge-ghost"
            }`}
          >
            {formatBadge(creative.format)}
          </span>
        </div>

        {/* Dates */}
        <div className="flex items-center gap-3 text-xs text-base-content/50">
          <span>First: {formatDate(creative.firstShown)}</span>
          <span>Last: {formatDate(creative.lastShown)}</span>
        </div>

        {/* Verified */}
        {creative.verified ? (
          <span className="badge badge-success badge-sm">Verified</span>
        ) : null}

        {/* Actions */}
        <div className="card-actions mt-2 justify-end">
          <button
            className={`btn btn-ghost btn-xs gap-1 ${isSaved ? "text-warning" : ""}`}
            onClick={onSave}
          >
            <Bookmark className="size-3.5" />
            {isSaved ? "Saved" : "Save"}
          </button>
          {transparencyUrl ? (
            <a
              href={transparencyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-xs gap-1"
            >
              <ExternalLink className="size-3.5" />
              View
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
