"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HilalObservation } from "@/lib/api";

/**
 * The "Around sunset" trajectory chart, split out so recharts can be loaded on
 * demand.
 *
 * recharts is 90.5 kB gzipped - by a wide margin the largest single dependency
 * in the app, and it was in the initial payload of the busiest page for one
 * component that sits below the verdict, the observational numbers and the
 * criterion comparison.
 *
 * Splitting it is only safe because the same series is already rendered as a
 * table beside this chart. Nothing is withheld while the chunk loads: the
 * numbers are on the page either way, and the picture arrives when it arrives.
 */
export default function TrajectoryChart({ obs }: { obs: HilalObservation }) {
  return (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={obs.trajectory}
                margin={{ top: 4, right: 12, bottom: 0, left: -12 }}
                // Recharts 3's built-in keyboard layer: arrow keys walk the
                // series and each point is announced. Without it the chart is
                // an unlabelled SVG carrying data that appears nowhere else on
                // the page.
                accessibilityLayer
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} vertical={false} />
                <XAxis
                  dataKey="minutes_from_sunset"
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}m`}
                  stroke="#94a3b8"
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  tickFormatter={(v) => `${v}°`}
                  stroke="#94a3b8"
                  width={40}
                />
                <ReferenceLine x={0} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: "Sunset", fontSize: 11, fill: "#94a3b8", position: "top" }} />
                <Tooltip
                  formatter={(value, name) => [`${Number(value).toFixed(2)}°`, name]}
                  labelFormatter={(v) => `${Number(v) > 0 ? "+" : ""}${v} min from sunset`}
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 8, fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="moon_altitude_deg"
                  name="Moon altitude"
                  stroke="#4fb3a6"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="elongation_deg"
                  name="Elongation"
                  stroke="#d9a83e"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
  );
}
