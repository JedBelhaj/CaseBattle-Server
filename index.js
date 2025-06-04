import express from "express";
import cors from "cors";
import User from "./models/User";
import {
  addRoom,
  generateUniqueRoomId,
  getRoom,
  joinRoom,
} from "./utils/roomsUtils";

const PORT = 5000;

const app = express();

// middleware
app.use(cors());
app.use(express.json());

// get room by id
app.get("/room", (req, res) => {
  const roomId = req.query.roomId;
  if (!roomId) {
    return res.status(400).send({ error: "Missing room roomId" });
  }
  const room = getRoom(roomId);
  if (!room) {
    return res.status(404).send({ error: "Room not found" });
  }
  res.send(room);
});

// create a room and add host
app.post("/room", (req, res) => {
  const { hostUsername } = req.body;
  const roomId = createRoom(hostUsername);
  if (roomId) {
    res.json({ roomId });
  } else {
    return res.status(400).send({ error: "Couldn't create room" });
  }
});

// join room by id and username, and handles dublicate usernames

app.post("/joinroom", (req, res) => {
  const { roomId, username, sessionToken } = req.body;
  const newUsername = joinRoom(username, sessionToken, roomId);
  res.status(200).send("joined room successfully!");
});

app.listen(PORT, () => {
  console.log(`Api Server Running on port ${PORT}`);
});
