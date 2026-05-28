import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getTodayTasks, getStats, getWeeklyStats,
  markTaskDone, getMotivation, getPriority
} from "../services/endpoints";
import { BookOpen, Clock, CheckCircle, Zap, ArrowRight, Flame } from "lucide-react";
import toast from "react-hot-toast";

// ── Skeleton shimmer component ──────────────────────────────────────────────
const Skeleton = ({ width = "100%", height = 20, radius = 8, style = {} }) => (
  <div className="skeleton" style={{ width, height, borderRadius: radius, ...style }} />
);

export default function Dashboard() {
  const { dbUser, firebaseUser } = useAuth();
  const [tasks,      setTasks]      = useState([]);
  const [stats,      setStats]      = useState(null);
  const [weekly,     setWeekly]     = useState([]);
  const [motivation, setMotivation] = useState(null);
  const [priority,   setPriority]   = useState([]);

  // Separate loading states — fast vs slow
  const [fastLoading, setFastLoading] = useState(true);
  const [aiLoading,   setAiLoading]   = useState(true);

  const name = dbUser?.name || firebaseUser?.displayName || "Student";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Phase 1: Fast data — tasks, stats, weekly chart (DB only, instant)
  useEffect(() => {
    Promise.allSettled([
      getTodayTasks(),
      getStats(),
      getWeeklyStats(),
    ]).then(([t, s, w]) => {
      if (t.status === "fulfilled") setTasks(t.value.data.data  || []);
      if (s.status === "fulfilled") setStats(s.value.data.data  || null);
      if (w.status === "fulfilled") setWeekly(w.value.data.data || []);
      setFastLoading(false);
    });
  }, []);

  // Phase 2: Slow AI calls — load after fast data, non-blocking
  useEffect(() => {
    Promise.allSettled([
      getMotivation(),
      getPriority(),
    ]).then(([m, p]) => {
      if (m.status === "fulfilled") setMotivation(m.value.data.data);
      if (p.status === "fulfilled") setPriority(p.value.data.data?.slice(0, 3) || []);
      setAiLoading(false);
    });
  }, []);

  const handleToggleTask = async (task) => {
    try {
      await markTaskDone(task.id, !task.is_done);
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_done: !t.is_done } : t));
      if (!task.is_done) toast.success("Task completed! 🎉");
    } catch { toast.error("Failed to update task"); }
  };

  const maxHours = Math.max(...weekly.map(d => d.hours), 1);

  return (
    <div className="page-content">
      {/* Header — always instant */}
      <div style={{ marginBottom: 28 }}>
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ fontSize: "1.75rem", fontFamily: "var(--font-display)", fontWeight: 700 }}
        >
          {greeting}, {name.split(" ")[0]} 👋
        </motion.h1>
        <p style={{ color: "var(--text-secondary)", marginTop: 4 }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* Motivation banner — skeleton while AI loads */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="card"
        style={{
          marginBottom: 24,
          background: "linear-gradient(135deg, rgba(16,185,129,0.10), rgba(45,212,191,0.07))",
          borderColor: "rgba(16,185,129,0.2)",
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "16px 24px",
          minHeight: 68,
        }}
      >
        <span style={{ fontSize: "1.5rem", flexShrink: 0 }}>💡</span>
        {aiLoading ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            <Skeleton height={14} width="70%" />
            <Skeleton height={10} width="25%" />
          </div>
        ) : motivation ? (
          <div>
            <p style={{ fontStyle: "italic", color: "var(--text-primary)", fontSize: "0.95rem" }}>
              "{motivation.quote}"
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", marginTop: 4 }}>
              — {motivation.author}
            </p>
          </div>
        ) : (
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Stay focused. Every minute of studying compounds.
          </p>
        )}
      </motion.div>

      {/* Stat cards — skeleton while fast data loads */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        {fastLoading ? (
          [0,1,2,3].map(i => (
            <div key={i} className="stat-card">
              <Skeleton width={48} height={48} radius={10} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                <Skeleton height={28} width="55%" />
                <Skeleton height={12} width="80%" />
              </div>
            </div>
          ))
        ) : stats ? (
          [
            { label: "Tasks Done Today",  value: `${tasks.filter(t=>t.is_done).length}/${tasks.length}`, icon: <CheckCircle size={22} />, color: "#10b981", bg: "rgba(16,185,129,0.12)" },
            { label: "Hours Studied",     value: `${stats.total_hours}h`,   icon: <Clock size={22} />,       color: "var(--primary-light)", bg: "rgba(16,185,129,0.12)" },
            { label: "Subjects Tracked",  value: stats.subject_stats?.length || 0, icon: <BookOpen size={22} />, color: "var(--accent-light)", bg: "rgba(45,212,191,0.12)" },
            { label: "Overall Progress",  value: `${stats.completion_pct}%`, icon: <Flame size={22} />,      color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
          ].map((s, i) => (
            <motion.div
              key={i}
              className="stat-card"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <div className="stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
              <div>
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </motion.div>
          ))
        ) : null}
      </div>

      <div className="grid-2" style={{ gap: 24 }}>
        {/* Today's Tasks */}
        <motion.div
          className="card"
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="section-header">
            <h2 className="section-title">Today's Tasks</h2>
            <Link to="/planner" style={{ fontSize: "0.8rem", color: "var(--primary-light)", display: "flex", alignItems: "center", gap: 4 }}>
              View all <ArrowRight size={13} />
            </Link>
          </div>

          {fastLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "var(--bg-elevated)", borderRadius: 8, border: "1px solid var(--border)" }}>
                  <Skeleton width={20} height={20} radius={6} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                    <Skeleton height={13} width="60%" />
                    <Skeleton height={10} width="40%" />
                  </div>
                </div>
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="empty-state" style={{ padding: "30px 0" }}>
              <div className="empty-icon">📭</div>
              <div className="empty-title">No tasks for today</div>
              <div className="empty-desc">Generate a study plan to get started</div>
              <Link to="/planner" className="btn btn-primary" style={{ marginTop: 12, fontSize: "0.85rem" }}>
                Generate Plan
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {tasks.map(task => (
                <div key={task.id} className={`task-item ${task.is_done ? "done" : ""}`}>
                  <div
                    className={`task-checkbox ${task.is_done ? "checked" : ""}`}
                    onClick={() => handleToggleTask(task)}
                  >
                    {task.is_done && <span style={{ color: "#fff", fontSize: "0.7rem" }}>✓</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.875rem", fontWeight: 500, color: task.is_done ? "var(--text-muted)" : "var(--text-primary)", textDecoration: task.is_done ? "line-through" : "none" }}>
                      {task.subject_name}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{task.focus}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: task.subject_color || "var(--primary)" }} />
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{task.duration_hours}h</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Weekly Chart + AI Priority */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Weekly bar chart */}
          <motion.div
            className="card"
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="section-header">
              <h2 className="section-title">This Week</h2>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Study hours</span>
            </div>
            {fastLoading ? (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 80 }}>
                {[0.4, 0.7, 0.3, 0.9, 0.5, 0.2, 0.6].map((h, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%" }}>
                    <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
                      <div className="skeleton" style={{ width: "100%", height: `${h * 100}%`, borderRadius: "4px 4px 2px 2px" }} />
                    </div>
                    <Skeleton width={20} height={8} />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 80 }}>
                {weekly.map((d, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%" }}>
                    <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
                      <motion.div
                        style={{
                          width: "100%",
                          background: d.hours > 0
                            ? "linear-gradient(180deg, var(--primary), var(--accent))"
                            : "var(--bg-elevated)",
                          borderRadius: "4px 4px 2px 2px",
                          minHeight: 4,
                          boxShadow: d.hours > 0 ? "0 0 8px var(--primary-glow)" : "none",
                        }}
                        initial={{ height: 0 }}
                        animate={{ height: `${(d.hours / maxHours) * 100}%` }}
                        transition={{ delay: i * 0.05, duration: 0.5, ease: "easeOut" }}
                      />
                    </div>
                    <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>{d.day}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* AI Priority — skeleton while AI loads */}
          <motion.div
            className="card"
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="section-header">
              <h2 className="section-title">AI Priority</h2>
              <span className="badge badge-primary"><Zap size={10} /> AI</span>
            </div>
            {aiLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Skeleton width={24} height={24} radius={12} style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                      <Skeleton height={13} width="55%" />
                      <Skeleton height={10} width="80%" />
                    </div>
                    <Skeleton width={24} height={16} />
                  </div>
                ))}
              </div>
            ) : priority.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {priority.map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: "50%",
                      background: i === 0 ? "var(--danger)" : i === 1 ? "var(--warning)" : "var(--success)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.7rem", fontWeight: 700, color: "#fff", flexShrink: 0,
                    }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>{s.name}</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.reason}</div>
                    </div>
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--primary-light)" }}>
                      {s.priority_score}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: "var(--text-muted)", fontSize: "0.875rem", padding: "10px 0" }}>
                Add subjects with exam dates to get AI priority ranking.
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Subject progress */}
      {!fastLoading && stats?.subject_stats?.length > 0 && (
        <motion.div
          className="card"
          style={{ marginTop: 24 }}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="section-header">
            <h2 className="section-title">Subject Progress</h2>
            <Link to="/subjects" style={{ fontSize: "0.8rem", color: "var(--primary-light)", display: "flex", alignItems: "center", gap: 4 }}>
              Manage <ArrowRight size={13} />
            </Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {stats.subject_stats.map((s, i) => (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: "0.875rem" }}>
                  <span style={{ fontWeight: 500 }}>{s.name}</span>
                  <span style={{ color: "var(--text-muted)" }}>{s.completion}%</span>
                </div>
                <div className="progress-bar-track">
                  <motion.div
                    className="progress-bar-fill"
                    style={{ background: `linear-gradient(90deg, ${s.color || "var(--primary)"}, var(--accent))` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${s.completion}%` }}
                    transition={{ delay: 0.3 + i * 0.05, duration: 0.7, ease: "easeOut" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
