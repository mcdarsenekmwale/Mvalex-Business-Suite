"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  Send,
  User,
  Sparkles,
  Plus,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
}

export default function AIAssistantPage() {
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  const { data: conversations } = useQuery({
    queryKey: ["ai-conversations"],
    queryFn: async () => {
      const res = await fetch("/api/ai-assistant");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: activeConversation } = useQuery({
    queryKey: ["ai-conversation", activeConversationId],
    queryFn: async () => {
      if (!activeConversationId) return null;
      const res = await fetch(`/api/ai-assistant?id=${activeConversationId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!activeConversationId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, conversationId }: { message: string; conversationId?: string }) => {
      const res = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, conversationId }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: (data) => {
      setActiveConversationId(data.conversationId);
      queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["ai-conversation", data.conversationId] });
      
    },
    onError: () => {
      toast.error("Failed to send message. Please try again.");
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const message = input;
    setInput("");
    setIsTyping(true);
    
    sendMessageMutation.mutate(
      { message, conversationId: activeConversationId || undefined },
      {
        onSettled: () => setIsTyping(false),
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const messages = activeConversation?.messages || [];

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-4">
      {/* Sidebar - Conversations */}
      <div className="w-64 hidden lg:flex flex-col border rounded-lg bg-card">
        <div className="p-4 border-b">
          <Button
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            variant="outline"
            size="sm"
            onClick={() => {
              setActiveConversationId(null);
              setInput("");
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Chat
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {conversations?.map((conv: Conversation, index: number) => (
              <Button 
                key={conv.id + index}
                onClick={() => setActiveConversationId(conv.id)}
                className={`w-full text-left p-3 rounded-lg text-sm transition-colors ${
                  activeConversationId === conv.id
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-accent"
                }`}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  <span className="truncate">{conv.title || "New Conversation"}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(conv.createdAt).toLocaleDateString()}
                </div>
              </Button>
            ))}
            {(!conversations || conversations.length === 0) && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No conversations yet
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col border rounded-lg bg-card overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">Mvalex AI Assistant</h2>
            <p className="text-xs text-muted-foreground">
              Expert in business design and branding
            </p>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">How can I help you today?</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  I can help you design business cards, create invoices, suggest logo concepts,
                  or answer any questions about using Mvalex Business Suite.
                </p>
                <div className="grid grid-cols-2 gap-2 mt-6 max-w-md">
                  <button
                    id="business-card-design"
                    onClick={() => {
                      setInput("What makes a good business card design?");
                    }}
                    className="p-3 rounded-lg border text-left text-sm hover:bg-accent transition-colors"
                  >
                    What makes a good business card design?
                  </button>
                  <button
                    id="invoice-structure"
                    onClick={() => {
                      setInput("How should I structure my invoice?");
                    }}
                    className="p-3 rounded-lg border text-left text-sm hover:bg-accent transition-colors"
                  >
                    How should I structure my invoice?
                  </button>
                  <button
                    id="logo-palette"
                    onClick={() => {
                      setInput("Suggest a color palette for a tech company");
                    }}
                    className="p-3 rounded-lg border text-left text-sm hover:bg-accent transition-colors"
                  >
                    Suggest a color palette for a tech company
                  </button>
                  <button
                    id="logo-style"
                    onClick={() => {
                      setInput("What logo style works best for consulting?");
                    }}
                    className="p-3 rounded-lg border text-left text-sm hover:bg-accent transition-colors"
                  >
                    What logo style works best for consulting?
                  </button>
                </div>
              </div>
            )}

            {messages.map((message: Message, index: number) => (
              <div
                key={message.id + index}
                className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg p-3 text-sm ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  <div className="text-xs opacity-50 mt-1">
                    {new Date(message.createdAt).toLocaleTimeString()}
                  </div>
                </div>
                {message.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about business design, branding, or using Mvalex..."
              className="min-h-[60px] resize-none"
              rows={1}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || sendMessageMutation.isPending}
              className="shrink-0 text-white"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
