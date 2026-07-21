import React, { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useListClasses, useListStudents, useListAttendance, useSubmitAttendance } from "@workspace/api-client-react";
import { TableSkeleton } from "@/components/ui/skeletons";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { CalendarCheck, Save, Search, Check, X, Clock } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

export default function AttendancePage() {
  const { user } = useAuth();
  const schoolId = user?.schoolId!;
  const queryClient = useQueryClient();
  
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  
  // State for recording attendance manually
  const [attendanceMap, setAttendanceMap] = useState<Record<number, "present" | "absent" | "late">>({});

  const { data: classes } = useListClasses(schoolId, { 
    query: { queryKey: ["classes", schoolId] } 
  });

  const { data: students, isLoading: studentsLoading } = useListStudents(
    schoolId,
    { classId: selectedClass ? Number(selectedClass) : undefined },
    { query: { enabled: !!selectedClass, queryKey: ["students", schoolId, "", selectedClass] } }
  );

  const { data: attendanceRecords, isLoading: attendanceLoading } = useListAttendance(
    schoolId,
    { classId: selectedClass ? Number(selectedClass) : undefined, date: selectedDate },
    { query: { enabled: !!selectedClass && !!selectedDate, queryKey: ["attendance", schoolId, selectedClass, selectedDate] } }
  );

  const submitMutation = useSubmitAttendance();

  // If we have existing records, use them, otherwise use students list to build the form
  const hasExistingRecords = attendanceRecords && attendanceRecords.length > 0;
  
  const handleStatusChange = (studentId: number, status: "present" | "absent" | "late") => {
    setAttendanceMap(prev => ({ ...prev, [studentId]: status }));
  };

  const handleMarkAll = (status: "present" | "absent") => {
    if (!students) return;
    const newMap: Record<number, "present" | "absent" | "late"> = {};
    students.forEach(s => {
      newMap[s.id] = status;
    });
    setAttendanceMap(newMap);
  };

  const handleSubmit = () => {
    if (!selectedClass || !selectedDate || !students) return;
    
    // Check if all students are marked
    const unmarked = students.filter(s => !attendanceMap[s.id]);
    if (unmarked.length > 0) {
      toast.error(`Please mark attendance for all students (${unmarked.length} remaining)`);
      return;
    }

    const records = Object.entries(attendanceMap).map(([id, status]) => ({
      studentId: Number(id),
      status
    }));

    submitMutation.mutate(
      { 
        schoolId, 
        data: { 
          classId: Number(selectedClass), 
          date: selectedDate, 
          records 
        } 
      },
      {
        onSuccess: () => {
          toast.success("Attendance saved successfully");
          queryClient.invalidateQueries({ queryKey: ["attendance", schoolId, selectedClass, selectedDate] });
        },
        onError: () => {
          toast.error("Failed to save attendance");
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Daily Attendance</h2>
        <p className="text-muted-foreground text-sm">Record and monitor class attendance.</p>
      </div>
      
      <Card className="border-border/50">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-1">
              <label className="text-sm font-medium">Select Class</label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a class" />
                </SelectTrigger>
                <SelectContent>
                  {classes?.map(c => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-sm font-medium">Date</label>
              <Input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)} 
                max={format(new Date(), "yyyy-MM-dd")}
              />
            </div>
            <div className="flex items-end">
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => {
                setAttendanceMap({});
                queryClient.invalidateQueries({ queryKey: ["attendance", schoolId, selectedClass, selectedDate] });
              }}>
                <Search className="mr-2 h-4 w-4" /> Load
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedClass ? (
        <div className="h-64 flex flex-col items-center justify-center text-muted-foreground border rounded-lg border-dashed bg-card/50">
          <CalendarCheck className="h-10 w-10 mb-2 opacity-50" />
          <p>Select a class and date to view or record attendance</p>
        </div>
      ) : studentsLoading || attendanceLoading ? (
        <TableSkeleton />
      ) : hasExistingRecords ? (
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
            <div>
              <CardTitle className="text-lg">Attendance Records</CardTitle>
              <CardDescription>Records for {format(new Date(selectedDate), "MMMM d, yyyy")}</CardDescription>
            </div>
            <StatusBadge status="Completed" className="bg-green-100 text-green-800" />
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead>Student</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceRecords?.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.studentName}</TableCell>
                    <TableCell><StatusBadge status={record.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : students && students.length > 0 ? (
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
            <div>
              <CardTitle className="text-lg">Record Attendance</CardTitle>
              <CardDescription>Mark attendance for {format(new Date(selectedDate), "MMMM d, yyyy")}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleMarkAll("present")}>
                <Check className="mr-1 h-3 w-3" /> Mark All Present
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead>Student</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.firstName} {student.lastName}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          size="sm" 
                          variant={attendanceMap[student.id] === "present" ? "default" : "outline"}
                          className={attendanceMap[student.id] === "present" ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                          onClick={() => handleStatusChange(student.id, "present")}
                        >
                          <Check className="h-4 w-4 mr-1 sm:hidden" />
                          <span className="hidden sm:inline">Present</span>
                        </Button>
                        <Button 
                          size="sm" 
                          variant={attendanceMap[student.id] === "late" ? "default" : "outline"}
                          className={attendanceMap[student.id] === "late" ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}
                          onClick={() => handleStatusChange(student.id, "late")}
                        >
                          <Clock className="h-4 w-4 mr-1 sm:hidden" />
                          <span className="hidden sm:inline">Late</span>
                        </Button>
                        <Button 
                          size="sm" 
                          variant={attendanceMap[student.id] === "absent" ? "default" : "outline"}
                          className={attendanceMap[student.id] === "absent" ? "bg-red-600 hover:bg-red-700 text-white" : ""}
                          onClick={() => handleStatusChange(student.id, "absent")}
                        >
                          <X className="h-4 w-4 mr-1 sm:hidden" />
                          <span className="hidden sm:inline">Absent</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="p-4 border-t bg-muted/20 flex justify-end">
              <Button onClick={handleSubmit} disabled={submitMutation.isPending} className="w-full sm:w-auto">
                {submitMutation.isPending ? "Saving..." : <><Save className="mr-2 h-4 w-4" /> Save Attendance</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="h-48 flex flex-col items-center justify-center text-muted-foreground border rounded-lg border-dashed">
          <p>No students found in this class.</p>
        </div>
      )}
    </div>
  );
}
