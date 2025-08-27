const express = require("express");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
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

mongoose
  .connect(
    "mongodb+srv://lakshayarora403:S0REWNkD5l5GkSua@cluster0.yh3wsug.mongodb.net/?retryWrites=true&w=majority"
  )
  .then(() => console.log("connected"))
  .catch((error) => console.log(error));

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
