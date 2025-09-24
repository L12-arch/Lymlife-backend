// Load environment variables first
require("dotenv").config();

// Load environment variables first
require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const SocketManager = require("./socket/socketManager");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const port = 8000;

// Create separate server for TV receiver on port 5501
const tvApp = express();
const tvServer = http.createServer(tvApp);
const tvPort = 5500;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const corsOptions = {
  origin: "*",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true, // Allow credentials (cookies, HTTP authentication) to be included
  optionsSuccessStatus: 204, // Some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.use(cors(corsOptions));

// MongoDB connection with better error handling
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB connected successfully");
    console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);
  })
  .catch((error) => {
    console.error("❌ MongoDB connection failed:");
    console.error("Error:", error.message);
    console.log("💡 Please check your MONGODB_URI in the .env file");
    console.log("💡 Make sure MongoDB is running and accessible");
    process.exit(1); // Exit the process if DB connection fails
  });

const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

// function authenticateToken(token) {
//   let authorize = true;
//   jwt.verify(token, "login", (err, user) => {
//     if (err) {
//       authorize = false;
//     }
//   });
//   return authorize;
// }

app.get("/", (req, res) => {
  res.send("Hello CodeSandbox!");
});

// Test endpoint to check video accessibility
app.get("/api/test-video/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;
    const videoUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

    console.log(`🧪 Testing video: ${videoUrl}`);

    const response = await axios({
      method: "HEAD", // Just get headers, don't download
      url: videoUrl,
      timeout: 10000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    res.json({
      success: true,
      fileId,
      contentType: response.headers['content-type'],
      contentLength: response.headers['content-length'],
      status: response.status,
      headers: response.headers,
    });

  } catch (error) {
    console.error("❌ Video test error:", error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      error: error.message,
      status: error.response?.status,
      details: error.response?.data,
    });
  }
});

// Video proxy endpoint for Google Drive videos
app.get("/api/video/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;
    const videoUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

    console.log(`🎥 Proxying video: ${videoUrl}`);

    // First, try to get video info without downloading
    const headResponse = await axios({
      method: "HEAD",
      url: videoUrl,
      timeout: 10000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const contentType = headResponse.headers['content-type'];
    const contentLength = headResponse.headers['content-length'];

    console.log(`📊 HEAD Response - Content-Type: ${contentType}`);
    console.log(`📊 HEAD Response - Content-Length: ${contentLength ? Math.round(contentLength / 1024 / 1024) + 'MB' : 'Unknown'}`);

    // Check if content type is supported
    const supportedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/mkv'];
    if (contentType && !supportedTypes.some(type => contentType.includes(type.split('/')[1]))) {
      console.warn(`⚠️ Unsupported content type: ${contentType}`);
    }

    // Now fetch the actual video
    const response = await axios({
      method: "GET",
      url: videoUrl,
      responseType: "stream",
      timeout: 30000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept": "video/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "DNT": "1",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Referer": "https://drive.google.com/",
      },
      maxRedirects: 5,
      validateStatus: function (status) {
        return status >= 200 && status < 400;
      },
    });

    // Use content type from actual response, fallback to HEAD response
    const finalContentType = response.headers['content-type'] || contentType || 'video/mp4';
    const finalContentLength = response.headers['content-length'] || contentLength;

    console.log(`📊 GET Response - Content-Type: ${finalContentType}`);
    console.log(`📊 GET Response - Content-Length: ${finalContentLength ? Math.round(finalContentLength / 1024 / 1024) + 'MB' : 'Unknown'}`);

    // Set appropriate headers for video streaming
    res.setHeader("Content-Type", finalContentType);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Range");
    res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range");
    res.setHeader("Cache-Control", "public, max-age=3600");

    // Handle range requests for video seeking
    const range = req.headers.range;
    if (range && finalContentLength) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : finalContentLength - 1;
      const chunksize = (end - start) + 1;

      console.log(`📊 Range request: ${start}-${end}/${finalContentLength}`);

      res.setHeader("Content-Range", `bytes ${start}-${end}/${finalContentLength}`);
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Content-Length", chunksize);
      res.status(206); // Partial content
    } else if (finalContentLength) {
      res.setHeader("Content-Length", finalContentLength);
    }

    // Handle potential streaming issues
    let hasError = false;
    response.data.on('error', (error) => {
      if (!hasError) {
        hasError = true;
        console.error("❌ Stream error:", error.message);
        if (!res.headersSent) {
          res.status(500).json({
            error: "Stream error",
            message: error.message,
          });
        }
      }
    });

    // Pipe the video stream to response
    response.data.pipe(res);

  } catch (error) {
    console.error("❌ Video proxy error:", error.message);
    console.error("❌ Error details:", error.response?.status, error.response?.data);
    console.error("❌ Full error:", error);

    if (error.response?.status === 404) {
      res.status(404).json({
        error: "Video not found",
        message: "The requested video could not be found on Google Drive",
      });
    } else if (error.response?.status === 403) {
      res.status(403).json({
        error: "Access denied",
        message: "Access to this video is restricted or requires permission",
      });
    } else {
      res.status(500).json({
        error: "Failed to fetch video",
        message: error.message,
        details: error.response?.data || "Unknown error",
        fullError: error.toString(),
      });
    }
  }
});

