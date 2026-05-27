import { createContext, useContext, useEffect, useState } from "react";
import { clearSession, getStoredSession, saveSession } from "../services/authStorage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState({
    isLoading: true,
    token: null,
    role: null,
    user: null,
  });

  useEffect(() => {
    const bootstrap = async () => {
      const storedSession = await getStoredSession();

      setSession({
        isLoading: false,
        token: storedSession?.token ?? null,
        role: storedSession?.role ?? null,
        user: storedSession?.user ?? null,
      });
    };

    bootstrap();
  }, []);

  const value = {
    session,
    signIn: async ({ token, user }) => {
      await saveSession({ token, user });
      setSession({
        isLoading: false,
        token,
        role: user?.rol ?? null,
        user: user ?? null,
      });
    },
    signOut: async () => {
      await clearSession();
      setSession({
        isLoading: false,
        token: null,
        role: null,
        user: null,
      });
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }

  return context;
}
