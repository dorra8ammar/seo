import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getTraffic } from "../api";
import { formatDate } from "../utils/formatDate";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="custom-tooltip">
      <p className="tooltip-date">{label}</p>
      <p className="tooltip-sessions">
        Sessions : <strong>{payload[0]?.value?.toLocaleString("fr-FR")}</strong>
      </p>
      <p className="tooltip-users">
        Utilisateurs : <strong>{payload[1]?.value?.toLocaleString("fr-FR")}</strong>
      </p>
    </div>
  );
}

export default function TrafficChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("30");

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError("");

      try {
        const response = await getTraffic(period);
        if (cancelled) return;

        const formatted = (response?.data || []).map((item) => ({
          ...item,
          date: formatDate(item.date),
        }));

        setData(formatted);
      } catch {
        if (cancelled) return;
        setError("Erreur de chargement des donnees");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [period]);

  if (loading) return <div className="chart-card">Chargement...</div>;
  if (error) return <div className="chart-card message error">{error}</div>;

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <h3>Evolution du trafic</h3>
          <p>Sessions et utilisateurs actifs</p>
        </div>

        <div className="period-selector">
          {["7", "30", "90"].map((value) => (
            <button
              key={value}
              type="button"
              className={period === value ? "active" : ""}
              onClick={() => setPeriod(value)}
            >
              {value}j
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="gradSessions" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradUsers" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#22D3EE" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#1C1A30" />
          <XAxis
            dataKey="date"
            stroke="#4B4870"
            tick={{ fontSize: 11, fill: "#7B78A0" }}
            tickLine={false}
          />
          <YAxis
            stroke="#4B4870"
            tick={{ fontSize: 11, fill: "#7B78A0" }}
            tickLine={false}
            tickFormatter={(value) => (value >= 1000 ? `${Math.round(value / 100) / 10}k` : value)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: "12px", color: "#7B78A0" }} />

          <Area
            type="monotone"
            dataKey="sessions"
            name="Sessions"
            stroke="#6366F1"
            strokeWidth={2.5}
            fill="url(#gradSessions)"
            dot={false}
            activeDot={{ r: 5, fill: "#6366F1" }}
          />
          <Area
            type="monotone"
            dataKey="users"
            name="Utilisateurs"
            stroke="#22D3EE"
            strokeWidth={2}
            strokeDasharray="5 3"
            fill="url(#gradUsers)"
            dot={false}
            activeDot={{ r: 5, fill: "#22D3EE" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
