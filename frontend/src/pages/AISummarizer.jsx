import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { summarizePDF } from "../services/endpoints";
import { useDropzone } from "react-dropzone";
import { FileText, Upload, Copy, Check } from "lucide-react";
import toast from "react-hot-toast";

export default function AISummarizer() {
  const [result,    setResult]    = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [copied,    setCopied]    = useState(false);
  const [fileName,  setFileName]  = useState("");

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    onDrop: async (files) => {
      if (!files[0]) return;
      setFileName(files[0].name);
      setResult(null);
      setLoading(true);
      try {
        const fd = new FormData();
        fd.append("file", files[0]);
        const res = await summarizePDF(fd);
        setResult(res.data.data);
        toast.success("PDF summarized successfully!");
      } catch (e) {
        toast.error(e.message || "Failed to summarize PDF");
      } finally { setLoading(false); }
    },
  });

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(`${result.title}\n\n${result.summary}\n\nKey Points:\n${result.key_points.map((p, i) => `${i+1}. ${p}`).join("\n")}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="page-content">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: "1.6rem", fontFamily: "var(--font-display)", fontWeight: 700 }}>PDF Summarizer</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: 4, fontSize: "0.9rem" }}>
          Upload your notes and Gemini AI will generate a structured summary
        </p>
      </div>

      {/* Dropzone */}
      <motion.div
        {...getRootProps()}
        className="card"
        style={{
          border: `2px dashed ${isDragActive ? "var(--primary)" : "var(--border)"}`,
          background: isDragActive ? "rgba(16,185,129,0.06)" : "var(--bg-card)",
          cursor: "pointer",
          textAlign: "center",
          padding: "48px 24px",
          marginBottom: 24,
          transition: "all 0.2s",
        }}
        whileHover={{ borderColor: "var(--primary-light)" }}
      >
        <input {...getInputProps()} />
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div className="spinner" style={{ width: 40, height: 40 }} />
            <p style={{ color: "var(--primary-light)", fontWeight: 500 }}>Gemini is reading your PDF...</p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>This may take a few seconds</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: isDragActive ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {fileName ? <FileText size={28} color="var(--primary-light)" /> : <Upload size={28} color="var(--primary-light)" />}
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: "1rem", color: isDragActive ? "var(--primary-light)" : "var(--text-primary)" }}>
                {isDragActive ? "Drop your PDF here!" : fileName ? fileName : "Drag & drop your PDF"}
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 4 }}>
                {fileName ? "Drop a new PDF to re-summarize" : "or click to browse — PDF files only"}
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {/* Title + Copy */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem" }}>{result.title}</h2>
              <button className="btn btn-ghost" style={{ gap: 8, fontSize: "0.8rem" }} onClick={handleCopy}>
                {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy All</>}
              </button>
            </div>

            <div className="grid-2" style={{ gap: 20, alignItems: "start" }}>
              {/* Summary */}
              <div className="card">
                <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--primary-light)", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                  📝 Summary
                </h3>
                <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.8 }}>{result.summary}</p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Key Points */}
                <div className="card">
                  <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--accent)", marginBottom: 14 }}>🎯 Key Points</h3>
                  <ul style={{ display: "flex", flexDirection: "column", gap: 10, listStyle: "none" }}>
                    {result.key_points?.map((point, i) => (
                      <li key={i} style={{ display: "flex", gap: 10, fontSize: "0.85rem" }}>
                        <span style={{
                          width: 22, height: 22, borderRadius: "50%", background: "rgba(45,212,191,0.15)",
                          color: "var(--accent)", fontWeight: 700, fontSize: "0.72rem",
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        }}>
                          {i + 1}
                        </span>
                        <span style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Important Terms */}
                {result.important_terms?.length > 0 && (
                  <div className="card">
                    <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--warning)", marginBottom: 14 }}>🔑 Key Terms</h3>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {result.important_terms.map((term, i) => (
                        <span key={i} className="badge badge-warning" style={{ fontSize: "0.78rem" }}>{term}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
