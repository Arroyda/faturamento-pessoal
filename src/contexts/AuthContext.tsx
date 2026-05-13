import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { UserProfile } from "@/types";
import {
  changePassword as svcChangePassword,
  currentProfile,
  login as svcLogin,
  logout as svcLogout,
  register as svcRegister,
  updateProfile as svcUpdateProfile,
} from "@/store/auth";

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(currentProfile());
    setLoading(false);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const profile = await svcLogin(email, password);
    setUser(profile);
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    const profile = await svcRegister(email, password, displayName);
    setUser(profile);
  }, []);

  const logout = useCallback(() => {
    svcLogout();
    setUser(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    setUser(currentProfile());
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await svcChangePassword(currentPassword, newPassword);
  }, []);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    const profile = svcUpdateProfile(updates);
    setUser(profile);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, signIn, signUp, logout, refreshProfile, changePassword, updateProfile }),
    [user, loading, signIn, signUp, logout, refreshProfile, changePassword, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de AuthProvider");
  return ctx;
}
