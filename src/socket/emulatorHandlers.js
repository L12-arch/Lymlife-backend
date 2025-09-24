const path = require("path");
const fs = require("fs");

class EmulatorHandlers {
  constructor() {
    this.handlers = new Map();
    this.setupDefaultHandlers();
  }

  setupDefaultHandlers() {
    // Emulator-specific handlers
    this.handlers.set("emulatorCommand", this.handleEmulatorCommand.bind(this));
    this.handlers.set(
      "getEmulatorStatus",
      this.handleGetEmulatorStatus.bind(this)
    );
    this.handlers.set("sendToEmulator", this.handleSendToEmulator.bind(this));
    this.handlers.set(
      "broadcastToEmulators",
      this.handleBroadcastToEmulators.bind(this)
    );
    this.handlers.set(
      "emulatorHeartbeat",
      this.handleEmulatorHeartbeat.bind(this)
    );
    this.handlers.set(
      "emulatorScreenshot",
      this.handleEmulatorScreenshot.bind(this)
    );
    this.handlers.set("emulatorInput", this.handleEmulatorInput.bind(this));
  }

  registerHandlers(socket, emulatorServer) {
    console.log(`📝 Registering emulator handlers for socket: ${socket.id}`);

    // Register all handlers
    for (const [event, handler] of this.handlers.entries()) {
      socket.on(event, (data) => {
        try {
          console.log(`📨 Emulator received ${event}:`, data);
          handler(socket, data, emulatorServer);
        } catch (error) {
          console.error(`❌ Error handling emulator ${event}:`, error);
          socket.emit("emulatorError", {
            event,
            message: "Internal server error",
            timestamp: new Date().toISOString(),
          });
        }
      });
    }
  }

