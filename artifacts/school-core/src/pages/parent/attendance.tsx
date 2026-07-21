import React, { useState } from "react";
import { useGetParentChildren, useGetChildAttendance } from "@workspace/api-client-react";
import { DashboardSkeleton } from "@/components/ui/skeletons";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export default function ParentAttendancePage() {
  const { data: children, isLoading: childrenLoading } = useGetParentChildren({
    query: { queryKey: ["parent-children"] }
  });

  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);

  React.useEffect(() => {
    if (children && children.length > 0 && !selectedChildId) {
      setSelectedChildId(children[0].id);
    }
  }, [children, selectedChildId]);

  const { data: attendanceData, isLoading: attendanceLoading } = useGetChildAttendance(
    selectedChildId || 0,
    { query: { enabled: !!selectedChildId, queryKey: ["child-attendance", selectedChildId] } }
  );

  if (childrenLoading) return <DashboardSkeleton />;

  const pieData = [
    { name: 'Present', value: attendanceData?.presentCount || 0, color: 'hsl(var(--primary))' },
    { name: 'Absent', value: attendanceData?.absentCount || 0, color: 'hsl(var(--destructive))' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Attendance Record</h2>
          <p className="text-muted-foreground text-sm">Monitor your child's presence at school.</p>
        </div>
        
        {children && children.length > 1 && (
          <div className="w-full sm:w-auto">
            <Select value={selectedChildId?.toString()} onValueChange={(v) => setSelectedChildId(Number(v))}>
              <SelectTrigger className="w-full sm:w-[200px] bg-card">
                <SelectValue placeholder="Select child" />
              </SelectTrigger>
              <SelectContent>
                {children.map(c => (
                  <SelectItem key={c.id} value={c.id.toString()}>{c.firstName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {attendanceLoading && selectedChildId ? (
        <DashboardSkeleton />
      ) : attendanceData ? (
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-1 border-border/50 h-fit">
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="text-center mt-[-20px] mb-6">
                <p className="text-3xl font-bold font-mono">{attendanceData.percentage}%</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Attendance Rate</p>
              </div>
              <div className="w-full grid grid-cols-2 gap-2 text-center mt-4">
                <div className="bg-muted p-2 rounded">
                  <p className="text-sm font-medium">{attendanceData.presentCount || 0}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Present</p>
                </div>
                <div className="bg-muted p-2 rounded">
                  <p className="text-sm font-medium text-destructive">{attendanceData.absentCount || 0}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Absent</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 border-border/50">
            <CardHeader>
              <CardTitle>Recent History</CardTitle>
              <CardDescription>Daily attendance logs</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="py-4">Date</TableHead>
                    <TableHead className="text-right py-4">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!attendanceData.records || attendanceData.records.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="h-32 text-center text-muted-foreground">
                        No attendance records available.
                      </TableCell>
                    </TableRow>
                  ) : (
                    attendanceData.records.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{formatDate(record.date)}</TableCell>
                        <TableCell className="text-right"><StatusBadge status={record.status} /></TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
