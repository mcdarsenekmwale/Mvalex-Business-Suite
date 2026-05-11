// components/general/tickets/ticket-details-content.tsx

import { statusColors, priorityColors } from "@/app/(general)/support/tickets/page";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Ticket } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@radix-ui/react-avatar";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@radix-ui/react-dropdown-menu";
import { format, formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import {  MoreVertical, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReactNode } from "react";
import { MessageDisplay } from "@/components/ui/MessageDisplay";

interface TicketDetailsContentProps {
    selectedTicket: Ticket;
    children?: ReactNode;
}

export default function TicketDetailsContent({ selectedTicket, children }: TicketDetailsContentProps) {
    
    // Get customer initials
    const getInitials = (name?: string | null, email?: string) => {
        if (name) {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
        }
        return (email?.[0] || "U").toUpperCase();
    };

    return (
        <div className="mt-6 space-y-6">
            {/* Ticket Header */}
            <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-semibold">{selectedTicket.subject}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={statusColors[selectedTicket.status]}>
                      {selectedTicket.status.replace("_", " ")}
                    </Badge>
                    <Badge className={priorityColors[selectedTicket.priority]}>
                      {selectedTicket.priority}
                    </Badge>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => {
                      navigator.clipboard.writeText(selectedTicket.id);
                      toast.success("Ticket ID copied");
                    }}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Ticket ID
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View in New Tab
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Customer Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Customer Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="border  border-slate-200">
                      <AvatarImage src={selectedTicket.user?.avatarUrl || undefined} />
                      <AvatarFallback className=" border border-slate-200">
                        {getInitials(selectedTicket.user?.name, selectedTicket.user?.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{selectedTicket.user?.name || "Customer"}</p>
                      <p className="text-sm text-muted-foreground">{selectedTicket.user?.email}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Ticket ID:</span>
                      <p className="font-mono text-xs">#{selectedTicket.id.slice(0, 8)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Created:</span>
                      <p>{format(new Date(selectedTicket.createdAt), "PPP")}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Last Updated:</span>
                      <p>{formatDistanceToNow(new Date(selectedTicket.updatedAt), { addSuffix: true })}</p>
                    </div>
                    {selectedTicket.assignedAdmin && (
                      <div>
                        <span className="text-muted-foreground">Assigned To:</span>
                        <p>{selectedTicket.assignedAdmin.name || selectedTicket.assignedAdmin.email}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Original Message */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Original Message</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{selectedTicket.description}</p>
                </CardContent>
              </Card>

              {/* Conversation Thread */}
              {selectedTicket.messages && selectedTicket.messages.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Conversation History</CardTitle>
                    <CardDescription>
                      {selectedTicket.messages.length} messages in this thread
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[500px] pr-4">
                      <div className="space-y-4 mb-4">
                        {selectedTicket.messages.map((response, index) => (
                          <motion.div
                            key={response.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={cn("p-3 rounded-lg ", {
                            "bg-primary/5 border-l-4 border-primary ml-4": response.isAdmin,
                            "bg-muted/30": !response.isAdmin,
                            "border border-muted-foreground": !response.isAdmin,
                            //positioning and size
                            "ml-auto ml-10": response.isAdmin,
                            "mr-auto": !response.isAdmin,
                            "w-fit": true
                          })}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  {response.isAdmin ? "Support Agent" : (response.user?.name || "Customer")}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {response.isAdmin ? "Staff" : "Customer"}
                                </Badge>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(response.createdAt), "PPp")}
                              </span>
                            </div>
                          
                              <MessageDisplay 
                                content={response.message}
                                isAI={response.isAdmin ? true : false}
                                timestamp={new Date(response.createdAt)}
                                showActions={true}
                              />
                          
                          </motion.div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {/* Response Area */}
              {children}
            </div>
  );
}