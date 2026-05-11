// app/(general)/support/tickets/page.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  User,
  Flag,
  RefreshCw,
  Loader2,
  TicketCheck,
  TicketIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import TicketListContent from "@/components/general/tickets/ticket-list-component";
import { Ticket, TicketStats } from "@/lib/types";
import RichTextEditor from "@/components/general/tickets/rich-text-editor";
import TicketDetailsContent from "@/components/general/tickets/ticket-details-content";


// Quick Response Templates
const QUICK_RESPONSES = [
  { id: 1, title: "Thank you for contacting support", content: "Thank you for reaching out to our support team. We have received your ticket and will get back to you within 24 hours." },
  { id: 2, title: "Investigating issue", content: "Thank you for reporting this issue. Our team is currently investigating and we will provide an update shortly." },
  { id: 3, title: "Resolution provided", content: "We believe this issue has been resolved. Please let us know if you're still experiencing any problems." },
  { id: 4, title: "Need more information", content: "Could you please provide more details about this issue? Screenshots or step-by-step reproduction steps would be very helpful." },
  { id: 5, title: "Escalated to engineering", content: "We have escalated this issue to our engineering team for further investigation. We'll keep you updated on progress." },
];

export const statusColors: Record<string, string> = {
  OPEN: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400",
  IN_PROGRESS: "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
  RESOLVED: "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400",
  CLOSED: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

export const priorityColors: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  MEDIUM: "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400",
  URGENT: "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400",
};

export const priorityOrder = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
export const statusOrder = { OPEN: 0, IN_PROGRESS: 1, RESOLVED: 2, CLOSED: 3 };

