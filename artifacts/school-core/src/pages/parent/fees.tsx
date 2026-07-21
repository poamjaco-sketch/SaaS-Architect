import React, { useState } from "react";
import { useGetParentChildren, useGetChildFees } from "@workspace/api-client-react";
import { DashboardSkeleton } from "@/components/ui/skeletons";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

export default function ParentFeesPage() {
  const { data: children, isLoading: childrenLoading } = useGetParentChildren({
    query: { queryKey: ["parent-children"] }
  });

  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);

  React.useEffect(() => {
    if (children && children.length > 0 && !selectedChildId) {
      setSelectedChildId(children[0].id);
    }
  }, [children, selectedChildId]);

  const { data: fees, isLoading: feesLoading } = useGetChildFees(
    selectedChildId || 0,
    { query: { enabled: !!selectedChildId, queryKey: ["child-fees", selectedChildId] } }
  );

  if (childrenLoading) return <DashboardSkeleton />;

  const totalBalance = fees?.reduce((acc, curr) => acc + (curr.balance || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Fee Statements</h2>
          <p className="text-muted-foreground text-sm">View billing and payment history.</p>
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

      {feesLoading && selectedChildId ? (
        <DashboardSkeleton />
      ) : (
        <div className="space-y-6">
          {totalBalance > 0 && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3 text-destructive">
              <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold">Outstanding Balance</h4>
                <p className="text-sm opacity-90 mt-1">
                  You have a total outstanding balance of <span className="font-bold">{formatCurrency(totalBalance)}</span>. 
                  Please settle this to avoid any inconveniences.
                </p>
              </div>
            </div>
          )}

          <Card className="border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="py-4">Term / Date</TableHead>
                    <TableHead className="py-4">Description</TableHead>
                    <TableHead className="text-right py-4">Billed</TableHead>
                    <TableHead className="text-right py-4">Paid</TableHead>
                    <TableHead className="text-right py-4">Balance</TableHead>
                    <TableHead className="text-center py-4">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!fees || fees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                        No fee records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    fees.map((fee) => (
                      <TableRow key={fee.id}>
                        <TableCell>
                          <p className="font-medium text-sm">{fee.term}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(fee.createdAt)}</p>
                        </TableCell>
                        <TableCell className="font-medium text-sm">{fee.description || "Tuition"}</TableCell>
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
        </div>
      )}
    </div>
  );
}
