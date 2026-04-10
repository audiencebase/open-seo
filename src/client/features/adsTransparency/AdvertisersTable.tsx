import { useState } from "react";
import { Bookmark, Eye } from "lucide-react";
import type { AdvertiserData } from "./adsTransparencyTypes";

type AdvertiserRow = AdvertiserData[number];

export function AdvertisersTable({
  advertisers,
  savedIds,
  onViewAds,
  onSave,
}: {
  advertisers: AdvertiserData;
  savedIds: Set<string>;
  onViewAds: (advertiserIds: string[]) => void;
  onSave: (advertiser: AdvertiserRow) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 25) {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAll() {
    if (selected.size > 0) {
      setSelected(new Set());
    } else {
      const ids = advertisers
        .flatMap((a) => getSelectableIds(a))
        .slice(0, 25);
      setSelected(new Set(ids));
    }
  }

  const selectedIds = Array.from(selected);

  return (
    <div className="space-y-3">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-base-content/60">
          {advertisers.length} advertiser{advertisers.length !== 1 ? "s" : ""} found
          {selected.size > 0
            ? ` (${selected.size} selected, max 25)`
            : ""}
        </span>
        {selected.size > 0 ? (
          <button
            className="btn btn-primary btn-sm gap-2"
            onClick={() => onViewAds(selectedIds)}
          >
            <Eye className="size-4" />
            View Ads ({selected.size})
          </button>
        ) : null}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-base-300">
        <table className="table table-sm">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={selected.size > 0}
                  onChange={toggleAll}
                />
              </th>
              <th>Advertiser</th>
              <th>ID</th>
              <th className="text-center">Verified</th>
              <th className="text-right">Ads</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {advertisers.map((item, idx) => {
              const mainId = item.advertiserId;
              const isMultiAccount = item.type === "ads_multi_account_advertiser";
              const isDomain = item.type === "ads_domain";

              if (isDomain) {
                return (
                  <tr key={`domain-${idx}`} className="hover">
                    <td />
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="badge badge-ghost badge-sm">
                          domain
                        </span>
                        <span>{item.domain}</span>
                      </div>
                    </td>
                    <td className="text-base-content/50">-</td>
                    <td />
                    <td />
                    <td />
                  </tr>
                );
              }

              if (isMultiAccount && item.childAdvertisers.length > 0) {
                return item.childAdvertisers.map((child, childIdx) => {
                  const childId = child.advertiserId;
                  return (
                    <tr key={`multi-${idx}-${childIdx}`} className="hover">
                      <td>
                        {childId ? (
                          <input
                            type="checkbox"
                            className="checkbox checkbox-sm"
                            checked={selected.has(childId)}
                            onChange={() => toggleSelected(childId)}
                          />
                        ) : null}
                      </td>
                      <td>
                        <div>
                          <span className="font-medium">
                            {item.advertiserName}
                          </span>
                          {item.childAdvertisers.length > 1 ? (
                            <span className="ml-2 badge badge-ghost badge-sm">
                              sub-account {childIdx + 1}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="font-mono text-xs text-base-content/60">
                        {childId ?? "-"}
                      </td>
                      <td className="text-center">
                        {child.verified ? (
                          <span className="badge badge-success badge-sm">
                            Verified
                          </span>
                        ) : (
                          <span className="badge badge-ghost badge-sm">
                            No
                          </span>
                        )}
                      </td>
                      <td className="text-right font-mono">
                        {child.adsCount?.toLocaleString() ?? "-"}
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {childId ? (
                            <>
                              <button
                                className="btn btn-ghost btn-xs"
                                title="View this advertiser's ads"
                                onClick={() => onViewAds([childId])}
                              >
                                <Eye className="size-3.5" />
                              </button>
                              <button
                                className={`btn btn-ghost btn-xs ${savedIds.has(childId) ? "text-warning" : ""}`}
                                title="Save advertiser"
                                onClick={() =>
                                  onSave({
                                    ...item,
                                    advertiserId: childId,
                                    verified: child.verified,
                                    adsCount: child.adsCount,
                                  })
                                }
                              >
                                <Bookmark className="size-3.5" />
                              </button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                });
              }

              return (
                <tr key={`single-${idx}`} className="hover">
                  <td>
                    {mainId ? (
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={selected.has(mainId)}
                        onChange={() => toggleSelected(mainId)}
                      />
                    ) : null}
                  </td>
                  <td className="font-medium">{item.advertiserName ?? "-"}</td>
                  <td className="font-mono text-xs text-base-content/60">
                    {mainId ?? "-"}
                  </td>
                  <td className="text-center">
                    {item.verified ? (
                      <span className="badge badge-success badge-sm">
                        Verified
                      </span>
                    ) : (
                      <span className="badge badge-ghost badge-sm">No</span>
                    )}
                  </td>
                  <td className="text-right font-mono">
                    {item.adsCount?.toLocaleString() ?? "-"}
                  </td>
                  <td className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {mainId ? (
                        <>
                          <button
                            className="btn btn-ghost btn-xs"
                            title="View this advertiser's ads"
                            onClick={() => onViewAds([mainId])}
                          >
                            <Eye className="size-3.5" />
                          </button>
                          <button
                            className={`btn btn-ghost btn-xs ${savedIds.has(mainId) ? "text-warning" : ""}`}
                            title="Save advertiser"
                            onClick={() => onSave(item)}
                          >
                            <Bookmark className="size-3.5" />
                          </button>
                        </>
                      ) : null}
                    </div>
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

function getSelectableIds(item: AdvertiserRow): string[] {
  if (item.type === "ads_domain") return [];
  if (
    item.type === "ads_multi_account_advertiser" &&
    item.childAdvertisers.length > 0
  ) {
    return item.childAdvertisers
      .map((c) => c.advertiserId)
      .filter((id): id is string => id != null);
  }
  return item.advertiserId ? [item.advertiserId] : [];
}
