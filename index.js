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
const port = process.env.PORT | 5000;
server.listen(port, () => {
  console.log("Server listening on port 3000...");
});
