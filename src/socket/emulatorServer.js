const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const emulatorHandlers = require("./emulatorHandlers");

class EmulatorServer {
  constructor(port = 8082) {
    this.port = port;
    this.app = express();
    this.server = http.createServer(this.app);
    this.emulatorSockets = new Map(); // emulatorId -> socketId
    this.connectedEmulators = new Map(); // emulatorId -> connection info

    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketIO();
    this.startServer();
  }

  setupMiddleware() {
    // Serve static files for emulator HTML
    this.app.use(express.static(path.join(__dirname, "../../public")));

    // CORS configuration for emulator connections
    this.app.use((req, res, next) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
      );
      next();
    });
  }

  setupRoutes() {
    // Main emulator HTML endpoint
    this.app.get("/", (req, res) => {
      res.sendFile(path.join(__dirname, "../../public/emulator/index.html"));
    });

    // Emulator status endpoint
    this.app.get("/status", (req, res) => {
      res.json({
        port: this.port,
        connectedEmulators: this.connectedEmulators.size,
        serverStatus: "running",
        timestamp: new Date().toISOString(),
      });
    });

    // Health check endpoint
    this.app.get("/health", (req, res) => {
      res.json({
        status: "healthy",
        port: this.port,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      });
    });
  }

  setupSocketIO() {
    this.io = new Server(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
    });

    this.io.on("connection", (socket) => {
      console.log(`🔗 Emulator client connected: ${socket.id}`);
      console.log(`📊 Emulator connections: ${this.io.sockets.sockets.size}`);

      // Register emulator handlers
      emulatorHandlers.registerHandlers(socket, this);

      // Handle emulator registration
      socket.on("registerEmulator", (data) => {
        this.handleEmulatorRegistration(socket, data);
      });

      // Handle disconnect
      socket.on("disconnect", (reason) => {
        console.log(
          `🔌 Emulator client disconnected: ${socket.id} | Reason: ${reason}`
        );
        this.handleEmulatorDisconnect(socket.id);
        console.log(`📊 Emulator connections: ${this.io.sockets.sockets.size}`);
      });

      // Handle broadcast requests from emulator
      socket.on("broadcastHTML", (data) => {
        this.handleBroadcastHTML(socket, data);
      });

      // Handle ping from emulator
      socket.on("ping", (data) => {
        socket.emit("pong", {
          timestamp: new Date().toISOString(),
          serverTime: Date.now(),
          emulatorId: socket.emulatorId,
        });
      });
    });
  }

  handleEmulatorRegistration(socket, data) {
    const { emulatorId, deviceName, androidVersion } = data;

    if (!emulatorId) {
      socket.emit("registrationError", {
        message: "Emulator ID is required",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Store emulator information
    socket.emulatorId = emulatorId;
    this.emulatorSockets.set(emulatorId, socket.id);
    this.connectedEmulators.set(emulatorId, {
      socketId: socket.id,
      deviceName: deviceName || "Unknown Emulator",
      androidVersion: androidVersion || "Unknown",
      connectedAt: new Date().toISOString(),
      port: this.port,
    });

    console.log(
      `📱 Emulator registered: ${emulatorId} (${deviceName || "Unknown"})`
    );
    console.log(`🔗 Emulator-5556 connection established on port ${this.port}`);

    socket.emit("emulatorRegistered", {
      emulatorId,
      message: "Emulator registered successfully",
      port: this.port,
      timestamp: new Date().toISOString(),
    });

    // Broadcast to all connected emulators
    this.broadcastToEmulators("emulatorConnected", {
      emulatorId,
      deviceName: deviceName || "Unknown",
      timestamp: new Date().toISOString(),
    });
  }

  handleEmulatorDisconnect(socketId) {
    // Find and remove disconnected emulator
    for (const [emulatorId, sid] of this.emulatorSockets.entries()) {
      if (sid === socketId) {
        this.emulatorSockets.delete(emulatorId);
        const emulatorInfo = this.connectedEmulators.get(emulatorId);
        this.connectedEmulators.delete(emulatorId);

        console.log(`📱 Emulator disconnected: ${emulatorId}`);

        // Notify remaining emulators
        this.broadcastToEmulators("emulatorDisconnected", {
          emulatorId,
          timestamp: new Date().toISOString(),
        });

        break;
      }
    }
  }

  handleBroadcastHTML(socket, data) {
    const { html, targetEmulators, broadcastType } = data;

    if (!html) {
      socket.emit("broadcastError", {
        message: "HTML content is required",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    console.log(`📡 Broadcasting HTML content to emulators`);
    console.log(`🎯 Target emulators: ${targetEmulators || "all"}`);
    console.log(`📝 Broadcast type: ${broadcastType || "update"}`);

    if (targetEmulators && Array.isArray(targetEmulators)) {
      // Broadcast to specific emulators
      targetEmulators.forEach((emulatorId) => {
        const socketId = this.emulatorSockets.get(emulatorId);
        if (socketId) {
          const targetSocket = this.io.sockets.sockets.get(socketId);
          if (targetSocket) {
            targetSocket.emit("htmlBroadcast", {
              html,
              broadcastType: broadcastType || "update",
              sourceEmulator: socket.emulatorId,
              timestamp: new Date().toISOString(),
            });
          }
        }
      });
    } else {
      // Broadcast to all emulators
      this.broadcastToEmulators("htmlBroadcast", {
        html,
        broadcastType: broadcastType || "update",
        sourceEmulator: socket.emulatorId,
        timestamp: new Date().toISOString(),
      });
    }

    socket.emit("broadcastResponse", {
      success: true,
      message: "HTML broadcast sent successfully",
      targetCount: targetEmulators
        ? targetEmulators.length
        : this.emulatorSockets.size,
      timestamp: new Date().toISOString(),
    });
  }

  broadcastToEmulators(event, data) {
    console.log(
      `📡 Broadcasting to ${this.emulatorSockets.size} emulators: ${event}`
    );
    this.io.emit(event, data);
  }

  getConnectedEmulators() {
    return Array.from(this.connectedEmulators.entries()).map(([id, info]) => ({
      id,
      ...info,
    }));
  }

  getEmulatorCount() {
    return this.emulatorSockets.size;
  }

  startServer() {
    this.server
      .listen(this.port, () => {
        console.log(`🚀 Emulator server running on port ${this.port}`);
        console.log(`📱 Ready for emulator-5556 connections`);
        console.log(`🌐 Emulator HTML server: http://localhost:${this.port}`);
        console.log(`🔍 Status endpoint: http://localhost:${this.port}/status`);
      })
      .on("error", (err) => {
        if (err.code === "EADDRINUSE") {
          console.error(`❌ Port ${this.port} is already in use`);
          console.log(
            `💡 This usually means another application is using this port`
          );
          console.log(`💡 Try one of these solutions:`);
          console.log(`   - Close other applications using port ${this.port}`);
          console.log(`   - Change the port in the EmulatorServer constructor`);
          console.log(`   - Wait a moment and try restarting`);
          process.exit(1);
        } else {
          console.error("❌ Server error:", err.message);
          process.exit(1);
        }
      });
  }

  stopServer() {
    this.server.close(() => {
      console.log(`🛑 Emulator server stopped on port ${this.port}`);
    });
  }
}

module.exports = EmulatorServer;
