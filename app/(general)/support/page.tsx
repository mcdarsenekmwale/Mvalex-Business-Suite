"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  HelpCircle,
  Plus,
  MessageSquare,
  Clock,
  CheckCircle2,
  Send,
  ChevronDown,
  ChevronUp,
  Headset,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { MessageDisplay } from "@/components/ui/MessageDisplay";
import { Spinner } from "@/components/shared/ui/spinner";
import { cn } from "@/lib/utils";

export default function SupportPage() {
  const queryClient = useQueryClient();
  const {data:session} = useSession();
  if (!session?.user) {
    return <div>Sign in to access support</div>;
  }
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [isReplying, setIsReplying] = useState(false);

  const router = useRouter();

  const [newTicket, setNewTicket] = useState({
    subject: "",
    description: "",
    category: "general",
    priority: "MEDIUM",
  });

  const { data: tickets } = useQuery({
    queryKey: ["support-tickets"],
    queryFn: async () => {
      const res = await fetch("/api/support");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      toast.success("Ticket created successfully!");
      setNewTicketOpen(false);
      setNewTicket({ subject: "", description: "", category: "general", priority: "MEDIUM" });
    },
    onError: () => {
      toast.error("Ticket creation failed. Please try again.");
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />Open</Badge>;
      case "IN_PROGRESS":
        return <Badge variant="default"><MessageSquare className="mr-1 h-3 w-3" />In Progress</Badge>;
      case "RESOLVED":
        return <Badge variant="default"><CheckCircle2 className="mr-1 h-3 w-3" />Resolved</Badge>;
      case "CLOSED":
        return <Badge variant="outline">Closed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return <Badge variant="destructive">Urgent</Badge>;
      case "HIGH":
        return <Badge variant="default">High</Badge>;
      case "MEDIUM":
        return <Badge variant="secondary">Medium</Badge>;
      case "LOW":
        return <Badge variant="outline">Low</Badge>;
      default:
        return <Badge>{priority}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support Center</h1>
          <p className="text-muted-foreground text-sm">Get help and track your support tickets</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Support Agent Button */}
          {session?.user?.role.toLocaleLowerCase().includes("agent") && <Button onClick={() => {
              router.push("/support/tickets");
            }} 
          className="text-white" variant='outline'>
            <Headset className="mr-2 h-4 w-4" />
            Support Agent
          </Button>}
          {/* New Ticket Button */}
          <Button onClick={() => setNewTicketOpen(true)} className="text-white">
            <Plus className="mr-2 h-4 w-4" />
            New Ticket
          </Button>
        </div>
      </div>

      {/* New Ticket Form */}
      {newTicketOpen && (
        <Card className="w-full rounded-md">
          <CardHeader>
            <CardTitle className="text-sm">Create New Support Ticket</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={newTicket.subject}
                onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                placeholder="Brief description of your issue"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={newTicket.category}
                  onValueChange={(value) => setNewTicket({ ...newTicket, category: value })}
                >
                  <SelectTrigger  className="w-full">
                    <SelectValue placeholder={newTicket.category || "Select Category"}/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">General</SelectItem>
                    <SelectItem value="billing">Billing</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="feature">Feature Request</SelectItem>
                  </SelectContent>
                </Select>
                 
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={newTicket.priority}
                  onValueChange={(value) => setNewTicket({ ...newTicket, priority: value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={newTicket.priority || "Select Priority"}/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newTicket.description}
                onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                placeholder="Please describe your issue in detail..."
                rows={4}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => createMutation.mutate(newTicket)}
                disabled={!newTicket.subject || !newTicket.category || !newTicket.priority || !newTicket.description || createMutation.isPending}
                className="text-white"
              >
                {createMutation.isPending ? "Creating..." : "Submit Ticket"}
              </Button>
              <Button variant="outline" onClick={() => setNewTicketOpen(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tickets List */}
      <div className="space-y-4">
        {tickets?.map((ticket: any, index: number) => (
          <Card key={ticket.id + index} className="overflow-hidden">
            <div
              className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => {
                if (expandedTicket === ticket.id) {
                  setSelectedTicket(null);
                  setExpandedTicket(null);
                }
                else {
                  setExpandedTicket(ticket.id);
                  setSelectedTicket(ticket);
                }
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <HelpCircle className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{ticket.subject}</div>
                    <div className="text-sm text-muted-foreground">
                      {ticket.category} • {new Date(ticket.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getPriorityBadge(ticket.priority)}
                  {getStatusBadge(ticket.status)}
                  {expandedTicket === ticket.id ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </div>

            {expandedTicket === ticket.id && (
              <div className="px-4 pb-4 border-t">
                <div className="py-4">
                  <div className="text-sm text-muted-foreground mb-4 ">
                    {ticket.description}
                  </div>

                  {/* Messages */}
                  {ticket.messages?.length > 0 && (
                    <div className="space-y-3 mb-4">
                      {ticket.messages.map((msg: any) => (
                        <div
                          key={msg.id}
                          className={cn("p-3 rounded-lg w-fit", {
                            "bg-primary/10 border border-primary/20": msg.isAdmin,
                            "bg-muted": !msg.isAdmin,
                            "border border-muted-foreground": !msg.isAdmin,
                            //positioning and size
                            "ml-auto": !msg.isAdmin,
                            "mr-auto": msg.isAdmin,
                          })}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-medium ${msg.isAdmin ? "text-primary" : "text-muted-foreground"}`}>
                              {msg.isAdmin ? "Support Team" : "You"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(msg.createdAt).toLocaleString()}
                            </span>
                          </div>
                          
                            <MessageDisplay 
                              content={msg.message}
                              isAI={msg.isAdmin ? true : false}
                              timestamp={new Date(msg.createdAt)}
                              showActions={true}
                            />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply Box */}
                  {ticket.status !== "CLOSED" && ticket.status !== "RESOLVED" && (
                    <div className="flex gap-2">
                      <Textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Add a reply..."
                        className="min-h-[60px]"
                        rows={2}
                      />
                      <Button
                        className="shrink-0 text-white" 
                        onClick={async () => {
                          try {
                            setIsReplying(true);
                            const res = await fetch(`/api/support/tickets/${selectedTicket.id}/messages`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ content: replyText }),
                            });
                            if (!res.ok) throw new Error("Failed to send reply");
                            toast.success("Reply sent!");
                            setReplyText("");
                            queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
                          } catch (err: any) {
                            toast.error(err.message || "Failed to send reply");
                          }
                          finally {
                            setIsReplying(false);
                          }
                        }}
                        disabled={!replyText.trim() || isReplying}
                      >
                        {isReplying ? (
                          <Spinner className="h-4 w-4" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        ))}

        {(!tickets || tickets.length === 0) && (
          <div className="text-center py-12">
            <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No support tickets yet</p>
            <Button variant="outline" className="mt-4" onClick={() => setNewTicketOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Ticket
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
