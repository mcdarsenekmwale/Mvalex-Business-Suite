type SocketLike = {
  userId: string;
  send: (payload: string) => void;
  readyState: number;
  lastPongAt?: number;
};

const OPEN = 1;
const HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds
const HEARTBEAT_TIMEOUT_MS = 60000; // 60 seconds

/**
 * Enhanced WebSocket server with heartbeat, stale connection cleanup,
 * and memory leak prevention.
 */
export class WebSocketServer {
  private clients: Map<string, Set<SocketLike>> = new Map();
  private heartbeatIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startHeartbeat();
  }

  addClient(userId: string, socket: SocketLike) {
    const set = this.clients.get(userId) ?? new Set<SocketLike>();
    set.add(socket);
    this.clients.set(userId, set);
    socket.lastPongAt = Date.now();
  }

  removeClient(userId: string, socket: SocketLike) {
    const set = this.clients.get(userId);
    if (!set) return;
    set.delete(socket);
    if (!set.size) this.clients.delete(userId);
  }

  emitToUser(userId: string, event: string, data: unknown) {
    const sockets = this.clients.get(userId);
    if (!sockets?.size) return;
    const payload = JSON.stringify({ event, data });
    sockets.forEach((socket) => {
      if (socket.readyState === OPEN) {
        try {
          socket.send(payload);
        } catch (error) {
          console.error(`[WebSocketServer] Failed to emit to ${userId}:`, error);
        }
      }
    });
  }

  broadcast(event: string, data: unknown) {
    const payload = JSON.stringify({ event, data });
    this.clients.forEach((sockets) => {
      sockets.forEach((socket) => {
        if (socket.readyState === OPEN) {
          try {
            socket.send(payload);
          } catch (error) {
            console.error("[WebSocketServer] Broadcast error:", error);
          }
        }
      });
    });
  }

  handlePong(userId: string, socket: SocketLike) {
    socket.lastPongAt = Date.now();
  }

  getConnectionStats() {
    let totalConnections = 0;
    this.clients.forEach((set) => {
      totalConnections += set.size;
    });
    return {
      uniqueUsers: this.clients.size,
      totalConnections,
    };
  }

  private startHeartbeat() {
    if (this.heartbeatIntervalId) return;

    this.heartbeatIntervalId = setInterval(() => {
      const now = Date.now();
      const deadSockets: Array<{ userId: string; socket: SocketLike }> = [];

      this.clients.forEach((sockets, userId) => {
        sockets.forEach((socket) => {
          // Send ping
          if (socket.readyState === OPEN) {
            try {
              socket.send(JSON.stringify({ event: "ping", data: {} }));
            } catch {
              deadSockets.push({ userId, socket });
            }
          }

          // Check for stale connections
          if (socket.lastPongAt && now - socket.lastPongAt > HEARTBEAT_TIMEOUT_MS) {
            deadSockets.push({ userId, socket });
          }
        });
      });

      // Remove dead sockets
      for (const { userId, socket } of deadSockets) {
        this.removeClient(userId, socket);
        try {
          if (typeof (socket as any).close === "function") {
            (socket as any).close();
          }
        } catch {
          // ignore
        }
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  stopHeartbeat() {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
  }
}
