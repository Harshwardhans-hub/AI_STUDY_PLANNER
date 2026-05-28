import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Toaster } from "react-hot-toast";

import AuthPage        from "./pages/AuthPage";
import DashboardLayout from "./components/layout/DashboardLayout";
import Dashboard       from "./pages/Dashboard";
import Subjects        from "./pages/Subjects";
import Planner         from "./pages/Planner";
import Progress        from "./pages/Progress";
import AISummarizer    from "./pages/AISummarizer";

import AIChat          from "./pages/AIChat";
import Flashcards      from "./pages/Flashcards";
import Calendar        from "./pages/Calendar";


import "./index.css";
import "./styles/app.css";

const ProtectedRoute = ({ children }) => {
  const { firebaseUser, loading } = useAuth();
  if (loading) return (
    <div className="page-loader">
      <div className="spinner" />
    </div>
  );
  return firebaseUser ? children : <Navigate to="/auth" replace />;
};

const PublicRoute = ({ children }) => {
  const { firebaseUser, loading } = useAuth();
  if (loading) return (
    <div className="page-loader">
      <div className="spinner" />
    </div>
  );
  return !firebaseUser ? children : <Navigate to="/" replace />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={
        <PublicRoute><AuthPage /></PublicRoute>
      } />
      <Route path="/" element={
        <ProtectedRoute>
          <DashboardLayout />
        </ProtectedRoute>
      }>
        <Route index            element={<Dashboard />} />
        <Route path="subjects"  element={<Subjects />} />
        <Route path="planner"   element={<Planner />} />
        <Route path="progress"  element={<Progress />} />
        <Route path="calendar"  element={<Calendar />} />
        <Route path="chat"      element={<AIChat />} />
        <Route path="flashcards" element={<Flashcards />} />
        <Route path="summarizer" element={<AISummarizer />} />


      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="bg-gradient-radial" />
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background:   "var(--bg-elevated)",
              color:        "var(--text-primary)",
              border:       "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              fontFamily:   "var(--font-body)",
              fontSize:     "0.875rem",
            },
            success: { iconTheme: { primary: "var(--success)", secondary: "#fff" } },
            error:   { iconTheme: { primary: "var(--danger)",  secondary: "#fff" } },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}
