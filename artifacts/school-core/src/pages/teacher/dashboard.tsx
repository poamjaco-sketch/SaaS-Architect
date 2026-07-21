import React from "react";
import { useAuth } from "@/lib/auth";
import { useGetTeacherDashboard } from "@workspace/api-client-react";
import { DashboardSkeleton } from "@/components/ui/skeletons";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, CalendarCheck, Clock, Users } from "lucide-react";
import { Link } from "wouter";

export default function TeacherDashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useGetTeacherDashboard({
    query: { queryKey: ["teacher-dashboard"] }
  });

  if (isLoading || !data) return <DashboardSkeleton />;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          Good morning, {data.teacher.firstName}
        </h2>
        <p className="text-muted-foreground">Here is your schedule for today.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 border-border/50">
          <CardHeader>
            <CardTitle>Today's Classes</CardTitle>
            <CardDescription>Your assigned sessions for the day</CardDescription>
          </CardHeader>
          <CardContent>
            {data.todaysClasses.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-muted-foreground border rounded-lg border-dashed bg-muted/20">
                <CalendarCheck className="h-10 w-10 mb-2 opacity-50" />
                <p>No classes scheduled for today.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {data.todaysClasses.map((cls, idx) => (
                  <div key={cls.id} className="flex items-center justify-between p-4 border rounded-lg hover:border-primary/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className="font-bold text-lg">{cls.name}</h4>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {cls.studentCount || 0} Students</span>
                          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> 45 mins</span>
                        </div>
                      </div>
                    </div>
                    <div className="hidden sm:flex gap-2">
                      <Link href={`/school/${cls.schoolId}/attendance?classId=${cls.id}`}>
                        <Button variant="outline" size="sm" className="hover-elevate">Take Attendance</Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-sidebar text-sidebar-foreground">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href={`/school/${data.teacher.schoolId}/attendance`}>
              <Button variant="secondary" className="w-full justify-start hover-elevate">
                <CalendarCheck className="mr-3 h-4 w-4" /> Record Attendance
              </Button>
            </Link>
            <Link href={`/school/${data.teacher.schoolId}/results`}>
              <Button variant="secondary" className="w-full justify-start hover-elevate">
                <BookOpen className="mr-3 h-4 w-4" /> Enter Results
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
