import React, { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useListFees, useGetFeesSummary, useCreateFeeRecord, useListStudents } from "@workspace/api-client-react";
import { TableSkeleton } from "@/components/ui/skeletons";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { CreditCard, Banknote, Receipt, AlertCircle, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/utils";

const createSchema = z.object({
  studentId: z.coerce.number().min(1, "Student is required"),
  amount: z.coerce.number().min(1, "Amount is required"),
  amountPaid: z.coerce.number().default(0),
  term: z.string().min(2, "Term is required"),
  description: z.string().optional(),
});

export default function FeesPage() {
  const { user } = useAuth();
  const schoolId = user?.schoolId!;
  const queryClient = useQueryClient();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: summary } = useGetFeesSummary(schoolId, {
    query: { queryKey: ["fees-summary", schoolId] }
  });

  const { data: fees, isLoading } = useListFees(
    schoolId,
    { status: statusFilter !== "all" ? statusFilter as any : undefined },
    { query: { queryKey: ["fees", schoolId, statusFilter] } }
  );

  const { data: students } = useListStudents(schoolId, {}, {
    query: { queryKey: ["students", schoolId] }
  });

  const createMutation = useCreateFeeRecord();

  const form = useForm<z.infer<typeof createSchema>>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      amount: 0,
      amountPaid: 0,
      term: "Term 1",
      description: "Tuition Fee",
    },
  });

  const onSubmit = (values: z.infer<typeof createSchema>) => {
    createMutation.mutate(
      { data: values },
      {
        onSuccess: () => {
          toast.success("Fee record created successfully");
          setIsCreateOpen(false);
          form.reset();
          queryClient.invalidateQueries({ queryKey: ["fees", schoolId] });
          queryClient.invalidateQueries({ queryKey: ["fees-summary", schoolId] });
        },
        onError: () => toast.error("Failed to create fee record"),
      }
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Fee Management</h2>
          <p className="text-muted-foreground text-sm">Track billing, payments, and outstanding balances.</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="hover-elevate">
              <Plus className="mr-2 h-4 w-4" /> Bill Student
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create Fee Record</DialogTitle>
              <DialogDescription>
                Bill a student for a specific term or item.
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
                              {s.firstName} {s.lastName} ({s.className || 'Unassigned'})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Bill (GHS)</FormLabel>
                        <FormControl><Input type="number" min="1" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="amountPaid"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount Paid Now (GHS)</FormLabel>
                        <FormControl><Input type="number" min="0" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="term"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Term</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Term" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Term 1">Term 1</SelectItem>
                            <SelectItem value="Term 2">Term 2</SelectItem>
                            <SelectItem value="Term 3">Term 3</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl><Input placeholder="e.g. Tuition Fee" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create Bill"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <StatCard
          title="Total Expected"
          value={formatCurrency(summary?.totalBilled || 0)}
          icon={Banknote}
          description="For current academic year"
        />
        <StatCard
          title="Total Collected"
          value={formatCurrency(summary?.totalCollected || 0)}
          icon={Receipt}
          trend={{ value: 0, isPositive: true }}
        />
        <StatCard
          title="Outstanding Balance"
          value={formatCurrency(summary?.outstanding || 0)}
          icon={AlertCircle}
          className="border-destructive/20 bg-destructive/5"
        />
      </div>

      <div className="flex gap-2">
        <Button variant={statusFilter === "all" ? "default" : "outline"} onClick={() => setStatusFilter("all")} size="sm">
          All Records
        </Button>
        <Button variant={statusFilter === "pending" ? "default" : "outline"} onClick={() => setStatusFilter("pending")} size="sm" className="text-amber-600 border-amber-200 hover:bg-amber-50">
          Pending
        </Button>
        <Button variant={statusFilter === "partial" ? "default" : "outline"} onClick={() => setStatusFilter("partial")} size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50">
          Partial
        </Button>
        <Button variant={statusFilter === "paid" ? "default" : "outline"} onClick={() => setStatusFilter("paid")} size="sm" className="text-green-600 border-green-200 hover:bg-green-50">
          Paid
        </Button>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <Card className="border-border/50">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead>Student</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">Billed</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!fees || fees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <CreditCard className="h-8 w-8 text-muted-foreground/50" />
                        <p>No fee records found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  fees.map((fee) => (
                    <TableRow key={fee.id}>
                      <TableCell>
                        <p className="font-semibold text-foreground">{fee.studentName}</p>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          ID: STU-{fee.studentId.toString().padStart(4, '0')}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-sm">{fee.term}</p>
                        <p className="text-xs text-muted-foreground">{fee.description || "Tuition"}</p>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCurrency(fee.amount)}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-green-600">{formatCurrency(fee.amountPaid || 0)}</TableCell>
                      <TableCell className={`text-right font-mono font-bold text-sm ${(fee.balance || 0) > 0 ? "text-destructive" : ""}`}>
                        {formatCurrency(fee.balance || 0)}
                      </TableCell>
                      <TableCell className="text-center"><StatusBadge status={fee.status} /></TableCell>
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
