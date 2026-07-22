import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, Router as WouterRouter } from "wouter";
import { AuthProvider, useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/AppLayout";
import NotFound from "@/pages/not-found";

// Pages
import Login from "@/pages/login";
import RoleRedirect from "@/pages/redirect";
import SuperAdminDashboard from "@/pages/super-admin/dashboard";
import SchoolsPage from "@/pages/super-admin/schools";
import AnalyticsPage from "@/pages/super-admin/analytics";
import SchoolDashboardPage from "@/pages/school/dashboard";
import StudentsPage from "@/pages/school/students";
import StudentDetailPage from "@/pages/school/student-detail";
import TeachersPage from "@/pages/school/teachers";
import ClassesPage from "@/pages/school/classes";
import SubjectsPage from "@/pages/school/subjects";
import AttendancePage from "@/pages/school/attendance";
import ResultsPage from "@/pages/school/results";
import FeesPage from "@/pages/school/fees";
import AnnouncementsPage from "@/pages/school/announcements";
import TeacherDashboard from "@/pages/teacher/dashboard";
import ParentDashboard from "@/pages/parent/dashboard";
import ParentResultsPage from "@/pages/parent/results";
import ParentAttendancePage from "@/pages/parent/attendance";
import ParentFeesPage from "@/pages/parent/fees";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) {
    window.location.replace(import.meta.env.BASE_URL + "login");
    return null;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <NotFound />;
  }
  return <AppLayout>{children}</AppLayout>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={RoleRedirect} />
      <Route path="/login" component={Login} />

      {/* Super Admin */}
      <Route path="/super-admin">
        <ProtectedRoute allowedRoles={["super_admin"]}>
          <SuperAdminDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/super-admin/schools">
        <ProtectedRoute allowedRoles={["super_admin"]}>
          <SchoolsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/super-admin/analytics">
        <ProtectedRoute allowedRoles={["super_admin"]}>
          <AnalyticsPage />
        </ProtectedRoute>
      </Route>

      {/* School Admin — dynamic schoolId */}
      <Route path="/school/:schoolId">
        <ProtectedRoute allowedRoles={["school_admin", "teacher"]}>
          <SchoolDashboardPage />
        </ProtectedRoute>
      </Route>
      <Route path="/school/:schoolId/students">
        <ProtectedRoute allowedRoles={["school_admin", "teacher"]}>
          <StudentsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/school/:schoolId/students/:studentId">
        <ProtectedRoute allowedRoles={["school_admin", "teacher"]}>
          <StudentDetailPage />
        </ProtectedRoute>
      </Route>
      <Route path="/school/:schoolId/teachers">
        <ProtectedRoute allowedRoles={["school_admin"]}>
          <TeachersPage />
        </ProtectedRoute>
      </Route>
      <Route path="/school/:schoolId/classes">
        <ProtectedRoute allowedRoles={["school_admin"]}>
          <ClassesPage />
        </ProtectedRoute>
      </Route>
      <Route path="/school/:schoolId/subjects">
        <ProtectedRoute allowedRoles={["school_admin"]}>
          <SubjectsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/school/:schoolId/attendance">
        <ProtectedRoute allowedRoles={["school_admin", "teacher"]}>
          <AttendancePage />
        </ProtectedRoute>
      </Route>
      <Route path="/school/:schoolId/results">
        <ProtectedRoute allowedRoles={["school_admin", "teacher"]}>
          <ResultsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/school/:schoolId/fees">
        <ProtectedRoute allowedRoles={["school_admin"]}>
          <FeesPage />
        </ProtectedRoute>
      </Route>
      <Route path="/school/:schoolId/announcements">
        <ProtectedRoute allowedRoles={["school_admin"]}>
          <AnnouncementsPage />
        </ProtectedRoute>
      </Route>

      {/* Teacher Portal */}
      <Route path="/teacher">
        <ProtectedRoute allowedRoles={["teacher"]}>
          <TeacherDashboard />
        </ProtectedRoute>
      </Route>

      {/* Parent Portal */}
      <Route path="/parent">
        <ProtectedRoute allowedRoles={["parent"]}>
          <ParentDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/parent/results">
        <ProtectedRoute allowedRoles={["parent"]}>
          <ParentResultsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/parent/attendance">
        <ProtectedRoute allowedRoles={["parent"]}>
          <ParentAttendancePage />
        </ProtectedRoute>
      </Route>
      <Route path="/parent/fees">
        <ProtectedRoute allowedRoles={["parent"]}>
          <ParentFeesPage />
        </ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster richColors position="top-right" />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
