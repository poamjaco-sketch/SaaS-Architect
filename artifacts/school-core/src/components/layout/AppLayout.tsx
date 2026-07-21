import React from "react";
import { useAuth } from "@/lib/auth";
import { Link, useLocation } from "wouter";
import { 
  Building2, 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  BookOpen, 
  CalendarCheck, 
  FileText, 
  CreditCard, 
  Megaphone,
  Settings,
  LogOut,
  Menu,
  X,
  TrendingUp,
  ShieldCheck,
  Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  if (!user) return null; // Or a full screen loader

  const isSuperAdmin = user.role === "super_admin";
  const isSchoolAdmin = user.role === "school_admin";
  const isTeacher = user.role === "teacher";
  const isParent = user.role === "parent";

  const getNavItems = () => {
    if (isSuperAdmin) {
      return [
        { name: "Dashboard", href: "/super-admin", icon: LayoutDashboard },
        { name: "Schools", href: "/super-admin/schools", icon: Building2 },
        { name: "Analytics", href: "/super-admin/analytics", icon: TrendingUp },
        // Placeholder links below
        { name: "Users", href: "/super-admin/users", icon: Users },
        { name: "Billing", href: "/super-admin/billing", icon: CreditCard },
        { name: "Security", href: "/super-admin/security", icon: ShieldCheck },
        { name: "Settings", href: "/super-admin/settings", icon: Settings },
      ];
    }
    if (isSchoolAdmin && user.schoolId) {
      const base = `/school/${user.schoolId}`;
      return [
        { name: "Dashboard", href: base, icon: LayoutDashboard },
        { name: "Students", href: `${base}/students`, icon: Users },
        { name: "Teachers", href: `${base}/teachers`, icon: GraduationCap },
        { name: "Classes", href: `${base}/classes`, icon: Building2 },
        { name: "Subjects", href: `${base}/subjects`, icon: BookOpen },
        { name: "Attendance", href: `${base}/attendance`, icon: CalendarCheck },
        { name: "Results", href: `${base}/results`, icon: FileText },
        { name: "Fees", href: `${base}/fees`, icon: CreditCard },
        { name: "Announcements", href: `${base}/announcements`, icon: Megaphone },
        { name: "Settings", href: `${base}/settings`, icon: Settings },
      ];
    }
    if (isTeacher) {
      return [
        { name: "Dashboard", href: "/teacher", icon: LayoutDashboard },
        // Additional teacher links would go here
      ];
    }
    if (isParent) {
      return [
        { name: "Portal Home", href: "/parent", icon: LayoutDashboard },
        { name: "Results", href: "/parent/results", icon: FileText },
        { name: "Attendance", href: "/parent/attendance", icon: CalendarCheck },
        { name: "Fees", href: "/parent/fees", icon: CreditCard },
      ];
    }
    return [];
  };

  const navItems = getNavItems();

  const NavLinks = () => (
    <div className="flex flex-col space-y-1 py-4">
      {navItems.map((item) => {
        const isActive = location === item.href || (location.startsWith(item.href) && item.href !== "/super-admin" && item.href !== `/school/${user.schoolId}` && item.href !== "/teacher" && item.href !== "/parent");
        return (
          <Link key={item.name} href={item.href} onClick={() => setIsMobileOpen(false)}>
            <div
              className={`flex items-center gap-3 px-4 py-3 mx-3 rounded-md transition-colors cursor-pointer ${
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <div className="w-8 h-8 rounded bg-sidebar-primary flex items-center justify-center text-white">
            <GraduationCap className="h-5 w-5" />
          </div>
          SchoolCore
        </div>
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 bg-sidebar border-r-sidebar-border w-72">
            <div className="flex flex-col h-full">
              <div className="p-6 border-b border-sidebar-border">
                <div className="flex items-center gap-2 font-bold text-2xl text-sidebar-foreground">
                  <div className="w-8 h-8 rounded bg-sidebar-primary flex items-center justify-center text-white">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  SchoolCore
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <NavLinks />
              </div>
              <div className="p-4 border-t border-sidebar-border">
                <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-white" onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-sidebar border-r border-sidebar-border text-sidebar-foreground">
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-2 font-bold text-2xl tracking-tight">
            <div className="w-8 h-8 rounded bg-sidebar-primary flex items-center justify-center text-white shadow-sm">
              <GraduationCap className="h-5 w-5" />
            </div>
            SchoolCore
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          <NavLinks />
        </div>
        <div className="p-4 border-t border-sidebar-border bg-sidebar/50">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-sidebar-accent flex items-center justify-center font-bold text-sm border border-sidebar-border">
              {user.name?.charAt(0) || user.phone?.slice(-1)}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate text-sidebar-foreground">{user.name || "User"}</span>
              <span className="text-xs text-sidebar-foreground/60 capitalize truncate">{user.role.replace('_', ' ')}</span>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="hidden md:flex h-16 border-b bg-card items-center justify-between px-8 shrink-0">
          <h1 className="font-semibold text-foreground tracking-tight capitalize">
            {location.split('/').pop()?.replace('-', ' ') || "Dashboard"}
          </h1>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-muted-foreground relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full border border-card"></span>
            </Button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
