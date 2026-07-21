import React from "react";
import { useAuth } from "@/lib/auth";
import { useGetSchoolDashboard } from "@workspace/api-client-react";
import { DashboardSkeleton } from "@/components/ui/skeletons";
import { StatCard } from "@/components/ui/stat-card";
import { Users, GraduationCap, CalendarCheck, CreditCard, Megaphone, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function SchoolDashboardPage() {
  const { user } = useAuth();
  const schoolId = user?.schoolId!;
  
  const { data, isLoading } = useGetSchoolDashboard(schoolId, {
    query: { queryKey: ["school-dashboard", schoolId] }
  });

  if (isLoading || !data) return <DashboardSkeleton />;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          Good morning, {user?.name?.split(' ')[0] || "Admin"}
        </h2>
        <p className="text-muted-foreground">Here is what's happening at your school today.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Students"
          value={data.studentCount.toLocaleString()}
          icon={Users}
        />
        <StatCard
          title="Total Teachers"
          value={data.teacherCount.toLocaleString()}
          icon={GraduationCap}
        />
        <StatCard
          title="Attendance Today"
          value={`${data.attendanceToday}%`}
          icon={CalendarCheck}
          trend={{ value: 2.4, isPositive: data.attendanceToday > 90 }}
        />
        <StatCard
          title="Fees Collected"
          value={formatCurrency(data.feesCollected)}
          icon={CreditCard}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 border-border/50">
          <CardHeader>
            <CardTitle>Attendance Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.recentAttendance || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { weekday: 'short' })}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                    labelFormatter={(val) => formatDate(val)}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="percentage" 
                    name="Attendance %" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: "hsl(var(--primary))" }} 
                    activeDot={{ r: 6 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Recent Notices</CardTitle>
            <div className="p-2 bg-secondary/20 rounded-full">
              <Megaphone className="h-4 w-4 text-secondary-foreground" />
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <div className="space-y-4 flex-1">
              {!data.announcements || data.announcements.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground py-8">
                  <Megaphone className="h-8 w-8 mb-2 opacity-20" />
                  <p className="text-sm">No recent announcements</p>
                </div>
              ) : (
                data.announcements.slice(0, 4).map((ann) => (
                  <div key={ann.id} className="border-b last:border-0 pb-3 last:pb-0">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-medium text-sm leading-tight">{ann.title}</h4>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                        {new Date(ann.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{ann.content}</p>
                    <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded bg-muted uppercase font-medium">
                      {ann.audience}
                    </span>
                  </div>
                ))
              )}
            </div>
            <Link href={`/school/${schoolId}/announcements`} className="mt-4 pt-4 border-t block">
              <Button variant="ghost" className="w-full justify-between text-muted-foreground hover:text-foreground">
                View all announcements <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
