import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { AccountSummaryData } from "./googleAdsTypes";

function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

function formatNum(value: number): string {
  return value.toLocaleString();
}

function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function AccountDashboard({ data }: { data: AccountSummaryData }) {
  const totals = useMemo(() => {
    const t = {
      clicks: 0,
      impressions: 0,
      costUsd: 0,
      conversions: 0,
      conversionsValue: 0,
    };
    for (const row of data) {
      t.clicks += row.clicks;
      t.impressions += row.impressions;
      t.costUsd += row.costUsd;
      t.conversions += row.conversions;
      t.conversionsValue += row.conversionsValue;
    }
    return t;
  }, [data]);

  const cpa = totals.conversions > 0 ? totals.costUsd / totals.conversions : null;
  const roas = totals.costUsd > 0 ? totals.conversionsValue / totals.costUsd : null;
  const ctr = totals.impressions > 0 ? totals.clicks / totals.impressions : 0;
  const avgCpc = totals.clicks > 0 ? totals.costUsd / totals.clicks : 0;

  const chartData = useMemo(() => {
    return data.map((row) => ({
      date: row.date,
      Spend: Number(row.costUsd.toFixed(2)),
      Clicks: row.clicks,
      Conversions: Number(row.conversions.toFixed(1)),
    }));
  }, [data]);

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        <KpiCard label="Total Spend" value={formatUsd(totals.costUsd)} />
        <KpiCard label="Clicks" value={formatNum(totals.clicks)} />
        <KpiCard label="Impressions" value={formatNum(totals.impressions)} />
        <KpiCard label="CTR" value={formatPct(ctr)} />
        <KpiCard label="Avg CPC" value={formatUsd(avgCpc)} />
        <KpiCard
          label="Conversions"
          value={totals.conversions.toFixed(1)}
        />
        <KpiCard
          label="CPA"
          value={cpa != null ? formatUsd(cpa) : "-"}
          highlight={cpa != null && cpa > 100}
        />
      </div>

      {roas != null && roas > 0 ? (
        <div className="rounded-lg border border-base-300 bg-base-100 p-3">
          <span className="text-xs text-base-content/50">ROAS</span>
          <span className="ml-2 text-lg font-semibold">{roas.toFixed(2)}x</span>
          <span className="ml-2 text-xs text-base-content/50">
            (${formatNum(Math.round(totals.conversionsValue))} revenue)
          </span>
        </div>
      ) : null}

      {/* Spend + Conversions Trend Chart */}
      {chartData.length > 1 ? (
        <div className="rounded-lg border border-base-300 bg-base-100 p-4">
          <h3 className="mb-3 text-sm font-medium">Performance Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.7 0 0 / 0.2)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(v: string) => v.slice(5)}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11 }}
                tickFormatter={(v: number) => `$${v}`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "oklch(0.2 0 0)",
                  border: "1px solid oklch(0.3 0 0)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="Spend"
                stroke="oklch(0.65 0.2 250)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="Clicks"
                stroke="oklch(0.65 0.15 150)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="Conversions"
                stroke="oklch(0.7 0.2 30)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : null}

      {/* Daily breakdown table */}
      {data.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-base-300">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Date</th>
                <th className="text-right">Spend</th>
                <th className="text-right">Clicks</th>
                <th className="text-right">Impr.</th>
                <th className="text-right">CTR</th>
                <th className="text-right">Avg CPC</th>
                <th className="text-right">Conv.</th>
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((row) => (
                <tr key={row.date} className="hover">
                  <td className="font-mono text-xs">{row.date}</td>
                  <td className="text-right font-mono">{formatUsd(row.costUsd)}</td>
                  <td className="text-right font-mono">{formatNum(row.clicks)}</td>
                  <td className="text-right font-mono">
                    {formatNum(row.impressions)}
                  </td>
                  <td className="text-right font-mono">{formatPct(row.ctr)}</td>
                  <td className="text-right font-mono">{formatUsd(row.avgCpc)}</td>
                  <td className="text-right font-mono">
                    {row.conversions.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function KpiCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        highlight
          ? "border-warning/30 bg-warning/5"
          : "border-base-300 bg-base-100"
      }`}
    >
      <p className="text-xs text-base-content/50">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
