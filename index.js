const fs = require("fs");
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { handleSocketEvents } = require("./utils/socketUtils");
const { initCaseData } = require("./utils/caseData");

// Local dev only: hosted environments (Render, Railway, etc.) inject env
// vars directly and don't have a .env file, so skip loading if absent.
if (fs.existsSync(".env")) {
  process.loadEnvFile();
}

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.get("/", (req, res) => {
  res.status(200).send("Hi!");
});

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);
  handleSocketEvents(io, socket);
});
const port = process.env.PORT || 5000;
initCaseData()
  .then(() => {
    server.listen(port, () => {
      console.log(`Server listening on port ${port}...`);
    });
  })
  .catch((err) => {
    console.error("Failed to load case data, not starting server:", err);
    process.exit(1);
  });
