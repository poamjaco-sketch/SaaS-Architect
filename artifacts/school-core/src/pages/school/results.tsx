import React, { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useListClasses, useListSubjects, useListStudents, useListResults, useCreateResult } from "@workspace/api-client-react";
import { TableSkeleton } from "@/components/ui/skeletons";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { computeGrade } from "@/lib/utils";

const createSchema = z.object({
  studentId: z.coerce.number().min(1, "Student is required"),
  score: z.coerce.number().min(0).max(100, "Score must be between 0 and 100"),
  comment: z.string().optional(),
});

export default function ResultsPage() {
  const { user } = useAuth();
  const schoolId = user?.schoolId!;
  const queryClient = useQueryClient();
  
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [term, setTerm] = useState<string>("Term 1");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: classes } = useListClasses(schoolId, { query: { queryKey: ["classes", schoolId] } });
  const { data: subjects } = useListSubjects(schoolId, { query: { queryKey: ["subjects", schoolId] } });
  
  const { data: students } = useListStudents(
    schoolId, 
    { classId: selectedClass ? Number(selectedClass) : undefined }, 
    { query: { enabled: !!selectedClass, queryKey: ["students", schoolId, "", selectedClass] } }
  );

  const { data: results, isLoading } = useListResults(
    schoolId,
    { 
      classId: selectedClass ? Number(selectedClass) : undefined,
      subjectId: selectedSubject ? Number(selectedSubject) : undefined,
      term: term
    },
    { query: { queryKey: ["results", schoolId, selectedClass, selectedSubject, term] } }
  );

  const createMutation = useCreateResult();

  const form = useForm<z.infer<typeof createSchema>>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      score: 0,
      comment: "",
    },
  });

  const onSubmit = (values: z.infer<typeof createSchema>) => {
    if (!selectedClass || !selectedSubject) {
      toast.error("Please select a class and subject first");
      return;
    }

    createMutation.mutate(
      { 
        schoolId,
        data: {
          ...values,
          classId: Number(selectedClass),
          subjectId: Number(selectedSubject),
          term,
          academicYear: "2025/2026"
        } 
      },
      {
        onSuccess: () => {
          toast.success("Result recorded successfully");
          setIsCreateOpen(false);
          form.reset();
          queryClient.invalidateQueries({ queryKey: ["results", schoolId] });
        },
        onError: () => toast.error("Failed to record result"),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Academic Results</h2>
          <p className="text-muted-foreground text-sm">Manage student scores and grades.</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="hover-elevate" disabled={!selectedClass || !selectedSubject}>
              <Plus className="mr-2 h-4 w-4" /> Enter Score
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Record Score</DialogTitle>
              <DialogDescription>
                Enter score for {term}. Grade will be calculated automatically.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="studentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Student</FormLabel>
                      <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value?.toString() || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select student" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {students?.map(s => (
                            <SelectItem key={s.id} value={s.id.toString()}>
                              {s.firstName} {s.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="score"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Score (%)</FormLabel>
                      <FormControl><Input type="number" min="0" max="100" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="bg-muted p-3 rounded-md flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Computed Grade:</span>
                  <span className="font-bold text-lg">{computeGrade(form.watch("score") || 0)}</span>
                </div>
                <FormField
                  control={form.control}
                  name="comment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teacher's Comment (Optional)</FormLabel>
                      <FormControl><Input placeholder="e.g. Excellent performance" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Saving..." : "Save Score"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/50 bg-muted/20">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="bg-card">
                <SelectValue placeholder="Select Class" />
              </SelectTrigger>
              <SelectContent>
                {classes?.map(c => (
                  <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="bg-card">
                <SelectValue placeholder="Select Subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects?.map(s => (
                  <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Select value={term} onValueChange={setTerm}>
              <SelectTrigger className="bg-card">
                <SelectValue placeholder="Select Term" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Term 1">Term 1</SelectItem>
                <SelectItem value="Term 2">Term 2</SelectItem>
                <SelectItem value="Term 3">Term 3</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <Card className="border-border/50">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead>Student</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-center">Grade</TableHead>
                  <TableHead>Comment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!results || results.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <BookOpen className="h-8 w-8 opacity-20 mb-2" />
                        <p>{!selectedClass || !selectedSubject ? "Select a class and subject to view results" : "No results recorded for this selection"}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  results.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.studentName}</TableCell>
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
      )}
    </div>
  );
}
