import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { CalendarDays, Download, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const TYPE_COLOR = { study: "#10b981", revision: "#2dd4bf", break: "#10b981" };

export default function Calendar() {
  const [upcoming,    setUpcoming]    = useState({});
  const [loading,     setLoading]     = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [exporting,   setExporting]   = useState(false);

  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    api.get("/calendar/upcoming")
      .then(r => setUpcoming(r.data.data || {}))
      .catch(() => setUpcoming({}))
      .finally(() => setLoading(false));
  }, []);

  const exportICS = async () => {
    setExporting(true);
    try {
      const res = await api.get("/calendar/export/ics", { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "text/calendar" }));
      const a   = document.createElement("a");
      a.href    = url;
      a.download = "study_plan.ics";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Calendar exported! Import it into Google Calendar or Apple Calendar.");
    } catch (e) {
      toast.error("No active study plan found. Generate one first.");
    } finally { setExporting(false); }
  };

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().split("T")[0];

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const getDateKey = (d) => `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  return (
    <div className="page-content">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: "1.6rem", fontFamily: "var(--font-display)", fontWeight: 700 }}>Calendar</h1>
          <p style={{ color: "var(--text-secondary)", marginTop: 4, fontSize: "0.9rem" }}>Visualize your study schedule and sync with your calendar</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            className="btn btn-ghost"
            onClick={exportICS}
            disabled={exporting}
            style={{ gap: 8, fontSize: "0.85rem" }}
          >
            <Download size={15} /> {exporting ? "Exporting..." : "Export .ics"}
          </button>
          <a
            href="https://calendar.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{ gap: 8, fontSize: "0.85rem", textDecoration: "none" }}
          >
            <ExternalLink size={15} /> Open Google Calendar
          </a>
        </div>
      </div>

      <div className="grid-2" style={{ gap: 24, alignItems: "start" }}>
        {/* Month Calendar */}
        <motion.div className="card" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
          {/* Month nav */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <button className="btn btn-ghost" style={{ padding: "6px 10px" }} onClick={() => setCurrentDate(new Date(year, month - 1))}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.05rem" }}>
              {MONTH_NAMES[month]} {year}
            </span>
            <button className="btn btn-ghost" style={{ padding: "6px 10px" }} onClick={() => setCurrentDate(new Date(year, month + 1))}>
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day labels */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 8 }}>
            {DAY_LABELS.map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {cells.map((d, i) => {
              const key    = d ? getDateKey(d) : null;
              const tasks  = (key && upcoming[key]) || [];
              const isToday = key === today;
              const hasTasks = tasks.length > 0;
              return (
                <div
                  key={i}
                  style={{
                    height: 52, borderRadius: 8, padding: "4px 6px",
                    background: isToday ? "rgba(16,185,129,0.12)" : hasTasks ? "var(--bg-elevated)" : "transparent",
                    border: isToday ? "1px solid rgba(16,185,129,0.4)" : hasTasks ? "1px solid var(--border)" : "1px solid transparent",
                    display: "flex", flexDirection: "column", alignItems: "center",
                    cursor: hasTasks ? "pointer" : "default",
                  }}
                >
                  {d && (
                    <>
                      <span style={{ fontSize: "0.75rem", fontWeight: isToday ? 700 : 400, color: isToday ? "var(--primary-light)" : "var(--text-secondary)" }}>
                        {d}
                      </span>
                      <div style={{ display: "flex", gap: 2, marginTop: 2, flexWrap: "wrap", justifyContent: "center" }}>
                        {tasks.slice(0, 3).map((t, j) => (
                          <div key={j} style={{ width: 6, height: 6, borderRadius: "50%", background: t.subject_color || TYPE_COLOR[t.task_type] || "var(--primary)" }} />
                        ))}
                        {tasks.length > 3 && <div style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>+{tasks.length - 3}</div>}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Upcoming 7 days */}
        <motion.div className="card" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
          <h2 className="section-title" style={{ marginBottom: 16 }}>Next 7 Days</h2>
          {loading ? (
            <div style={{ textAlign: "center", padding: "30px 0" }}><div className="spinner" style={{ margin: "0 auto" }} /></div>
          ) : Object.keys(upcoming).length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><CalendarDays size={40} style={{ opacity: 0.3 }} /></div>
              <div className="empty-title">No upcoming sessions</div>
              <div className="empty-desc">Generate a study plan first, then sync it here.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {Object.entries(upcoming).sort(([a], [b]) => a.localeCompare(b)).map(([date, tasks]) => (
                <div key={date}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                    {date === today && <span className="badge badge-primary" style={{ marginLeft: 8, fontSize: "0.65rem" }}>Today</span>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {tasks.map((t, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "var(--bg-elevated)", borderRadius: 8, border: "1px solid var(--border)" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: t.subject_color || TYPE_COLOR[t.task_type] || "var(--primary)", flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "0.85rem", fontWeight: 500 }}>{t.subject_name || "Break"}</div>
                          {t.focus && <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.4 }}>{t.focus}</div>}
                        </div>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{t.duration_hours}h</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* ICS import instructions */}
      <motion.div className="card" style={{ marginTop: 24 }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h2 className="section-title" style={{ marginBottom: 12 }}>Sync with Google Calendar</h2>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {[
            { step: "1", text: "Click \"Export .ics\" to download your study plan" },
            { step: "2", text: "Open Google Calendar → Settings (⚙️) → Import & Export" },
            { step: "3", text: "Click \"Import\" and select the downloaded study_plan.ics file" },
            { step: "4", text: "All your study sessions appear in Google Calendar with reminders!" },
          ].map(s => (
            <div key={s.step} style={{ display: "flex", gap: 12, alignItems: "flex-start", flex: "1 1 200px" }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(16,185,129,0.15)", color: "var(--primary-light)", fontWeight: 700, fontSize: "0.8rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {s.step}
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6, marginTop: 3 }}>{s.text}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
