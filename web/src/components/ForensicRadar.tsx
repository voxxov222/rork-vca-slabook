import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";

const CYAN = "#3D6BE8";
const ICE = "#E8394A";

export interface ForensicSubgrades {
  centering: number;
  corners: number;
  edges: number;
  surface: number;
  print: number;
}

interface ForensicRadarProps {
  subgrades: ForensicSubgrades;
}

/**
 * Visual summary of the five forensic grading categories (centering, corners,
 * edges, surface, print) as an interactive radar chart on the 10-point scale.
 * Domain is clamped to 5–10 so real grading resolution stays readable.
 */
export default function ForensicRadar({ subgrades }: ForensicRadarProps) {
  const data = [
    { category: "Centering", score: subgrades.centering },
    { category: "Corners", score: subgrades.corners },
    { category: "Edges", score: subgrades.edges },
    { category: "Surface", score: subgrades.surface },
    { category: "Print", score: subgrades.print },
  ];

  return (
    <div className="h-64 w-full sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="74%">
          <PolarGrid stroke="rgba(96,130,230,0.16)" />
          <PolarAngleAxis
            dataKey="category"
            tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700 }}
          />
          <PolarRadiusAxis domain={[5, 10]} tickCount={6} tick={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              background: "rgba(9,13,22,0.95)",
              border: "1px solid rgba(61,107,232,0.3)",
              borderRadius: 12,
              fontSize: 12,
              color: "#fff",
            }}
            formatter={(value: number | string) => [`${Number(value).toFixed(1)} / 10`, "Subgrade"]}
          />
          <Radar
            dataKey="score"
            stroke={CYAN}
            fill={CYAN}
            fillOpacity={0.32}
            strokeWidth={2}
            dot={{ r: 3, fill: ICE, stroke: CYAN, strokeWidth: 1 }}
            isAnimationActive
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
