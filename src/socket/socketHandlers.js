const { v4: uuidv4 } = require("uuid");

class SocketHandlers {
  constructor() {
    this.handlers = new Map();
    this.setupDefaultHandlers();
  }

  setupDefaultHandlers() {
    // Register handler
    this.handlers.set("register", this.handleRegister.bind(this));

    // Video control handlers
    this.handlers.set("playVideo", this.handlePlayVideo.bind(this));
    this.handlers.set("pauseVideo", this.handlePauseVideo.bind(this));
    this.handlers.set("stopVideo", this.handleStopVideo.bind(this));

    // Pairing handlers
    this.handlers.set("requestPairing", this.handleRequestPairing.bind(this));
    this.handlers.set("confirmPairing", this.handleConfirmPairing.bind(this));
    this.handlers.set("cancelPairing", this.handleCancelPairing.bind(this));

    // Status handlers
    this.handlers.set("getStatus", this.handleGetStatus.bind(this));
    this.handlers.set("ping", this.handlePing.bind(this));
  }

  registerHandlers(socket, socketManager) {
    console.log(`📝 Registering handlers for socket: ${socket.id}`);

    // Register all handlers
    for (const [event, handler] of this.handlers.entries()) {
      socket.on(event, (data) => {
        try {
          console.log(`📨 Received ${event}:`, data);
          handler(socket, data, socketManager);
        } catch (error) {
          console.error(`❌ Error handling ${event}:`, error);
          socket.emit("error", {
            event,
            message: "Internal server error",
            timestamp: new Date().toISOString(),
          });
        }
      });
    }
  }

