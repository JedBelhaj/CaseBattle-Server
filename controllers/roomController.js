import {
  activateUser,
  createRoom,
  getRoom,
  getUserByName,
  isRoomExist,
  joinRoom,
} from "../models/Room.js";

export const handleGetRoom = (req, res) => {
  const room = getRoom(req.query.id);
  if (!room) return res.status(404).send({ error: "Room not found" });
  res.send(room);
};

export const handleCreateRoom = (req, res) => {
  const { username } = req.body;
  if (!username) {
    res.status(400).send({ error: "cant create room without username" });
  }
  const roomId = createRoom(username);
  if (roomId) {
    res.status(200).json({ roomId });
  } else {
    return res
      .status(400)
      .send({ error: "Couldn't create room for " + username });
  }
};

export const handleJoinRoom = (req, res) => {
  const { roomId, username, sessionToken } = req.body;

  if (isRoomExist(roomId)) {
    const newUsername = joinRoom(username, sessionToken, roomId);
    res.status(200).send({ newUsername });
  } else {
    res.status(400);
  }
};

export const handleDisconnect = (req, res) => {
  const { roomId, username, sessionToken } = req.body;

  if (isRoomExist(roomId)) {
    const user = getUserByName(username, roomId);
    if (user && user.sessionToken === sessionToken) {
      activateUser(username, roomId, false);
      res.status(200).send("disconnected");
    } else {
      res.status(401).send("user not found or sessionToken invalide");
    }
  } else {
    res.status(404).send("room not found");
  }
};
