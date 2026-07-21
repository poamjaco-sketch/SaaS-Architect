import React from "react";
import { useGetSuperAdminDashboard } from "@workspace/api-client-react";
import { StatCard } from "@/components/ui/stat-card";
import { DashboardSkeleton } from "@/components/ui/skeletons";
import { StatusBadge } from "@/components/ui/status-badge";
import { Building2, Users, GraduationCap, CreditCard, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Link } from "wouter";

export default function SuperAdminDashboard() {
  const { data, isLoading } = useGetSuperAdminDashboard({
    query: {
      queryKey: ["super-admin-dashboard"]
    }
  });

  if (isLoading || !data) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Schools"
          value={data.totalSchools}
          icon={Building2}
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title="Active Students"
          value={data.activeStudents.toLocaleString()}
          icon={Users}
          trend={{ value: 5.2, isPositive: true }}
        />
        <StatCard
          title="Total Teachers"
          value={data.totalTeachers.toLocaleString()}
          icon={GraduationCap}
        />
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(data.monthlyRevenue)}
          icon={CreditCard}
          trend={{ value: 18.4, isPositive: true }}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Schools</CardTitle>
              <CardDescription>Latest institutions joined the platform</CardDescription>
            </div>
            <Link href="/super-admin/schools">
              <Button variant="outline" size="sm" className="hidden sm:flex hover-elevate">
                View All <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>School</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentSchools.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        No schools found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.recentSchools.map((school) => (
                      <TableRow key={school.id} className="group">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase">
                              {school.name.substring(0, 2)}
                            </div>
                            <div className="flex flex-col">
                              <span>{school.name}</span>
                              <span className="text-xs text-muted-foreground font-normal">
                                Joined {formatDate(school.createdAt)}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{school.location}</TableCell>
                        <TableCell>
                          <span className="capitalize text-sm font-medium">{school.plan}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <StatusBadge status={school.status} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Plan Distribution</CardTitle>
            <CardDescription>Schools by subscription tier</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(data.schoolsByPlan || {}).map(([plan, count]) => (
                <div key={plan} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      plan === 'enterprise' ? 'bg-primary' : 
                      plan === 'professional' ? 'bg-secondary' : 'bg-muted-foreground'
                    }`} />
                    <span className="capitalize font-medium text-sm">{plan}</span>
                  </div>
                  <span className="font-mono text-sm">{count}</span>
                </div>
              ))}
            </div>
            
            <div className="mt-8 pt-6 border-t">
              <Button className="w-full hover-elevate">Generate Report</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
