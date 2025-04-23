const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { handleSocketEvents } = require("./utils/socketUtils");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:8000"],
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);
  handleSocketEvents(io, socket);
});

server.listen(3001, () => {
  console.log("Server listening on port 3001...");
});