export default function SupportAgentTicketsPage() {
  const queryClient = useQueryClient();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState("my-tickets");
  const [isQuickResponseOpen, setIsQuickResponseOpen] = useState(false);

  const router = useRouter();

  // Fetch tickets
  const { data: ticketsData, isLoading: ticketsLoading, refetch } = useQuery({
    queryKey: ["agent-tickets", statusFilter, priorityFilter, searchQuery, page, activeTab],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (priorityFilter !== "all") params.set("priority", priorityFilter);
      if (searchQuery) params.set("search", searchQuery);
      params.set("page", String(page));
      params.set("limit", "20");
      params.set("assigned", activeTab === "my-tickets" ? "true" : "false");
      
      const res = await fetch(`/api/support/tickets?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch tickets");
      return res.json();
    },
  });

  // Fetch ticket stats
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["agent-ticket-stats"],
    queryFn: async () => {
      const res = await fetch("/api/support/tickets/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  // Respond to ticket mutation
  const respondMutation = useMutation({
    mutationFn: async ({ ticketId, message, status }: { ticketId: string; message: string; status?: string }) => {
      const res = await fetch(`/api/support/tickets/${ticketId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, status }),
      });
      if (!res.ok) throw new Error("Failed to send response");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Response sent successfully!");
      setResponseText("");
      setDialogOpen(false);
      setSheetOpen(false);
      queryClient.invalidateQueries({ queryKey: ["agent-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["agent-ticket-stats"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to send response");
    },
  });

  // Update ticket status mutation
  const statusMutation = useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string; status: string }) => {
      const res = await fetch(`/api/support/tickets/${ticketId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Ticket status updated");
      queryClient.invalidateQueries({ queryKey: ["agent-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["agent-ticket-stats"] });
    },
  });

  const tickets: Ticket[] = ticketsData?.tickets || [];
  const stats: TicketStats = statsData?.stats || {
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
    myAssigned: 0,
    highPriority: 0,
    urgentPriority: 0,
    avgResponseTime: 0,
  };
  const pagination = ticketsData?.pagination || { page: 1, totalPages: 1, total: 0 };

  const handleRespond = (closeAfter?: boolean) => {
    if (!selectedTicket || !responseText.trim()) {
      toast.error("Please enter a response");
      return;
    }
    
    respondMutation.mutate({
      ticketId: selectedTicket.id,
      message: responseText,
      status: closeAfter ? "RESOLVED" : undefined,
    });
  };

  const handleStatusChange = (ticketId: string, newStatus: string) => {
    statusMutation.mutate({ ticketId, status: newStatus });
  };

  const handleViewDetails = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setSheetOpen(true);
  };

  const useQuickResponse = (content: string) => {
    setResponseText(content);
    setIsQuickResponseOpen(false);
  };



  const isLoading = ticketsLoading || statsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-1" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support Tickets</h1>
          <p className="text-muted-foreground text-sm">
            Manage and respond to customer support requests
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={ticketsLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${ticketsLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant='default' size='sm' className="text-white" onClick={() => router.push("/support")}>
            <TicketCheck className="h-4 w-4 mr-2" />
            My Support
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Assigned to Me</p>
                <p className="text-2xl font-bold">{stats.myAssigned}</p>
              </div>
              <User className="h-5 w-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Open</p>
                <p className="text-2xl font-bold">{stats.open}</p>
              </div>
              <AlertCircle className="h-5 w-5 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
              </div>
              <Clock className="h-5 w-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">High Priority</p>
                <p className="text-2xl font-bold">{stats.highPriority + stats.urgentPriority}</p>
              </div>
              <Flag className="h-5 w-5 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Resolved (7d)</p>
                <p className="text-2xl font-bold">{stats.resolved}</p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Avg Response</p>
                <p className="text-2xl font-bold">{stats.avgResponseTime}m</p>
              </div>
              <Clock className="h-5 w-5 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="my-tickets">
            <User className="h-4 w-4 mr-2" />
            Assigned to Me
          </TabsTrigger>
          <TabsTrigger value="all-tickets">
            <TicketIcon className="h-4 w-4 mr-2" />
            All Tickets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-tickets" className="space-y-4 mt-4">
          <TicketListContent
            tickets={tickets}
            isLoading={ticketsLoading}
            onSelectTicket={handleViewDetails}
            onQuickRespond={(ticket) => {
              setSelectedTicket(ticket);
              setDialogOpen(true);
            }}
            onStatusChange={handleStatusChange}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            priorityFilter={priorityFilter}
            setPriorityFilter={setPriorityFilter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            page={page}
            setPage={setPage}
            pagination={pagination}
            statusColors={statusColors}
            priorityColors={priorityColors}
            priorityOrder={priorityOrder}
          />
        </TabsContent>

        <TabsContent value="all-tickets" className="space-y-4 mt-4">
          <TicketListContent
            tickets={tickets}
            isLoading={ticketsLoading}
            onSelectTicket={handleViewDetails}
            onQuickRespond={(ticket) => {
              setSelectedTicket(ticket);
              setDialogOpen(true);
            }}
            onStatusChange={handleStatusChange}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            priorityFilter={priorityFilter}
            setPriorityFilter={setPriorityFilter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            page={page}
            setPage={setPage}
            pagination={pagination}
            statusColors={statusColors}
            priorityColors={priorityColors}
            priorityOrder={priorityOrder}
          />
        </TabsContent>
      </Tabs>

      {/* Quick Response Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) setSelectedTicket(null);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Quick Response
            </DialogTitle>
          </DialogHeader>
          
          {selectedTicket && (
            <div className="space-y-4">
              {/* Ticket Summary */}
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm font-medium">{selectedTicket.subject}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  From: {selectedTicket.user?.name || selectedTicket.user?.email}
                </p>
              </div>

              {/* Quick Response Templates */}
              <div>
                <Label className="mb-2 block">Quick Response Templates</Label>
                <div className="flex flex-wrap gap-2">
                  {QUICK_RESPONSES.map((template) => (
                    <Button
                      key={template.id}
                      variant="outline"
                      size="sm"
                      onClick={() => useQuickResponse(template.content)}
                    >
                      {template.title}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Rich Text Editor */}
              <div>
                <Label>Your Response</Label>
                <RichTextEditor
                  value={responseText}
                  onChange={setResponseText}
                  placeholder="Type your response here..."
                  minHeight={200}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleRespond(false)}
              disabled={!responseText.trim() || respondMutation.isPending}
            >
              {respondMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send & Keep Open
            </Button>
            <Button
              onClick={() => handleRespond(true)}
              disabled={!responseText.trim() || statusMutation.isPending}
              className="bg-primary text-white"
            >
              {statusMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Resolve & Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ticket Details Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-4xl overflow-y-auto">
          <SheetHeader className="gap-0">
            <SheetTitle className="flex items-center gap-2">
              <TicketIcon className="h-5 w-5" />
              Ticket Details
            </SheetTitle>
            <SheetDescription>
              View complete ticket information and conversation history
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-150px)]">
            {selectedTicket &&
              <TicketDetailsContent selectedTicket={selectedTicket!} >
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Quick Response</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <RichTextEditor
                      value={responseText}
                      onChange={setResponseText}
                      placeholder="Type your response..."
                      minHeight={120}
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setResponseText("");
                          setSheetOpen(false);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="secondary"
                        className="text-white"
                        onClick={() => handleRespond(false)}
                        disabled={!responseText.trim() || respondMutation.isPending}
                      >
                        {respondMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        Send Reply
                      </Button>
                      <Button
                        onClick={() => handleStatusChange(selectedTicket.id,"RESOLVED")}
                        disabled={!responseText.trim() || statusMutation.isPending}
                        className="bg-primary text-white"
                      >
                        {statusMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                        )}
                        Resolve & Close
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TicketDetailsContent>
            }
          </ScrollArea>

          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setSheetOpen(false)}>
              Close
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