  // Handler methods
  handleRegister(socket, data, socketManager) {
    const { type, id, name } = data;

    if (!type || !id) {
      socket.emit("error", {
        message: "Registration requires type and id",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (type === "tv") {
      socketManager.tvSockets.set(id, socket.id);
      console.log(`📺 TV registered: ${id} (${name || "Unknown"})`);

      socket.emit("registered", {
        type: "tv",
        id,
        message: "TV registered successfully",
        timestamp: new Date().toISOString(),
      });

      // Notify about active pairing sessions
      const activeSessions = Array.from(socketManager.pairingSessions.entries())
        .filter(([_, session]) => !session.used)
        .map(([sessionId, session]) => ({
          sessionId,
          tvId: session.tvId,
          expiresAt: session.expiresAt,
        }));

      if (activeSessions.length > 0) {
        socket.emit("activePairingSessions", activeSessions);
      }
    } else if (type === "mobile") {
      console.log(`📱 Mobile registered: ${id} (${name || "Unknown"})`);

      socket.emit("registered", {
        type: "mobile",
        id,
        message: "Mobile registered successfully",
        timestamp: new Date().toISOString(),
      });
    } else {
      socket.emit("error", {
        message: "Invalid registration type. Use 'tv' or 'mobile'",
        timestamp: new Date().toISOString(),
      });
    }
  }

  handlePlayVideo(socket, data, socketManager) {
    const { url, title, startTime } = data;

    if (!url) {
      socket.emit("error", {
        message: "Video URL is required",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    console.log(`🎬 Play video request: ${title || "Unknown"} | URL: ${url}`);

    // Broadcast to all TVs
    socketManager.broadcastToTVs("playOnTV", {
      url,
      title: title || "Unknown Video",
      startTime: startTime || 0,
      timestamp: new Date().toISOString(),
      source: "mobile",
    });

    socket.emit("playResponse", {
      success: true,
      message: "Video play command sent to all TVs",
      timestamp: new Date().toISOString(),
    });
  }

  handlePauseVideo(socket, data, socketManager) {
    console.log("⏸️ Pause video request");

    socketManager.broadcastToTVs("pauseOnTV", {
      timestamp: new Date().toISOString(),
    });

    socket.emit("pauseResponse", {
      success: true,
      message: "Pause command sent to all TVs",
      timestamp: new Date().toISOString(),
    });
  }

  handleStopVideo(socket, data, socketManager) {
    console.log("⏹️ Stop video request");

    socketManager.broadcastToTVs("stopOnTV", {
      timestamp: new Date().toISOString(),
    });

    socket.emit("stopResponse", {
      success: true,
      message: "Stop command sent to all TVs",
      timestamp: new Date().toISOString(),
    });
  }

  handleRequestPairing(socket, data, socketManager) {
    const { tvId } = data;

    if (!tvId) {
      socket.emit("error", {
        message: "TV ID is required for pairing",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Check if TV is registered
    if (!socketManager.tvSockets.has(tvId)) {
      socket.emit("error", {
        message: "TV not found or not registered",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Generate pairing session
    const sessionId = uuidv4();
    const expiresAt = Date.now() + socketManager.PAIRING_TTL_MS;

    socketManager.pairingSessions.set(sessionId, {
      tvId,
      expiresAt,
      used: false,
      mobileSocketId: socket.id,
    });

    console.log(`🔗 Pairing session created: ${sessionId} for TV: ${tvId}`);

    // Send pairing request to TV
    const tvSocketId = socketManager.tvSockets.get(tvId);
    const tvSocket = socketManager.io.sockets.sockets.get(tvSocketId);

    if (tvSocket) {
      tvSocket.emit("pairingRequest", {
        sessionId,
        mobileId: socket.id,
        expiresAt,
        timestamp: new Date().toISOString(),
      });
    }

    socket.emit("pairingRequested", {
      sessionId,
      tvId,
      expiresAt,
      message: "Pairing request sent to TV",
      timestamp: new Date().toISOString(),
    });
  }

  handleConfirmPairing(socket, data, socketManager) {
    const { sessionId, accepted } = data;

    const session = socketManager.pairingSessions.get(sessionId);
    if (!session) {
      socket.emit("error", {
        message: "Pairing session not found or expired",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (session.used) {
      socket.emit("error", {
        message: "Pairing session already used",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (accepted) {
      // Mark session as used
      session.used = true;
      session.pairedAt = Date.now();

      console.log(`✅ Pairing confirmed: ${sessionId}`);

      // Notify mobile
      const mobileSocket = socketManager.io.sockets.sockets.get(
        session.mobileSocketId
      );
      if (mobileSocket) {
        mobileSocket.emit("pairingConfirmed", {
          sessionId,
          tvId: session.tvId,
          message: "Pairing successful",
          timestamp: new Date().toISOString(),
        });
      }

      socket.emit("pairingConfirmed", {
        sessionId,
        message: "Pairing confirmed",
        timestamp: new Date().toISOString(),
      });
    } else {
      // Remove session
      socketManager.pairingSessions.delete(sessionId);

      console.log(`❌ Pairing rejected: ${sessionId}`);

      // Notify mobile
      const mobileSocket = socketManager.io.sockets.sockets.get(
        session.mobileSocketId
      );
      if (mobileSocket) {
        mobileSocket.emit("pairingRejected", {
          sessionId,
          tvId: session.tvId,
          message: "Pairing rejected by TV",
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  handleCancelPairing(socket, data, socketManager) {
    const { sessionId } = data;

    const session = socketManager.pairingSessions.get(sessionId);
    if (session) {
      socketManager.pairingSessions.delete(sessionId);

      console.log(`🚫 Pairing cancelled: ${sessionId}`);

      // Notify the other party
      const otherSocketId =
        session.mobileSocketId === socket.id ? null : session.mobileSocketId;
      if (otherSocketId) {
        const otherSocket = socketManager.io.sockets.sockets.get(otherSocketId);
        if (otherSocket) {
          otherSocket.emit("pairingCancelled", {
            sessionId,
            message: "Pairing cancelled",
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    socket.emit("pairingCancelled", {
      sessionId,
      message: "Pairing cancelled",
      timestamp: new Date().toISOString(),
    });
  }

  handleGetStatus(socket, data, socketManager) {
    const status = {
      connectedClients: socketManager.getConnectedClients().length,
      tvCount: socketManager.getTVCount(),
      activePairingSessions: socketManager.getActivePairingSessions(),
      timestamp: new Date().toISOString(),
    };

    socket.emit("status", status);
  }

  handlePing(socket, data, socketManager) {
    socket.emit("pong", {
      timestamp: new Date().toISOString(),
      serverTime: Date.now(),
    });
  }
}

module.exports = new SocketHandlers();
