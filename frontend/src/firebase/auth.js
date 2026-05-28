import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyBV82BpABaT5ceaMKDH2wgZaw5iJ4m4WIw",
  authDomain: "mlh-project-aistudyplanner.firebaseapp.com",
  projectId: "mlh-project-aistudyplanner",
  storageBucket: "mlh-project-aistudyplanner.firebasestorage.app",
  messagingSenderId: "448831905315",
  appId: "1:448831905315:web:d0f7eb0e26992409371b96",
  measurementId: "G-ZCPH5CSB2V"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// ── Auth helpers ─────────────────────────────────────────────────────────────

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);

export const loginWithEmail = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);

export const registerWithEmail = async (email, password, displayName) => {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(result.user, { displayName });
  return result;
};

export const logout = () => signOut(auth);

export const onAuthChange = (callback) => onAuthStateChanged(auth, callback);

export const getIdToken = async () => {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken(false);
};
