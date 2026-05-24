import { createContext, useContext, useState, useEffect } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

const AuthContext = createContext(null);

const ADMIN_EMAILS = [
  "mateusbpugli@gmail.com",
  ...(process.env.REACT_APP_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
];

function isAdminEmail(email) {
  return ADMIN_EMAILS.includes((email || "").toLowerCase());
}

async function buildUser(firebaseUser) {
  if (!firebaseUser) return false;

  const ref = doc(db, "users", firebaseUser.uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const data = snap.data();

    return {
      id: firebaseUser.uid,
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      name: data.name || firebaseUser.displayName || firebaseUser.email,
      phone: data.phone || "",
      role: isAdminEmail(firebaseUser.email) ? "admin" : data.role || "user",
      ...data,
    };
  }

  const newUser = {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    name: firebaseUser.displayName || firebaseUser.email,
    phone: "",
    role: isAdminEmail(firebaseUser.email) ? "admin" : "user",
    created_at: new Date().toISOString(),
  };

  await setDoc(ref, newUser);

  return {
    id: firebaseUser.uid,
    ...newUser,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        const builtUser = await buildUser(firebaseUser);
        setUser(builtUser);
      } catch (err) {
        console.error("Erro ao carregar usuário:", err);
        setUser(false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const builtUser = await buildUser(credential.user);
    setUser(builtUser);
    return builtUser;
  };

  const register = async ({ name, email, password, phone }) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);

    await updateProfile(credential.user, {
      displayName: name,
    });

    const userData = {
      uid: credential.user.uid,
      email,
      name,
      phone: phone || "",
      role: isAdminEmail(email) ? "admin" : "user",
      created_at: new Date().toISOString(),
    };

    await setDoc(doc(db, "users", credential.user.uid), userData);

    const finalUser = {
      id: credential.user.uid,
      ...userData,
    };

    setUser(finalUser);
    return finalUser;
  };

  const logout = async () => {
    await signOut(auth);
    setUser(false);
  };

  const setUserDirect = (userData) => {
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUserDirect }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
