// lib/events/admin-event-reader.ts
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

// Admin Event Types
export enum AdminEventType {
  // System Events
  SYSTEM_HEALTH_CHECK = "admin:system:health",
  SYSTEM_METRICS = "admin:system:metrics",
  SYSTEM_ALERT = "admin:system:alert",
  SYSTEM_MAINTENANCE = "admin:system:maintenance",
  SYSTEM_BACKUP = "admin:system:backup",
  SYSTEM_UPDATE = "admin:system:update",
  
  // User Management Events
  USER_REGISTERED = "admin:user:registered",
  USER_DELETED = "admin:user:deleted",
  USER_SUSPENDED = "admin:user:suspended",
  USER_ACTIVATED = "admin:user:activated",
  USER_ROLE_CHANGED = "admin:user:role:changed",
  USER_CREDITS_UPDATED = "admin:user:credits:updated",
  USER_BULK_ACTION = "admin:user:bulk:action",
  
  // Ticket Management Events
  TICKET_CREATED = "admin:ticket:created",
  TICKET_ESCALATED = "admin:ticket:escalated",
  TICKET_URGENT = "admin:ticket:urgent",
  TICKET_SLA_BREACH = "admin:ticket:sla:breach",
  TICKET_UNASSIGNED = "admin:ticket:unassigned",
  TICKET_AGE_THRESHOLD = "admin:ticket:age:threshold",
  
  // Agent Management Events
  AGENT_STATUS_CHANGED = "admin:agent:status:changed",
  AGENT_OVERLOADED = "admin:agent:overloaded",
  AGENT_IDLE = "admin:agent:idle",
  AGENT_PERFORMANCE = "admin:agent:performance",
  AGENT_TICKET_DEADLINE = "admin:agent:ticket:deadline",
  
  // Credit & Revenue Events
  REVENUE_MILESTONE = "admin:revenue:milestone",
  CREDIT_PURCHASE = "admin:credit:purchase",
  REFUND_ISSUED = "admin:refund:issued",
  PROMO_CODE_USED = "admin:promo:code:used",
  
  // Security Events
  SECURITY_BREACH_ATTEMPT = "admin:security:breach:attempt",
  LOGIN_ANOMALY = "admin:security:login:anomaly",
  API_RATE_LIMIT_EXCEEDED = "admin:api:rate:limit:exceeded",
  PERMISSION_CHANGE = "admin:permission:change",
  
  // Analytics Events
  ANALYTICS_REPORT_READY = "admin:analytics:report:ready",
  METRICS_THRESHOLD = "admin:metrics:threshold",
  DAILY_SUMMARY = "admin:daily:summary",
  WEEKLY_REPORT = "admin:weekly:report",
}

// Event Payload Interfaces
interface AdminEventPayload {
  id: string;
  type: AdminEventType;
  timestamp: string;
  severity: "info" | "warning" | "error" | "critical";
  category: "system" | "users" | "tickets" | "agents" | "revenue" | "security" | "analytics";
  title: string;
  message: string;
  data: any;
  metadata?: Record<string, any>;
  actionRequired?: boolean;
  actionUrl?: string;
}

interface AdminEventHandler {
  (payload: AdminEventPayload): void;
}

// Toast configuration for admin events
const adminToastConfig: Partial<Record<AdminEventType, { severity: string; duration?: number }>> = {
  [AdminEventType.SYSTEM_ALERT]: { severity: "error", duration: 10000 },
  [AdminEventType.SYSTEM_HEALTH_CHECK]: { severity: "info", duration: 5000 },
  [AdminEventType.TICKET_URGENT]: { severity: "warning", duration: 15000 },
  [AdminEventType.TICKET_ESCALATED]: { severity: "warning", duration: 10000 },
  [AdminEventType.TICKET_SLA_BREACH]: { severity: "error", duration: 15000 },
  [AdminEventType.AGENT_OVERLOADED]: { severity: "warning", duration: 10000 },
  [AdminEventType.SECURITY_BREACH_ATTEMPT]: { severity: "critical", duration: 0 },
  [AdminEventType.REVENUE_MILESTONE]: { severity: "success", duration: 8000 },
  [AdminEventType.AGENT_IDLE]: { severity: "info", duration: 5000 },
};

class AdminEventReader {
  private ws: WebSocket | null = null;
  private eventHandlers: Map<AdminEventType, Set<AdminEventHandler>> = new Map();
  private categoryHandlers: Map<string, Set<AdminEventHandler>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private adminId: string | null = null;
  private isConnected = false;
  private eventQueue: AdminEventPayload[] = [];
  private isProcessingQueue = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;
  
  // Admin dashboard metrics
  private metrics: {
    eventsReceived: number;
    eventsByType: Map<string, number>;
    errors: number;
    lastEventAt: Date | null;
  } = {
    eventsReceived: 0,
    eventsByType: new Map(),
    errors: 0,
    lastEventAt: null,
  };

