// WebSocket connection manager
export class NotificationWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private listeners: Set<(notification: Notification) => void> = new Set();
  private userId: string | null = null;

  connect(userId: string) {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    
    this.userId = userId;
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || `ws://${window.location.host}/api/ws`;
    
    try {
      this.ws = new WebSocket(`${wsUrl}?userId=${userId}`);
      
      this.ws.onopen = () => {
        console.log("WebSocket connected");
        this.reconnectAttempts = 0;
      };
      
      this.ws.onmessage = (event) => {
        try {
          const notification = JSON.parse(event.data) as Notification;
          this.listeners.forEach(listener => listener(notification));
        } catch (error) {
          console.warn("Failed to parse WebSocket message:", error);
        }
      };
      
      this.ws.onerror = (error) => {
        console.warn("WebSocket error:", error);
      };
      
      this.ws.onclose = () => {
        console.log("WebSocket disconnected");
        this.reconnect();
      };
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
      this.reconnect();
    }
  }

  private reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("Max reconnection attempts reached");
      return;
    }
    
    setTimeout(() => {
      this.reconnectAttempts++;
      if (this.userId) {
        this.connect(this.userId);
      }
    }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
  }

  addListener(listener: (notification: Notification) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
  }
}