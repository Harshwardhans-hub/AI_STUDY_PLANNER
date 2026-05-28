import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";
import { getSubjects } from "../services/endpoints";
import { BookOpen, ChevronLeft, ChevronRight, RotateCcw, Check, Sparkles } from "lucide-react";
import toast from "react-hot-toast";

export default function Flashcards() {
  const [subjects,  setSubjects]  = useState([]);
  const [subject,   setSubject]   = useState("");
  const [topic,     setTopic]     = useState("");
  const [numCards,  setNumCards]  = useState(10);
  const [deck,      setDeck]      = useState(null);
  const [current,   setCurrent]   = useState(0);
  const [flipped,   setFlipped]   = useState(false);
  const [known,     setKnown]     = useState(new Set());
  const [loading,   setLoading]   = useState(false);

  useEffect(() => {
    getSubjects().then(r => setSubjects(r.data.data || [])).catch(() => {});
  }, []);

  const handleGenerate = async () => {
    if (!subject.trim() || !topic.trim()) { toast.error("Subject and topic are required"); return; }
    setLoading(true);
    setDeck(null); setCurrent(0); setFlipped(false); setKnown(new Set());
    try {
      const res = await api.post("/chat/flashcards", { subject, topic, num_cards: numCards });
      setDeck(res.data.data);
      toast.success("Flashcards ready! 🧠");
    } catch (e) { toast.error(e.message || "Failed to generate flashcards"); }
    finally { setLoading(false); }
  };

  const handleNext = () => {
    setFlipped(false);
    setTimeout(() => setCurrent(c => Math.min(c + 1, deck.cards.length - 1)), 150);
  };

  const handlePrev = () => {
    setFlipped(false);
    setTimeout(() => setCurrent(c => Math.max(c - 1, 0)), 150);
  };

  const toggleKnown = () => {
    setKnown(prev => {
      const next = new Set(prev);
      if (next.has(current)) next.delete(current);
      else next.add(current);
      return next;
    });
  };

  const progress = deck ? Math.round((known.size / deck.cards.length) * 100) : 0;
  const card     = deck?.cards?.[current];

  return (
    <div className="page-content">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: "1.6rem", fontFamily: "var(--font-display)", fontWeight: 700 }}>Flashcards</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: 4, fontSize: "0.9rem" }}>
          AI-generated flashcards to boost memory retention
        </p>
      </div>

      {/* Config */}
      {!deck && (
        <motion.div className="card" style={{ maxWidth: 520 }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", marginBottom: 20 }}>Generate Flashcard Deck</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Subject</label>
              <select className="select" value={subject} onChange={e => setSubject(e.target.value)}>
                <option value="">— Select or type below —</option>
                {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
              <input className="input" style={{ marginTop: 8 }} placeholder="Or type subject name..." value={subject} onChange={e => setSubject(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Topic *</label>
              <input className="input" placeholder="e.g. Sorting Algorithms, Photosynthesis..." value={topic} onChange={e => setTopic(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Number of Cards: <strong style={{ color: "var(--primary-light)" }}>{numCards}</strong></label>
              <input type="range" min={5} max={20} value={numCards} onChange={e => setNumCards(parseInt(e.target.value))}
                style={{ width: "100%", accentColor: "var(--primary)" }} />
            </div>
            <button className="btn btn-primary" onClick={handleGenerate} disabled={loading} style={{ alignSelf: "flex-start", minWidth: 180 }}>
              {loading ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Generating...</> : <><Sparkles size={15} /> Generate Deck</>}
            </button>
          </div>
        </motion.div>
      )}

      {/* Deck */}
      {deck && card && (
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          {/* Stats bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Card {current + 1} of {deck.cards.length}
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--success)", fontWeight: 600 }}>
              {known.size} / {deck.cards.length} known ✓
            </div>
          </div>
          <div className="progress-bar-track" style={{ marginBottom: 24 }}>
            <div className="progress-bar-fill" style={{ width: `${progress}%`, background: "var(--success)" }} />
          </div>

          {/* Flashcard flip */}
          <div
            onClick={() => setFlipped(f => !f)}
            style={{ cursor: "pointer", perspective: 1000, height: 280, marginBottom: 20 }}
          >
            <motion.div
              style={{
                position: "relative", width: "100%", height: "100%",
                transformStyle: "preserve-3d",
                transition: "transform 0.45s ease",
                transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              {/* Front */}
              <div style={{
                position: "absolute", inset: 0, backfaceVisibility: "hidden",
                background: "var(--bg-card)", border: "1px solid var(--border)",
                borderRadius: 20, padding: "32px 40px",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
              }}>
                <div style={{ fontSize: "0.75rem", color: "var(--primary-light)", fontWeight: 600, marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>
                  Question
                </div>
                <p style={{ fontSize: "1.15rem", fontWeight: 600, textAlign: "center", lineHeight: 1.7 }}>{card.front}</p>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 20 }}>Tap to reveal answer</p>
              </div>
              {/* Back */}
              <div style={{
                position: "absolute", inset: 0, backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
                background: "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(45,212,191,0.06))",
                border: "1px solid rgba(16,185,129,0.25)",
                borderRadius: 20, padding: "32px 40px",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              }}>
                <div style={{ fontSize: "0.75rem", color: "var(--accent)", fontWeight: 600, marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>
                  Answer
                </div>
                <p style={{ fontSize: "1.05rem", textAlign: "center", lineHeight: 1.8, color: "var(--text-primary)" }}>{card.back}</p>
                {card.hint && (
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 16, fontStyle: "italic", textAlign: "center" }}>
                    💡 {card.hint}
                  </p>
                )}
              </div>
            </motion.div>
          </div>

          {/* Controls */}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", alignItems: "center" }}>
            <button className="btn btn-ghost" onClick={handlePrev} disabled={current === 0}>
              <ChevronLeft size={18} />
            </button>
            <button
              className="btn"
              onClick={toggleKnown}
              style={{
                padding: "10px 24px",
                background: known.has(current) ? "rgba(16,185,129,0.15)" : "var(--bg-elevated)",
                border: known.has(current) ? "1px solid var(--success)" : "1px solid var(--border)",
                color: known.has(current) ? "var(--success)" : "var(--text-secondary)",
              }}
            >
              <Check size={15} /> {known.has(current) ? "Known ✓" : "Mark as Known"}
            </button>
            <button className="btn btn-ghost" onClick={() => { setFlipped(false); setTimeout(() => setCurrent(0), 150); }}>
              <RotateCcw size={15} />
            </button>
            <button className="btn btn-ghost" onClick={handleNext} disabled={current === deck.cards.length - 1}>
              <ChevronRight size={18} />
            </button>
          </div>

          <button className="btn btn-ghost" style={{ marginTop: 20, width: "100%", fontSize: "0.85rem" }} onClick={() => { setDeck(null); setKnown(new Set()); }}>
            ← Generate New Deck
          </button>

          {/* Completion */}
          {known.size === deck.cards.length && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ marginTop: 20, padding: "20px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 16, textAlign: "center" }}
            >
              <div style={{ fontSize: "2rem" }}>🎉</div>
              <div style={{ fontWeight: 700, color: "var(--success)", fontSize: "1.1rem" }}>You know all cards!</div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 4 }}>Great work mastering this topic!</div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
