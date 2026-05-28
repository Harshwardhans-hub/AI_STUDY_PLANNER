import { createContext, useContext, useEffect, useState, useRef } from "react";
import { onAuthChange, logout as firebaseLogout } from "../firebase/auth";
import { authApi } from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [dbUser,       setDbUser]       = useState(null);
  // Only blocks on the fast Firebase SDK call, NOT the backend
  const [loading,      setLoading]      = useState(true);
  const verifyRef = useRef(null); // prevent double-verify on HMR

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setFirebaseUser(user);
      setLoading(false); // Unblock immediately — Firebase SDK is local & instant

      if (user) {
        // Cancel any existing in-flight verify request
        if (verifyRef.current) clearTimeout(verifyRef.current);

        // Fire-and-forget: verify with backend in background
        // Use short timeout + retry once
        const doVerify = async (attempt = 1) => {
          try {
            const res = await authApi.post("/auth/verify");
            setDbUser(res.data.data);
          } catch (err) {
            if (attempt === 1 && err.message?.includes("timeout")) {
              // Retry once after 1 second on timeout
              verifyRef.current = setTimeout(() => doVerify(2), 1000);
            } else {
              // Non-critical — app still works with Firebase user data
              console.warn("Backend sync failed (non-critical):", err.message);
            }
          }
        };

        doVerify();
      } else {
        setDbUser(null);
        if (verifyRef.current) clearTimeout(verifyRef.current);
      }
    });

    return () => {
      unsubscribe();
      if (verifyRef.current) clearTimeout(verifyRef.current);
    };
  }, []);

  const logout = async () => {
    await firebaseLogout();
    setDbUser(null);
    setFirebaseUser(null);
  };

  return (
    <AuthContext.Provider value={{ firebaseUser, dbUser, loading, logout, setDbUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
