const { Server } = require("socket.io");
const socketHandlers = require("./socketHandlers");

class SocketManager {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
    });

    this.tvSockets = new Map(); // tvId -> socketId
    this.pairingSessions = new Map(); // sessionId -> { tvId, expiresAt, used: false, pairedUserId? }
    this.PAIRING_TTL_MS = 1000 * 60 * 5; // 5 minutes

    this.setupSocketHandlers();
    this.setupErrorHandling();
    this.startCleanupInterval();
  }

  setupSocketHandlers() {
    this.io.on("connection", (socket) => {
      console.log(`🔗 Client connected: ${socket.id}`);
      console.log(`📊 Active connections: ${this.io.sockets.sockets.size}`);

      // Register socket handlers
      socketHandlers.registerHandlers(socket, this);

      // Handle disconnect
      socket.on("disconnect", (reason) => {
        console.log(`🔌 Client disconnected: ${socket.id} | Reason: ${reason}`);
        this.handleDisconnect(socket.id);
        console.log(`📊 Active connections: ${this.io.sockets.sockets.size}`);
      });
    });
  }

  setupErrorHandling() {
    this.io.on("connection_error", (error) => {
      console.error("❌ Socket connection error:", error);
    });

    this.io.on("connect_error", (error) => {
      console.error("❌ Socket connect error:", error);
    });
  }

  startCleanupInterval() {
    // Clean up expired pairing sessions every minute
    setInterval(() => {
      const now = Date.now();
      let cleaned = 0;

      for (const [sessionId, session] of this.pairingSessions.entries()) {
        if (session.expiresAt < now) {
          this.pairingSessions.delete(sessionId);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        console.log(`🧹 Cleaned up ${cleaned} expired pairing sessions`);
      }
    }, 60000);
  }

  handleDisconnect(socketId) {
    // Clean up TV sockets
    for (const [tvId, sid] of this.tvSockets.entries()) {
      if (sid === socketId) {
        this.tvSockets.delete(tvId);
        console.log(`📺 TV ${tvId} disconnected`);
      }
    }

    // Clean up pairing sessions associated with this socket
    for (const [sessionId, session] of this.pairingSessions.entries()) {
      if (session.tvSocketId === socketId) {
        this.pairingSessions.delete(sessionId);
      }
    }
  }

  // Utility methods
  getConnectedClients() {
    return Array.from(this.io.sockets.sockets.keys());
  }

  getTVCount() {
    return this.tvSockets.size;
  }

  getActivePairingSessions() {
    return this.pairingSessions.size;
  }

  broadcastToTVs(event, data) {
    console.log(`📡 Broadcasting to ${this.tvSockets.size} TVs: ${event}`);
    this.io.emit(event, data);
  }

  sendToTV(tvId, event, data) {
    const socketId = this.tvSockets.get(tvId);
    if (socketId) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit(event, data);
        return true;
      }
    }
    return false;
  }
}

module.exports = SocketManager;
