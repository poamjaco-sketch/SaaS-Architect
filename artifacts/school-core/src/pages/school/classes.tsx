import React, { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useListClasses, useCreateClass, useListTeachers } from "@workspace/api-client-react";
import { TableSkeleton } from "@/components/ui/skeletons";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Building2, Users } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const createSchema = z.object({
  name: z.string().min(2, "Class name is required"),
  level: z.string().optional(),
  teacherId: z.coerce.number().optional(),
});

export default function ClassesPage() {
  const { user } = useAuth();
  const schoolId = user?.schoolId!;
  const queryClient = useQueryClient();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: classes, isLoading } = useListClasses(schoolId, { 
    query: { queryKey: ["classes", schoolId] } 
  });
  
  const { data: teachers } = useListTeachers(schoolId, {}, {
    query: { queryKey: ["teachers", schoolId] }
  });

  const createMutation = useCreateClass();

  const form = useForm<z.infer<typeof createSchema>>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      name: "",
      level: "",
    },
  });

  const onSubmit = (values: z.infer<typeof createSchema>) => {
    createMutation.mutate(
      { schoolId, data: values },
      {
        onSuccess: () => {
          toast.success("Class created successfully");
          setIsCreateOpen(false);
          form.reset();
          queryClient.invalidateQueries({ queryKey: ["classes", schoolId] });
        },
        onError: () => toast.error("Failed to create class"),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Classes</h2>
          <p className="text-muted-foreground text-sm">Organize your school's classes and form masters.</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="hover-elevate">
              <Plus className="mr-2 h-4 w-4" /> Create Class
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Class</DialogTitle>
              <DialogDescription>
                Define a new class room and assign a form master.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class Name</FormLabel>
                      <FormControl><Input placeholder="e.g. Form 1A, Grade 6" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Academic Level (Optional)</FormLabel>
                      <FormControl><Input placeholder="e.g. JHS, Primary" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="teacherId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Form Master (Optional)</FormLabel>
                      <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value?.toString() || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select teacher" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {teachers?.map(t => (
                            <SelectItem key={t.id} value={t.id.toString()}>
                              {t.firstName} {t.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create Class"}
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classes?.length === 0 ? (
            <div className="col-span-full h-32 flex flex-col items-center justify-center text-muted-foreground border rounded-lg border-dashed">
              <Building2 className="h-8 w-8 mb-2 opacity-50" />
              <p>No classes created yet</p>
            </div>
          ) : (
            classes?.map((cls) => (
              <Card key={cls.id} className="border-border/50 hover:border-primary/30 transition-colors">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg">{cls.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5 bg-muted inline-block px-2 py-0.5 rounded">
                        {cls.level || "General"}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <Users className="h-5 w-5" />
                    </div>
                  </div>
                  
                  <div className="space-y-3 mt-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Students Enrolled</span>
                      <span className="font-medium font-mono">{cls.studentCount || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Form Master</span>
                      <span className="font-medium text-right max-w-[150px] truncate">
                        {cls.teacherName || <span className="text-muted-foreground italic text-xs">Unassigned</span>}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
