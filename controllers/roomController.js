import {
  activateUser,
  createRoom,
  deleteRoom,
  getOnlineUsers,
  getRoom,
  getUserByName,
  isRoomExist,
  joinRoom,
  setHost,
} from "../models/Room.js";

let hostAssignmentTimeoutIDs = {};
let roomDeletionTimeoutIDs = {};

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
  const { roomId, user } = createRoom(username);
  if (roomId) {
    res.status(200).json({ roomId, user });
  } else {
    return res
      .status(400)
      .send({ error: "Couldn't create room for " + username });
  }
};

export const handleJoinRoom = (req, res) => {
  let { roomId, username, sessionToken } = req.body;

  // check for host reconnection and cancel host reassignment
  const user = getUserByName(username, roomId);
  if (user?.host) {
    clearTimeout(hostAssignmentTimeoutIDs[roomId]);
  }
  // check for room deletion and cancel deletion
  if (roomDeletionTimeoutIDs[roomId]) {
    clearTimeout(roomDeletionTimeoutIDs[roomId]);
  }

  if (isRoomExist(roomId)) {
    const { newUsername, newSessionToken } = joinRoom(
      username,
      roomId,
      sessionToken
    );
    if (!sessionToken) {
      sessionToken = newSessionToken;
    }
    res.status(200).send({ newUsername, sessionToken });
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
      if (user.host) {
        hostAssignmentTimeoutIDs[roomId] = setTimeout(() => {
          setHost(roomId);
        }, 10000);
      }
      if (getOnlineUsers(roomId).length === 0) {
        roomDeletionTimeoutIDs[roomId] = setTimeout(() => {
          deleteRoom(roomId);
        }, 10000);
      }
      res.status(200).send("disconnected");
    } else {
      res.status(401).send("user not found or sessionToken invalide");
    }
  } else {
    res.status(404).send("room not found");
  }
};
