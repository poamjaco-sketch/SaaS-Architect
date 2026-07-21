import React, { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useListAnnouncements, useCreateAnnouncement } from "@workspace/api-client-react";
import { DashboardSkeleton } from "@/components/ui/skeletons";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Megaphone, Plus, BellRing, Users, GraduationCap, School } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/utils";

const createSchema = z.object({
  title: z.string().min(5, "Title is too short").max(100, "Title is too long"),
  content: z.string().min(10, "Content must be at least 10 characters"),
  audience: z.enum(["all", "teachers", "parents", "students"]).default("all"),
});

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const schoolId = user?.schoolId!;
  const queryClient = useQueryClient();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: announcements, isLoading } = useListAnnouncements(schoolId, {
    query: { queryKey: ["announcements", schoolId] }
  });

  const createMutation = useCreateAnnouncement();

  const form = useForm<z.infer<typeof createSchema>>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      title: "",
      content: "",
      audience: "all",
    },
  });

  const onSubmit = (values: z.infer<typeof createSchema>) => {
    createMutation.mutate(
      { data: values },
      {
        onSuccess: () => {
          toast.success("Announcement broadcasted successfully");
          setIsCreateOpen(false);
          form.reset();
          queryClient.invalidateQueries({ queryKey: ["announcements", schoolId] });
        },
        onError: () => toast.error("Failed to broadcast announcement"),
      }
    );
  };

  const getAudienceIcon = (audience: string) => {
    switch (audience) {
      case "all": return <School className="h-4 w-4" />;
      case "teachers": return <GraduationCap className="h-4 w-4" />;
      case "parents": return <Users className="h-4 w-4" />;
      case "students": return <Users className="h-4 w-4" />;
      default: return <BellRing className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Announcements</h2>
          <p className="text-muted-foreground text-sm">Broadcast messages to staff, parents, and students.</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="hover-elevate">
              <Plus className="mr-2 h-4 w-4" /> New Broadcast
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Broadcast Announcement</DialogTitle>
              <DialogDescription>
                Send a notification to specific groups. They will see it on their dashboard.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject / Title</FormLabel>
                      <FormControl><Input placeholder="e.g. End of Term Arrangements" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="audience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Audience</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select target audience" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">Everyone</SelectItem>
                          <SelectItem value="teachers">Teachers Only</SelectItem>
                          <SelectItem value="parents">Parents Only</SelectItem>
                          <SelectItem value="students">Students Only</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message Content</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Write your announcement here..." 
                          className="min-h-[120px] resize-none"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Broadcasting..." : "Broadcast"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <div className="grid gap-4 max-w-4xl">
          {!announcements || announcements.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-muted-foreground border rounded-lg border-dashed bg-card/50">
              <Megaphone className="h-10 w-10 mb-2 opacity-50" />
              <p>No announcements broadcasted yet.</p>
            </div>
          ) : (
            announcements.map((ann) => (
              <Card key={ann.id} className="border-border/50 hover:shadow-md transition-shadow overflow-hidden">
                <div className="w-1 h-full bg-primary absolute left-0 top-0"></div>
                <CardHeader className="pb-3 flex flex-row items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl leading-tight">{ann.title}</CardTitle>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1 font-medium capitalize bg-muted px-2 py-0.5 rounded text-foreground">
                        {getAudienceIcon(ann.audience || 'all')}
                        {ann.audience}
                      </span>
                      <span>{formatDate(ann.createdAt)}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap text-foreground/90 leading-relaxed">
                    {ann.content}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
