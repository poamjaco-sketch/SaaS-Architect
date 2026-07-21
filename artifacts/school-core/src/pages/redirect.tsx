import React, { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

export default function RoleRedirect() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        setLocation("/login");
      } else {
        switch (user.role) {
          case "super_admin":
            setLocation("/super-admin");
            break;
          case "school_admin":
            if (user.schoolId) {
              setLocation(`/school/${user.schoolId}`);
            } else {
              // Should not happen in real app
              setLocation("/login");
            }
            break;
          case "teacher":
            setLocation("/teacher");
            break;
          case "parent":
            setLocation("/parent");
            break;
          default:
            setLocation("/login");
        }
      }
    }
  }, [user, isLoading, setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p>Loading your portal...</p>
      </div>
    </div>
  );
}
