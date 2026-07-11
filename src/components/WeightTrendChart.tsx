"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { dedupeDailyWeights } from "@/lib/dataStabilization";
import { formatShortDate } from "@/lib/dates";
import type { WeightEntry } from "@/lib/types";

interface WeightTrendChartProps {
  weights: WeightEntry[];
}

function formatWeightValue(value: number): string {
  return value.toLocaleString("fr-FR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
  });
}

function buildWeightAxis(values: number[]): {
  domain: [number, number];
  ticks: number[];
} {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 0.8);
  const padding = Math.max(0.4, span * 0.25);
  const lower = Math.max(0, Math.floor((min - padding) * 2) / 2);
  const upper = Math.ceil((max + padding) * 2) / 2;
  const rawStep = (upper - lower) / 4;
  const step = Math.max(0.5, Math.ceil(rawStep * 2) / 2);
  const ticks: number[] = [];

  for (let value = lower; value <= upper + 0.001; value += step) {
    ticks.push(Math.round(value * 10) / 10);
  }

  if (ticks[ticks.length - 1] !== upper) {
    ticks.push(upper);
  }

  return { domain: [lower, upper], ticks };
}

export function WeightTrendChart({ weights }: WeightTrendChartProps) {
  const chartData = dedupeDailyWeights(weights)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry) => ({
      date: entry.date,
      label: formatShortDate(entry.date),
      poids: entry.weightKg,
    }));

  if (chartData.length < 2) {
    return (
      <div className="flex min-h-52 items-center justify-center rounded-[22px] border border-dashed border-[#D3CABD] bg-[#FAF8F1] px-5 text-center text-sm leading-6 text-[#7A7166] shadow-[0_8px_20px_rgba(23,21,18,0.035)]">
        Données insuffisantes. Le graphique apparaît après deux mesures.
      </div>
    );
  }

  const values = chartData.map((entry) => entry.poids);
  const weightAxis = buildWeightAxis(values);

  return (
    <div className="w-full rounded-[22px] border border-[#DDD5C7] bg-[#FAF8F1] p-3 shadow-[0_10px_22px_rgba(23,21,18,0.045)]">
      <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#7A7166]">
        <span>Poids (kg)</span>
        <span>
          {formatWeightValue(weightAxis.domain[0])} -{" "}
          {formatWeightValue(weightAxis.domain[1])} kg
        </span>
      </div>
      <div className="h-60">
        <ResponsiveContainer height="100%" width="100%">
          <LineChart
            data={chartData}
            margin={{ bottom: 4, left: 8, right: 12, top: 12 }}
          >
            <CartesianGrid stroke="#C9BFAF" strokeDasharray="2 6" />
            <XAxis
              dataKey="label"
              tick={{ fill: "#7A7166", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "#C9BFAF" }}
            />
            <YAxis
              domain={weightAxis.domain}
              ticks={weightAxis.ticks}
              tick={{ fill: "#7A7166", fontSize: 11 }}
              tickFormatter={(value) => `${formatWeightValue(Number(value))} kg`}
              tickLine={false}
              axisLine={{ stroke: "#C9BFAF" }}
              width={64}
            />
            <Tooltip
              contentStyle={{
                background: "#FAF8F1",
                border: "1px solid #DDD5C7",
                borderRadius: 16,
                boxShadow: "0 10px 22px rgba(23,21,18,0.08)",
                color: "#171512",
              }}
              formatter={(value) => [
                `${formatWeightValue(Number(value))} kg`,
                "Poids",
              ]}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""}
            />
            <Line
              type="monotone"
              dataKey="poids"
              stroke="#3E6670"
              strokeWidth={2}
              dot={{ fill: "#3E6670", r: 3 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
