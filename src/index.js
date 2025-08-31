// Load environment variables first
require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const port = 8000;

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

app.listen(port, () => {
  console.log(`Sandbox listening on port ${port}`);
});