// Alternative: Direct video streaming endpoint
app.get("/api/stream/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;
    const videoUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

    console.log(`📺 Streaming video: ${videoUrl}`);

    // Fetch video from Google Drive with better headers
    const response = await axios({
      method: "GET",
      url: videoUrl,
      responseType: "stream",
      timeout: 30000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept": "video/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "DNT": "1",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
      maxRedirects: 5,
      validateStatus: function (status) {
        return status >= 200 && status < 400;
      },
    });

    // Get content type from response or default to video/mp4
    const contentType = response.headers['content-type'] || 'video/mp4';
    const contentLength = response.headers['content-length'];

    console.log(`📊 Stream content type: ${contentType}`);
    console.log(`📊 Stream size: ${contentLength ? Math.round(contentLength / 1024 / 1024) + 'MB' : 'Unknown'}`);

    // Set appropriate headers for video streaming
    res.setHeader("Content-Type", contentType);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Range");
    res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range");
    res.setHeader("Cache-Control", "public, max-age=3600");

    // Handle range requests for video seeking
    const range = req.headers.range;
    if (range && contentLength) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : contentLength - 1;
      const chunksize = (end - start) + 1;

      console.log(`📊 Range request: ${start}-${end}/${contentLength}`);

      res.setHeader("Content-Range", `bytes ${start}-${end}/${contentLength}`);
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Content-Length", chunksize);
      res.status(206); // Partial content
    } else if (contentLength) {
      res.setHeader("Content-Length", contentLength);
    }

    // Handle potential streaming issues
    let hasError = false;
    response.data.on('error', (error) => {
      if (!hasError) {
        hasError = true;
        console.error("❌ Stream error:", error.message);
        if (!res.headersSent) {
          res.status(500).json({
            error: "Stream error",
            message: error.message,
          });
        }
      }
    });

    // Pipe the video stream to response
    response.data.pipe(res);

  } catch (error) {
    console.error("❌ Stream error:", error.message);
    console.error("❌ Error details:", error.response?.status, error.response?.data);

    if (error.response?.status === 404) {
      res.status(404).json({
        error: "Video not found",
        message: "The requested video could not be found on Google Drive",
      });
    } else if (error.response?.status === 403) {
      res.status(403).json({
        error: "Access denied",
        message: "Access to this video is restricted or requires permission",
      });
    } else {
      res.status(500).json({
        error: "Failed to stream video",
        message: error.message,
        details: error.response?.data || "Unknown error",
      });
    }
  }
});

// Initialize Socket.IO with improved configuration
const socketManager = new SocketManager(server);

// TV Receiver Server Setup
tvApp.use(express.static(__dirname));

// Serve the TV receiver HTML file
tvApp.get('/', (req, res) => {
  const filePath = path.join(__dirname, 'serverSocket.html');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      res.status(404).send('TV Receiver file not found');
      return;
    }
    res.send(data);
  });
});

// Start both servers
server.listen(port, () => {
  console.log(`🚀 Main server running on port ${port}`);
  console.log(`📺 Socket.IO server ready for TV/Mobile connections`);
  console.log(`🔗 WebSocket endpoint: ws://localhost:${port}`);
});

tvServer.listen(tvPort, () => {
  console.log(`📺 TV Receiver server running on port ${tvPort}`);
  console.log(`📺 TV Receiver URL: http://127.0.0.1:${tvPort}/serverSocket.html`);
  console.log(`📱 Mobile access: http://172.20.10.7:${tvPort}/serverSocket.html`);
});
