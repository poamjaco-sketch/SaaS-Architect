import React from "react";
import { useAuth } from "@/lib/auth";
import { useGetStudent, useListResults, useListAttendance, useListFees } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, User, Phone, MapPin, Calendar, BookOpen, GraduationCap, Clock, CreditCard } from "lucide-react";
import { DashboardSkeleton } from "@/components/ui/skeletons";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function StudentDetailPage() {
  const { user } = useAuth();
  const schoolId = user?.schoolId!;
  const params = useParams();
  const studentId = parseInt(params.studentId || "0");

  const { data: student, isLoading: isStudentLoading } = useGetStudent(schoolId, studentId, {
    query: { enabled: !!studentId, queryKey: ["student", schoolId, studentId] }
  });

  const { data: results } = useListResults(schoolId, { studentId }, {
    query: { enabled: !!studentId, queryKey: ["results", schoolId, studentId] }
  });

  const { data: attendance } = useListAttendance(schoolId, { studentId }, {
    query: { enabled: !!studentId, queryKey: ["attendance", schoolId, studentId] }
  });

  const { data: fees } = useListFees(schoolId, { studentId }, {
    query: { enabled: !!studentId, queryKey: ["fees", schoolId, studentId] }
  });

  if (isStudentLoading || !student) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/school/${schoolId}/students`}>
          <Button variant="outline" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Student Profile</h2>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1 border-border/50 h-fit">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-3xl shadow-inner border-4 border-background">
                {student.firstName[0]}{student.lastName[0]}
              </div>
              <div>
                <h3 className="text-xl font-bold">{student.firstName} {student.lastName}</h3>
                <p className="text-muted-foreground text-sm font-mono mt-1">ID: STU-{student.id.toString().padStart(4, '0')}</p>
                <div className="mt-2">
                  <StatusBadge status={student.status} />
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Class:</span> 
                <span className="ml-auto text-muted-foreground">{student.className || "Unassigned"}</span>
              </div>
              {student.dateOfBirth && (
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">DOB:</span> 
                  <span className="ml-auto text-muted-foreground">{formatDate(student.dateOfBirth)}</span>
                </div>
              )}
              {student.parentPhone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Parent ({student.parentRelationship}):</span> 
                  <span className="ml-auto text-muted-foreground">{student.parentPhone}</span>
                </div>
              )}
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Avg Score</p>
                <p className="text-lg font-bold font-mono">{student.averageScore || 0}%</p>
              </div>
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Attendance</p>
                <p className="text-lg font-bold font-mono">{student.attendanceRate || 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2">
          <Tabs defaultValue="results" className="w-full">
            <TabsList className="w-full grid grid-cols-3 mb-6 bg-card border">
              <TabsTrigger value="results" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <BookOpen className="h-4 w-4 mr-2" /> Results
              </TabsTrigger>
              <TabsTrigger value="attendance" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <Clock className="h-4 w-4 mr-2" /> Attendance
              </TabsTrigger>
              <TabsTrigger value="fees" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                <CreditCard className="h-4 w-4 mr-2" /> Fees
              </TabsTrigger>
            </TabsList>

            <TabsContent value="results" className="mt-0">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Academic Results</CardTitle>
                  <CardDescription>Recent performance across all subjects</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead>Term</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead className="text-right">Score</TableHead>
                        <TableHead className="text-center">Grade</TableHead>
                        <TableHead>Comment</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!results || results.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No results recorded yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        results.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium">{r.term}</TableCell>
                            <TableCell>{r.subjectName}</TableCell>
                            <TableCell className="text-right font-mono font-medium">{r.score}%</TableCell>
                            <TableCell className="text-center">
                              <span className={`inline-block w-8 py-1 rounded text-xs font-bold ${
                                r.grade === 'A' ? 'bg-green-100 text-green-800' :
                                r.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                                r.grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                                r.grade === 'D' ? 'bg-orange-100 text-orange-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {r.grade}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground italic">{r.comment || "-"}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="attendance" className="mt-0">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Attendance History</CardTitle>
                  <CardDescription>Recent daily attendance records</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!attendance || attendance.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                            No attendance recorded yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        attendance.map((a) => (
                          <TableRow key={a.id}>
                            <TableCell className="font-medium">{formatDate(a.date)}</TableCell>
                            <TableCell><StatusBadge status={a.status} /></TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="fees" className="mt-0">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Fee Records</CardTitle>
                  <CardDescription>Billing and payment history</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead>Term</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Billed</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!fees || fees.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No fee records found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        fees.map((f) => (
                          <TableRow key={f.id}>
                            <TableCell className="font-medium">{f.term}</TableCell>
                            <TableCell>{f.description || "School Fees"}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(f.amount)}</TableCell>
                            <TableCell className="text-right font-mono text-green-600">{formatCurrency(f.amountPaid || 0)}</TableCell>
                            <TableCell className={`text-right font-mono font-medium ${(f.balance || 0) > 0 ? "text-destructive" : ""}`}>
                              {formatCurrency(f.balance || 0)}
                            </TableCell>
                            <TableCell className="text-center"><StatusBadge status={f.status} /></TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
