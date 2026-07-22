import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "@workspace/api-client-react";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

// Configure the token getter so every API call includes the Authorization header
setAuthTokenGetter(() => localStorage.getItem("schoolcore_token"));

const TOKEN_KEY = "schoolcore_token";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function storeToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  logout: () => void;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [, setLocation] = useLocation();
  const logoutMutation = useLogout();

  // Only fetch /auth/me if we have a token in storage
  const hasToken = !!getStoredToken();

  const { data: meData, isLoading, isError } = useGetMe({
    query: {
      enabled: hasToken,
      retry: false,
      refetchOnWindowFocus: false,
    },
  });

  useEffect(() => {
    if (meData) {
      setUser(meData);
    }
    if (isError) {
      clearToken();
      setUser(null);
    }
  }, [meData, isError]);

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        clearToken();
        setUser(null);
        setLocation("/login");
        toast.success("Logged out successfully");
      },
      onError: () => {
        clearToken();
        setUser(null);
        setLocation("/login");
      },
    });
  };

  // If no token, we're not loading — resolve immediately
  const effectiveLoading = hasToken ? isLoading : false;

  return (
    <AuthContext.Provider value={{ user, isLoading: effectiveLoading, logout: handleLogout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
