import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getStats, getWeeklyStats, getHeatmap } from "../services/endpoints";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  ArcElement, Tooltip, Legend
} from "chart.js";
import { Clock, CheckCircle, Flame, BookOpen } from "lucide-react";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const CHART_OPTS = {
  plugins: { legend: { display: false }, tooltip: { backgroundColor: "#111827", titleColor: "#f1f5f9", bodyColor: "#94a3b8", borderColor: "rgba(16,185,129,0.2)", borderWidth: 1 } },
  scales:  { x: { grid: { color: "rgba(255,255,255,0.03)" }, ticks: { color: "#64748b" } }, y: { grid: { color: "rgba(255,255,255,0.03)" }, ticks: { color: "#64748b" }, beginAtZero: true } },
  maintainAspectRatio: false,
};

export default function Progress() {
  const [stats,     setStats]     = useState(null);
  const [weekly,    setWeekly]    = useState([]);
  const [heatmap,   setHeatmap]   = useState({});

  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, w, h] = await Promise.allSettled([
          getStats(), getWeeklyStats(), getHeatmap(),
        ]);
        if (s.status === "fulfilled") setStats(s.value.data.data);
        if (w.status === "fulfilled") setWeekly(w.value.data.data || []);
        if (h.status === "fulfilled") setHeatmap(h.value.data.data || {});
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}><div className="spinner" /></div>;

  const barData = {
    labels:   weekly.map(d => d.day),
    datasets: [{
      data:            weekly.map(d => d.hours),
      backgroundColor: weekly.map(d => d.hours > 0 ? "rgba(16,185,129,0.7)" : "rgba(255,255,255,0.05)"),
      borderColor:     "rgba(16,185,129,1)",
      borderWidth:     1,
      borderRadius:    6,
    }],
  };

  const donutData = stats?.subject_stats?.length > 0 ? {
    labels:   stats.subject_stats.map(s => s.name),
    datasets: [{
      data:            stats.subject_stats.map(s => s.completion || 0),
      backgroundColor: stats.subject_stats.map(s => s.color || "#10b981"),
      borderColor:     "var(--bg-elevated)",
      borderWidth:     3,
    }],
  } : null;

  // Build 90-day grid for heatmap
  const today   = new Date();
  const grid    = Array.from({ length: 90 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (89 - i));
    const key = d.toISOString().split("T")[0];
    return { date: key, hours: heatmap[key] || 0 };
  });

  const getHeatColor = (h) => {
    if (h === 0)  return "rgba(255,255,255,0.04)";
    if (h < 1)    return "rgba(16,185,129,0.25)";
    if (h < 2)    return "rgba(16,185,129,0.45)";
    if (h < 4)    return "rgba(16,185,129,0.7)";
    return "rgba(16,185,129,0.95)";
  };

  return (
    <div className="page-content">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: "1.6rem", fontFamily: "var(--font-display)", fontWeight: 700 }}>Progress</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: 4, fontSize: "0.9rem" }}>Track your study performance and analytics</p>
      </div>

      {/* Stat cards */}
      {stats && (
        <div className="grid-4" style={{ marginBottom: 24 }}>
          {[
            { label: "Total Hours",     value: `${stats.total_hours}h`,   icon: <Clock size={20} />,        color: "#10b981", bg: "rgba(16,185,129,0.12)" },
            { label: "Tasks Completed", value: stats.done_tasks,           icon: <CheckCircle size={20} />,  color: "#10b981", bg: "rgba(16,185,129,0.12)" },
            { label: "Overall Progress",value: `${stats.completion_pct}%`, icon: <Flame size={20} />,        color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },

          ].map((s, i) => (
            <motion.div key={i} className="stat-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <div className="stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
              <div>
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Weekly Bar Chart */}
        <motion.div className="card" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
          <h2 className="section-title" style={{ marginBottom: 20 }}>Weekly Study Hours</h2>
          <div style={{ height: 180 }}>
            <Bar data={barData} options={CHART_OPTS} />
          </div>
        </motion.div>

        {/* Subject Donut */}
        <motion.div className="card" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
          <h2 className="section-title" style={{ marginBottom: 20 }}>Subject Completion</h2>
          {donutData ? (
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <div style={{ height: 160, width: 160, flexShrink: 0 }}>
                <Doughnut data={donutData} options={{ ...CHART_OPTS, cutout: "70%", maintainAspectRatio: false, plugins: { ...CHART_OPTS.plugins, legend: { display: false } } }} />
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                {stats?.subject_stats?.map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: "0.8rem" }}>{s.name}</span>
                    <span style={{ fontSize: "0.8rem", fontWeight: 600, color: s.color }}>{s.completion}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: "30px 0" }}>
              <div className="empty-desc">No subjects to display yet</div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Activity Heatmap */}
      <motion.div className="card" style={{ marginBottom: 24 }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <h2 className="section-title" style={{ marginBottom: 16 }}>Study Activity (Last 90 days)</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
          {grid.map((d, i) => (
            <div
              key={i}
              title={`${d.date}: ${d.hours}h`}
              style={{
                width: 12, height: 12, borderRadius: 3,
                background: getHeatColor(d.hours),
                transition: "transform 0.15s",
                cursor: "default",
              }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.3)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            />
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, fontSize: "0.72rem", color: "var(--text-muted)" }}>
          <span>Less</span>
          {[0, 0.5, 1.5, 3, 5].map(h => (
            <div key={h} style={{ width: 12, height: 12, borderRadius: 3, background: getHeatColor(h) }} />
          ))}
          <span>More</span>
        </div>
      </motion.div>


    </div>
  );
}