  handleEmulatorCommand(socket, data, emulatorServer) {
    const { command, parameters } = data;

    if (!command) {
      socket.emit("commandError", {
        message: "Command is required",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    console.log(`⚡ Emulator command: ${command}`, parameters || "");

    // Handle different emulator commands
    switch (command) {
      case "getDeviceInfo":
        this.sendDeviceInfo(socket, emulatorServer);
        break;
      case "listApps":
        this.sendAppList(socket, emulatorServer);
        break;
      case "launchApp":
        this.launchApp(socket, parameters, emulatorServer);
        break;
      case "closeApp":
        this.closeApp(socket, parameters, emulatorServer);
        break;
      case "rotate":
        this.rotateDevice(socket, parameters, emulatorServer);
        break;
      case "setLocation":
        this.setLocation(socket, parameters, emulatorServer);
        break;
      default:
        socket.emit("commandResponse", {
          command,
          success: false,
          message: `Unknown command: ${command}`,
          timestamp: new Date().toISOString(),
        });
    }
  }

  handleGetEmulatorStatus(socket, data, emulatorServer) {
    const status = {
      emulatorId: socket.emulatorId,
      connectedEmulators: emulatorServer.getConnectedEmulators(),
      totalConnections: emulatorServer.getEmulatorCount(),
      serverPort: emulatorServer.port,
      timestamp: new Date().toISOString(),
    };

    socket.emit("emulatorStatus", status);
  }

  handleSendToEmulator(socket, data, emulatorServer) {
    const { targetEmulatorId, message, messageType } = data;

    if (!targetEmulatorId) {
      socket.emit("sendError", {
        message: "Target emulator ID is required",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const targetSocketId = emulatorServer.emulatorSockets.get(targetEmulatorId);
    if (!targetSocketId) {
      socket.emit("sendError", {
        message: "Target emulator not found or not connected",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const targetSocket = emulatorServer.io.sockets.sockets.get(targetSocketId);
    if (targetSocket) {
      targetSocket.emit("messageFromServer", {
        message,
        messageType: messageType || "info",
        sourceEmulator: socket.emulatorId,
        timestamp: new Date().toISOString(),
      });

      socket.emit("sendResponse", {
        success: true,
        message: "Message sent to emulator successfully",
        targetEmulator: targetEmulatorId,
        timestamp: new Date().toISOString(),
      });
    } else {
      socket.emit("sendError", {
        message: "Target emulator socket not available",
        timestamp: new Date().toISOString(),
      });
    }
  }

  handleBroadcastToEmulators(socket, data, emulatorServer) {
    const { message, messageType, excludeEmulator } = data;

    if (!message) {
      socket.emit("broadcastError", {
        message: "Message is required for broadcast",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    console.log(`📡 Broadcasting message to all emulators: ${message}`);

    emulatorServer.broadcastToEmulators("broadcastMessage", {
      message,
      messageType: messageType || "info",
      sourceEmulator: socket.emulatorId,
      excludeEmulator,
      timestamp: new Date().toISOString(),
    });

    socket.emit("broadcastResponse", {
      success: true,
      message: "Message broadcast to all emulators",
      timestamp: new Date().toISOString(),
    });
  }

  handleEmulatorHeartbeat(socket, data, emulatorServer) {
    // Update emulator's last seen timestamp
    if (socket.emulatorId) {
      const emulatorInfo = emulatorServer.connectedEmulators.get(
        socket.emulatorId
      );
      if (emulatorInfo) {
        emulatorInfo.lastSeen = new Date().toISOString();
        emulatorInfo.isOnline = true;
      }
    }

    socket.emit("heartbeatResponse", {
      emulatorId: socket.emulatorId,
      timestamp: new Date().toISOString(),
      serverTime: Date.now(),
    });
  }

  handleEmulatorScreenshot(socket, data, emulatorServer) {
    // Handle screenshot requests from emulator
    console.log(`📸 Screenshot requested by emulator: ${socket.emulatorId}`);

    socket.emit("screenshotResponse", {
      message: "Screenshot functionality not yet implemented",
      timestamp: new Date().toISOString(),
    });
  }

  handleEmulatorInput(socket, data, emulatorServer) {
    const { inputType, inputData } = data;

    console.log(`⌨️ Emulator input: ${inputType}`, inputData);

    // Broadcast input events to other emulators if needed
    emulatorServer.broadcastToEmulators("emulatorInputEvent", {
      inputType,
      inputData,
      sourceEmulator: socket.emulatorId,
      timestamp: new Date().toISOString(),
    });

    socket.emit("inputResponse", {
      success: true,
      message: "Input event processed",
      timestamp: new Date().toISOString(),
    });
  }

  // Helper methods
  sendDeviceInfo(socket, emulatorServer) {
    const deviceInfo = {
      emulatorId: socket.emulatorId,
      deviceName: "Android Emulator",
      androidVersion: "11.0",
      apiLevel: 30,
      screenSize: "1080x1920",
      density: "xxhdpi",
      serverPort: emulatorServer.port,
      timestamp: new Date().toISOString(),
    };

    socket.emit("deviceInfo", deviceInfo);

    socket.emit("commandResponse", {
      command: "getDeviceInfo",
      success: true,
      data: deviceInfo,
      timestamp: new Date().toISOString(),
    });
  }

  sendAppList(socket, emulatorServer) {
    const appList = [
      { packageName: "com.android.browser", name: "Browser" },
      { packageName: "com.android.settings", name: "Settings" },
      { packageName: "com.android.calculator2", name: "Calculator" },
    ];

    socket.emit("appList", appList);

    socket.emit("commandResponse", {
      command: "listApps",
      success: true,
      data: appList,
      timestamp: new Date().toISOString(),
    });
  }

  launchApp(socket, parameters, emulatorServer) {
    const { packageName } = parameters;

    if (!packageName) {
      socket.emit("commandResponse", {
        command: "launchApp",
        success: false,
        message: "Package name is required",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    socket.emit("commandResponse", {
      command: "launchApp",
      success: true,
      message: `App ${packageName} launch command sent`,
      timestamp: new Date().toISOString(),
    });
  }

  closeApp(socket, parameters, emulatorServer) {
    const { packageName } = parameters;

    if (!packageName) {
      socket.emit("commandResponse", {
        command: "closeApp",
        success: false,
        message: "Package name is required",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    socket.emit("commandResponse", {
      command: "closeApp",
      success: true,
      message: `App ${packageName} close command sent`,
      timestamp: new Date().toISOString(),
    });
  }

  rotateDevice(socket, parameters, emulatorServer) {
    const { orientation } = parameters; // portrait, landscape, reversePortrait, reverseLandscape

    socket.emit("commandResponse", {
      command: "rotate",
      success: true,
      message: `Device rotation to ${orientation} command sent`,
      timestamp: new Date().toISOString(),
    });
  }

  setLocation(socket, parameters, emulatorServer) {
    const { latitude, longitude, altitude } = parameters;

    if (!latitude || !longitude) {
      socket.emit("commandResponse", {
        command: "setLocation",
        success: false,
        message: "Latitude and longitude are required",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    socket.emit("commandResponse", {
      command: "setLocation",
      success: true,
      message: `Location set to ${latitude}, ${longitude}`,
      timestamp: new Date().toISOString(),
    });
  }
}

module.exports = new EmulatorHandlers();
