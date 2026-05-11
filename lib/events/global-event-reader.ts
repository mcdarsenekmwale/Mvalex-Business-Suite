// lib/events/global-event-reader.ts
"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";


// Event Types
export enum EventType {
  // Ticket Events
  TICKET_CREATED = "ticket:created",
  TICKET_ASSIGNED = "ticket:assigned",
  TICKET_RESPONDED = "ticket:responded",
  TICKET_RESOLVED = "ticket:resolved",
  TICKET_CLOSED = "ticket:closed",
  TICKET_ESCALATED = "ticket:escalated",
  TICKET_PRIORITY_CHANGED = "ticket:priority:changed",
  TICKET_STATUS_CHANGED = "ticket:status:changed",
  
  // User Events
  USER_CREATED = "user:created",
  USER_UPDATED = "user:updated",
  USER_DELETED = "user:deleted",
  USER_SUSPENDED = "user:suspended",
  USER_ACTIVATED = "user:activated",
  USER_ROLE_CHANGED = "user:role:changed",
  
  // Credit Events
  CREDIT_ADDED = "credit:added",
  CREDIT_DEDUCTED = "credit:deducted",
  CREDIT_LOW = "credit:low",
  CREDIT_EXPIRING = "credit:expiring",
  
  // Asset Events
  ASSET_CREATED = "asset:created",
  ASSET_UPDATED = "asset:updated",
  ASSET_DELETED = "asset:deleted",
  EXPORT_COMPLETED = "export:completed",
  
  // System Events
  SYSTEM_ALERT = "system:alert",
  SYSTEM_MAINTENANCE = "system:maintenance",
  SYSTEM_UPDATE = "system:update",
  
  // Agent Events
  AGENT_STATUS_CHANGED = "agent:status:changed",
  AGENT_ASSIGNED = "agent:assigned",
  
  // Notification Events
  NOTIFICATION_NEW = "notification:new",
  NOTIFICATION_READ = "notification:read",
}

// Event Payload Interfaces
interface EventPayload {
  id: string;
  type: EventType;
  timestamp: string;
  userId: string;
  data: any;
  metadata?: Record<string, any>;
}

interface EventHandler {
  (payload: EventPayload): void;
}

// Toast configuration for different event types
const eventToastConfig: Partial<Record<EventType, { title: string; description?: string; variant?: "default" | "destructive" | "success" }>> = {
  [EventType.TICKET_CREATED]: { title: "New Ticket Created", variant: "default" },
  [EventType.TICKET_ASSIGNED]: { title: "Ticket Assigned", variant: "default" },
  [EventType.TICKET_RESPONDED]: { title: "New Response", variant: "default" },
  [EventType.TICKET_RESOLVED]: { title: "Ticket Resolved", variant: "success" },
  [EventType.CREDIT_LOW]: { title: "Low Credits", variant: "destructive" },
  [EventType.CREDIT_ADDED]: { title: "Credits Added", variant: "success" },
  [EventType.USER_SUSPENDED]: { title: "Account Suspended", variant: "destructive" },
  [EventType.EXPORT_COMPLETED]: { title: "Export Ready", variant: "success" },
  [EventType.SYSTEM_ALERT]: { title: "System Alert", variant: "destructive" },
};

