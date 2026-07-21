import React, { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useListSubjects, useCreateSubject } from "@workspace/api-client-react";
import { TableSkeleton } from "@/components/ui/skeletons";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, BookOpen } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const createSchema = z.object({
  name: z.string().min(2, "Subject name is required"),
  code: z.string().optional(),
});

export default function SubjectsPage() {
  const { user } = useAuth();
  const schoolId = user?.schoolId!;
  const queryClient = useQueryClient();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: subjects, isLoading } = useListSubjects(schoolId, { 
    query: { queryKey: ["subjects", schoolId] } 
  });

  const createMutation = useCreateSubject();

  const form = useForm<z.infer<typeof createSchema>>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      name: "",
      code: "",
    },
  });

  const onSubmit = (values: z.infer<typeof createSchema>) => {
    createMutation.mutate(
      { schoolId, data: values },
      {
        onSuccess: () => {
          toast.success("Subject added successfully");
          setIsCreateOpen(false);
          form.reset();
          queryClient.invalidateQueries({ queryKey: ["subjects", schoolId] });
        },
        onError: () => toast.error("Failed to add subject"),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Subjects</h2>
          <p className="text-muted-foreground text-sm">Manage the academic curriculum subjects.</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="hover-elevate">
              <Plus className="mr-2 h-4 w-4" /> Add Subject
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>New Subject</DialogTitle>
              <DialogDescription>
                Add a new subject to the curriculum catalog.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject Name</FormLabel>
                      <FormControl><Input placeholder="e.g. Mathematics, Integrated Science" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject Code (Optional)</FormLabel>
                      <FormControl><Input placeholder="e.g. MAT, SCI" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Adding..." : "Add Subject"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <Card className="border-border/50 max-w-3xl">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-[100px]">Code</TableHead>
                  <TableHead>Subject Name</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="h-32 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <BookOpen className="h-8 w-8 text-muted-foreground/50" />
                        <p>No subjects defined</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  subjects?.map((subject) => (
                    <TableRow key={subject.id}>
                      <TableCell className="font-mono font-medium text-sm">
                        {subject.code || "-"}
                      </TableCell>
                      <TableCell className="font-medium">
                        {subject.name}
                      </TableCell>
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
