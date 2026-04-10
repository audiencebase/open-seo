import type { ConversionActionData } from "./googleAdsTypes";

function statusBadge(status: string) {
  const s = status.toLowerCase();
  if (s === "enabled") return "badge-success";
  if (s === "hidden") return "badge-warning";
  return "badge-ghost";
}

function typeBadge(type: string) {
  const t = type.toLowerCase();
  if (t.includes("website")) return "badge-info";
  if (t.includes("phone")) return "badge-accent";
  if (t.includes("import")) return "badge-secondary";
  return "badge-ghost";
}

export function ConversionsTable({ data }: { data: ConversionActionData }) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-base-300 p-8 text-center text-base-content/50">
        No conversion actions found.
      </div>
    );
  }

  const enabledCount = data.filter(
    (r) => r.status.toLowerCase() === "enabled",
  ).length;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-base-300 bg-base-100 p-3">
        <span className="text-sm font-medium">
          {data.length} conversion action{data.length !== 1 ? "s" : ""}{" "}
        </span>
        <span className="text-xs text-base-content/50">
          ({enabledCount} enabled)
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-base-300">
        <table className="table table-sm">
          <thead>
            <tr>
              <th>Name</th>
              <th className="text-center">Status</th>
              <th className="text-center">Type</th>
              <th>Category</th>
              <th>Counting</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.id} className="hover">
                <td className="max-w-sm truncate font-medium">{row.name}</td>
                <td className="text-center">
                  <span className={`badge badge-sm ${statusBadge(row.status)}`}>
                    {row.status.toLowerCase()}
                  </span>
                </td>
                <td className="text-center">
                  <span className={`badge badge-sm ${typeBadge(row.type)}`}>
                    {row.type
                      .replace(/_/g, " ")
                      .toLowerCase()
                      .replace("upload clicks", "import")}
                  </span>
                </td>
                <td className="text-xs text-base-content/60">
                  {row.category.replace(/_/g, " ").toLowerCase()}
                </td>
                <td className="text-xs text-base-content/60">
                  {row.countingType.replace(/_/g, " ").toLowerCase()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
