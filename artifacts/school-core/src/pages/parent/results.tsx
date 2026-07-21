import React, { useState } from "react";
import { useGetParentChildren, useGetChildResults } from "@workspace/api-client-react";
import { DashboardSkeleton } from "@/components/ui/skeletons";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen } from "lucide-react";

export default function ParentResultsPage() {
  const { data: children, isLoading: childrenLoading } = useGetParentChildren({
    query: { queryKey: ["parent-children"] }
  });

  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [term, setTerm] = useState<string>("Term 1");

  // Auto-select first child if not selected
  React.useEffect(() => {
    if (children && children.length > 0 && !selectedChildId) {
      setSelectedChildId(children[0].id);
    }
  }, [children, selectedChildId]);

  const { data: results, isLoading: resultsLoading } = useGetChildResults(
    selectedChildId || 0,
    { term },
    { query: { enabled: !!selectedChildId, queryKey: ["child-results", selectedChildId, term] } }
  );

  if (childrenLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Academic Results</h2>
          <p className="text-muted-foreground text-sm">View your child's performance reports.</p>
        </div>
        
        <div className="flex gap-3 w-full sm:w-auto">
          {children && children.length > 1 && (
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
          )}
          <Select value={term} onValueChange={setTerm}>
            <SelectTrigger className="w-full sm:w-[150px] bg-card">
              <SelectValue placeholder="Select term" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Term 1">Term 1</SelectItem>
              <SelectItem value="Term 2">Term 2</SelectItem>
              <SelectItem value="Term 3">Term 3</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {resultsLoading && selectedChildId ? (
        <DashboardSkeleton />
      ) : (
        <Card className="border-border/50 max-w-4xl mx-auto">
          <CardHeader className="text-center border-b pb-6 bg-muted/10">
            <CardTitle className="text-2xl">{term} Report</CardTitle>
            <CardDescription className="text-base mt-2 font-medium text-foreground">
              {children?.find(c => c.id === selectedChildId)?.firstName} {children?.find(c => c.id === selectedChildId)?.lastName}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="py-4">Subject</TableHead>
                  <TableHead className="text-right py-4">Score</TableHead>
                  <TableHead className="text-center py-4">Grade</TableHead>
                  <TableHead className="py-4">Teacher's Remark</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!results || results.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-48 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <BookOpen className="h-8 w-8 opacity-20 mb-2" />
                        <p>No results available for this term yet.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  results.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.subjectName}</TableCell>
                      <TableCell className="text-right font-mono text-base">{r.score}%</TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-block w-8 py-1 rounded text-sm font-bold ${
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
            {results && results.length > 0 && (
              <div className="p-6 bg-muted/20 border-t flex justify-end">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Overall Average</p>
                  <p className="text-3xl font-bold font-mono">
                    {Math.round(results.reduce((acc, r) => acc + r.score, 0) / results.length)}%
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
