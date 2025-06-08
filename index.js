import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { roomRoutes } from "./routes/roomRoutes.js";
import { roomSocketHandlers } from "./sockets/roomSocket.js";

const PORT = 5000;

export const app = express();
export const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// middleware
app.use(cors());
app.use(express.json());

app.use("/room", roomRoutes());

app.get("/", (req, res) => {
  res.status(200).send("ok");
});

roomSocketHandlers(io);

if (process.env.NODE_ENV !== "test") {
  server.listen(PORT, () => {
    console.log(`Api Server Running on port ${PORT}`);
  });
}
