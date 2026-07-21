import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "@workspace/api-client-react";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

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
  
  const { data: meData, isLoading, isError } = useGetMe({
    query: {
      retry: false,
      refetchOnWindowFocus: false,
    }
  });

  useEffect(() => {
    if (meData) {
      setUser(meData);
    }
    if (isError) {
      setUser(null);
    }
  }, [meData, isError]);

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        setUser(null);
        setLocation("/login");
        toast.success("Logged out successfully");
      },
      onError: () => {
        setUser(null);
        setLocation("/login");
      }
    });
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, logout: handleLogout, setUser }}>
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