class GlobalEventReader {
  private ws: WebSocket | null = null;
  private eventHandlers: Map<EventType, Set<EventHandler>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private userId: string | null = null;
  private isConnected = false;
  private eventQueue: EventPayload[] = [];
  private isProcessingQueue = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Load cached events from localStorage on initialization
    this.loadCachedEvents();
  }

  /**
   * Connect to WebSocket server
   */
  connect(userId: string, token: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log("WebSocket already connected");
      return;
    }

    this.userId = userId;
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || `wss://${window.location.host}/api/ws`;
    
    try {
      this.ws = new WebSocket(`${wsUrl}?userId=${userId}&token=${token}`);
      
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isConnected = false;
    this.userId = null;
    this.reconnectAttempts = 0;
  }

  /**
   * Subscribe to an event type
   */
  on(eventType: EventType, handler: EventHandler): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    
    this.eventHandlers.get(eventType)!.add(handler);
    
    // Return unsubscribe function
    return () => {
      this.eventHandlers.get(eventType)?.delete(handler);
    };
  }

  /**
   * Subscribe to multiple event types
   */
  onMany(eventTypes: EventType[], handler: EventHandler): () => void {
    const unsubscribes = eventTypes.map(type => this.on(type, handler));
    return () => unsubscribes.forEach(unsubscribe => unsubscribe());
  }

  /**
   * Subscribe to all events
   */
  onAll(handler: EventHandler): () => void {
    return this.on(EventType.SYSTEM_ALERT, handler);
  }

  /**
   * Emit an event (for testing or internal use)
   */
  emit(eventType: EventType, data: any, userId?: string) {
    const payload: EventPayload = {
      id: this.generateId(),
      type: eventType,
      timestamp: new Date().toISOString(),
      userId: userId || this.userId || "system",
      data,
    };
    
    this.processEvent(payload);
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Handle WebSocket open event
   */
  private handleOpen() {
    console.log("WebSocket connected");
    this.isConnected = true;
    this.reconnectAttempts = 0;
    
    // Start heartbeat
    this.startHeartbeat();
    
    // Process queued events
    this.processEventQueue();
  }

  /**
   * Handle WebSocket message event
   */
  private handleMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === "heartbeat") {
        this.handleHeartbeat();
        return;
      }
      
      if (data.type === "event") {
        this.processEvent(data.payload);
      }
    } catch (error) {
      console.error("Failed to parse WebSocket message:", error);
    }
  }

  /**
   * Handle WebSocket error event
   */
  private handleError(error: Event) {
    console.warn("WebSocket error:", error);
    this.isConnected = false;
  }

  /**
   * Handle WebSocket close event
   */
  private handleClose() {
    console.log("WebSocket disconnected");
    this.isConnected = false;
    this.scheduleReconnect();
  }

  /**
   * Process incoming event
   */
  private processEvent(payload: EventPayload) {
    // Cache event for offline support
    this.cacheEvent(payload);
    
    // Show toast notification if configured
    this.showEventToast(payload);
    
    // Invalidate React Query cache based on event type
    this.invalidateQueries(payload);
    
    // Call registered handlers
    const handlers = this.eventHandlers.get(payload.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(payload);
        } catch (error) {
          console.error(`Error in event handler for ${payload.type}:`, error);
        }
      });
    }
    
    // Call global handlers for all events
    const globalHandlers = this.eventHandlers.get(EventType.SYSTEM_ALERT);
    if (globalHandlers) {
      globalHandlers.forEach(handler => {
        try {
          handler(payload);
        } catch (error) {
          console.error(`Error in global event handler:`, error);
        }
      });
    }
  }

  /**
   * Show toast notification for event
   */
  private showEventToast(payload: EventPayload) {
    const config = eventToastConfig[payload.type];
    if (!config) return;
    
    const { title, description, variant } = config;
    const message = payload.data?.message || payload.data?.description || description;
    
    switch (variant) {
      case "success":
        toast.success(title, { description: message });
        break;
      case "destructive":
        toast.error(title, { description: message });
        break;
      default:
        toast.info(title, { description: message });
    }
  }

  /**
   * Invalidate React Query cache based on event
   */
  private invalidateQueries(payload: EventPayload) {
    const queryKeys: string[] = [];
    
    switch (payload.type) {
      case EventType.TICKET_CREATED:
      case EventType.TICKET_ASSIGNED:
      case EventType.TICKET_RESPONDED:
      case EventType.TICKET_RESOLVED:
      case EventType.TICKET_CLOSED:
        queryKeys.push("agent-tickets", "tickets", "admin-tickets");
        break;
        
      case EventType.USER_CREATED:
      case EventType.USER_UPDATED:
      case EventType.USER_DELETED:
      case EventType.USER_SUSPENDED:
      case EventType.USER_ACTIVATED:
        queryKeys.push("admin-users", "users");
        break;
        
      case EventType.CREDIT_ADDED:
      case EventType.CREDIT_DEDUCTED:
        queryKeys.push("user-credits", "credits-balance");
        break;
        
      case EventType.ASSET_CREATED:
      case EventType.ASSET_UPDATED:
      case EventType.ASSET_DELETED:
      case EventType.EXPORT_COMPLETED:
        queryKeys.push("dashboard", "recent-assets");
        break;
        
      case EventType.NOTIFICATION_NEW:
      case EventType.NOTIFICATION_READ:
        queryKeys.push("user-notifications");
        break;
        
      case EventType.AGENT_STATUS_CHANGED:
        queryKeys.push("admin-agents-dashboard");
        break;
    }

    const queryClient = useQueryClient();
    
    // Invalidate each query key
    queryKeys.forEach(key => {
      queryClient.invalidateQueries({ queryKey: [key] });
    });
  }

  /**
   * Cache event for offline support
   */
  private cacheEvent(payload: EventPayload) {
    try {
      const cached = localStorage.getItem("mvalex_events_cache");
      let events: EventPayload[] = cached ? JSON.parse(cached) : [];
      
      // Add new event
      events.unshift(payload);
      
      // Keep only last 100 events
      events = events.slice(0, 100);
      
      localStorage.setItem("mvalex_events_cache", JSON.stringify(events));
    } catch (error) {
      console.error("Failed to cache event:", error);
    }
  }

  /**
   * Load cached events
   */
  private loadCachedEvents() {
    try {
      const cached = localStorage.getItem("mvalex_events_cache");
      if (cached) {
        const events: EventPayload[] = JSON.parse(cached);
        // Process events from the last hour
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        const recentEvents = events.filter(e => new Date(e.timestamp).getTime() > oneHourAgo);
        recentEvents.forEach(event => this.processEvent(event));
      }
    } catch (error) {
      console.error("Failed to load cached events:", error);
    }
  }

  /**
   * Process event queue
   */
  private async processEventQueue() {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;
    
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      if (event) {
        this.processEvent(event);
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    this.isProcessingQueue = false;
  }

  /**
   * Queue event for later processing
   */
  private queueEvent(event: EventPayload) {
    this.eventQueue.push(event);
    this.processEventQueue();
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);
  }

  /**
   * Handle heartbeat response
   */
  private handleHeartbeat() {
    // Connection is alive
    this.startHeartbeat();
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      return;
    }
    
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;
    
    setTimeout(() => {
      if (this.userId) {
        const token = localStorage.getItem("auth_token");
        if (token) {
          this.connect(this.userId!, token);
        }
      }
    }, delay);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
