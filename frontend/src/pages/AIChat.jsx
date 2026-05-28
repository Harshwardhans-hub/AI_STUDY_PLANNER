import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { Send, Bot, User, Trash2, Sparkles } from "lucide-react";
import toast from "react-hot-toast";

const SUGGESTIONS = [
  "Explain binary search trees simply",
  "Give me tips to memorize faster",
  "Create a study schedule for my exams",
  "What's the best way to tackle hard subjects?",
  "Help me understand recursion",
];

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: "flex",
        gap: 12,
        flexDirection: isUser ? "row-reverse" : "row",
        alignItems: "flex-start",
        marginBottom: 16,
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
        background: isUser ? "var(--primary)" : "rgba(45,212,191,0.15)",
        display: "flex", alignItems: "center", justifyContent: "center",
        border: isUser ? "none" : "1px solid rgba(45,212,191,0.3)",
      }}>
        {isUser ? <User size={16} color="#fff" /> : <Bot size={16} color="var(--accent)" />}
      </div>
      <div style={{
        maxWidth: "75%",
        background: isUser ? "var(--primary)" : "var(--bg-elevated)",
        color: isUser ? "#fff" : "var(--text-primary)",
        padding: "10px 16px",
        borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
        border: isUser ? "none" : "1px solid var(--border)",
        fontSize: "0.9rem",
        lineHeight: 1.7,
        whiteSpace: "pre-wrap",
      }}>
        {msg.content}
      </div>
    </motion.div>
  );
}

export default function AIChat() {
  const { dbUser, firebaseUser } = useAuth();
  const name = dbUser?.name || firebaseUser?.displayName || "Student";
  const [messages, setMessages]   = useState([{
    role: "assistant",
    content: `Hi ${name.split(" ")[0]}! 👋 I'm your AI study tutor powered by Gemini. Ask me anything — concepts, study tips, exam strategies, or get me to explain a tough topic!`,
  }]);
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text) => {
    const userMsg = text || input.trim();
    if (!userMsg || loading) return;

    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));
      const res = await api.post("/chat/message", { message: userMsg, history });
      const reply = res.data.data.reply;
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      toast.error("AI is unavailable right now. Try again.");
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I ran into an error. Please try again! 😅" }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([{
      role: "assistant",
      content: `Hi ${name.split(" ")[0]}! 👋 Chat cleared. What would you like to study?`,
    }]);
  };

  return (
    <div className="page-content" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 40px)", gap: 0 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: "1.6rem", fontFamily: "var(--font-display)", fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: "1.4rem" }}>🤖</span> AI Study Tutor
          </h1>
          <p style={{ color: "var(--text-secondary)", marginTop: 4, fontSize: "0.9rem" }}>
            Powered by Gemini — ask anything about your subjects
          </p>
        </div>
        <button className="btn btn-ghost" onClick={clearChat} style={{ gap: 6, fontSize: "0.8rem" }}>
          <Trash2 size={14} /> Clear Chat
        </button>
      </div>

      {/* Quick suggestions */}
      {messages.length <= 1 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {SUGGESTIONS.map((s, i) => (
            <button
              key={i}
              onClick={() => sendMessage(s)}
              style={{
                padding: "6px 14px", borderRadius: 999, fontSize: "0.8rem",
                background: "var(--bg-elevated)", border: "1px solid var(--border)",
                color: "var(--text-secondary)", cursor: "pointer", transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.color = "var(--primary-light)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "16px",
        background: "var(--bg-card)", borderRadius: 16,
        border: "1px solid var(--border)", marginBottom: 16,
      }}>
        {messages.map((msg, i) => <Message key={i} msg={msg} />)}

        {loading && (
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(45,212,191,0.15)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(45,212,191,0.3)" }}>
              <Bot size={16} color="var(--accent)" />
            </div>
            <div style={{ background: "var(--bg-elevated)", padding: "12px 16px", borderRadius: "18px 18px 18px 4px", border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", gap: 4 }}>
                {[0, 0.2, 0.4].map((d, i) => (
                  <motion.div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)" }}
                    animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: d }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: 10 }}>
        <input
          className="input"
          style={{ flex: 1, padding: "12px 18px", fontSize: "0.9rem", borderRadius: 12 }}
          placeholder="Ask anything about your subjects..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
          disabled={loading}
        />
        <motion.button
          whileTap={{ scale: 0.95 }}
          className="btn btn-primary"
          style={{ padding: "12px 20px", borderRadius: 12 }}
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
        >
          <Send size={18} />
        </motion.button>
      </div>
    </div>
  );
}
