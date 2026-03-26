import { useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { getTrafficSources } from "../api";

const COLORS = {
  "Organic Search": "#6366F1",
  Direct: "#22D3EE",
  Social: "#A78BFA",
  Referral: "#F59E0B",
  Email: "#10B981",
  "Paid Search": "#F43F5E",
  Other: "#4B4870",
};

const LABELS = {
  "Organic Search": "Recherche Google",
  Direct: "Acces direct",
  Social: "Reseaux sociaux",
  Referral: "Liens externes",
  Email: "Email",
  "Paid Search": "Publicite",
  Other: "Autre",
};

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;

  const item = payload[0];
  return (
    <div className="donut-tooltip">
      <p className="tooltip-source">{LABELS[item.name] || item.name}</p>
      <p className="tooltip-sessions">
        Sessions : <strong>{item.value.toLocaleString("fr-FR")}</strong>
      </p>
      <p className="tooltip-pct" style={{ color: item.payload.fill }}>
        {item.payload.percentage}% du trafic
      </p>
    </div>
  );
}

export default function TrafficSourcesChart() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchSources() {
      setLoading(true);
      try {
        const json = await getTrafficSources();
        if (cancelled) return;

        const prepared = (json.data || []).map((item) => ({
          ...item,
          fill: COLORS[item.source] || COLORS.Other,
        }));

        setData(prepared);
        setTotal(json.total || 0);
      } catch {
        if (cancelled) return;
        setData([]);
        setTotal(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchSources();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <div className="donut-card">Chargement...</div>;

  return (
    <div className="donut-card">
      <div className="donut-header">
        <h3>Sources de trafic</h3>
        <p>30 derniers jours</p>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="sessions"
            nameKey="source"
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={95}
            paddingAngle={3}
            onMouseEnter={(_, index) => setActive(index)}
            onMouseLeave={() => setActive(null)}
          >
            {data.map((entry, index) => (
              <Cell
                key={entry.source}
                fill={entry.fill}
                opacity={active === null || active === index ? 1 : 0.4}
                stroke="transparent"
              />
            ))}
          </Pie>

          <Tooltip content={<CustomTooltip />} />

          <text
            x="50%"
            y="45%"
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ fontSize: "22px", fontWeight: 700, fill: "#EEF0FF", fontFamily: "var(--font-mono)" }}
          >
            {total.toLocaleString("fr-FR")}
          </text>
          <text
            x="50%"
            y="57%"
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ fontSize: "11px", fill: "#7B78A0" }}
          >
            sessions
          </text>
        </PieChart>
      </ResponsiveContainer>

      <div className="donut-legend">
        {data.map((item, index) => (
          <div
            key={item.source}
            className={`legend-item ${active === index ? "legend-active" : ""}`}
            onMouseEnter={() => setActive(index)}
            onMouseLeave={() => setActive(null)}
          >
            <div className="legend-dot" style={{ background: item.fill }} />
            <span className="legend-label">{LABELS[item.source] || item.source}</span>
            <span className="legend-pct">{item.percentage}%</span>
            <span className="legend-sessions">{item.sessions.toLocaleString("fr-FR")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