let globalEventReader: GlobalEventReader | null = null;

export function getGlobalEventReader(): GlobalEventReader {
  if (!globalEventReader) {
    globalEventReader = new GlobalEventReader();
  }
  return globalEventReader;
}

// React Hook for using events in components
export function useEventReader() {
  const [isConnected, setIsConnected] = useState(false);
  const eventReader = getGlobalEventReader();

  useEffect(() => {
    setIsConnected(eventReader.getConnectionStatus());
    
    const interval = setInterval(() => {
      setIsConnected(eventReader.getConnectionStatus());
    }, 5000);
    
    return () => clearInterval(interval);
  }, [eventReader]);

  return {
    isConnected,
    on: eventReader.on.bind(eventReader),
    onMany: eventReader.onMany.bind(eventReader),
    onAll: eventReader.onAll.bind(eventReader),
    emit: eventReader.emit.bind(eventReader),
  };
}

// React Hook for specific event types
export function useEventListener<T = any>(
  eventType: EventType,
  handler: (data: T, payload: EventPayload) => void
) {
  const eventReader = getGlobalEventReader();

  useEffect(() => {
    const unsubscribe = eventReader.on(eventType, (payload) => {
      handler(payload.data as T, payload);
    });
    
    return unsubscribe;
  }, [eventType, handler, eventReader]);
}

// React Hook for multiple event types
export function useEventListeners<T = any>(
  eventTypes: EventType[],
  handler: (data: T, payload: EventPayload) => void
) {
  const eventReader = getGlobalEventReader();

  useEffect(() => {
    const unsubscribe = eventReader.onMany(eventTypes, (payload) => {
      handler(payload.data as T, payload);
    });
    
    return unsubscribe;
  }, [eventTypes, handler, eventReader]);
}