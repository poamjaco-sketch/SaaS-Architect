import React from "react";
import { useAuth } from "@/lib/auth";
import { useGetParentChildren } from "@workspace/api-client-react";
import { DashboardSkeleton } from "@/components/ui/skeletons";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, CalendarCheck, CreditCard, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { formatCurrency } from "@/lib/utils";

export default function ParentDashboard() {
  const { user } = useAuth();
  const { data: children, isLoading } = useGetParentChildren({
    query: { queryKey: ["parent-children"] }
  });

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          Welcome, {user?.name?.split(' ')[0] || "Parent"}
        </h2>
        <p className="text-muted-foreground">Monitor your children's academic progress and records.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {!children || children.length === 0 ? (
          <Card className="md:col-span-2 border-border/50">
            <CardContent className="p-12 text-center text-muted-foreground">
              <p>No children linked to your account yet.</p>
              <p className="text-sm mt-2">Please contact the school administration.</p>
            </CardContent>
          </Card>
        ) : (
          children.map((child) => (
            <Card key={child.id} className="border-border/50 overflow-hidden group">
              <div className="h-2 w-full bg-primary" />
              <CardHeader className="pb-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl shadow-inner border-2 border-background">
                    {child.firstName[0]}{child.lastName[0]}
                  </div>
                  <div>
                    <CardTitle className="text-xl">{child.firstName} {child.lastName}</CardTitle>
                    <CardDescription className="text-sm font-medium mt-1 text-foreground/80">
                      {child.className} &bull; {child.schoolName}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-3 gap-2 text-center border rounded-lg p-3 bg-muted/20">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Average</p>
                    <p className="font-mono font-bold text-lg">{child.averageScore || 0}%</p>
                  </div>
                  <div className="border-x">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Attendance</p>
                    <p className="font-mono font-bold text-lg">{child.attendanceRate || 0}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Fee Balance</p>
                    <p className={`font-mono font-bold text-lg ${(child.feesBalance || 0) > 0 ? "text-destructive" : "text-green-600"}`}>
                      {formatCurrency(child.feesBalance || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="bg-muted/30 border-t p-0">
                <div className="grid grid-cols-3 w-full divide-x">
                  <Link href={`/parent/results?studentId=${child.id}`}>
                    <Button variant="ghost" className="w-full h-12 rounded-none text-muted-foreground hover:text-foreground">
                      <BookOpen className="h-4 w-4 mr-2" /> Results
                    </Button>
                  </Link>
                  <Link href={`/parent/attendance?studentId=${child.id}`}>
                    <Button variant="ghost" className="w-full h-12 rounded-none text-muted-foreground hover:text-foreground">
                      <CalendarCheck className="h-4 w-4 mr-2" /> Attend.
                    </Button>
                  </Link>
                  <Link href={`/parent/fees?studentId=${child.id}`}>
                    <Button variant="ghost" className="w-full h-12 rounded-none text-muted-foreground hover:text-foreground">
                      <CreditCard className="h-4 w-4 mr-2" /> Fees
                    </Button>
                  </Link>
                </div>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
