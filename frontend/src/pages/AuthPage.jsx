import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { signInWithGoogle, loginWithEmail, registerWithEmail } from "../firebase/auth";
import toast from "react-hot-toast";
import "../styles/auth.css";

const FEATURES = [
  {
    icon: "🤖",
    color: "#E8F5E9",
    title: "AI-Powered Study Plans",
    desc: "Gemini AI generates personalized timetables based on your exam dates."
  },
  {
    icon: "📅",
    color: "#E0F2F1",
    title: "Calendar Sync",
    desc: "Study sessions added to Google Calendar with reminders."
  },
  {
    icon: "📊",
    color: "#FFF3E0",
    title: "Progress Analytics",
    desc: "Track your study hours and performance across all subjects."
  },
  {
    icon: "🧠",
    color: "#FCE4EC",
    title: "PDF Summarizer",
    desc: "Upload notes and get instant AI-generated summaries."
  },
];

export default function AuthPage() {
  const [tab, setTab]         = useState("login");
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [password, setPass]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const clearError = () => setError("");

  const handleGoogle = async () => {
    setLoading(true);
    setError("");
    try {
      await signInWithGoogle();
      toast.success("Signed in with Google!");
    } catch (err) {
      setError(err.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (tab === "login") {
        await loginWithEmail(email, password);
        toast.success("Welcome back!");
      } else {
        if (!name.trim()) { setError("Please enter your name"); setLoading(false); return; }
        if (password.length < 6) { setError("Password must be at least 6 characters"); setLoading(false); return; }
        await registerWithEmail(email, password, name.trim());
        toast.success("Account created! Welcome aboard 🎉");
      }
    } catch (err) {
      const msg = err.message || "";
      if (msg.includes("email-already-in-use"))   setError("This email is already registered. Try logging in.");
      else if (msg.includes("user-not-found"))    setError("No account found with this email.");
      else if (msg.includes("wrong-password"))    setError("Incorrect password. Please try again.");
      else if (msg.includes("invalid-email"))     setError("Please enter a valid email address.");
      else if (msg.includes("weak-password"))     setError("Password should be at least 6 characters.");
      else                                         setError(msg || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Background Animated Shapes */}
      <div className="bg-shapes">
        <motion.div 
          className="shape shape-1"
          animate={{ y: [0, -30, 0], rotate: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
        />
        <motion.div 
          className="shape shape-2"
          animate={{ y: [0, 40, 0], x: [0, -20, 0], rotate: [0, -15, 0] }}
          transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
        />
        <motion.div 
          className="shape shape-3"
          animate={{ scale: [1, 1.1, 1], rotate: [0, 90, 0] }}
          transition={{ repeat: Infinity, duration: 10, ease: "easeInOut" }}
        />
      </div>

      <div className="auth-container">
        
        {/* Top Navigation / Brand */}
        <div className="auth-header">
          <div className="auth-brand">
            <div className="auth-brand-icon">🎓</div>
            <span className="auth-brand-name">MLH Project</span>
          </div>
        </div>

        {/* Hero Section */}
        <div className="auth-hero animate-fade-up">
          <h1 className="auth-hero-title">YOUR HOME FOR<br />AI LEARNING</h1>
          <p className="auth-hero-subtitle">
            Plan, summarize, and dominate your exams with intelligent scheduling.
          </p>
        </div>

        {/* Main Content Area */}
        <div className="auth-content">
          
          {/* Form Card */}
          <motion.div 
            className="auth-card"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="auth-tabs">
              <button className={`auth-tab ${tab === "login" ? "active" : ""}`}    onClick={() => { setTab("login");    clearError(); }}>Sign In</button>
              <button className={`auth-tab ${tab === "register" ? "active" : ""}`} onClick={() => { setTab("register"); clearError(); }}>Create Account</button>
            </div>

            <button className="btn-google" onClick={handleGoogle} disabled={loading}>
              <svg className="google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <div className="auth-divider">or with email</div>

            <AnimatePresence>
              {error && (
                <motion.div
                  className="auth-error"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  ⚠️ {error}
                </motion.div>
              )}
            </AnimatePresence>

            <form className="auth-form" onSubmit={handleSubmit}>
              <AnimatePresence>
                {tab === "register" && (
                  <motion.div
                    className="form-group"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: "hidden" }}
                  >
                    <label className="form-label">Full Name</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required={tab === "register"}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  className="input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  className="input"
                  type="password"
                  placeholder={tab === "register" ? "Min. 6 characters" : "Enter your password"}
                  value={password}
                  onChange={(e) => setPass(e.target.value)}
                  required
                />
              </div>

              <button className="btn btn-primary auth-submit" type="submit" disabled={loading}>
                {loading ? (
                  <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2, borderTopColor: "#fff", borderColor: "rgba(255,255,255,0.2)" }} /> Processing...</>
                ) : (
                  tab === "login" ? "Sign In →" : "Create Account →"
                )}
              </button>
            </form>
          </motion.div>

          {/* Features Grid */}
          <motion.div 
            className="auth-features-grid"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {FEATURES.map((f, i) => (
              <div key={i} className="feature-card">
                <div className="feature-icon" style={{ background: f.color }}>{f.icon}</div>
                <div className="feature-text">
                  <h4>{f.title}</h4>
                  <p>{f.desc}</p>
                </div>
              </div>
            ))}
          </motion.div>

        </div>
      </div>
    </div>
  );
}
