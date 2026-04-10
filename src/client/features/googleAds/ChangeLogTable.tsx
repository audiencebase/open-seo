import { useQuery } from "@tanstack/react-query";
import { getGadsChanges } from "@/serverFunctions/googleAds";

type ChangeLogEntry = {
  id: number;
  action: string;
  entityType: string;
  entityId: string;
  entityName: string | null;
  oldValue: string | null;
  newValue: string | null;
  source: string;
  createdAt: string;
};

function actionLabel(action: string): string {
  const labels: Record<string, string> = {
    campaign_status: "Campaign Status",
    budget_update: "Budget Change",
    add_negative: "Add Negative",
    keyword_bid: "Keyword Bid",
  };
  return labels[action] ?? action;
}

function sourceBadge(source: string) {
  if (source === "mcp") return "badge-primary";
  if (source === "ui") return "badge-info";
  return "badge-ghost";
}

function actionBadge(action: string) {
  if (action === "campaign_status") return "badge-warning";
  if (action === "budget_update") return "badge-accent";
  if (action === "add_negative") return "badge-error";
  return "badge-ghost";
}

export function ChangeLogTable({ projectId }: { projectId: string }) {
  const query = useQuery({
    queryKey: ["gadsChangeLog", projectId],
    queryFn: () => getGadsChanges({ data: { projectId } }),
  });

  if (query.isLoading) {
    return (
      <div className="flex items-center justify-center gap-3 p-12">
        <span className="loading loading-spinner loading-md" />
        <span className="text-sm text-base-content/50">Loading change log...</span>
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error">
        Failed to load change log.
      </div>
    );
  }

  const data = (query.data ?? []) as ChangeLogEntry[];

  if (data.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-base-300 bg-base-100 p-3">
          <h3 className="text-sm font-medium">How this works</h3>
          <p className="mt-1 text-xs text-base-content/60">
            Every change made through this dashboard or via Claude MCP is logged
            here. You can see exactly what was changed, when, and by what source
            (UI actions vs Claude/MCP actions).
          </p>
        </div>
        <div className="rounded-lg border border-base-300 p-8 text-center text-base-content/50">
          No changes logged yet. Actions taken on campaigns, budgets, and
          keywords will appear here.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-base-300 bg-base-100 p-3">
        <span className="text-sm font-medium">
          {data.length} action{data.length !== 1 ? "s" : ""} logged
        </span>
        <p className="text-xs text-base-content/50 mt-1">
          All mutations from the UI and Claude MCP are tracked here.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-base-300">
        <table className="table table-sm">
          <thead>
            <tr>
              <th>Time</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Details</th>
              <th className="text-center">Source</th>
            </tr>
          </thead>
          <tbody>
            {data.map((entry) => (
              <tr key={entry.id} className="hover">
                <td className="whitespace-nowrap font-mono text-xs text-base-content/60">
                  {formatTimestamp(entry.createdAt)}
                </td>
                <td>
                  <span
                    className={`badge badge-sm ${actionBadge(entry.action)}`}
                  >
                    {actionLabel(entry.action)}
                  </span>
                </td>
                <td className="text-sm">
                  <span className="text-xs text-base-content/50">
                    {entry.entityType}
                  </span>
                  {entry.entityName ? (
                    <span className="ml-1 font-medium">{entry.entityName}</span>
                  ) : (
                    <span className="ml-1 font-mono text-xs">
                      {entry.entityId}
                    </span>
                  )}
                </td>
                <td className="max-w-xs text-xs">
                  {entry.oldValue && entry.newValue ? (
                    <>
                      <span className="line-through text-base-content/40">
                        {entry.oldValue}
                      </span>
                      <span className="mx-1">-&gt;</span>
                      <span className="font-medium">{entry.newValue}</span>
                    </>
                  ) : entry.newValue ? (
                    <span className="font-medium">{entry.newValue}</span>
                  ) : (
                    <span className="text-base-content/30">-</span>
                  )}
                </td>
                <td className="text-center">
                  <span
                    className={`badge badge-sm ${sourceBadge(entry.source)}`}
                  >
                    {entry.source}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