  constructor() {
    this.loadCachedEvents();
    this.startMetricsCollection();
  }

  /**
   * Connect to WebSocket server as admin
   */
  connect(adminId: string, token: string, adminRole: "ADMIN" | "SUPER_ADMIN") {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log("Admin WebSocket already connected");
      return;
    }

    this.adminId = adminId;
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || `wss://${window.location.host}/api/admin/ws`;
    
    try {
      this.ws = new WebSocket(`${wsUrl}?adminId=${adminId}&role=${adminRole}&token=${token}`);
      
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      
    } catch (error) {
      console.error("Failed to create Admin WebSocket connection:", error);
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
    
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isConnected = false;
    this.adminId = null;
    this.reconnectAttempts = 0;
  }

  /**
   * Subscribe to an event type
   */
  on(eventType: AdminEventType, handler: AdminEventHandler): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    
    this.eventHandlers.get(eventType)!.add(handler);
    
    return () => {
      this.eventHandlers.get(eventType)?.delete(handler);
    };
  }

  /**
   * Subscribe to events by category
   */
  onCategory(category: string, handler: AdminEventHandler): () => void {
    if (!this.categoryHandlers.has(category)) {
      this.categoryHandlers.set(category, new Set());
    }
    
    this.categoryHandlers.get(category)!.add(handler);
    
    return () => {
      this.categoryHandlers.get(category)?.delete(handler);
    };
  }

  /**
   * Subscribe to multiple event types
   */
  onMany(eventTypes: AdminEventType[], handler: AdminEventHandler): () => void {
    const unsubscribes = eventTypes.map(type => this.on(type, handler));
    return () => unsubscribes.forEach(unsubscribe => unsubscribe());
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      eventsByType: Object.fromEntries(this.metrics.eventsByType),
    };
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
    console.log("Admin WebSocket connected");
    this.isConnected = true;
    this.reconnectAttempts = 0;
    
    // Start heartbeat
    this.startHeartbeat();
    
    // Process queued events
    this.processEventQueue();
    
    // Request initial dashboard data
    this.requestDashboardData();
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
      
      if (data.type === "metrics") {
        this.updateMetrics(data.payload);
        return;
      }
      
      if (data.type === "event") {
        this.processEvent(data.payload);
      }
    } catch (error) {
      console.error("Failed to parse Admin WebSocket message:", error);
      this.metrics.errors++;
    }
  }

  /**
   * Handle WebSocket error event
   */
  private handleError(error: Event) {
    console.error("Admin WebSocket error:", error);
    this.isConnected = false;
    this.metrics.errors++;
  }

  /**
   * Handle WebSocket close event
   */
  private handleClose() {
    console.log("Admin WebSocket disconnected");
    this.isConnected = false;
    this.scheduleReconnect();
  }

  /**
   * Process incoming event
   */
  private processEvent(payload: AdminEventPayload) {
    // Update metrics
    this.metrics.eventsReceived++;
    this.metrics.lastEventAt = new Date();
    const count = this.metrics.eventsByType.get(payload.type) || 0;
    this.metrics.eventsByType.set(payload.type, count + 1);
    
    // Cache event
    this.cacheEvent(payload);
    
    // Show admin notification
    this.showAdminNotification(payload);
    
    // Invalidate React Query cache
    this.invalidateQueries(payload);
    
    // Call specific event handlers
    const handlers = this.eventHandlers.get(payload.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(payload);
        } catch (error) {
          console.error(`Error in admin event handler for ${payload.type}:`, error);
        }
      });
    }
    
    // Call category handlers
    const categoryHandlers = this.categoryHandlers.get(payload.category);
    if (categoryHandlers) {
      categoryHandlers.forEach(handler => {
        try {
          handler(payload);
        } catch (error) {
          console.error(`Error in category handler for ${payload.category}:`, error);
        }
      });
    }
  }

  /**
   * Show admin notification with appropriate styling
   */
  private showAdminNotification(payload: AdminEventPayload) {
    const config = adminToastConfig[payload.type];
    
    const toastOptions = {
      duration: config?.duration || 6000,
      action: payload.actionRequired ? {
        label: "View Details",
        onClick: () => {
          if (payload.actionUrl) {
            window.open(payload.actionUrl, "_blank");
          }
        },
      } : undefined,
    };
    
    switch (payload.severity) {
      case "critical":
        toast.error(`🚨 CRITICAL: ${payload.title}`, {
          description: payload.message,
          ...toastOptions,
        });
        break;
      case "error":
        toast.error(payload.title, {
          description: payload.message,
          ...toastOptions,
        });
        break;
      case "warning":
        toast.warning(payload.title, {
          description: payload.message,
          ...toastOptions,
        });
        break;
      case "info":
        toast.info(payload.title, {
          description: payload.message,
          ...toastOptions,
        });
        break;
      default:
        toast(payload.title, {
          description: payload.message,
          ...toastOptions,
        });
    }
    
    // Play sound for critical events
    if (payload.severity === "critical") {
      this.playAlertSound();
    }
  }

  /**
   * Play alert sound for critical events
   */
  private playAlertSound() {
    try {
      const audio = new Audio("/sounds/alert.mp3");
      audio.volume = 0.5;
      audio.play().catch(() => console.log("Audio playback failed"));
    } catch (error) {
      console.log("Audio not supported");
    }
  }

  /**
   * Invalidate React Query cache based on event
   */
  private invalidateQueries(payload: AdminEventPayload) {
    const queryKeys: string[] = [];
    
    switch (payload.category) {
      case "users":
        queryKeys.push("admin-users", "users-stats", "user-growth");
        break;
      case "tickets":
        queryKeys.push("admin-tickets", "ticket-stats", "agent-tickets");
        break;
      case "agents":
        queryKeys.push("admin-agents", "agent-stats", "agent-performance");
        break;
      case "revenue":
        queryKeys.push("admin-revenue", "credit-stats", "pricing-stats");
        break;
      case "system":
        queryKeys.push("system-health", "system-metrics", "audit-logs");
        break;
      case "security":
        queryKeys.push("security-logs", "active-sessions");
        break;
      case "analytics":
        queryKeys.push("admin-analytics", "dashboard-stats");
        break;
    }

    const queryClient = useQueryClient();
    
    queryKeys.forEach(key => {
      queryClient.invalidateQueries({ queryKey: [key] });
    });
  }

  /**
   * Request initial dashboard data
   */
  private requestDashboardData() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: "request",
        resource: "dashboard",
      }));
    }
  }

  /**
   * Update metrics from server
   */
  private updateMetrics(metrics: any) {
    // Store server-side metrics
    localStorage.setItem("admin_metrics", JSON.stringify(metrics));
  }

  /**
   * Start collecting metrics
   */
  private startMetricsCollection() {
    this.metricsInterval = setInterval(() => {
      if (this.isConnected) {
        // Send metrics to server
        this.ws?.send(JSON.stringify({
          type: "metrics",
          data: this.getMetrics(),
        }));
      }
    }, 60000); // Every minute
  }

  /**
   * Cache event for offline support
   */
  private cacheEvent(payload: AdminEventPayload) {
    try {
      const cached = localStorage.getItem("admin_events_cache");
      let events: AdminEventPayload[] = cached ? JSON.parse(cached) : [];
      
      events.unshift(payload);
      events = events.slice(0, 500); // Keep last 500 events
      
      localStorage.setItem("admin_events_cache", JSON.stringify(events));
    } catch (error) {
      console.error("Failed to cache admin event:", error);
    }
  }

  /**
   * Load cached events
   */
  private loadCachedEvents() {
    try {
      const cached = localStorage.getItem("admin_events_cache");
      if (cached) {
        const events: AdminEventPayload[] = JSON.parse(cached);
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const recentEvents = events.filter(e => new Date(e.timestamp).getTime() > oneDayAgo);
        recentEvents.forEach(event => this.processEvent(event));
      }
    } catch (error) {
      console.error("Failed to load cached admin events:", error);
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
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached for admin reader");
      return;
    }
    
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;
    
    setTimeout(() => {
      if (this.adminId) {
        const token = localStorage.getItem("auth_token");
        const role = localStorage.getItem("user_role") as "ADMIN" | "SUPER_ADMIN";
        if (token && role) {
          this.connect(this.adminId!, token, role);
        }
      }
    }, delay);
  }
}

