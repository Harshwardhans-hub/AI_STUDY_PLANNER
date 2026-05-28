import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getSubjects, createSubject, updateSubject, deleteSubject,
  getTopics, addTopic, completeTopic, deleteTopic,
  analyzeSyllabus, importTopics,
} from "../services/endpoints";
import {
  Plus, Trash2, Check, ChevronDown, ChevronUp, Edit2, X,
  BookOpen, Upload, FileText, Zap, CheckCircle2, AlertCircle,
  ChevronRight, RefreshCw, Download,
} from "lucide-react";
import toast from "react-hot-toast";

const COLORS = ["#10b981","#2dd4bf","#34d399","#f59e0b","#ef4444","#8b5cf6","#ec4899","#f97316","#3b82f6","#a855f7"];
const DIFFICULTIES = ["Easy","Medium","Hard"];

// ── Syllabus Analyzer Modal ────────────────────────────────────────────────────
function SyllabusAnalyzerModal({ subject, onClose, onImported }) {
  const [file,        setFile]       = useState(null);
  const [dragOver,    setDragOver]   = useState(false);
  const [analyzing,   setAnalyzing]  = useState(false);
  const [result,      setResult]     = useState(null);
  const [importing,   setImporting]  = useState(false);
  const [importMode,  setImportMode] = useState("append");
  const [selected,    setSelected]   = useState({});  // { "chIdx-tIdx": true }
  const fileRef = useRef();

  // When result loads, select all topics by default
  useEffect(() => {
    if (!result) return;
    const all = {};
    result.chapters.forEach((ch, ci) =>
      ch.topics.forEach((_, ti) => { all[`${ci}-${ti}`] = true; })
    );
    setSelected(all);
  }, [result]);

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f?.name.endsWith(".pdf")) setFile(f);
    else toast.error("Please drop a PDF file");
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    setResult(null);
    try {
      const res = await analyzeSyllabus(subject.id, file);
      setResult(res.data.data);
      toast.success(`Found ${res.data.data.total_topics} topics across ${res.data.data.chapters.length} chapters!`);
    } catch (e) {
      toast.error(e.message || "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleTopic = (key) => setSelected(s => ({ ...s, [key]: !s[key] }));
  const toggleChapter = (ci) => {
    const keys = result.chapters[ci].topics.map((_, ti) => `${ci}-${ti}`);
    const allOn = keys.every(k => selected[k]);
    setSelected(s => {
      const next = { ...s };
      keys.forEach(k => { next[k] = !allOn; });
      return next;
    });
  };
  const selectedCount = Object.values(selected).filter(Boolean).length;

  const handleImport = async () => {
    if (selectedCount === 0) { toast.error("Select at least one topic"); return; }
    setImporting(true);
    try {
      // Build chapters with only selected topics
      const filteredChapters = result.chapters.map((ch, ci) => ({
        ...ch,
        topics: ch.topics.filter((_, ti) => selected[`${ci}-${ti}`]),
      })).filter(ch => ch.topics.length > 0);

      await importTopics(subject.id, filteredChapters, importMode);
      toast.success(`✅ ${selectedCount} topics imported into ${subject.name}!`);
      onImported();
      onClose();
    } catch (e) {
      toast.error(e.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.94 }}
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          padding: 0,
          width: "100%",
          maxWidth: 680,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "var(--shadow-lg)",
          animation: "fadeInUp 0.25s ease",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "24px 28px 20px",
          borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, background: "var(--bg-elevated)", zIndex: 10,
          borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: "linear-gradient(135deg, var(--primary), var(--accent))",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Zap size={20} color="#fff" />
            </div>
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>AI Syllabus Analyzer</h3>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 2 }}>
                {subject.name}
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Step 1 — Upload */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700, color: "#fff" }}>1</div>
              <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Upload Syllabus PDF</span>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? "var(--primary)" : file ? "var(--primary)" : "var(--border)"}`,
                borderRadius: "var(--radius-md)",
                background: dragOver
                  ? "rgba(16,185,129,0.06)"
                  : file
                    ? "rgba(16,185,129,0.04)"
                    : "var(--bg-card)",
                padding: "28px 20px",
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={e => setFile(e.target.files[0])} />
              {file ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                  <div style={{ width: 44, height: 44, background: "rgba(16,185,129,0.12)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <FileText size={22} color="var(--primary)" />
                  </div>
                  <div style={{ textAlign: "left" }}>
                    <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>{file.name}</p>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
                      {(file.size / 1024 / 1024).toFixed(2)} MB · Click to change
                    </p>
                  </div>
                  <CheckCircle2 size={20} color="var(--primary)" style={{ marginLeft: "auto" }} />
                </div>
              ) : (
                <div>
                  <div style={{ width: 52, height: 52, background: "var(--bg-elevated)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                    <Upload size={24} color="var(--text-muted)" />
                  </div>
                  <p style={{ fontWeight: 600, marginBottom: 4 }}>Drag & drop your syllabus PDF</p>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                    or click to browse · PDF only · Text-based (not scanned)
                  </p>
                </div>
              )}
            </div>

            <button
              className="btn btn-primary"
              style={{ width: "100%", marginTop: 12, gap: 10 }}
              onClick={handleAnalyze}
              disabled={!file || analyzing}
            >
              {analyzing ? (
                <>
                  <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  Analyzing with Gemini AI...
                </>
              ) : (
                <>
                  <Zap size={16} />
                  Analyze Syllabus with AI
                </>
              )}
            </button>
          </div>

          {/* Loading state */}
          <AnimatePresence>
            {analyzing && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  background: "rgba(16,185,129,0.06)",
                  border: "1px solid rgba(16,185,129,0.2)",
                  borderRadius: "var(--radius-md)",
                  padding: "20px 24px",
                  textAlign: "center",
                }}
              >
                <div style={{ marginBottom: 12, fontSize: "1.6rem" }}>🤖</div>
                <p style={{ fontWeight: 600, marginBottom: 4 }}>Gemini is reading your syllabus...</p>
                <p style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                  Extracting chapters, topics, and estimating study hours. This takes 10–30 seconds.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Step 2 — Results */}
          <AnimatePresence>
            {result && !analyzing && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {/* Summary bar */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700, color: "#fff" }}>2</div>
                  <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Review Extracted Topics</span>
                </div>

                <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                  {[
                    { label: "Chapters", value: result.chapters.length, color: "var(--primary)" },
                    { label: "Topics", value: result.total_topics, color: "var(--accent)" },
                    { label: "Est. Hours", value: `${result.total_estimated_hours}h`, color: "var(--warning)" },
                    { label: "Selected", value: selectedCount, color: "var(--success)" },
                  ].map(s => (
                    <div key={s.label} style={{
                      flex: 1, minWidth: 80,
                      background: "var(--bg-card)", border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)", padding: "10px 14px",
                    }}>
                      <div style={{ fontSize: "1.2rem", fontWeight: 700, color: s.color, fontFamily: "var(--font-display)" }}>{s.value}</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Chapter list */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 360, overflowY: "auto", paddingRight: 4 }}>
                  {result.chapters.map((ch, ci) => {
                    const chKeys = ch.topics.map((_, ti) => `${ci}-${ti}`);
                    const allSel  = chKeys.every(k => selected[k]);
                    const someSel = chKeys.some(k => selected[k]);
                    return (
                      <div key={ci} style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                        {/* Chapter header */}
                        <div
                          onClick={() => toggleChapter(ci)}
                          style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "10px 14px", cursor: "pointer",
                            background: allSel ? "rgba(16,185,129,0.08)" : someSel ? "rgba(16,185,129,0.04)" : "var(--bg-elevated)",
                            transition: "background 0.15s",
                          }}
                        >
                          <div style={{
                            width: 18, height: 18, borderRadius: 5, border: "2px solid",
                            borderColor: allSel ? "var(--primary)" : "var(--border-hover)",
                            background: allSel ? "var(--primary)" : "transparent",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            flexShrink: 0, transition: "all 0.15s",
                          }}>
                            {allSel && <Check size={10} color="#fff" strokeWidth={3} />}
                            {!allSel && someSel && <div style={{ width: 8, height: 2, background: "var(--primary)", borderRadius: 2 }} />}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                              Chapter {ch.chapter_number}: {ch.chapter_name}
                            </div>
                            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                              {ch.topics.length} topics · {ch.topics.reduce((a, t) => a + (t.estimated_hours || 1), 0).toFixed(1)}h
                            </div>
                          </div>
                          <ChevronRight size={14} color="var(--text-muted)" />
                        </div>

                        {/* Topics */}
                        <div style={{ padding: "6px 14px 10px", display: "flex", flexDirection: "column", gap: 5, background: "var(--bg-card)" }}>
                          {ch.topics.map((topic, ti) => {
                            const key = `${ci}-${ti}`;
                            return (
                              <div
                                key={ti}
                                onClick={() => toggleTopic(key)}
                                style={{
                                  display: "flex", alignItems: "flex-start", gap: 10,
                                  padding: "7px 10px", borderRadius: 8, cursor: "pointer",
                                  background: selected[key] ? "rgba(16,185,129,0.06)" : "transparent",
                                  border: `1px solid ${selected[key] ? "rgba(16,185,129,0.2)" : "transparent"}`,
                                  transition: "all 0.15s",
                                }}
                              >
                                <div style={{
                                  width: 16, height: 16, borderRadius: 4, border: "2px solid",
                                  borderColor: selected[key] ? "var(--primary)" : "var(--border-hover)",
                                  background: selected[key] ? "var(--primary)" : "transparent",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  flexShrink: 0, marginTop: 1, transition: "all 0.15s",
                                }}>
                                  {selected[key] && <Check size={9} color="#fff" strokeWidth={3} />}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: "0.82rem", fontWeight: 500, color: selected[key] ? "var(--text-primary)" : "var(--text-secondary)" }}>
                                    {topic.name}
                                  </div>
                                  {topic.notes && (
                                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2, lineHeight: 1.4 }}>
                                      {topic.notes}
                                    </div>
                                  )}
                                </div>
                                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", flexShrink: 0, marginTop: 2 }}>
                                  {topic.estimated_hours}h
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Step 3 — Import options */}
                <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700, color: "#fff" }}>3</div>
                  <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Import Options</span>
                </div>

                <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                  {[
                    { value: "append", label: "Add to existing topics", icon: "➕" },
                    { value: "replace", label: "Replace all topics", icon: "🔄" },
                  ].map(opt => (
                    <div
                      key={opt.value}
                      onClick={() => setImportMode(opt.value)}
                      style={{
                        flex: 1, padding: "10px 14px", borderRadius: "var(--radius-sm)",
                        border: `2px solid ${importMode === opt.value ? "var(--primary)" : "var(--border)"}`,
                        background: importMode === opt.value ? "rgba(16,185,129,0.08)" : "var(--bg-card)",
                        cursor: "pointer", transition: "all 0.15s",
                      }}
                    >
                      <div style={{ fontSize: "1rem", marginBottom: 4 }}>{opt.icon}</div>
                      <div style={{ fontSize: "0.8rem", fontWeight: 600, color: importMode === opt.value ? "var(--primary)" : "var(--text-secondary)" }}>
                        {opt.label}
                      </div>
                    </div>
                  ))}
                </div>

                {importMode === "replace" && (
                  <div style={{
                    background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                    borderRadius: "var(--radius-sm)", padding: "10px 14px", marginBottom: 14,
                    display: "flex", gap: 8, alignItems: "flex-start",
                  }}>
                    <AlertCircle size={15} color="var(--danger)" style={{ flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontSize: "0.8rem", color: "var(--danger)" }}>
                      This will delete all existing topics for <strong>{subject.name}</strong> and replace them with the imported ones.
                    </span>
                  </div>
                )}

                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setResult(null); setFile(null); }}>
                    <RefreshCw size={14} /> Re-analyze
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 2, gap: 8 }}
                    onClick={handleImport}
                    disabled={importing || selectedCount === 0}
                  >
                    {importing ? (
                      <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Importing...</>
                    ) : (
                      <><Download size={16} /> Import {selectedCount} Topics</>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

// ── Subject Modal (with inline PDF upload) ─────────────────────────────────────
function SubjectModal({ subject, onClose, onSave }) {
  const [form, setForm] = useState({
    name:        subject?.name        || "",
    difficulty:  subject?.difficulty  || "Medium",
    exam_date:   subject?.exam_date   || "",
    color:       subject?.color       || "#10b981",
    description: subject?.description || "",
  });
  const [syllabusFile,  setSyllabusFile]  = useState(null);
  const [dragOver,      setDragOver]      = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [savingStep,    setSavingStep]    = useState(""); // status message during multi-step save
  const fileRef = useRef();
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f?.name.toLowerCase().endsWith(".pdf")) setSyllabusFile(f);
    else toast.error("Please drop a PDF file");
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Subject name is required"); return; }
    setSaving(true);
    try {
      // Step 1: Create the subject
      setSavingStep("Creating subject...");
      const createdSubject = await onSave(form, false); // false = don't close yet

      // Step 2: If PDF attached, analyze and import
      if (syllabusFile && createdSubject?.id) {
        setSavingStep("📄 Extracting text from PDF...");
        try {
          const res = await analyzeSyllabus(createdSubject.id, syllabusFile);
          const chapters = res.data.data?.chapters || [];
          if (chapters.length > 0) {
            setSavingStep(`🤖 Importing ${res.data.data.total_topics} topics...`);
            await importTopics(createdSubject.id, chapters, "replace");
            toast.success(`✅ Subject created with ${res.data.data.total_topics} topics from syllabus!`);
          } else {
            toast.success("Subject created! (No topics found in PDF)");
          }
        } catch (pdfErr) {
          toast.error(`Subject created, but PDF analysis failed: ${pdfErr.message}`);
        }
      } else {
        toast.success(subject ? "Subject updated!" : "Subject added!");
      }
      onClose();
    } catch (e) {
      toast.error(e.message || "Failed to save subject");
    } finally {
      setSaving(false);
      setSavingStep("");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          padding: 32,
          width: "100%",
          maxWidth: 520,
          boxShadow: "var(--shadow-lg)",
          maxHeight: "92vh",
          overflowY: "auto",
        }}
      >
        <div className="modal-header">
          <h3 className="modal-title">{subject ? "Edit Subject" : "Add New Subject"}</h3>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Subject Name */}
          <div className="form-group">
            <label className="form-label">Subject Name *</label>
            <input
              className="input"
              value={form.name}
              onChange={e => set("name", e.target.value)}
              placeholder="e.g. Data Structures & Algorithms"
              autoFocus
            />
          </div>

          {/* Difficulty + Exam Date */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Difficulty</label>
              <select className="select" value={form.difficulty} onChange={e => set("difficulty", e.target.value)}>
                {DIFFICULTIES.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Exam Date</label>
              <input className="input" type="date" value={form.exam_date} onChange={e => set("exam_date", e.target.value)} />
            </div>
          </div>

          {/* Color */}
          <div className="form-group">
            <label className="form-label">Color</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {COLORS.map((c, i) => (
                <button
                  key={`color-${i}`}
                  onClick={() => set("color", c)}
                  style={{
                    width: 28, height: 28, borderRadius: "50%", background: c,
                    border: form.color === c ? "3px solid white" : "2px solid transparent",
                    cursor: "pointer", outline: form.color === c ? `2px solid ${c}` : "none",
                    transition: "transform 0.15s",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">Description (optional)</label>
            <textarea
              className="textarea"
              value={form.description}
              onChange={e => set("description", e.target.value)}
              placeholder="What does this subject cover?"
              style={{ minHeight: 64 }}
            />
          </div>

          {/* ── Syllabus PDF Upload ── */}
          {!subject && (
            <>
              <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%",
                    background: "linear-gradient(135deg, var(--primary), var(--accent))",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Zap size={12} color="#fff" />
                  </div>
                  <label className="form-label" style={{ margin: 0, color: "var(--primary)", fontWeight: 600 }}>
                    Upload Syllabus PDF — Auto-import Topics with AI
                  </label>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginLeft: "auto" }}>optional</span>
                </div>

                {/* Drop zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current?.click()}
                  style={{
                    border: `2px dashed ${dragOver ? "var(--primary)" : syllabusFile ? "var(--primary)" : "var(--border)"}`,
                    borderRadius: "var(--radius-md)",
                    background: dragOver
                      ? "rgba(16,185,129,0.08)"
                      : syllabusFile
                        ? "rgba(16,185,129,0.05)"
                        : "var(--bg-card)",
                    padding: syllabusFile ? "14px 18px" : "20px 18px",
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf"
                    style={{ display: "none" }}
                    onChange={e => setSyllabusFile(e.target.files[0] || null)}
                  />
                  {syllabusFile ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: 8, flexShrink: 0,
                        background: "rgba(16,185,129,0.12)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <FileText size={20} color="var(--primary)" />
                      </div>
                      <div style={{ flex: 1, textAlign: "left" }}>
                        <p style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--text-primary)" }}>
                          {syllabusFile.name}
                        </p>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
                          {(syllabusFile.size / 1024 / 1024).toFixed(2)} MB · Click to change
                        </p>
                      </div>
                      <CheckCircle2 size={18} color="var(--primary)" />
                      <button
                        onClick={e => { e.stopPropagation(); setSyllabusFile(null); }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 2 }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div style={{
                        width: 40, height: 40, borderRadius: 10, background: "var(--bg-elevated)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        margin: "0 auto 10px",
                      }}>
                        <Upload size={20} color="var(--text-muted)" />
                      </div>
                      <p style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: 4 }}>
                        Drag & drop your syllabus PDF here
                      </p>
                      <p style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
                        or click to browse · Gemini AI will extract all chapters & topics automatically
                      </p>
                    </>
                  )}
                </div>

                {syllabusFile && (
                  <div style={{
                    marginTop: 8, padding: "8px 12px",
                    background: "rgba(16,185,129,0.06)",
                    border: "1px solid rgba(16,185,129,0.2)",
                    borderRadius: 8,
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <Zap size={13} color="var(--primary)" />
                    <span style={{ fontSize: "0.78rem", color: "var(--primary)" }}>
                      Gemini will analyze this PDF and auto-import all topics when you click "Add Subject"
                    </span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Saving progress message */}
          {saving && savingStep && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px",
                background: "rgba(16,185,129,0.08)",
                border: "1px solid rgba(16,185,129,0.2)",
                borderRadius: 8,
                fontSize: "0.85rem", color: "var(--primary)", fontWeight: 500,
              }}
            >
              <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2, flexShrink: 0 }} />
              {savingStep}
            </motion.div>
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? (
                <><div className="spinner" style={{ width: 15, height: 15, borderWidth: 2 }} /> Processing...</>
              ) : subject ? (
                "Save Changes"
              ) : syllabusFile ? (
                <><Zap size={15} /> Add Subject & Import Topics</>
              ) : (
                <><Plus size={15} /> Add Subject</>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}


// ── Topic Row ──────────────────────────────────────────────────────────────────
function TopicRow({ topic, onToggle, onDelete }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      style={{
        display: "flex", alignItems: "flex-start", gap: 10,
        padding: "8px 12px", borderRadius: 8,
        background: "var(--bg-base)",
        border: "1px solid var(--border)",
        opacity: topic.is_completed ? 0.6 : 1,
      }}
    >
      <button
        onClick={() => onToggle(topic)}
        style={{
          width: 20, height: 20, borderRadius: 6, marginTop: 1,
          border: topic.is_completed ? "none" : "2px solid var(--border-hover)",
          background: topic.is_completed ? "var(--success)" : "transparent",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, transition: "all 0.15s",
        }}
      >
        {topic.is_completed && <Check size={12} color="#fff" strokeWidth={3} />}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{
          fontSize: "0.875rem",
          textDecoration: topic.is_completed ? "line-through" : "none",
          color: topic.is_completed ? "var(--text-muted)" : "var(--text-primary)",
        }}>
          {topic.name}
        </span>
        {topic.notes && (
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>{topic.notes}</div>
        )}
      </div>
      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", flexShrink: 0 }}>{topic.estimated_hours}h</span>
      <button onClick={() => onDelete(topic.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 2, borderRadius: 4 }}>
        <Trash2 size={13} />
      </button>
    </motion.div>
  );
}

// ── Add Topic Form ─────────────────────────────────────────────────────────────
function AddTopicForm({ subjectId, onAdd }) {
  const [name, setName]   = useState("");
  const [hours, setHours] = useState("1");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await addTopic(subjectId, { name: name.trim(), estimated_hours: parseFloat(hours) || 1 });
      onAdd(res.data.data);
      setName("");
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
      <input
        className="input"
        style={{ flex: 1, padding: "7px 12px", fontSize: "0.85rem" }}
        placeholder="Add topic manually..."
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === "Enter" && handleAdd()}
      />
      <input
        className="input"
        style={{ width: 70, padding: "7px 10px", fontSize: "0.85rem" }}
        type="number" min="0.5" step="0.5" value={hours}
        onChange={e => setHours(e.target.value)} title="Estimated hours"
      />
      <button className="btn btn-primary" style={{ padding: "7px 14px" }} onClick={handleAdd} disabled={saving || !name.trim()}>
        <Plus size={15} />
      </button>
    </div>
  );
}

// ── Subject Card ───────────────────────────────────────────────────────────────
function SubjectCard({ subject, onEdit, onDelete, onUpdated }) {
  const [expanded,      setExpanded]      = useState(false);
  const [topics,        setTopics]        = useState([]);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [showAnalyzer,  setShowAnalyzer]  = useState(false);

  const fetchTopics = async (force = false) => {
    if ((topics.length > 0 || loadingTopics) && !force) return;
    setLoadingTopics(true);
    try {
      const res = await getTopics(subject.id);
      setTopics(res.data.data || []);
    } catch { /* silent */ }
    finally { setLoadingTopics(false); }
  };

  const handleExpand = () => {
    if (!expanded) fetchTopics();
    setExpanded(e => !e);
  };

  const handleToggleTopic = async (topic) => {
    try {
      await completeTopic(topic.id, !topic.is_completed);
      setTopics(prev => prev.map(t => t.id === topic.id ? { ...t, is_completed: !t.is_completed } : t));
      onUpdated?.();
    } catch (e) { toast.error(e.message); }
  };

  const handleDeleteTopic = async (topicId) => {
    try {
      await deleteTopic(topicId);
      setTopics(prev => prev.filter(t => t.id !== topicId));
    } catch (e) { toast.error(e.message); }
  };

  const handleImported = () => {
    // Refresh topics after syllabus import
    fetchTopics(true);
    onUpdated?.();
  };

  return (
    <>
      <motion.div layout className="subject-card" style={{ "--subject-color": subject.color }}>
        {/* Color strip */}
        <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: subject.color, borderRadius: "4px 0 0 4px" }} />

        <div style={{ paddingLeft: 12 }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 4 }}>{subject.name}</h3>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span className="badge" style={{ background: `${subject.color}22`, color: subject.color, fontSize: "0.72rem" }}>
                  {subject.difficulty}
                </span>
                {subject.days_until_exam !== null && (
                  <span className={`badge ${subject.days_until_exam <= 3 ? "badge-danger" : subject.days_until_exam <= 7 ? "badge-warning" : "badge-accent"}`} style={{ fontSize: "0.72rem" }}>
                    {subject.days_until_exam <= 0 ? "Exam today!" : `${subject.days_until_exam}d left`}
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {/* AI Syllabus button */}
              <button
                onClick={() => setShowAnalyzer(true)}
                title="Analyze syllabus PDF"
                style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", cursor: "pointer", color: "var(--primary)", padding: "4px 6px", borderRadius: 6, transition: "all 0.15s", display: "flex", alignItems: "center", gap: 4, fontSize: "0.72rem", fontWeight: 600 }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(16,185,129,0.2)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(16,185,129,0.1)"; }}
              >
                <Zap size={12} /> AI
              </button>
              <button onClick={() => onEdit(subject)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4, borderRadius: 6, transition: "all 0.15s" }} onMouseEnter={e => e.currentTarget.style.color = "var(--primary-light)"} onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}><Edit2 size={14} /></button>
              <button onClick={() => onDelete(subject.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4, borderRadius: 6, transition: "all 0.15s" }} onMouseEnter={e => e.currentTarget.style.color = "var(--danger)"} onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}><Trash2 size={14} /></button>
            </div>
          </div>

          {/* Progress */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: 5 }}>
              <span style={{ color: "var(--text-muted)" }}>{subject.topic_count} topics</span>
              <span style={{ color: subject.color, fontWeight: 600 }}>{subject.completion_percentage}%</span>
            </div>
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${subject.completion_percentage}%`, background: `linear-gradient(90deg, ${subject.color}, ${subject.color}aa)` }} />
            </div>
          </div>

          {/* AI Syllabus hint if no topics */}
          {subject.topic_count === 0 && (
            <div
              onClick={() => setShowAnalyzer(true)}
              style={{
                marginBottom: 10, padding: "8px 12px", borderRadius: 8,
                background: "rgba(16,185,129,0.06)", border: "1px dashed rgba(16,185,129,0.25)",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                transition: "all 0.15s",
              }}
            >
              <Zap size={14} color="var(--primary)" />
              <span style={{ fontSize: "0.8rem", color: "var(--primary)" }}>
                Upload syllabus PDF to auto-import topics with AI →
              </span>
            </div>
          )}

          {/* Expand toggle */}
          <button
            onClick={handleExpand}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: 4, padding: 0, transition: "color 0.15s" }}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? "Hide topics" : "Show topics"}
          </button>

          {/* Topics */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: "hidden", marginTop: 12 }}
              >
                {loadingTopics ? (
                  <div style={{ textAlign: "center", padding: "12px 0" }}>
                    <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2, margin: "0 auto" }} />
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <AnimatePresence>
                      {topics.map(t => (
                        <TopicRow key={t.id} topic={t} onToggle={handleToggleTopic} onDelete={handleDeleteTopic} />
                      ))}
                    </AnimatePresence>
                    {topics.length === 0 && (
                      <div style={{ textAlign: "center", padding: "12px 0" }}>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginBottom: 8 }}>No topics yet.</p>
                        <button
                          onClick={() => setShowAnalyzer(true)}
                          style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: 4 }}
                        >
                          <Zap size={13} /> Import from syllabus PDF
                        </button>
                      </div>
                    )}
                    <AddTopicForm subjectId={subject.id} onAdd={(t) => setTopics(prev => [...prev, t])} />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Syllabus Analyzer Modal */}
      <AnimatePresence>
        {showAnalyzer && (
          <SyllabusAnalyzerModal
            subject={subject}
            onClose={() => setShowAnalyzer(false)}
            onImported={handleImported}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function Subjects() {
  const [subjects,    setSubjects]   = useState([]);
  const [loading,     setLoading]    = useState(true);
  const [showModal,   setShowModal]  = useState(false);
  const [editSubject, setEditSubject] = useState(null);

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await getSubjects();
      setSubjects(res.data.data || []);
    } catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const handleSave = async (form, showToast = true) => {
    if (editSubject) {
      const res = await updateSubject(editSubject.id, form);
      setSubjects(prev => prev.map(s => s.id === editSubject.id ? res.data.data : s));
      if (showToast) toast.success("Subject updated!");
      setEditSubject(null);
      return res.data.data;
    } else {
      const res = await createSubject(form);
      setSubjects(prev => [...prev, res.data.data]);
      // Note: toast shown by modal after PDF import if applicable
      setEditSubject(null);
      return res.data.data; // Return so modal can use subject.id for PDF
    }
  };

  const handleEdit   = (subject) => { setEditSubject(subject); setShowModal(true); };
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this subject and all its topics?")) return;
    try {
      await deleteSubject(id);
      setSubjects(prev => prev.filter(s => s.id !== id));
      toast.success("Subject deleted");
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: "1.6rem", fontFamily: "var(--font-display)", fontWeight: 700 }}>Subjects</h1>
          <p style={{ color: "var(--text-secondary)", marginTop: 4, fontSize: "0.9rem" }}>
            Manage subjects · Upload syllabus PDFs to auto-import topics with AI
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditSubject(null); setShowModal(true); }}>
          <Plus size={16} /> Add Subject
        </button>
      </div>

      {/* Info banner */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          marginBottom: 24,
          padding: "12px 18px",
          background: "rgba(16,185,129,0.06)",
          border: "1px solid rgba(16,185,129,0.2)",
          borderRadius: "var(--radius-md)",
          display: "flex", alignItems: "center", gap: 12,
        }}
      >
        <div style={{ width: 36, height: 36, background: "rgba(16,185,129,0.12)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Zap size={18} color="var(--primary)" />
        </div>
        <div>
          <p style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: 2 }}>AI Syllabus Analyzer</p>
          <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
            Click the <strong style={{ color: "var(--primary)" }}>AI</strong> button on any subject card to upload a syllabus PDF.
            Gemini will automatically extract all chapters and topics and list them for you.
          </p>
        </div>
      </motion.div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
          <div className="spinner" />
        </div>
      ) : subjects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><BookOpen size={48} style={{ opacity: 0.3 }} /></div>
          <div className="empty-title">No subjects yet</div>
          <div className="empty-desc">Add your first subject to get started. You can upload a syllabus PDF to auto-import all topics!</div>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowModal(true)}>
            <Plus size={16} /> Add Your First Subject
          </button>
        </div>
      ) : (
        <motion.div className="grid-3" layout>
          <AnimatePresence>
            {subjects.map(s => (
              <SubjectCard
                key={s.id}
                subject={s}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onUpdated={fetch}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <AnimatePresence>
        {showModal && (
          <SubjectModal
            subject={editSubject}
            onClose={() => { setShowModal(false); setEditSubject(null); }}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