// Singleton instance
let adminEventReader: AdminEventReader | null = null;

export function getAdminEventReader(): AdminEventReader {
  if (!adminEventReader) {
    adminEventReader = new AdminEventReader();
  }
  return adminEventReader;
}

// React Hook for admin events
export function useAdminEventReader() {
  const [isConnected, setIsConnected] = useState(false);
  const [metrics, setMetrics] = useState({ eventsReceived: 0, errors: 0 });
  const eventReader = getAdminEventReader();

  useEffect(() => {
    setIsConnected(eventReader.getConnectionStatus());
    setMetrics(eventReader.getMetrics());
    
    const interval = setInterval(() => {
      setIsConnected(eventReader.getConnectionStatus());
      setMetrics(eventReader.getMetrics());
    }, 5000);
    
    return () => clearInterval(interval);
  }, [eventReader]);

  return {
    isConnected,
    metrics,
    on: eventReader.on.bind(eventReader),
    onCategory: eventReader.onCategory.bind(eventReader),
    onMany: eventReader.onMany.bind(eventReader),
  };
}

// React Hook for specific admin event types
export function useAdminEventListener<T = any>(
  eventType: AdminEventType,
  handler: (data: T, payload: AdminEventPayload) => void
) {
  const eventReader = getAdminEventReader();

  useEffect(() => {
    const unsubscribe = eventReader.on(eventType, (payload) => {
      handler(payload.data as T, payload);
    });
    
    return unsubscribe;
  }, [eventType, handler, eventReader]);
}